# Install & Use

This guide shows how to wire the Dummy detector JSI into Android and iOS. This is a small PoC — your real inference module will follow the same pattern.

Android (Kotlin)

1. Add this module as a subproject or copy `native/dummy-detector/android` into `android/` and update `settings.gradle` to include it.
2. Make sure the CMake building is enabled. In `android/app/build.gradle`, add to `android` section:

```gradle
externalNativeBuild {
  cmake {
    path "../native/dummy-detector/android/src/main/cpp/CMakeLists.txt"
  }
}
```

3. After React Native runtime is started, call the installer to register the JSI function: 

In `MainApplication.kt` add (after `loadReactNative(this)` or when React context is available):

```kotlin
import com.amirzhou.rahcapp.DummyDetectorInstaller

// ... inside onCreate or when ReactContext is available
val ctx = reactNativeHost.reactInstanceManager.currentReactContext
if (ctx != null) {
  DummyDetectorInstaller.installJSI(ctx)
} else {
  reactNativeHost.reactInstanceManager.addReactInstanceEventListener { reactContext ->
    DummyDetectorInstaller.installJSI(reactContext as ReactApplicationContext)
  }
}
```

4. Rebuild and run. JS should now have a global `detectObjects` function.

iOS

1. Add `DummyDetector.mm` to your Xcode project and make sure it is compiled as Objective-C++.
2. Add a small header to import the Install function (see the file):

```objc
#ifdef __cplusplus
extern "C" {
#endif
  void InstallDummyDetector(jsi::Runtime *rt);
#ifdef __cplusplus
}
#endif
```

3. Call this when the RN runtime becomes available (AppDelegate).

```objc
#import "DummyDetector.h"
#import <React/RCTCxxBridge.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
 // ... normal init
 RCTCxxBridge *cxxBridge = (RCTCxxBridge *)bridge;
 if (cxxBridge != nil) {
   void *runtimePtr = cxxBridge.runtime;
   InstallDummyDetector((jsi::Runtime *)runtimePtr);
 }
}
```

Caveat: `RCTCxxBridge` internals may change and you must include proper headers from React Native's C++ headers. The above is a conceptual example; consult RN new architecture docs.

JS usage

```ts
import detectObjects from "native/dummy-detector/js/Detector";
const boxes = detectObjects(640, 480, null);
console.log(boxes);
```


This PoC demonstrates how to register a JSI function `detectObjects` — the next step is to replace the mock in `DummyDetector.cpp` with actual inference code (ncnn/MNN), buffer conversion, and postprocessing.

Building the Android native library

Run the Gradle task to build the app including the native C++ artifact (arm64-v8a ABI by default):

```powershell
cd android
./gradlew assembleDebug
```

This will run CMake (see `native/dummy-detector/android/src/main/cpp/CMakeLists.txt`) and produce `libdummy-detector.so` placed into the APK for the selected ABIs. If you need to restrict ABIs, set `abiFilters` in `defaultConfig` or your `app` level `build.gradle`.
