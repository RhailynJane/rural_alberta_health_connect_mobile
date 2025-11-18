import React, { useState } from 'react';
import { Button, Text, View } from 'react-native';
import detectObjects from '../../../native/dummy-detector/js/Detector';

export default function DummyDetectorTest() {
  const [detections, setDetections] = useState<any[]>([]);

  const runTest = () => {
    const d = detectObjects(640, 480, null);
    setDetections(d);
  };

  return (
    <View style={{padding: 20}}>
      <Button title="Run dummy detector" onPress={runTest} />
      {detections.map((det, i) => (
        <Text key={i}>{`${det.label}: ${det.score.toFixed(2)} [${det.x1},${det.y1},${det.x2},${det.y2}]`}</Text>
      ))}
    </View>
  );
}
