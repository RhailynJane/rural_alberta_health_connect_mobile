# VisionCamera Frame Processors - Complete Reference Guide

**Created:** 2025-10-05 16:18:00

**Purpose:** Comprehensive guide to VisionCamera Frame Processors, Worklets, and Skia integration based on official documentation

---

## Table of Contents

1. [Frame Processors Overview](#frame-processors-overview)
2. [Installation & Setup](#installation--setup)
3. [The Frame Object](#the-frame-object)
4. [Worklets Explained](#worklets-explained)
5. [Interacting with Frame Processors](#interacting-with-frame-processors)
6. [Performance & Scheduling](#performance--scheduling)
7. [Skia Frame Processors](#skia-frame-processors)
8. [Best Practices & Tips](#best-practices--tips)
9. [Current Implementation Analysis](#current-implementation-analysis)
10. [Solution to Current Issue](#solution-to-current-issue)

---

## Frame Processors Overview

### What are Frame Processors?

Frame Processors are JavaScript functions that run **for each Frame the Camera sees**. They enable:

- Real-time ML for face/object detection at 60+ FPS
- Video processing for WebRTC streaming
- Custom code scanning (QR, barcodes, SnapCodes)
- AR filters (dog masks, beauty filters)
- Real-time image processing (blur, color correction, depth detection)

### Basic Example

```typescript
const frameProcessor = useFrameProcessor((frame) => {
  'worklet'
  const objects = detectObjects(frame)
  const label = objects[0].name
  console.log(`You're looking at a ${label}.`)
}, [])

return <Camera frameProcessor={frameProcessor} />
```

### Key Characteristics

- **Synchronous execution** in the Camera pipeline
- **GPU-based** pixel buffers (YUV or RGB format)
- **JSI-based** for near-zero overhead
- **Extensible** via native plugins

---

## Installation & Setup

### Required Package

```bash
npm i react-native-worklets-core
```

### Babel Configuration

Add to `babel.config.js`:

```javascript
module.exports = {
  plugins: [["react-native-worklets-core/plugin"]],
};
```

### Using Community Plugins

Example with `vision-camera-image-labeler`:

```bash
npm i vision-camera-image-labeler
cd ios && pod install
```

Usage:

```typescript
const { labelImage } = useImageLabeler();

const frameProcessor = useFrameProcessor(
  (frame) => {
    "worklet";
    const labels = labelImage(frame);
    console.log(`You're looking at a ${labels[0].name}.`);
  },
  [labelImage]
);
```

---

## The Frame Object

### Frame Properties

A Frame is a **GPU-based pixel buffer** exposed to JavaScript via JSI.

```typescript
const frameProcessor = useFrameProcessor((frame) => {
  "worklet";
  console.log(`Frame: ${frame.width}x${frame.height} (${frame.pixelFormat})`);
}, []);
```

### Accessing Pixel Data

```typescript
const frameProcessor = useFrameProcessor((frame) => {
  "worklet";
  if (frame.pixelFormat === "rgb") {
    const buffer = frame.toArrayBuffer();
    const data = new Uint8Array(buffer);
    console.log(`Pixel at 0,0: RGB(${data[0]}, ${data[1]}, ${data[2]})`);
  }
}, []);
```

### Performance Considerations

> **WARNING:** At 4k resolution, a raw Frame is ~12MB. At 60 FPS, **~700MB/second** flows through your Frame Processor.
>
> VisionCamera uses JSI to directly expose GPU buffers from C++ to JavaScript **without copying or serializing**.

---

## Worklets Explained

### What is a Worklet?

A Worklet is a **small JavaScript function that can execute on a separate JavaScript Context** (separate Thread).

### Creating a Worklet

Simply add the `'worklet'` directive:

```typescript
const sayHello = () => {
  "worklet";
  console.log("Hello from the Worklet Thread!");
};
```

### Running on Background Thread

```typescript
await Worklets.defaultContext.runAsync(sayHello);
```

### JavaScript Contexts

- **Main JS Thread (mqt_js):** Runs your React app
- **Worklet Context:** Separate Thread for parallel execution
- **Benefits:**
  - Reanimated: Style updaters run on UI Thread
  - VisionCamera: Frame Processors run on Camera Thread

### Parameters and Results

Worklets can take parameters and return results as promises:

```typescript
const fibonacci = (num: number): number => {
  "worklet";
  if (num <= 1) return num;
  let prev = 0,
    curr = 1;
  for (let i = 2; i <= num; i++) {
    let next = prev + curr;
    prev = curr;
    curr = next;
  }
  return curr;
};

const context = Worklets.defaultContext;
const result = await context.runAsync(() => {
  "worklet";
  return fibonacci(50);
});
console.log(`Fibonacci of 50 is ${result}`);
```

### Shared Values

**Shared Values** are values accessible from any Context:

```typescript
const progress = useSharedValue(0);

const someHeavyFunction = () => {
  "worklet";
  for (let i = 0; i < lotsOfItems.length; i++) {
    // do heavy processing
    progress.value = i / lotsOfItems.length;
  }
};

// progress.value can be accessed here to check Worklet's progress
```

---

## Interacting with Frame Processors

### 1. Access JS Values

Frame Processors can **readonly-copy** React state:

```typescript
const targetObject = "banana"; // React state

const frameProcessor = useFrameProcessor(
  (frame) => {
    "worklet";
    const objects = detectObjects(frame);
    const bananas = objects.filter((o) => o.type === targetObject);
    console.log(`Detected ${bananas.length} bananas!`);
  },
  [targetObject]
);
```

### 2. Shared Values (Read/Write)

**Best practice:** Use Shared Values for communication between contexts.

```typescript
const bananas = useSharedValue([]);

// Detect Bananas in Frame Processor
const frameProcessor = useFrameProcessor(
  (frame) => {
    "worklet";
    const objects = detectObjects(frame);
    bananas.value = objects.filter((o) => o.type === "banana");
  },
  [bananas]
);

// Draw bananas in a Skia Canvas
const onDraw = useDrawCallback((canvas) => {
  for (const banana of bananas.value) {
    const rect = Skia.XYWHRect(banana.x, banana.y, banana.width, banana.height);
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("red"));
    frame.drawRect(rect, paint);
  }
});
```

### 3. Call Functions (Worklets.createRunOnJS)

**CRITICAL:** Use `Worklets.createRunOnJS` (from `react-native-worklets-core`), **NOT** `runOnJS` from Reanimated.

```typescript
import { Worklets } from "react-native-worklets-core";

const onFaceDetected = Worklets.createRunOnJS((face: Face) => {
  navigation.push("FiltersPage", { face: face });
});

const frameProcessor = useFrameProcessor(
  (frame) => {
    "worklet";
    const faces = scanFaces(frame);
    if (faces.length > 0) {
      onFaceDetected(faces[0]);
    }
  },
  [onFaceDetected]
);
```

---

## Performance & Scheduling

### Frame Processing Timing

| FPS | Time per Frame |
| --- | -------------- |
| 30  | 33ms           |
| 60  | 16ms           |

> **Rule:** Frame Processor must finish before next Frame arrives, or Frame will be dropped.

### Running Asynchronously

For longer processing, use `runAsync()`:

```typescript
const frameProcessor = useFrameProcessor((frame) => {
  "worklet";
  console.log("I'm running synchronously at 60 FPS!");

  runAsync(frame, () => {
    "worklet";
    console.log("I'm running asynchronously, possibly at lower FPS!");
    const faces = detectFaces(frame); // Takes 500ms
  });
}, []);
```

**Behavior:**

- Only one `runAsync()` executes at a time (not parallel, but asynchronous)
- Example: Camera at 60 FPS, heavy ML takes 500ms
  - Camera stays at 60 FPS
  - ML runs at ~2 FPS

### Running at Throttled FPS

For operations that don't need every frame:

```typescript
const TARGET_FPS = 2;
const frameProcessor = useFrameProcessor((frame) => {
  "worklet";
  console.log("I'm running synchronously at 60 FPS!");

  runAtTargetFps(TARGET_FPS, () => {
    "worklet";
    console.log("I'm running synchronously at 2 FPS!");
    const brightness = detectBrightness(frame);
  });
}, []);
```

---

## Skia Frame Processors

### What is Skia?

Skia is a **2D graphics library** for drawing shapes, images, text, shaders, etc. GPU-accelerated by:

- **iOS:** Metal
- **Android:** OpenGL

### Installation

```bash
npm i @shopify/react-native-skia
npm i react-native-reanimated
```

### Basic Usage

```typescript
import { useSkiaFrameProcessor } from "react-native-vision-camera";

const frameProcessor = useSkiaFrameProcessor((frame) => {
  "worklet";
  frame.render(); // MUST call render()
}, []);
```

### Drawing to Frame

#### Draw Red Rectangle

```typescript
const frameProcessor = useSkiaFrameProcessor((frame) => {
  "worklet";
  frame.render();

  const centerX = frame.width / 2;
  const centerY = frame.height / 2;
  const rect = Skia.XYWHRect(centerX, centerY, 150, 150);
  const paint = Skia.Paint();
  paint.setColor(Skia.Color("red"));
  frame.drawRect(rect, paint);
}, []);
```

#### Apply Shader (Invert Colors)

```typescript
const invertColorsFilter = Skia.RuntimeEffect.Make(`
  uniform shader image;
  half4 main(vec2 pos) {
    vec4 color = image.eval(pos);
    return vec4((1.0 - color).rgb, 1.0);
  }
`);
const shaderBuilder = Skia.RuntimeShaderBuilder(invertColorsFilter);
const imageFilter = Skia.ImageFilter.MakeRuntimeShader(
  shaderBuilder,
  null,
  null
);
const paint = Skia.Paint();
paint.setImageFilter(imageFilter);

const frameProcessor = useSkiaFrameProcessor(
  (frame) => {
    "worklet";
    frame.render(paint);
  },
  [paint]
);
```

### Coordinate System

- `(0, 0)` = Top-left
- `(frame.width, frame.height)` = Bottom-right
- Frame dimensions and orientation-based

### Performance

- **GPU-accelerated** via Metal (iOS) and OpenGL (Android)
- Can run at **up to 500 FPS** (depending on rendering complexity)

### CRITICAL LIMITATION

> **⚠️ PREVIEW-ONLY:** Skia Frame Processors are currently **preview-only**. Content drawn to the Frame **will NOT be visible** in:
>
> - Captured photos
> - Snapshots
> - Videos
>
> This means **bounding boxes drawn with Skia will appear on screen but NOT in saved media**.

---

## Best Practices & Tips

### Avoiding Frame Drops

1. **Use `runAsync()`** if you don't need synchronous execution
2. **Use `runAtTargetFps()`** if you don't need every frame
3. **Use Shared Values** (`useSharedValue`) instead of React State (`useState`)
4. **Prefer native plugins** over pure JavaScript

### FPS Graph

Enable performance profiling:

```typescript
<Camera {...props} enableFpsGraph={true} />
```

### Fast Frame Processor Plugins

1. **Prefer YUV over RGB:** More efficient in memory and processing
2. **Use native Frame types:** Avoid `frame.toArrayBuffer()` (GPU → CPU copy)
3. **Prefer `uint8` over `float`:** Much more efficient
4. **Use GPU acceleration:** CoreML, Metal (iOS), TensorFlow delegates
5. **Use vector acceleration:** Accelerate/vImage (iOS)

### ESLint Configuration

Add to `.eslintrc.js`:

```javascript
{
  "rules": {
    "react-hooks/exhaustive-deps": ["warn", {
      "additionalHooks": "(useFrameProcessor|useSkiaFrameProcessor)"
    }]
  }
}
```

---

## Current Implementation Analysis

### File: `app/(tabs)/vision-test/index.tsx`

**What Works ✅**

1. **TFLite Model:** Loads successfully (`model.state === 'loaded'`)
2. **Frame Processing:** Runs at 10 FPS using `runAtTargetFps(10, ...)`
3. **Detection Pipeline:** Fully functional
   - Resizes frames to 300×300 RGB
   - Runs TFLite inference
   - Parses outputs (boxes, classes, scores)
4. **Shared Value Updates:** Working
   - `detectionsShared.value = foundDetections` (Line 175)
   - Logs show: `"✅ Updated shared value. Count: 4"`

**What's Broken ❌**

1. **React State Updates:** NOT working
   - `useAnimatedReaction` (Lines 97-102) **not triggering**
   - React state (`detections`) stays empty
   - Bounding boxes don't render (map over empty array)

**Current Code (Lines 97-102):**

```typescript
useAnimatedReaction(
  () => detectionsShared.value,
  (currentDetections) => {
    runOnJS(setDetections)(currentDetections);
  }
);
```

**Problem:**

- `runOnJS` is from `react-native-reanimated`
- VisionCamera worklets use `react-native-worklets-core`
- **These are incompatible contexts**

---

## Solution to Current Issue

### Root Cause

**VisionCamera Frame Processors** run in a **`react-native-worklets-core` context**, NOT a Reanimated context.

- ❌ `runOnJS` from Reanimated **does not work** in VisionCamera worklets
- ✅ `Worklets.createRunOnJS` from `react-native-worklets-core` **does work**

### Solution: Use Skia Frame Processors

Since you need to **render bounding boxes on screen**, and Skia Frame Processors provide GPU-accelerated drawing, this is the **recommended approach**.

#### Step 1: Install Skia

```bash
npm i @shopify/react-native-skia
npx expo prebuild --clean
```

#### Step 2: Replace with `useSkiaFrameProcessor`

**Current imports (Line 11-14):**

```typescript
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
  runAtTargetFps,
} from "react-native-vision-camera";
import { useResizePlugin } from "vision-camera-resize-plugin";
import { useTensorflowModel } from "react-native-fast-tflite";
import {
  useSharedValue,
  useAnimatedReaction,
  runOnJS,
} from "react-native-reanimated";
```

**Replace with:**

```typescript
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useSkiaFrameProcessor,
  runAtTargetFps,
} from "react-native-vision-camera";
import { useResizePlugin } from "vision-camera-resize-plugin";
import { useTensorflowModel } from "react-native-fast-tflite";
import { useSharedValue } from "react-native-reanimated";
import { Skia } from "@shopify/react-native-skia";
```

#### Step 3: Rewrite Frame Processor (Lines 105-186)

**Replace:**

```typescript
const frameProcessor = useFrameProcessor(
  (frame) => {
    "worklet";
    // ... detection logic ...
    detectionsShared.value = foundDetections;
  },
  [model, detectionsShared]
);
```

**With:**

```typescript
const frameProcessor = useSkiaFrameProcessor(
  (frame) => {
    "worklet";

    // CRITICAL: Render the camera frame first
    frame.render();

    if (model.state !== "loaded") return;

    runAtTargetFps(10, () => {
      "worklet";

      try {
        // Step 1: Resize frame to 300x300 RGB
        const resized = resize(frame, {
          scale: { width: 300, height: 300 },
          pixelFormat: "rgb",
          dataType: "uint8",
        });

        // Step 2: Run TFLite inference
        const outputs = model.model.runSync([resized]);

        // Step 3: Parse outputs
        const boxes = outputs[0];
        const classes = outputs[1];
        const scores = outputs[2];
        const numDetections = Math.min(Number(outputs[3][0]) || 10, 10);

        // Step 4: Draw bounding boxes directly on frame
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

            // Draw rectangle
            const rect = Skia.XYWHRect(x, y, width, height);
            const paint = Skia.Paint();
            paint.setColor(Skia.Color(getColorForClass(label)));
            paint.setStyle(PaintStyle.Stroke);
            paint.setStrokeWidth(3);
            frame.drawRect(rect, paint);

            // Draw label background
            const labelBgRect = Skia.XYWHRect(x, y - 25, 150, 25);
            const labelBgPaint = Skia.Paint();
            labelBgPaint.setColor(Skia.Color(getColorForClass(label)));
            frame.drawRect(labelBgRect, labelBgPaint);

            // Draw label text
            const font = Skia.Font(null, 16);
            const textPaint = Skia.Paint();
            textPaint.setColor(Skia.Color("white"));
            frame.drawText(
              `${label} ${Math.round(confidence * 100)}%`,
              x + 5,
              y - 5,
              textPaint,
              font
            );

            // Update shared value for detection count display
            detectionsShared.value = [
              ...detectionsShared.value.slice(0, i),
              { label, confidence, box: { x, y, width, height } },
            ];
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("❌ Frame processing error:", errorMessage);
      }
    });
  },
  [model, detectionsShared, resize]
);
```

#### Step 4: Remove Bounding Box Overlays (Lines 412-445)

Since bounding boxes are now drawn directly on the frame by Skia, **remove the React View overlays**.

**Remove this code:**

```typescript
{detections.map((detection, index) => (
  <View
    key={index}
    style={{
      position: 'absolute',
      left: detection.box.x,
      top: detection.box.y,
      width: detection.box.width,
      height: detection.box.height,
      borderWidth: 2,
      borderColor: getColorForClass(detection.label),
    }}
  >
    {/* Label */}
  </View>
))}
```

#### Step 5: Update Status Overlay

Keep the status overlay showing detection count using `detectionsShared.value.length`.

---

### Alternative Solution: Worklets.createRunOnJS

If you **don't want to use Skia**, you can use `Worklets.createRunOnJS`:

#### Step 1: Add Import

```typescript
import { Worklets } from "react-native-worklets-core";
```

#### Step 2: Create Worklet Callback (Before `frameProcessor`)

```typescript
const updateDetections = Worklets.createRunOnJS(
  (newDetections: Detection[]) => {
    setDetections(newDetections);
  }
);
```

#### Step 3: Replace Shared Value Update (Line 175)

**Replace:**

```typescript
detectionsShared.value = foundDetections;
console.log("✅ Updated shared value. Count:", foundDetections.length);
```

**With:**

```typescript
updateDetections(foundDetections);
console.log("✅ Updated React state. Count:", foundDetections.length);
```

#### Step 4: Remove `useAnimatedReaction` (Lines 97-102)

Delete the broken hook entirely.

---

### Recommended Approach

**Use Skia Frame Processors** because:

1. ✅ **GPU-accelerated** rendering (better performance)
2. ✅ **No React re-renders** needed (fewer dropped frames)
3. ✅ **Cleaner code** (no state synchronization issues)
4. ✅ **Better UX** (bounding boxes drawn directly on camera feed)

**Trade-off:**

- ❌ Bounding boxes **won't appear in captured photos/videos** (preview-only)

For your use case (real-time detection demo), this is acceptable since the goal is to **prove on-device detection works**, not to capture annotated media.

---

## Final Checklist

### For Tomorrow's APK

- [ ] Install `@shopify/react-native-skia`
- [ ] Replace `useFrameProcessor` with `useSkiaFrameProcessor`
- [ ] Add `frame.render()` at start of processor
- [ ] Draw bounding boxes with Skia instead of React Views
- [ ] Remove React View overlays (lines 412-445)
- [ ] Remove `useAnimatedReaction` hook (lines 97-102)
- [ ] Rebuild with `npx expo prebuild --clean`
- [ ] Test on device
- [ ] Build APK via EAS

### For Friday's Demo

**What to show:**

1. Open vision-test tab → Live camera with real-time bounding boxes
2. Point at person → Red box appears with "person 87%"
3. Point at objects → Multiple detections with color-coded boxes
4. Emphasize: "Zero cloud costs, all on-device, GPU-accelerated"

**What to say:**

- "Real-time object detection using TFLite and Skia"
- "Next: Replace with custom wound detection model from Roboflow"
- "This proves on-device AI is feasible for medical triage"

**What NOT to claim:**

- ❌ "Wound detection" (still using COCO)
- ❌ "Fully offline" (still needs Convex)
- ❌ "Production-ready" (test tab only)

---

## References

- VisionCamera Docs: https://react-native-vision-camera.com/
- Worklets Core: https://github.com/margelo/react-native-worklets-core
- Skia Docs: https://shopify.github.io/react-native-skia/
- TFLite: https://github.com/mrousavy/react-native-fast-tflite

---

**End of Document**
