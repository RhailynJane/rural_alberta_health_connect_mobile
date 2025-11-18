import React from 'react';
import { Camera, useFrameProcessor } from 'react-native-vision-camera';

// Register the plugin somewhere early in the app (import the plugin file)
import './vision-camera-detection-plugin';

export default function FrameProcessorExample() {
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    // Call the frame processor plugin we registered named 'detectNativeObjects'
    const detections = (global as any).detectNativeObjects(frame);
    return detections;
  }, []);

  return (
    <Camera
      style={{ flex: 1 }}
      device={'back'}
      isActive={true}
      frameProcessor={frameProcessor}
      frameProcessorFps={5}
    />
  );
}
