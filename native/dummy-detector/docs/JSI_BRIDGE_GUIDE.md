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

---

## iOS Implementation

### Overview

The iOS implementation follows a similar pattern to Android but uses Objective-C++ (`.mm` files) to bridge between Objective-C (iOS) and C++ (JSI). The key difference is that iOS doesn't use JNI - instead, React Native's iOS layer directly exposes the JSI runtime pointer.

### File Structure

```
native/dummy-detector/ios/
├── DummyDetector.h       # C header declaring the install function
└── DummyDetector.mm      # Objective-C++ implementation
```

### Step-by-Step Implementation

#### 1. Header File: `DummyDetector.h`

```cpp
#ifdef __cplusplus
extern "C" void InstallDummyDetector(jsi::Runtime *rt);
#else
void InstallDummyDetector(void* rt);
#endif
```

**Line-by-line explanation**:

```cpp
#ifdef __cplusplus
```
- **Preprocessor directive**: Checks if we're compiling as C++ (not C)
- **Why needed?**: Objective-C files (`.m`) can't understand C++ syntax
- **Result**: Different function signatures for C vs C++ callers

```cpp
extern "C" void InstallDummyDetector(jsi::Runtime *rt);
```
- **`extern "C"`**: Prevents C++ name mangling (keeps function name simple)
- **C++ name mangling**: Compiler adds type info to function names (e.g., `_Z19InstallDummyDetectorPN8facebook3jsi7RuntimeE`)
- **Without `extern "C"`**: Objective-C code can't find the function
- **`jsi::Runtime *rt`**: Pointer to JavaScript runtime (C++ type)

```cpp
#else
void InstallDummyDetector(void* rt);
#endif
```
- **C version**: Uses generic `void*` pointer instead of typed `jsi::Runtime*`
- **Why?**: Plain C doesn't understand C++ namespaces or classes
- **Usage**: If someone includes this header in a `.c` file (not `.cpp` or `.mm`)

**Key Insight**: This header is a "bridge" that allows both C++ and Objective-C code to call the same function, even though they speak different "languages".

---

#### 2. Implementation File: `DummyDetector.mm`

**Why `.mm` extension?**
- **`.m`**: Objective-C file (can't use C++ features)
- **`.mm`**: Objective-C++ file (can mix Objective-C and C++)
- **JSI requires C++**: So we must use `.mm`

##### Import Headers

```objectivec++
#import <jsi/jsi.h>
#import <Foundation/Foundation.h>

using namespace facebook;
using namespace jsi;
```

**What each import does**:
- **`<jsi/jsi.h>`**: JSI C++ API (Runtime, Value, Object, Array, etc.)
- **`<Foundation/Foundation.h>`**: iOS Foundation framework (NSString, NSArray, etc.)
  - Not used in current implementation but often needed for iOS-specific logic
  
**`using namespace`**:
- **Without**: Would need to write `facebook::jsi::Runtime`, `facebook::jsi::Value`, etc.
- **With**: Can write just `Runtime`, `Value`, `Array`
- **Trade-off**: Makes code cleaner but can cause naming conflicts

##### Mock Detection Generator

```objectivec++
static Value createMockDetections(Runtime &rt) {
  Array arr(rt, 1);
  Object box(rt);
  box.setProperty(rt, "x1", 0.1);
  box.setProperty(rt, "y1", 0.15);
  box.setProperty(rt, "x2", 0.5);
  box.setProperty(rt, "y2", 0.6);
  box.setProperty(rt, "score", 0.85);
  box.setProperty(rt, "label", "person");
  arr.setValueAtIndex(rt, 0, box);
  return arr;
}
```

**Breakdown**:

```objectivec++
static Value createMockDetections(Runtime &rt) {
```
- **`static`**: Function only visible in this file (not exported)
- **`Value`**: Return type - can be any JavaScript value
- **`Runtime &rt`**: Reference to JavaScript engine (passed by reference for efficiency)

```objectivec++
  Array arr(rt, 1);
```
- **Create JavaScript array**: `new Array(1)` in JS terms
- **Size 1**: Pre-allocate space for 1 element
- **Why pass `rt`?**: Array needs access to the JavaScript engine's memory allocator

```objectivec++
  Object box(rt);
```
- **Create JavaScript object**: `{}` in JS terms
- **Empty object**: Will add properties next

```objectivec++
  box.setProperty(rt, "x1", 0.1);
```
- **Add property**: Like `box.x1 = 0.1` in JavaScript
- **Type conversion**: C++ `double` (0.1) automatically converts to JavaScript `number`

```objectivec++
  box.setProperty(rt, "label", "person");
```
- **String property**: C string `"person"` converts to JavaScript `string`
- **Under the hood**: JSI creates a JavaScript string object in the engine

```objectivec++
  arr.setValueAtIndex(rt, 0, box);
```
- **Add to array**: Like `arr[0] = box` in JavaScript
- **Index 0**: First element

```objectivec++
  return arr;
```
- **Return to JavaScript**: The `Value` type can hold any JS value (array, object, number, etc.)

**JavaScript equivalent**:
```javascript
function createMockDetections() {
  return [{
    x1: 0.1,
    y1: 0.15,
    x2: 0.5,
    y2: 0.6,
    score: 0.85,
    label: "person"
  }];
}
```

##### Host Function Implementation

```objectivec++
static Value detectObjects(Runtime &rt, const Value &thisVal, const Value *args, size_t argCount) {
  (void)thisVal;
  (void)args;
  (void)argCount;
  return createMockDetections(rt);
}
```

**Parameter explanation**:

```objectivec++
Runtime &rt
```
- **JavaScript runtime**: The engine executing our code
- **Reference (`&`)**: Avoids copying (efficient)

```objectivec++
const Value &thisVal
```
- **`this` context**: What `this` refers to when function is called
- **Example in JS**: `someObject.detectObjects()` → `thisVal` would be `someObject`
- **Not used here**: We ignore it (hence `(void)thisVal`)

```objectivec++
const Value *args
```
- **Arguments array**: Pointer to arguments passed from JavaScript
- **Example**: JS calls `detectObjects(640, 480)` → `args[0]` = 640, `args[1]` = 480
- **Not used here**: Current implementation ignores arguments

```objectivec++
size_t argCount
```
- **Argument count**: How many arguments were passed
- **Type safety**: Can check if caller passed correct number of args
- **Not used here**: We don't validate

**Unused parameter suppression**:
```objectivec++
(void)thisVal;
(void)args;
(void)argCount;
```
- **Why?**: Prevents compiler warnings about unused parameters
- **Alternative**: Could use `[[maybe_unused]]` attribute (C++17)
- **Common pattern**: In stub implementations or minimal examples

##### Installation Function

```objectivec++
extern "C" void InstallDummyDetector(jsi::Runtime *rt) {
```
- **`extern "C"`**: Matches the header declaration
- **Entry point**: Called from Objective-C React Native module
- **Takes pointer**: `jsi::Runtime *rt` instead of reference

```objectivec++
  auto name = jsi::PropNameID::forAscii(*rt, "detectObjects");
```
- **Create property name**: JavaScript property identifier
- **`PropNameID`**: JSI's type-safe way to create JS property names
- **`forAscii`**: String is ASCII (not Unicode)
- **`*rt`**: Dereference pointer to get reference

```objectivec++
  auto fn = jsi::Function::createFromHostFunction(
    *rt, 
    name, 
    3,
    [](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
      return detectObjects(rt, thisVal, args, count);
    }
  );
```

**Detailed breakdown**:

```objectivec++
jsi::Function::createFromHostFunction
```
- **Factory method**: Creates a JavaScript function backed by C++ code
- **Result**: JavaScript sees this as a normal function

```objectivec++
*rt
```
- **Runtime reference**: Dereference the pointer

```objectivec++
name
```
- **Function name**: "detectObjects" (used in error messages, debugging)

```objectivec++
3
```
- **Expected argument count**: Helps JSI optimize calls
- **Not enforced**: Function still callable with any number of args

```objectivec++
[](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
  return detectObjects(rt, thisVal, args, count);
}
```
- **Lambda function**: Anonymous function defined inline
- **Captures nothing**: `[]` means no external variables captured
- **Forwarding**: Just passes all arguments to our `detectObjects` function
- **Why not pass `detectObjects` directly?**: JSI requires this specific lambda signature

```objectivec++
  rt->global().setProperty(*rt, name, fn);
}
```
- **Attach to global**: Like `global.detectObjects = fn` in JavaScript
- **`rt->global()`**: Get the global object (`window` in browsers, `global` in Node/RN)
- **`setProperty(*rt, name, fn)`**: Add our function as a property

**Result**: JavaScript code can now call `global.detectObjects()` and it will execute our C++ function!

---

### Integrating with React Native iOS

#### Step 1: Create React Native Module (Objective-C)

**File**: `ios/YourApp/DummyDetectorModule.mm`

```objectivec++
#import <React/RCTBridgeModule.h>
#import <React/RCTBridge+Private.h>
#import <ReactCommon/RCTTurboModule.h>
#import "DummyDetector.h"

@interface DummyDetectorModule : NSObject <RCTBridgeModule>
@end

@implementation DummyDetectorModule

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)setBridge:(RCTBridge *)bridge {
  _bridge = bridge;
  [self installJSI];
}

- (void)installJSI {
  RCTCxxBridge *cxxBridge = (RCTCxxBridge *)self.bridge;
  if (!cxxBridge.runtime) {
    return;
  }
  
  jsi::Runtime *runtime = (jsi::Runtime *)cxxBridge.runtime;
  InstallDummyDetector(runtime);
}

@end
```

**Code explanation**:

```objectivec++
#import <React/RCTBridge+Private.h>
```
- **Private header**: Exposes internal React Native APIs
- **`RCTBridge+Private.h`**: Gives access to `.runtime` property (JSI runtime pointer)
- **Warning**: Private API might change between RN versions

```objectivec++
@interface DummyDetectorModule : NSObject <RCTBridgeModule>
```
- **Objective-C class**: Standard iOS module pattern
- **Inherits from `NSObject`**: Base class for all Objective-C objects
- **Implements `RCTBridgeModule`**: React Native module protocol

```objectivec++
RCT_EXPORT_MODULE();
```
- **Macro**: Registers this class as a React Native module
- **Without arguments**: Module name = class name (`DummyDetectorModule`)
- **With argument**: `RCT_EXPORT_MODULE(CustomName)` for different JS name

```objectivec++
+ (BOOL)requiresMainQueueSetup {
  return NO;
}
```
- **Class method** (`+` means static)
- **Purpose**: Tell React Native which thread to initialize on
- **`NO`**: Can initialize on background thread (no UI work needed)
- **`YES`**: Must initialize on main thread (needed for UI components)

```objectivec++
- (void)setBridge:(RCTBridge *)bridge {
  _bridge = bridge;
  [self installJSI];
}
```
- **Instance method** (`-` means non-static)
- **Called by React Native**: When module is initialized
- **`bridge`**: Connection to JavaScript runtime
- **Store reference**: `_bridge = bridge` for later use
- **Install immediately**: Call `installJSI` to set up our JSI functions

```objectivec++
RCTCxxBridge *cxxBridge = (RCTCxxBridge *)self.bridge;
```
- **Type cast**: `RCTBridge` → `RCTCxxBridge` (internal implementation)
- **`RCTCxxBridge`**: C++ bridge implementation (has `.runtime` property)
- **Alternative**: In new architecture, use `RCTBridge.jsiRuntime` (future-proof)

```objectivec++
if (!cxxBridge.runtime) {
  return;
}
```
- **Null check**: Runtime might not be ready yet
- **Early return**: Don't proceed if JSI not available

```objectivec++
jsi::Runtime *runtime = (jsi::Runtime *)cxxBridge.runtime;
InstallDummyDetector(runtime);
```
- **Cast to JSI type**: `void*` → `jsi::Runtime*`
- **Call install function**: Our C++ function from `DummyDetector.mm`
- **One-time setup**: Registers `global.detectObjects`

---

#### Step 2: Register in AppDelegate

**File**: `ios/YourApp/AppDelegate.mm`

```objectivec++
#import "AppDelegate.h"
#import "DummyDetectorModule.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // ... existing React Native setup ...
  
  // No explicit registration needed!
  // RCT_EXPORT_MODULE() auto-registers the module
  
  return YES;
}

@end
```

**Why no explicit registration?**
- **`RCT_EXPORT_MODULE()` macro**: Automatically adds module to registry
- **Runtime discovery**: React Native finds all exported modules at startup
- **Alternative (manual)**: Could use `extraModules` in `RCTBridge`, but unnecessary

---

#### Step 3: Xcode Project Configuration

**Add files to Xcode**:
1. Open `.xcworkspace` (not `.xcodeproj`)
2. Right-click on project → "Add Files to..."
3. Select `DummyDetector.h`, `DummyDetector.mm`, `DummyDetectorModule.mm`
4. ✅ Check "Copy items if needed"
5. ✅ Check "Add to targets: YourApp"

**Configure header search paths**:
1. Select project in navigator
2. Build Settings → Search "Header Search Paths"
3. Add: `$(SRCROOT)/../node_modules/react-native/ReactCommon/jsi`
4. Set to "recursive"

**Link frameworks** (if not auto-linked):
1. Build Phases → Link Binary With Libraries
2. Click `+` → Add `libRCTJsi.a` (if available)

---

### iOS vs Android Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| **File extension** | `.mm` (Objective-C++) | `.cpp` (C++) |
| **Bridge layer** | Objective-C module | Kotlin/Java + JNI |
| **Runtime access** | `RCTCxxBridge.runtime` | `ReactContext.javaScriptContextHolder` |
| **Build system** | Xcode / CocoaPods | CMake / Gradle |
| **Module registration** | `RCT_EXPORT_MODULE()` | Manual JNI function |
| **Header includes** | `#import <jsi/jsi.h>` | `#include <jsi/jsi.h>` |
| **Null safety** | Objective-C `nil` checks | Kotlin null-safety (`?.`) |

---

### Advanced iOS Features

#### 1. Error Handling

**Throwing JavaScript errors from C++**:

```objectivec++
static Value detectObjects(Runtime &rt, const Value &thisVal, const Value *args, size_t argCount) {
  if (argCount < 2) {
    throw jsi::JSError(rt, "detectObjects requires at least 2 arguments");
  }
  
  if (!args[0].isNumber() || !args[1].isNumber()) {
    throw jsi::JSError(rt, "width and height must be numbers");
  }
  
  int width = (int)args[0].asNumber();
  int height = (int)args[1].asNumber();
  
  if (width <= 0 || height <= 0) {
    throw jsi::JSError(rt, "width and height must be positive");
  }
  
  return createMockDetections(rt);
}
```

**In JavaScript**:
```javascript
try {
  const detections = global.detectObjects("invalid", "args");
} catch (error) {
  console.error(error.message); // "width and height must be numbers"
}
```

#### 2. Async Operations with Dispatch Queues

**Problem**: Native operations might be slow (network, disk I/O, ML inference)

**Solution**: Use GCD (Grand Central Dispatch) to run on background thread

```objectivec++
static Value detectObjectsAsync(Runtime &rt, const Value &thisVal, const Value *args, size_t argCount) {
  // Get arguments on main thread
  int width = (int)args[0].asNumber();
  int height = (int)args[1].asNumber();
  
  // Create a promise
  auto promise = Promise(rt);
  auto promiseId = promise.getPromiseId(rt);
  
  // Run heavy work on background thread
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    // Simulate slow operation
    sleep(2);
    
    // Get result
    auto result = performHeavyDetection(width, height);
    
    // Resolve promise on JS thread
    dispatch_async(dispatch_get_main_queue(), ^{
      auto& rt = [self getRuntime]; // You'd need to store runtime
      promise.resolve(rt, result);
    });
  });
  
  return promise.asValue(rt);
}
```

**JavaScript usage**:
```javascript
const detections = await global.detectObjectsAsync(640, 480);
```

#### 3. Calling JavaScript from Native

**Scenario**: Native code needs to trigger JS callback

```objectivec++
// Store callback reference
static std::shared_ptr<jsi::Function> onDetectionCallback;

static Value setDetectionCallback(Runtime &rt, const Value &thisVal, const Value *args, size_t argCount) {
  if (argCount < 1 || !args[0].isObject() || !args[0].asObject(rt).isFunction(rt)) {
    throw jsi::JSError(rt, "First argument must be a function");
  }
  
  // Store the callback
  onDetectionCallback = std::make_shared<jsi::Function>(args[0].asObject(rt).asFunction(rt));
  
  return Value::undefined();
}

// Later, when detection happens:
void triggerDetection(Runtime &rt, const std::vector<Detection>& detections) {
  if (onDetectionCallback) {
    // Convert detections to JSI array
    auto arr = arrayFromDetections(rt, detections);
    
    // Call the JavaScript callback
    onDetectionCallback->call(rt, arr);
  }
}
```

**JavaScript**:
```javascript
global.setDetectionCallback((detections) => {
  console.log('Native triggered detection:', detections);
});
```

---

### Debugging iOS JSI Modules

#### 1. Enable C++ Exception Breakpoints

**In Xcode**:
1. Debug Navigator (⌘7)
2. Breakpoint Navigator
3. `+` → "Exception Breakpoint"
4. Type: "C++"
5. ✅ Check "Objective-C"

**Catches JSI errors immediately!**

#### 2. NSLog from C++

```objectivec++
#import <Foundation/Foundation.h>

static Value detectObjects(Runtime &rt, const Value &thisVal, const Value *args, size_t argCount) {
  NSLog(@"detectObjects called with %zu arguments", argCount);
  
  for (size_t i = 0; i < argCount; i++) {
    if (args[i].isNumber()) {
      NSLog(@"arg[%zu] = %f", i, args[i].asNumber());
    } else if (args[i].isString()) {
      std::string str = args[i].asString(rt).utf8(rt);
      NSLog(@"arg[%zu] = %s", i, str.c_str());
    }
  }
  
  return createMockDetections(rt);
}
```

**View logs**: Xcode Console or `log stream --predicate 'subsystem contains "YourApp"'`

#### 3. Inspect JSI Values

```objectivec++
void debugValue(Runtime &rt, const Value &val) {
  if (val.isUndefined()) {
    NSLog(@"Value is undefined");
  } else if (val.isNull()) {
    NSLog(@"Value is null");
  } else if (val.isBool()) {
    NSLog(@"Value is bool: %d", val.getBool());
  } else if (val.isNumber()) {
    NSLog(@"Value is number: %f", val.getNumber());
  } else if (val.isString()) {
    NSLog(@"Value is string: %s", val.getString(rt).utf8(rt).c_str());
  } else if (val.isObject()) {
    auto obj = val.getObject(rt);
    if (obj.isArray(rt)) {
      NSLog(@"Value is array with length: %zu", obj.getArray(rt).length(rt));
    } else if (obj.isFunction(rt)) {
      NSLog(@"Value is function");
    } else {
      NSLog(@"Value is object");
    }
  }
}
```

---

### Performance Optimization Tips

#### 1. Avoid String Copying

**Slow**:
```objectivec++
std::string str = args[0].asString(rt).utf8(rt); // Copies entire string
```

**Fast**:
```objectivec++
auto strValue = args[0].asString(rt);
size_t len = strValue.length(rt);
// Work with string reference, not copy
```

#### 2. Reuse JSI Objects

**Slow**:
```objectivec++
for (int i = 0; i < 1000; i++) {
  Object box(rt); // Creates 1000 objects
  box.setProperty(rt, "value", i);
}
```

**Fast**:
```objectivec++
Object box(rt); // Create once
for (int i = 0; i < 1000; i++) {
  box.setProperty(rt, "value", i); // Reuse same object
}
```

#### 3. Batch Property Sets

**Slow**:
```objectivec++
obj.setProperty(rt, "x", 10);
obj.setProperty(rt, "y", 20);
obj.setProperty(rt, "z", 30);
```

**Fast** (if you have many properties):
```objectivec++
// Use JS Object.assign or spread
auto props = Object(rt);
props.setProperty(rt, "x", 10);
props.setProperty(rt, "y", 20);
props.setProperty(rt, "z", 30);
// Then merge in single operation
```

---

### Common iOS-Specific Errors

#### 1. `ld: symbol(s) not found for architecture arm64`

**Cause**: Xcode can't find JSI headers/libraries

**Fix**:
```bash
cd ios
pod install
```

**Or** add to Podfile:
```ruby
pod 'React-jsi', :path => '../node_modules/react-native/ReactCommon/jsi'
```

#### 2. `'jsi/jsi.h' file not found`

**Fix in Xcode**:
1. Build Settings
2. Header Search Paths
3. Add: `$(SRCROOT)/../node_modules/react-native/ReactCommon` (recursive)

#### 3. `Undefined symbols: _OBJC_CLASS_$_RCTCxxBridge`

**Cause**: Using private API without proper imports

**Fix**: Add to imports:
```objectivec++
#import <React/RCTBridge+Private.h>
#import <ReactCommon/RCTTurboModule.h>
```

#### 4. Module not found in JavaScript

**Cause**: Module not registered or JSI install failed silently

**Debug**:
```objectivec++
- (void)installJSI {
  NSLog(@"Installing JSI module...");
  RCTCxxBridge *cxxBridge = (RCTCxxBridge *)self.bridge;
  if (!cxxBridge.runtime) {
    NSLog(@"ERROR: Runtime is nil!");
    return;
  }
  NSLog(@"Runtime available, installing...");
  jsi::Runtime *runtime = (jsi::Runtime *)cxxBridge.runtime;
  InstallDummyDetector(runtime);
  NSLog(@"JSI module installed successfully");
}
```

---

### iOS Summary

**What we covered**:
- ✅ Objective-C++ bridge layer (`.mm` files)
- ✅ JSI Runtime access via `RCTCxxBridge`
- ✅ Module registration with `RCT_EXPORT_MODULE()`
- ✅ Error handling with `jsi::JSError`
- ✅ Async operations with GCD
- ✅ Debugging techniques
- ✅ Performance optimizations
- ✅ Common errors and solutions

**Key takeaway**: iOS JSI is simpler than Android (no JNI layer) but requires understanding Objective-C++ interop and React Native's private APIs.

---
