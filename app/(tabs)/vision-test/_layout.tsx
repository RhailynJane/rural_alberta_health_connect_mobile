import { Stack } from 'expo-router';
import React from 'react';
import { VisionSessionProvider } from './VisionSessionContext';

export default function VisionTestLayout() {
  return (
    <VisionSessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="camera" />
        <Stack.Screen name="review" />
      </Stack>
    </VisionSessionProvider>
  );
}
