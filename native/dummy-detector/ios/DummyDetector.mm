#import <jsi/jsi.h>
#import <Foundation/Foundation.h>

using namespace facebook;
using namespace jsi;

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

static Value detectObjects(Runtime &rt, const Value &thisVal, const Value *args, size_t argCount) {
  (void)thisVal;
  (void)args;
  (void)argCount;
  return createMockDetections(rt);
}

extern "C" void InstallDummyDetector(jsi::Runtime *rt) {
  auto name = jsi::PropNameID::forAscii(*rt, "detectObjects");
  auto fn = jsi::Function::createFromHostFunction(*rt, name, 3, [](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
    return detectObjects(rt, thisVal, args, count);
  });
  rt->global().setProperty(*rt, name, fn);
}
