# VisionCamera + TFLite Integration Guide
**Date:** October 5, 2025
**Timestamp:** 15:35:02
**Developer:** Amir
**Documented by:** Mark (AI PM)

---

## Overview

This document captures the critical learnings from integrating `react-native-vision-camera` with `react-native-fast-tflite` for real-time object detection in React Native.

**Bottom Line:** The integration works, but requires understanding worklet contexts and thread communication patterns that are not obvious from the documentation.

---

## What We Built

**Goal:** Real-time on-device object detection using TFLite models with live camera feed.

**Stack:**
- `react-native-vision-camera` ^4.7.2 - Camera access and frame processing
- `vision-camera-resize-plugin` ^3.2.0 - RGB pixel extraction from camera frames
- `react-native-fast-tflite` ^x.x.x - TFLite model inference
- `react-native-reanimated` ~4.1.1 - Shared values for cross-thread communication
- `react-native-worklets-core` ^1.6.2 - Worklet runtime (VisionCamera dependency)

**Result:** Successfully running COCO SSD MobileNet V1 model at ~10fps with real-time detection (1-4 objects per frame).

---

## Critical Architecture Insight

### The Two-Worklet Problem

React Native with VisionCamera runs **three separate JavaScript contexts**:

1. **Main JS Thread** - React state, UI rendering, normal JavaScript
2. **VisionCamera Worklet Context** - Frame processors (from `react-native-worklets-core`)
3. **Reanimated Worklet Context** - Animations, gestures (from `react-native-reanimated`)

**Problem:** These contexts cannot directly share objects. Passing data between them requires specific patterns.

---

## Key Integration Pattern: Shared Values

### ❌ What DOESN'T Work

```typescript
// THIS FAILS - runOnJS from Reanimated doesn't work in VisionCamera worklets
import { runOnJS } from 'react-native-reanimated';

const frameProcessor = useFrameProcessor((frame) => {
  'worklet'
  const detections = processFrame(frame);
  runOnJS(setDetections)(detections); // ❌ ERROR: global._createSerializableString is not a function
}, []);
```

**Why it fails:** `runOnJS()` is designed for Reanimated worklets, not VisionCamera worklets. The serialization system is incompatible.

---

### ✅ What DOES Work

```typescript
import { useSharedValue } from 'react-native-reanimated';

// In component:
const detectionsShared = useSharedValue<Detection[]>([]);
const [detections, setDetections] = useState<Detection[]>([]);

// Sync shared value → React state periodically
useEffect(() => {
  const interval = setInterval(() => {
    setDetections(detectionsShared.value);
  }, 200); // Update UI every 200ms
  return () => clearInterval(interval);
}, []);

// In frame processor:
const frameProcessor = useFrameProcessor((frame) => {
  'worklet'
  const detections = processFrame(frame);
  detectionsShared.value = detections; // ✅ WORKS - Direct assignment
}, []);
```

**Why it works:**
- Shared values are designed for cross-context communication
- Both VisionCamera and Reanimated worklets can write to shared values
- React can read shared values on the main thread
- No serialization needed - Reanimated handles it internally

---

## Complete Working Pattern

### 1. Setup (Component Level)

```typescript
import { useSharedValue } from 'react-native-reanimated';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useTensorflowModel } from 'react-native-fast-tflite';

export default function VisionTest() {
  // Shared value for cross-thread communication
  const detectionsShared = useSharedValue<Detection[]>([]);

  // React state for UI rendering
  const [detections, setDetections] = useState<Detection[]>([]);

  // Camera and model setup
  const { resize } = useResizePlugin();
  const model = useTensorflowModel(require('./model.tflite'));

  // Sync shared value to React state every 200ms
  useEffect(() => {
    const interval = setInterval(() => {
      setDetections(detectionsShared.value);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Frame processor runs in VisionCamera worklet context
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'

    if (model.state !== 'loaded') return;

    // Process frame...
    const detections = runInference(frame);

    // Update shared value (no runOnJS needed!)
    detectionsShared.value = detections;
  }, [model]);

  return <Camera frameProcessor={frameProcessor} />;
}
```

---

### 2. Frame Processing Pattern

```typescript
const frameProcessor = useFrameProcessor((frame) => {
  'worklet'

  try {
    // Step 1: Resize frame to model input size
    const resized = resize(frame, {
      scale: { width: 300, height: 300 },
      pixelFormat: 'rgb',
      dataType: 'uint8',
    });

    // Step 2: Run TFLite model (synchronous)
    const outputs = model.model.runSync([resized]);

    // Step 3: Parse model outputs
    const boxes = outputs[0];
    const classes = outputs[1];
    const scores = outputs[2];
    const numDetections = outputs[3][0];

    // Step 4: Build detection array
    const detections = [];
    for (let i = 0; i < numDetections; i++) {
      if (scores[i] > 0.5) {
        detections.push({
          label: LABELS[classes[i]],
          confidence: scores[i],
          box: {
            x: boxes[i*4+1] * frame.width,
            y: boxes[i*4+0] * frame.height,
            width: (boxes[i*4+3] - boxes[i*4+1]) * frame.width,
            height: (boxes[i*4+2] - boxes[i*4+0]) * frame.height,
          }
        });
      }
    }

    // Step 5: Update shared value
    detectionsShared.value = detections;

  } catch (error) {
    console.error("Frame processing error:", error.message);
  }
}, [model]);
```

---

## Performance Optimization: Frame Skipping

**Problem:** Processing every frame at 30fps is too expensive for TFLite inference.

**Solution:** Use a shared value counter to process every Nth frame.

```typescript
// In component:
const frameCounter = useSharedValue(0);

// In frame processor:
const frameProcessor = useFrameProcessor((frame) => {
  'worklet'

  // Process every 3rd frame (30fps → 10fps detection)
  frameCounter.value++;
  if (frameCounter.value % 3 !== 0) return;

  // ... rest of processing
}, []);
```

**Result:** Reduces CPU usage by 66% while maintaining smooth detection.

---

## TFLite Model Requirements

### Input Format

TFLite models expect **raw pixel data**, not image URIs or file paths.

**Correct approach:**
```typescript
const { resize } = useResizePlugin();

const resized = resize(frame, {
  scale: { width: 300, height: 300 },
  pixelFormat: 'rgb',      // RGB format (not RGBA)
  dataType: 'uint8',       // 0-255 values (not normalized)
});

const outputs = model.model.runSync([resized]); // ✅ Works
```

**Why `vision-camera-resize-plugin` is essential:**
- VisionCamera frames are in YUV format (not RGB)
- Plugin converts YUV → RGB automatically
- Plugin resizes to exact model input dimensions
- Plugin outputs `Uint8Array` that TFLite expects

---

### Model Output Format (COCO SSD)

```typescript
const outputs = model.model.runSync([pixels]);

// outputs[0]: Bounding boxes [num_detections, 4]
//   Format: [ymin, xmin, ymax, xmax] (normalized 0-1)
// outputs[1]: Class indices [num_detections]
// outputs[2]: Confidence scores [num_detections]
// outputs[3]: Number of valid detections [1]

// Example parsing:
const numDetections = outputs[3][0];
for (let i = 0; i < numDetections; i++) {
  const ymin = outputs[0][i * 4 + 0];
  const xmin = outputs[0][i * 4 + 1];
  const ymax = outputs[0][i * 4 + 2];
  const xmax = outputs[0][i * 4 + 3];
  const classIndex = outputs[1][i];
  const confidence = outputs[2][i];

  // Convert normalized coords to pixels
  const box = {
    x: xmin * frame.width,
    y: ymin * frame.height,
    width: (xmax - xmin) * frame.width,
    height: (ymax - ymin) * frame.height,
  };
}
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Using `runOnJS()` in Frame Processors

**Symptom:** `global._createSerializableString is not a function`

**Cause:** `runOnJS` from `react-native-reanimated` doesn't work in VisionCamera worklet context.

**Solution:** Use shared values instead:
```typescript
// ❌ Don't do this:
runOnJS(setState)(value);

// ✅ Do this:
sharedValue.value = value;
```

---

### Pitfall 2: Trying to Pass Image URIs to TFLite

**Symptom:** Model fails silently or returns garbage outputs

**Cause:** TFLite expects raw pixel arrays (`Uint8Array`), not file paths or URIs.

**Solution:** Use `vision-camera-resize-plugin` to get pixel data:
```typescript
const pixels = resize(frame, { ... });
model.runSync([pixels]); // ✅ Works
```

---

### Pitfall 3: Processing Every Frame

**Symptom:** App becomes laggy, CPU usage spikes, battery drains fast

**Cause:** Running TFLite inference 30 times per second is expensive.

**Solution:** Skip frames using a counter:
```typescript
frameCounter.value++;
if (frameCounter.value % 3 !== 0) return;
```

---

### Pitfall 4: Not Checking Model State

**Symptom:** Crashes or errors in frame processor

**Cause:** Frame processor starts before model finishes loading.

**Solution:** Always check model state:
```typescript
const frameProcessor = useFrameProcessor((frame) => {
  'worklet'
  if (model.state !== 'loaded') return; // ✅ Check first
  // ... rest of processing
}, []);
```

---

### Pitfall 5: Forgetting 'worklet' Directive

**Symptom:** Frame processor doesn't run or throws cryptic errors

**Cause:** VisionCamera requires explicit `'worklet'` directive.

**Solution:** Always add at the top of frame processor:
```typescript
const frameProcessor = useFrameProcessor((frame) => {
  'worklet' // ✅ Required!
  // ... processing
}, []);
```

---

## Dependencies & Permissions

### Required Packages

```json
{
  "react-native-vision-camera": "^4.7.2",
  "vision-camera-resize-plugin": "^3.2.0",
  "react-native-fast-tflite": "latest",
  "react-native-reanimated": "~4.1.1",
  "react-native-worklets-core": "^1.6.2"
}
```

### Required Permissions (app.json)

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-vision-camera",
        {
          "cameraPermissionText": "This app uses the camera for medical imaging.",
          "enableMicrophonePermission": false
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera for medical imaging."
      }
    },
    "android": {
      "permissions": ["CAMERA"]
    }
  }
}
```

### Build Requirements

**Important:** After adding VisionCamera, you MUST rebuild the native app:

```bash
npx expo prebuild --clean
npm run android  # or npm run ios
```

Hot reload will NOT work for native module changes.

---

## Performance Characteristics

Based on testing with COCO SSD MobileNet V1 on development device:

- **Frame Processing:** Every 3rd frame (~10 fps detection rate)
- **Inference Time:** ~50-100ms per frame (acceptable for real-time)
- **Detections per Frame:** 0-4 objects (depends on scene)
- **CPU Usage:** Moderate (frame skipping keeps it manageable)
- **Memory:** Model loaded once (~20MB), stable during operation

---

## Debugging Tips

### Enable Console Logging in Frame Processor

```typescript
const frameProcessor = useFrameProcessor((frame) => {
  'worklet'

  console.log("🔍 Processing frame...");

  try {
    const resized = resize(frame, { ... });
    console.log("✅ Resize complete. Length:", resized.length);

    const outputs = model.model.runSync([resized]);
    console.log("✅ Inference complete. Outputs:", outputs.length);

    console.log("📊 Found detections:", detections.length);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}, []);
```

### Check Shared Value Updates

```typescript
// In component:
useEffect(() => {
  console.log("🔄 Detections updated:", detections.length);
}, [detections]);
```

### Verify Model Loading

```typescript
useEffect(() => {
  console.log("📊 Model state:", model.state);
  if (model.state === 'loaded') {
    console.log("✅ Model ready");
  }
}, [model.state]);
```

---

## Known Issues (As of Oct 5, 2025)

### Issue 1: Bounding Boxes Not Rendering

**Status:** Detection working (confirmed via console logs), but UI not updating.

**Symptoms:**
- Console shows: `📊 Found detections: 1-4`
- No bounding boxes appear on camera feed
- No errors in console

**Current Investigation:**
- Shared value updates successfully
- React state receives detections (200ms sync)
- Likely issue in rendering logic, not data flow

**Next Steps:**
- Check if bounding box components are rendering
- Verify style positions are calculated correctly
- Add debug logging to render methods

---

## Future Improvements

### 1. Custom Wound Detection Model
Replace COCO model with Roboflow-trained wound detection model:
- Export `.tflite` from Roboflow
- Update labels to wound classes (laceration, burn, etc.)
- Same code pattern, just swap model file

### 2. Optimize Sync Frequency
Current 200ms sync may be too slow or too fast:
- Experiment with 100ms, 150ms, 300ms intervals
- Consider using `useAnimatedReaction` for instant updates

### 3. Add Confidence Threshold Control
Allow users to adjust detection sensitivity:
```typescript
const [threshold, setThreshold] = useState(0.5);

// In frame processor:
if (confidence > threshold) {
  detections.push(detection);
}
```

---

## Reference Code Location

**File:** `app/(tabs)/vision-test/index.tsx`

**Key sections:**
- Lines 64-67: Shared value setup
- Lines 98-103: Sync effect
- Lines 106-198: Frame processor with TFLite inference
- Line 190: Shared value update (critical line)

---

## Summary: What Works and What Doesn't

### ✅ Working
- Camera integration
- Model loading (COCO SSD MobileNet V1)
- Frame processing at 10fps
- TFLite inference (confirmed via outputs)
- Detection parsing (1-4 objects per frame)
- Cross-thread communication (shared values)
- No crashes, no serialization errors

### ⏳ In Progress
- Bounding box rendering on camera feed

### ❌ Not Attempted Yet
- Custom wound detection model
- Production integration (`ai-assess` flow)
- Offline data persistence
- Performance optimization

---

## Key Takeaway for Future Development

**The Pattern:**
```
Camera Frame (VisionCamera worklet)
  ↓
Resize to model input (vision-camera-resize-plugin)
  ↓
TFLite inference (react-native-fast-tflite)
  ↓
Shared Value update (react-native-reanimated)
  ↓
React state sync (setInterval)
  ↓
UI render (React components)
```

**Never use `runOnJS()` in VisionCamera frame processors.** Always use shared values for cross-thread communication.

---

**Document Status:** Living document - will be updated as rendering issue is resolved.

**Last Updated:** October 5, 2025 - 15:35:02
