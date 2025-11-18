import { registerFrameProcessorPlugin } from 'react-native-vision-camera';

// This registers a sample frame-processor plugin that calls the global JSI
// `detectObjects(width, height, data)` method. To enable zero-copy detection
// you will want to pass a native buffer pointer or the frame object directly
// into the native JSI function — this example passes width/height only so it is
// a simple demonstration for the PoC.

registerFrameProcessorPlugin('detectNativeObjects', ({ frame }) => {
  'worklet';

  try {
    // `frame` is the VisionCamera Frame object. To do zero-copy you must
    // expose native buffer to the JSI method and accept it on the C++ side.
    // For PoC, we pass just the width / height.
    return (global as any).detectObjects(frame.width, frame.height, null);
  } catch (e) {
    // If JSI isn't installed we return an empty array.
    return [];
  }
});

export { };

