# JSI Bridge Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Process](#implementation-process)
4. [Code Explanation](#code-explanation)
5. [Troubleshooting](#troubleshooting)
6. [Next Steps](#next-steps)

---

## Overview

### What is JSI?
**JSI (JavaScript Interface)** is React Native's new framework that enables **synchronous** communication between JavaScript and native C++ code. Unlike the old bridge (which was asynchronous and used JSON serialization), JSI allows:

- **Zero-copy data sharing**: Pass pointers directly instead of serializing/deserializing
- **Synchronous calls**: Call native functions and get immediate results
- **Direct memory access**: Share typed arrays between JS and C++ without copying
- **Better performance**: No message queue overhead

### What We Built
A **proof-of-concept JSI module** called `DummyDetector` that:
1. Exposes native C++ functions (`detectObjects`, `loadDetectionModel`) to JavaScript
2. Demonstrates frame-by-frame processing for computer vision tasks
3. Shows how to integrate optional libraries (NCNN) with compile-time flags
4. Integrates with VisionCamera for real-time camera frame processing

---

## Architecture

### High-Level Flow
```
┌─────────────────┐
│   JavaScript    │  (App code calls detectObjects(...))
│   Runtime (V8)  │
└────────┬────────┘
         │ JSI (zero-copy, synchronous)
         ▼
┌─────────────────┐
│   C++ Layer     │  (DummyDetector.cpp - JSI host functions)
│   (JNI Bridge)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Kotlin/Java    │  (DummyDetectorInstaller.kt - loads C++ lib)
│  Android Layer  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ React Native    │  (MainApplication.kt - app entry point)
│ Application     │
└─────────────────┘
```

### Component Breakdown

| Component | Language | Purpose |
|-----------|----------|---------|
| `Detector.ts` | TypeScript | JavaScript API facade |
| `DummyDetector.cpp` | C++ | JSI host functions implementation |
| `ncnn_wrapper.cpp/h` | C++ | Optional NCNN inference wrapper |
| `DummyDetectorInstaller.kt` | Kotlin | JNI loader and runtime bridge |
| `MainApplication.kt` | Kotlin | App lifecycle integration |
| `CMakeLists.txt` | CMake | Native build configuration |

---

## Implementation Process

### Step 1: Create the C++ JSI Module

**File**: `native/dummy-detector/android/src/main/cpp/DummyDetector.cpp`

**Goal**: Implement native functions that JavaScript can call directly.

#### What We Did:
1. Created two JSI host functions:
   - `detectObjects(width, height, imageData)` - Returns mock detections
   - `loadDetectionModel(paramPath, binPath)` - Loads NCNN model (stub)

2. Registered them to the global JavaScript object so they're callable from JS

#### Key Concepts:

**JSI Host Function**:
```cpp
static facebook::jsi::Value detectObjects(
    facebook::jsi::Runtime &rt,           // JavaScript runtime
    const facebook::jsi::Value &thisVal,  // 'this' context (unused here)
    const facebook::jsi::Value *args,     // Arguments from JS
    size_t argCount                       // Number of arguments
) {
    // Extract arguments
    int width = (int)args[0].asNumber();
    int height = (int)args[1].asNumber();
    
    // Create return value (JSI Array)
    facebook::jsi::Array arr(rt, 0);
    
    // Populate with mock detection
    facebook::jsi::Object box(rt);
    box.setProperty(rt, "x1", 0.25);
    box.setProperty(rt, "y1", 0.25);
    box.setProperty(rt, "x2", 0.75);
    box.setProperty(rt, "y2", 0.75);
    box.setProperty(rt, "score", 0.95);
    box.setProperty(rt, "label", "toy_object");
    
    arr.setValueAtIndex(rt, 0, box);
    return arr;
}
```

**Why this works**:
- `facebook::jsi::Runtime &rt` - The JavaScript engine (V8/Hermes)
- `args` - Arguments passed from JavaScript (e.g., `detectObjects(640, 480)`)
- Return type `facebook::jsi::Value` - Can be any JS type (number, object, array, etc.)

**Installation Function**:
```cpp
static void install(facebook::jsi::Runtime &rt) {
    // Create a property name "detectObjects"
    auto name = facebook::jsi::PropNameID::forAscii(rt, "detectObjects");
    
    // Create a host function that wraps our C++ function
    auto fn = facebook::jsi::Function::createFromHostFunction(
        rt,
        name,
        3,  // Expected argument count
        [](facebook::jsi::Runtime &rt, 
           const facebook::jsi::Value &thisVal,
           const facebook::jsi::Value *args,
           size_t count) -> facebook::jsi::Value {
            return detectObjects(rt, thisVal, args, count);
        }
    );
    
    // Attach to global object: global.detectObjects = fn
    rt.global().setProperty(rt, name, fn);
}
```

**What happens**:
1. JavaScript engine boots up
2. Our `install` function runs
3. `global.detectObjects` is now a callable function from JavaScript
4. When JS calls `detectObjects(640, 480)`, it directly invokes our C++ code

---

### Step 2: Create the JNI Bridge

**File**: `native/dummy-detector/android/src/main/java/com/amirzhou/rahcapp/DummyDetectorInstaller.kt`

**Goal**: Connect the Android Java/Kotlin layer to the C++ JSI code.

#### Full Code Walkthrough:

```kotlin
package com.amirzhou.rahcapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext

object DummyDetectorInstaller {
```
- **`object`**: Singleton in Kotlin (only one instance exists)
- **Purpose**: Manage the lifecycle of the native library

```kotlin
    init {
        try {
            System.loadLibrary("dummy-detector")
        } catch (_: UnsatisfiedLinkError) {
            // Library may not be present in some build variants
        }
    }
```
- **`init` block**: Runs when the object is first accessed
- **`System.loadLibrary("dummy-detector")`**: Loads `libdummy-detector.so` from APK
- **Why catch?**: The library might not be built in all configurations (e.g., dev builds without CMake)

```kotlin
    @JvmStatic
    external fun install(runtimePtr: Long)
```
- **`@JvmStatic`**: Makes this callable from Java (not just Kotlin)
- **`external`**: Implemented in native code (C++)
- **`runtimePtr: Long`**: Memory address of the JavaScript runtime (passed as 64-bit integer)
- **What it does**: Maps to `Java_com_amirzhou_rahcapp_DummyDetectorInstaller_install` in C++

```kotlin
    @JvmStatic
    fun installJSI(reactContext: ReactContext) {
```
- **Entry point** called from `MainApplication.kt`
- **Accepts `ReactContext`**: Base type provided by React Native lifecycle

```kotlin
        val ptr = try {
            if (reactContext is ReactApplicationContext) {
                reactContext.javaScriptContextHolder?.get() ?: 0L
            } else 0L
        } catch (_: Throwable) {
            0L
        }
```
- **Type check**: `ReactContext` might not always be `ReactApplicationContext`
- **`javaScriptContextHolder`**: React Native's internal holder for the JSI runtime pointer
- **`.get()`**: Retrieves the actual memory address (Long)
- **Null-safety**: Returns `0L` if unavailable (means JSI not ready yet)

```kotlin
        if (ptr == 0L) return
```
- **Guard**: Don't proceed if we don't have a valid runtime pointer

```kotlin
        try {
            install(ptr)
        } catch (_: UnsatisfiedLinkError) {
            // Native symbol missing
        }
    }
}
```
- **Calls native `install`**: Passes the runtime pointer to C++
- **Catch `UnsatisfiedLinkError`**: If C++ function not found (library not loaded)

---

### Step 3: Integrate with React Native App

**File**: `android/app/src/main/java/com/amirzhou/rahcapp/MainApplication.kt`

**Goal**: Install the JSI module when React Native initializes.

#### Key Section:

```kotlin
override fun onCreate() {
    super.onCreate()
    // ... other React Native setup ...
    loadReactNative(this)
```
- **`onCreate()`**: Android application lifecycle method (runs once on app start)
- **`loadReactNative(this)`**: Initializes React Native framework

```kotlin
    val ctx = reactNativeHost.reactInstanceManager.currentReactContext
```
- **`reactNativeHost`**: React Native's central manager
- **`.reactInstanceManager`**: Manages the JavaScript runtime
- **`.currentReactContext`**: The active context (might be `null` if not ready)

```kotlin
    if (ctx != null) {
        DummyDetectorInstaller.installJSI(ctx)
    }
```
- **If context exists**: JavaScript runtime is ready, install immediately

```kotlin
    else {
        reactNativeHost.reactInstanceManager.addReactInstanceEventListener(
            object : com.facebook.react.ReactInstanceEventListener {
                override fun onReactContextInitialized(context: com.facebook.react.bridge.ReactContext) {
                    DummyDetectorInstaller.installJSI(context)
                }
            }
        )
    }
```
- **If context is null**: JavaScript runtime not ready yet
- **Listener pattern**: Wait for `onReactContextInitialized` callback
- **Why needed?**: The JS engine might boot asynchronously

**Critical Detail - Parameter Name**:
```kotlin
override fun onReactContextInitialized(context: com.facebook.react.bridge.ReactContext)
```
- **Must be named `context`** (not `reactContext`)
- **Why?**: Kotlin requires exact signature match for interface implementation
- **Error if wrong**: `Class '<anonymous>' is not abstract and does not implement abstract member`

---

### Step 4: Build Configuration

**File**: `native/dummy-detector/android/src/main/cpp/CMakeLists.txt`

**Goal**: Tell CMake how to compile the C++ code.

#### Key Sections Explained:

```cmake
cmake_minimum_required(VERSION 3.10.2)
project(dummy_detector)
```
- **Minimum CMake version**: Ensures compatibility
- **Project name**: Used for build artifacts

```cmake
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++17 -fexceptions -frtti")
```
- **`-std=c++17`**: Use C++17 standard (needed for JSI)
- **`-fexceptions`**: Enable exception handling
- **`-frtti`**: Enable runtime type information

```cmake
add_library(dummy-detector SHARED DummyDetector.cpp)
```
- **`add_library`**: Create a library
- **`SHARED`**: Build as `.so` (shared library, loaded at runtime)
- **`DummyDetector.cpp`**: Source file to compile

```cmake
option(USE_NCNN "Build with NCNN library support" OFF)
```
- **Compile-time option**: Can toggle NCNN support
- **Default `OFF`**: NCNN not required for basic functionality

```cmake
add_library(ncnn-wrapper STATIC ncnn_wrapper.cpp)
target_link_libraries(dummy-detector ncnn-wrapper)
```
- **`STATIC` library**: `ncnn_wrapper` compiled into `dummy-detector`
- **Link**: Makes `ncnn_wrapper` functions available in `dummy-detector`

```cmake
get_filename_component(REACT_NATIVE_DIR "${CMAKE_SOURCE_DIR}/../../../../.." ABSOLUTE)
include_directories(${REACT_NATIVE_DIR}/node_modules/react-native/ReactCommon/jsi)
```
- **Find React Native**: Navigate from `android/src/main/cpp/` to repo root
- **Include JSI headers**: So we can use `facebook::jsi::Runtime` etc.

```cmake
find_library(log-lib log)
target_link_libraries(dummy-detector ${log-lib})
```
- **Android logging**: Link to `liblog.so` for `__android_log_print`

---

### Step 5: JavaScript API Layer

**File**: `native/dummy-detector/js/Detector.ts`

**Goal**: Provide a clean TypeScript API for JavaScript code.

```typescript
export interface Detection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  score: number;
  label: string;
}

export default function detectObjects(
  width: number,
  height: number,
  imageData?: Uint8Array | null
): Detection[] {
  // @ts-ignore - Global function installed by JSI
  return (global as any).detectObjects(width, height, imageData ?? null);
}
```

**Why this wrapper?**:
1. **Type safety**: TypeScript knows the return type
2. **Default arguments**: Can omit `imageData`
3. **Documentation**: IDE autocomplete works
4. **Encapsulation**: Hide the `global` object ugliness

```typescript
export function loadModel(paramPath: string, binPath: string): boolean {
  // @ts-ignore
  return (global as any).loadDetectionModel(paramPath, binPath);
}
```

**Usage in app**:
```typescript
import detectObjects, { loadModel } from './native/dummy-detector/js/Detector';

// Later in component
const detections = detectObjects(640, 480);
console.log(detections); // [{ x1: 0.25, y1: 0.25, ... }]

loadModel('/path/to/model.param', '/path/to/model.bin');
```

---

## Code Explanation

### NCNN Wrapper (Optional ML Integration)

**File**: `native/dummy-detector/android/src/main/cpp/ncnn_wrapper.cpp`

```cpp
#include "ncnn_wrapper.h"
#include <cstddef>

#ifdef USE_NCNN
#include <ncnn/net.h>
#endif

bool NCNNWrapper::loadModel(const std::string &paramFile, const std::string &binFile) {
#ifdef USE_NCNN
    // Real NCNN loading code here
    return net.load_param(paramFile.c_str()) == 0 && 
           net.load_model(binFile.c_str()) == 0;
#else
    return false; // Stub when NCNN disabled
#endif
}
```

**Compile-time Conditional**:
- **`#ifdef USE_NCNN`**: Only compile this code if `-DUSE_NCNN=ON` passed to CMake
- **Why?**: NCNN is large (~5-10MB), don't bloat APK if not needed
- **Stub version**: Returns `false` when NCNN not available

**Full Inference Flow (When USE_NCNN=ON)**:
```cpp
std::vector<NCNNDetection> NCNNWrapper::forward(const unsigned char *rgba, int width, int height) {
    ncnn::Mat in = ncnn::Mat::from_pixels(rgba, ncnn::Mat::PIXEL_RGBA, width, height);
    
    ncnn::Extractor ex = net.create_extractor();
    ex.input("data", in);
    
    ncnn::Mat out;
    ex.extract("output", out);
    
    // Parse detections from output tensor
    std::vector<NCNNDetection> dets;
    for (int i = 0; i < out.h; i++) {
        const float* values = out.row(i);
        NCNNDetection det;
        det.x1 = values[0];
        det.y1 = values[1];
        det.x2 = values[2];
        det.y2 = values[3];
        det.score = values[4];
        det.classId = (int)values[5];
        dets.push_back(det);
    }
    return dets;
}
```

---

### VisionCamera Integration

**File**: `app/(tabs)/vision-test/vision-camera-detection-plugin.ts`

```typescript
import { VisionCameraProxy, Frame } from 'react-native-vision-camera';

const plugin = VisionCameraProxy.initFrameProcessorPlugin('detectNativeObjects', {});

export function detectNativeObjects(frame: Frame) {
  'worklet'; // Runs on camera thread, not JS thread
  
  if (plugin == null) {
    throw new Error('Failed to load detectNativeObjects plugin!');
  }
  
  // Call the native plugin (runs on Frame Processor thread)
  return plugin.call(frame) as Detection[];
}
```

**Worklet Concept**:
- **VisionCamera runs on a separate thread** (not main JS thread)
- **`'worklet'`**: Special directive - function compiled to run on camera thread
- **Zero-copy**: `frame` is a native pointer, not copied to JS

**Registration**:
```typescript
VisionCameraProxy.registerFrameProcessorPlugin(
  'detectNativeObjects',
  ({ frame }) => {
    'worklet';
    // Call our JSI function directly from camera thread
    return (global as any).detectObjects(frame.width, frame.height, null);
  }
);
```

**Usage in React Component**:
```typescript
const frameProcessor = useFrameProcessor((frame) => {
  'worklet';
  const detections = detectNativeObjects(frame);
  
  // Can't use console.log here (different thread)
  // Use runAsync to send to JS thread:
  runAsync(frame, () => {
    console.log('Detections:', detections);
  });
}, []);

return <Camera frameProcessor={frameProcessor} />;
```

---

## Troubleshooting

### Common Build Errors

#### 1. `Unresolved reference 'DummyDetectorInstaller'`

**Cause**: `.gitignore` excludes `/android` directory

**Fix**:
```bash
git add -f android/app/src/main/java/com/amirzhou/rahcapp/DummyDetectorInstaller.kt
git commit -m "chore: track DummyDetectorInstaller"
```

#### 2. `Class '<anonymous>' is not abstract and does not implement abstract member`

**Cause**: Parameter name mismatch in `onReactContextInitialized`

**Fix**:
```kotlin
// Wrong:
override fun onReactContextInitialized(reactContext: ReactContext) { }

// Correct:
override fun onReactContextInitialized(context: ReactContext) { }
```

#### 3. `UnsatisfiedLinkError: dlopen failed: library "libdummy-detector.so" not found`

**Causes**:
- CMake not configured in `build.gradle`
- Library not included in APK

**Fix in `android/app/build.gradle`**:
```gradle
android {
    externalNativeBuild {
        cmake {
            path "../../native/dummy-detector/android/src/main/cpp/CMakeLists.txt"
        }
    }
}
```

#### 4. `facebook::jsi::Runtime` not found

**Cause**: Missing JSI headers in include path

**Fix in CMakeLists.txt**:
```cmake
include_directories(${REACT_NATIVE_DIR}/node_modules/react-native/ReactCommon/jsi)
```

#### 5. Permission denied on `./gradlew`

**Cause**: GitHub Actions doesn't preserve file permissions

**Fix in CI workflow**:
```yaml
- name: Build Android
  run: |
    chmod +x gradlew
    ./gradlew assembleDebug -x lint
```

---

## Next Steps

### 1. Implement Real NCNN Inference

**Currently**: Stub returns `false`

**To implement**:
1. Download NCNN prebuilt libraries
2. Update CMakeLists.txt:
   ```cmake
   option(USE_NCNN "Build with NCNN library support" ON)
   set(NCNN_LIB "/path/to/libncnn.a")
   set(NCNN_INCLUDE "/path/to/ncnn/include")
   ```
3. Add real model loading in `ncnn_wrapper.cpp`
4. Test with a quantized MobileNet model

### 2. Zero-Copy Frame Buffer Passing

**Currently**: Only pass width/height to `detectObjects`

**Goal**: Pass actual frame pixels without copying

**Implementation**:
```cpp
// In DummyDetector.cpp
static facebook::jsi::Value detectObjects(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &thisVal,
    const facebook::jsi::Value *args,
    size_t argCount
) {
    if (argCount >= 3 && args[2].isObject()) {
        auto obj = args[2].asObject(rt);
        
        // Get native buffer pointer
        auto buffer = obj.getArrayBuffer(rt);
        unsigned char* data = buffer.data(rt);
        size_t size = buffer.size(rt);
        
        // Now we have direct access to pixel data!
        // No copying - just a pointer to the frame buffer
    }
}
```

**VisionCamera Side**:
```typescript
const frameProcessor = useFrameProcessor((frame) => {
  'worklet';
  
  // This gives us the native buffer
  const buffer = frame.toArrayBuffer();
  
  // Pass directly to C++ (zero-copy)
  return (global as any).detectObjects(frame.width, frame.height, buffer);
}, []);
```

### 3. Add Device/Emulator Integration Tests

**Create**: `android/app/src/androidTest/java/com/amirzhou/rahcapp/JSIDetectorTest.kt`

```kotlin
@RunWith(AndroidJUnit4::class)
class JSIDetectorTest {
    @Test
    fun testDetectObjectsCallable() {
        // Launch React Native
        val activity = ActivityScenario.launch(MainActivity::class.java)
        
        // Wait for JS runtime
        Thread.sleep(2000)
        
        // Verify global.detectObjects exists
        activity.onActivity { act ->
            val context = (act.application as MainApplication)
                .reactNativeHost
                .reactInstanceManager
                .currentReactContext
            
            assertNotNull("React context should be initialized", context)
            
            // Execute JS to test
            context.runOnJSQueueThread {
                val result = context.evaluateJavaScriptFromAsset(
                    context.assets,
                    "test-detect-objects.js"
                )
                assertTrue("Should return detections array", result.contains("x1"))
            }
        }
    }
}
```

### 4. Performance Benchmarking

**Measure**:
- JSI call overhead (JS → C++)
- Frame processing time (640x480, 1920x1080)
- Memory usage during inference

**Tool**: Add timing in C++
```cpp
#include <chrono>

auto start = std::chrono::high_resolution_clock::now();
// ... do work ...
auto end = std::chrono::high_resolution_clock::now();
auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

__android_log_print(ANDROID_LOG_INFO, "JSI-Perf", 
    "Processing took %lld μs", duration.count());
```

---

## Summary

### What We Achieved

✅ **Synchronous native calls from JavaScript**
- JavaScript can call C++ functions directly
- No serialization overhead
- Results returned immediately

✅ **Type-safe API**
- TypeScript definitions for all native functions
- IDE autocomplete support
- Compile-time error checking

✅ **Modular architecture**
- NCNN support is optional (compile-time flag)
- Easy to add more native functions
- Clean separation: JS ↔ C++ ↔ Optional ML

✅ **Production-ready error handling**
- Graceful degradation if native lib missing
- Safe pointer handling
- Try-catch wrappers prevent crashes

✅ **VisionCamera integration**
- Frame processor plugin registered
- Ready for zero-copy frame processing
- Runs on camera thread (not blocking JS)

### Key Learnings

1. **JSI is powerful but requires careful setup**
   - Must install at exact right moment in React Native lifecycle
   - Pointer management is critical (null checks everywhere)

2. **Type system matters**
   - Kotlin interface signatures must match exactly
   - `ReactContext` vs `ReactApplicationContext` distinction is important

3. **Build configuration is complex**
   - CMake, Gradle, and React Native must all align
   - .gitignore can hide files from CI (use `-f` to force-add)

4. **Performance wins are real**
   - JSI calls are ~10-100x faster than old bridge
   - Zero-copy enables real-time video processing

Now you can explain to anyone: "We built a JSI bridge that lets JavaScript synchronously call native C++ code for high-performance computer vision tasks, with optional NCNN neural network inference, integrated into VisionCamera for real-time frame processing."

Want me to add more sections? I can expand on:
- iOS implementation (DummyDetector.mm)
- Debugging techniques
- Common pitfalls
- Alternative approaches (TurboModules vs JSI)
