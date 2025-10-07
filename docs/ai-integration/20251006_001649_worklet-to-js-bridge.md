# Worklet to JS Thread Bridge Pattern

**Date:** October 6, 2025
**Time:** 00:16:49
**Feature:** Photo Capture with Detection Results

## Problem

Vision Camera frame processors run on a **worklet thread** (for performance). When you need to access data from the worklet in your React component (JS thread), you can't directly read shared values reliably.

**Symptom:** Reading `sharedValue.value` from JS thread returns empty/stale data even though the worklet is updating it.

## Solution: Parallel State Pattern

Maintain **two** copies of the data:
1. **Shared Value** - for worklet thread (fast rendering)
2. **React State** - for JS thread (reliable access)

Sync them using `Worklets.createRunOnJS()`.

## Implementation

### Step 1: Add React State
```typescript
const [latestDetections, setLatestDetections] = useState<DetectionType[]>([]);
```

### Step 2: Create JS Callback
```typescript
const updateLatestDetections = Worklets.createRunOnJS((detections: DetectionType[]) => {
  setLatestDetections(detections);
});
```

### Step 3: Call from Worklet
```typescript
const frameProcessor = useSkiaFrameProcessor((frame) => {
  'worklet'

  // ... detection logic ...

  // Update shared value (for rendering)
  cachedDetections.value = newDetections;

  // Update JS state (for capture)
  updateLatestDetections(detectionsForJS);

}, [updateLatestDetections]);
```

### Step 4: Read from JS Thread
```typescript
const handleCapture = async () => {
  // ✅ Read from React state (reliable)
  const detections = latestDetections;

  // ❌ Don't read from shared value
  // const detections = cachedDetections.value; // unreliable
};
```

## Timeline

1. **Initial attempt:** Read `cachedDetections.value` directly → empty array
2. **Added delay:** `await new Promise(resolve => setTimeout(resolve, 100))` → still empty
3. **Root cause:** Shared values aren't reliably readable from JS thread
4. **Solution:** Parallel state with `Worklets.createRunOnJS()` → ✅ works

## Key Files

- `app/(tabs)/vision-test/index.tsx` - Implementation
- React Native Vision Camera docs - "Interacting with Frame Processors" section

## Result

- ✅ Photo captured with detection data
- ✅ Detections array populated with actual objects
- ✅ Data ready for LLM analysis
