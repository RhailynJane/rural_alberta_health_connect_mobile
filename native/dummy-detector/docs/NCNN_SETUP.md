# NCNN Integration (POC)

This documents how to wire a minimal NCNN wrapper into the dummy JSI detector.

1. Clone NCNN and build static library for Android/iOS. For Android a typical approach is:

   git clone https://github.com/Tencent/ncnn.git
   cd ncnn
   mkdir build && cd build
   cmake -DANDROID_ABI=arm64-v8a -DANDROID_NDK=/path/to/ndk -DCMAKE_TOOLCHAIN_FILE=/path/to/ndk/build/cmake/android.toolchain.cmake ..
   make -j8

   This produces `libncnn.a` and headers under `include/`.

2. Update CMake flags when building the PoC

   If building with CMake directly (Gradle does this), add:

   -DUSE_NCNN=ON -DNCNN_LIB=/absolute/path/to/libncnn.a -DNCNN_INCLUDE=/absolute/path/to/ncnn/include

   Example using Gradle: open `android/app/build.gradle` and add the following to your `defaultConfig` block or to the `cmake` block to pass CMake arguments:

```
externalNativeBuild {
  cmake {
    arguments '-DUSE_NCNN=ON', '-DNCNN_LIB=/absolute/path/to/libncnn.a', '-DNCNN_INCLUDE=/absolute/path/to/ncnn/include'
  }
}
```

This will instruct CMake to enable NCNN when building with Gradle. You may need to adapt the ABI and NDK options to your environment.

3. Add model files (.param and .bin) to your app assets or set `param` and `bin` absolute paths before calling `detectObjects` with buffer.

4. Replace toy path with real inference: update `DummyDetector.cpp` to call `s_ncnn.forward` giving it `rgba` pointer and width/height. NCNN wrapper should return bounding boxes.

5. Example usage from JS:

```ts
import { loadModel, detectObjects } from '@rahc/dummy-detector/js/Detector';

const ok = loadModel('/data/user/0/com.app/files/model.param', '/data/user/0/com.app/files/model.bin');
if (ok) {
  const detections = detectObjects(640, 480, null); // or pass a native pointer
}
```


Notes:
- The wrapper here is intentionally minimal and will only compile into the PoC binary if `USE_NCNN` is turned on and NCNN libs/headers are accessible to CMake.
- This helps keep the PoC small and easier to compile in CI. Add NCNN to CI if you want to build with the real engine.
