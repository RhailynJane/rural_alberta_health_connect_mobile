# Skia + TFLite Real-Time Detection - Handoff Document

**Created:** 2025-10-05 17:15:00
**Status:** ✅ Detection Working - Boxes Flicker (Fix Needed)
**Next Agent:** Continue from here

---

## Current Status: HUGE SUCCESS! 🎉

### What's Working ✅

1. **Skia Frame Processors:** Fully functional
   - GPU-accelerated rendering confirmed
   - Drawing to camera frames works
   - minSdkVersion set to 26 (HardwareBuffer support)

2. **TFLite Object Detection:** Fully functional
   - COCO SSD MobileNetV1 model loaded successfully
   - Real-time inference running at 10 FPS
   - Detections being generated correctly

3. **Bounding Box Rendering:** Partially working
   - **Red boxes appear on detected objects** ✅
   - Color-coded by object category (red=person, teal=vehicle, etc.)
   - Label backgrounds render correctly
   - **Issue:** Boxes only visible for 1 frame, then disappear (flicker)

### What Needs Fixing ❌

**Problem:** Bounding boxes flicker (appear for 1 frame, disappear for ~9 frames)

**Root Cause:**
```typescript
// Current implementation (lines 89-171)
const frameProcessor = useSkiaFrameProcessor((frame) => {
  'worklet'

  frame.render(); // Clears canvas (runs at 30-60 FPS)

  runAtTargetFps(10, () => {  // Only runs every 10th frame
    'worklet'
    // Resize frame
    // Run TFLite inference
    // Parse detections
    // Draw boxes ← ONLY HAPPENS ON 10% OF FRAMES
  });
}, [model, resize]);
```

**Why This Happens:**
1. `frame.render()` runs at **30-60 FPS** (clears canvas every frame)
2. `runAtTargetFps(10, ...)` throttles detection to **10 FPS** (every 10th frame)
3. Boxes only drawn inside the throttled block
4. Result: Boxes visible on Frame 1, 10, 20, 30... but cleared on all other frames

---

## Solution: Cache Detections & Draw Every Frame

### Architecture Change Needed

**Current Flow:**
```
Frame 1:  render() → detect() → draw boxes ✅
Frame 2:  render() → [skipped]  → no boxes ❌
Frame 3:  render() → [skipped]  → no boxes ❌
...
Frame 10: render() → detect() → draw boxes ✅ (flickers)
```

**Target Flow:**
```
Frame 1:  render() → detect() → cache results → draw boxes ✅
Frame 2:  render() → [skip detection] → draw cached boxes ✅
Frame 3:  render() → [skip detection] → draw cached boxes ✅
...
Frame 10: render() → detect() → update cache → draw boxes ✅
```

### Implementation Plan

**Step 1: Create Shared Value for Detections**

```typescript
import { useSharedValue } from 'react-native-reanimated';

// Add before frameProcessor (line ~78)
const cachedDetections = useSharedValue<Array<{
  label: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}>>([]);
```

**Step 2: Restructure Frame Processor**

```typescript
const frameProcessor = useSkiaFrameProcessor((frame) => {
  'worklet'

  // STEP 1: Render camera frame
  frame.render();

  // STEP 2: Run detection at 10 FPS (update cache)
  if (model.state === 'loaded') {
    runAtTargetFps(10, () => {
      'worklet'

      try {
        // Resize frame
        const resized = resize(frame, {
          scale: { width: 300, height: 300 },
          pixelFormat: 'rgb',
          dataType: 'uint8',
        });

        // Run TFLite inference
        const outputs = model.model.runSync([resized]);

        // Parse outputs
        const boxes = outputs[0];
        const classes = outputs[1];
        const scores = outputs[2];
        const numDetections = Math.min(Number(outputs[3][0]) || 10, 10);

        // Build detection array
        const newDetections = [];

        for (let i = 0; i < numDetections; i++) {
          const confidence = Number(scores[i]);

          if (confidence > 0.5) {
            const classIndex = Math.round(Number(classes[i]));
            const label = COCO_LABELS[classIndex] || `Class ${classIndex}`;

            // Boxes are normalized [ymin, xmin, ymax, xmax]
            const ymin = Number(boxes[i * 4 + 0]);
            const xmin = Number(boxes[i * 4 + 1]);
            const ymax = Number(boxes[i * 4 + 2]);
            const xmax = Number(boxes[i * 4 + 3]);

            // Convert to pixel coordinates
            const x = xmin * frame.width;
            const y = ymin * frame.height;
            const width = (xmax - xmin) * frame.width;
            const height = (ymax - ymin) * frame.height;

            newDetections.push({
              label,
              color: getColorForClass(label),
              x,
              y,
              width,
              height,
            });
          }
        }

        // UPDATE CACHE (this happens at 10 FPS)
        cachedDetections.value = newDetections;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Detection error:", errorMessage);
      }
    });
  }

  // STEP 3: Draw boxes EVERY frame using cached detections (runs at 30-60 FPS)
  const detections = cachedDetections.value;

  for (const detection of detections) {
    // Draw bounding box
    const rect = Skia.XYWHRect(detection.x, detection.y, detection.width, detection.height);
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(detection.color));
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(3);
    frame.drawRect(rect, paint);

    // Draw label background
    const labelHeight = 25;
    const labelWidth = 150;
    const labelBgRect = Skia.XYWHRect(detection.x, detection.y - labelHeight, labelWidth, labelHeight);
    const labelBgPaint = Skia.Paint();
    labelBgPaint.setColor(Skia.Color(detection.color));
    labelBgPaint.setStyle(PaintStyle.Fill);
    frame.drawRect(labelBgRect, labelBgPaint);
  }

}, [model, resize]);
```

**Step 3: Add Dependency**

Update frame processor dependencies:
```typescript
}, [model, resize, cachedDetections]); // Add cachedDetections
```

---

## Files Modified

### Primary Changes

**File:** `app/(tabs)/vision-test/index.tsx`
- Lines 1-48: Imports, COCO labels, color map (with `'worklet'` directive)
- Lines 50-77: State management, model loading
- Lines 79-171: **Frame processor (NEEDS RESTRUCTURING)**
- Lines 173-181: Button handlers
- Lines 183-267: Loading/error screens
- Lines 269-435: Camera UI and controls
- Lines 437-606: Styles

### Supporting Changes

**File:** `app.json`
- Added `expo-build-properties` plugin with `minSdkVersion: 26`

**File:** `package.json`
- Added `expo-build-properties: ~1.0.9`
- Already has `@shopify/react-native-skia: ^2.3.0`

---

## Key Technical Details

### TFLite Model

- **Model:** COCO SSD MobileNetV1
- **Location:** `assets/models/coco_ssd_mobilenet_v1.tflite`
- **Labels:** `assets/models/coco_labels.json`
- **Input:** 300×300 RGB uint8
- **Outputs:**
  - `[0]`: Bounding boxes [1, num_detections, 4] - normalized [ymin, xmin, ymax, xmax]
  - `[1]`: Class indices [1, num_detections]
  - `[2]`: Confidence scores [1, num_detections]
  - `[3]`: Number of valid detections [1]

### Skia Frame Processor

- **Hook:** `useSkiaFrameProcessor` (from `react-native-vision-camera`)
- **Required:** `frame.render()` must be called first
- **Coordinate System:** (0,0) = top-left, (frame.width, frame.height) = bottom-right
- **Drawing APIs:**
  - `Skia.XYWHRect(x, y, width, height)` - Create rectangle
  - `Skia.Paint()` - Create paint object
  - `paint.setColor(Skia.Color('red'))` - Set color
  - `paint.setStyle(PaintStyle.Stroke | Fill)` - Outline or fill
  - `frame.drawRect(rect, paint)` - Draw rectangle

### Performance

- **Frame rate:** Camera runs at 30-60 FPS
- **Detection rate:** Throttled to 10 FPS via `runAtTargetFps(10, ...)`
- **Render rate:** Should be 30-60 FPS (after fix)

---

## Testing Checklist

After implementing the fix:

- [ ] Camera opens successfully
- [ ] Model loads (see "COCO Model Ready ✅")
- [ ] Point at yourself → Red "person" box appears
- [ ] **Box stays visible continuously** (not flickering)
- [ ] Point at chair → Green "chair" box appears
- [ ] Point at car → Teal "car" box appears
- [ ] Multiple objects → Multiple boxes with different colors
- [ ] Freeze button → Camera pauses, boxes stay visible
- [ ] Continue button → Camera resumes, detection continues
- [ ] No console errors

---

## Known Issues

### 1. Skia Canvas Warning (Non-Blocking)

```
ERROR: <Canvas onLayout={onLayout} /> is not supported on the new architecture
```

- **Status:** Known issue, non-blocking
- **Cause:** Skia's internal Canvas tries to use `onLayout` with New Architecture
- **Impact:** None - rendering still works perfectly
- **Fix:** Not needed (VisionCamera provides frame dimensions directly)

### 2. Boxes Flicker (BLOCKING - FIX NEEDED)

- **Status:** Actively being fixed
- **Cause:** Boxes only drawn on detection frames (10 FPS), not render frames (30-60 FPS)
- **Impact:** Boxes appear for 1 frame, disappear for 9 frames
- **Fix:** See implementation plan above

---

## Next Steps for Next Agent

### Immediate Task (30 min)

1. **Implement cached detection rendering** (see Implementation Plan above)
   - Add `useSharedValue` for `cachedDetections`
   - Move detection logic inside `runAtTargetFps(10, ...)`
   - Move drawing logic outside throttled block
   - Update detections cache at 10 FPS
   - Draw from cache at full frame rate

2. **Test on device**
   - Point camera at various objects
   - Verify boxes stay persistent
   - Check performance (should still be smooth)

3. **Commit working version**

### Future Tasks (Sprint 2)

1. **Replace COCO model with wound detection model**
   - Export custom model from Roboflow to TFLite
   - Place in `assets/models/wound_detector.tflite`
   - Update labels from COCO to wound types (cut, burn, laceration, etc.)
   - Update color map for medical categories

2. **Integrate with LLM**
   - Pass detection results to Llama 3.2 1B
   - Generate medical assessment based on detected wounds
   - Display assessment to user

3. **Production integration**
   - Move detection logic to main `ai-assess` flow
   - Give user choice: local detection vs. Gemini
   - Add wound severity classification

---

## Environment

- **Device:** Pixel 7a (Android 13+, API 33+)
- **Min SDK:** 26 (Android 8.0 Oreo)
- **Target SDK:** 33+ (from Expo defaults)
- **Build:** Development build (`npm run android`)
- **Dependencies:**
  - `react-native-vision-camera`: ^4.7.2
  - `@shopify/react-native-skia`: ^2.3.0
  - `react-native-fast-tflite`: ^1.6.1
  - `vision-camera-resize-plugin`: ^3.2.0
  - `react-native-reanimated`: ~4.1.1
  - `react-native-worklets-core`: ^1.6.2
  - `expo-build-properties`: ~1.0.9

---

## Prompt for Next Agent

```
Hi Next Agent,

I'm continuing work on implementing real-time on-device object detection using TFLite + Skia Frame Processors for a rural Alberta healthcare app.

CURRENT STATUS:
✅ Skia Frame Processors working (GPU-accelerated drawing confirmed)
✅ TFLite detection working (COCO SSD MobileNetV1 at 10 FPS)
✅ Bounding boxes rendering with color-coding
❌ ISSUE: Boxes flicker (appear for 1 frame, disappear for 9 frames)

THE PROBLEM:
File: app/(tabs)/vision-test/index.tsx, lines 79-171

Current frame processor renders the camera at 30-60 FPS but only runs detection + drawing at 10 FPS (inside `runAtTargetFps`). This causes boxes to appear briefly then disappear.

SOLUTION NEEDED:
Restructure the frame processor to:
1. Run TFLite detection at 10 FPS (keep inside `runAtTargetFps`)
2. Cache detection results in a shared value
3. Draw boxes at full frame rate (30-60 FPS) using cached results

IMPLEMENTATION:
See detailed plan in: docs/ai-integration/20251005_171500_skia-tflite-detection-handoff.md

The document includes:
- Complete code example for the fix
- Step-by-step implementation plan
- Technical details about the architecture
- Testing checklist

WHAT TO DO:
1. Read the handoff document (^^ above)
2. Implement the cached detection rendering pattern
3. Test on device - boxes should stay persistent
4. Commit when working
5. Next: Replace COCO model with wound detection model

The user is VERY excited about this progress (boxes ARE working, just need persistence). This is a critical fix for tomorrow's APK delivery.

Good luck!
```

---

## Git Commits in This Session

1. `5c3aff4` - pkg: add expo-build-properties plugin for skia
2. `3806e7b` - pkg: add skia for frame processing
3. `1a20153` - feat: implement working Skia Frame Processor with static red box test

**Next commit after fix:** feat: add real-time TFLite detection with Skia rendering

---

**End of Handoff Document**
