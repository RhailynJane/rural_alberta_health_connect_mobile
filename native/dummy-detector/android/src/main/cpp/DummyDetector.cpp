#include <jsi/jsi.h>
#include <jni.h>
#include <string>
#include "ncnn_wrapper.h"
#include <algorithm>
#include <cmath>
#include <cstddef>

// Avoid 'using namespace' to keep IntelliSense quiet; refer to facebook::jsi::* explicitly.

// Helper string conversions are intentionally omitted for the POC.

// A very small helper that returns 1 mock detection.
// A tiny toy CPU "inference" function — not machine learning, but a quick
// native-side computation to simulate per-frame work.
// - If width*height > 200k, return a centered bounding box scaled to the
//   frame size. Otherwise return an empty array.
static facebook::jsi::Value createToyDetections(facebook::jsi::Runtime &rt, int width, int height) {
  facebook::jsi::Array arr(rt, 0);
  if (width * height < 200000) {
    return arr; // No detections for very small frames.
  }

  facebook::jsi::Object box(rt);
  // Produce a centered box with a size proportional to the frame size.
  double cx = 0.5;
  double cy = 0.5;
  double invW = 1.0 / std::max(1, width);
  double invH = 1.0 / std::max(1, height);
  double w = std::min(0.5, 320.0 * invW);
  double h = std::min(0.5, 240.0 * invH);

  box.setProperty(rt, "x1", cx - w / 2);
  box.setProperty(rt, "y1", cy - h / 2);
  box.setProperty(rt, "x2", cx + w / 2);
  box.setProperty(rt, "y2", cy + h / 2);
  double score = 0.48 + std::min(width * height / 1000000.0, 0.5);
  box.setProperty(rt, "score", score);
  box.setProperty(rt, "label", "toy_object");

  arr = facebook::jsi::Array(rt, 1);
  arr.setValueAtIndex(rt, 0, box);
  return arr;
}

// Optional bridge for calling NCNN if available via CMake option
static NCNNWrapper s_ncnn;

static bool tryLoadModel(const char *paramFile, const char *binFile) {
  return s_ncnn.loadModel(paramFile ? std::string(paramFile) : "", binFile ? std::string(binFile) : "");
}

// Host function: detectObjects(width, height, imageUint8Array /*optional*/)
static auto detectObjects(facebook::jsi::Runtime &rt, const facebook::jsi::Value &thisVal, const facebook::jsi::Value *args, size_t argCount) -> facebook::jsi::Value {
  // Accept arguments but ignore them for now.
  (void)thisVal;

  int width = 640;
  int height = 480;
  if (argCount >= 2 && args[0].isNumber() && args[1].isNumber()) {
    width = (int)args[0].asNumber();
    height = (int)args[1].asNumber();
  }

  // If NCNN model was loaded and data provided (args[2]), try to run a forward pass.
  if (args && argCount >= 3 && args[2].isNull() == false) {
    // In a real path, args[2] would be a native pointer/TypedArray to image buffer.
    // For now, we call the toy inference unless NCNN is available and we have a RGBA buffer.
    // Since this is a PoC, we simply return the toy output.
  }

  return createToyDetections(rt, width, height);
}

static void install(facebook::jsi::Runtime &rt) {
  auto name = facebook::jsi::PropNameID::forAscii(rt, "detectObjects");
  auto fn = facebook::jsi::Function::createFromHostFunction(rt, name, 3, [](facebook::jsi::Runtime &rt, const facebook::jsi::Value &thisVal, const facebook::jsi::Value *args, size_t count) -> facebook::jsi::Value {
    return detectObjects(rt, thisVal, args, count);
  });
  rt.global().setProperty(rt, name, fn);

  // Add a helper to load a NCNN model: loadModel(paramPath, binPath)
  auto loadName = facebook::jsi::PropNameID::forAscii(rt, "loadDetectionModel");
  auto loadFn = facebook::jsi::Function::createFromHostFunction(rt, loadName, 2, [](facebook::jsi::Runtime &rt, const facebook::jsi::Value &thisVal, const facebook::jsi::Value *args, size_t count) -> facebook::jsi::Value {
    if (count < 2 || !args[0].isString() || !args[1].isString()) {
      return facebook::jsi::Value(false);
    }
    std::string param = args[0].asString(rt).utf8(rt);
    std::string bin = args[1].asString(rt).utf8(rt);
    bool ok = tryLoadModel(param.c_str(), bin.c_str());
    return facebook::jsi::Value(ok);
  });
  rt.global().setProperty(rt, loadName, loadFn);
}

// JNI wrapper used by Java/Kotlin to pass the runtime pointer.
#ifdef __ANDROID__
extern "C" JNIEXPORT void JNICALL
Java_com_amirzhou_rahcapp_DummyDetectorInstaller_install(JNIEnv *env, jclass /*clazz*/, jlong runtimePtr) {
  facebook::jsi::Runtime *rt = reinterpret_cast<facebook::jsi::Runtime *>(runtimePtr);
  install(*rt);
}
#endif
