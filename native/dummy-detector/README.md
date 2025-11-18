# Dummy Detector (JSI) — Proof of concept

This module implements a tiny JSI-native PoC to demonstrate how to expose a C++ function
from native code into JavaScript for the React Native New Architecture.

It is intentionally minimal: the native function returns a mocked bounding box.

Usage steps (Android/iOS):
1. Build native library using CMake (Android) or add `DummyDetector.mm` to the iOS project.
2. Call the `install` function from app initialization code and pass the JS runtime pointer.
3. In JS, call `detectObjects(width, height, imageData)` — returns mock detections.

See docs in this repo and the commented code for platform-specific details.

Note: this is a proof of concept — you will replace the dummy code with real inference logic.
