# Vision + LLM Integration - Current State Analysis

**Created:** 2025-10-06 14:38:17
**Branch:** feature/edge-model-architecture
**Latest Commit:** bfd4dc1 - feat: add complete testing UI for photo capture and AI analysis

---

## Executive Summary

You have **successfully built the foundation** for connecting Vision Detection → LLM Assessment. Here's what's working and what's next:

### ✅ What's Complete:

1. **Vision Model (TFLite COCO SSD)**
   - Real-time detection at 10 FPS
   - Smooth bounding boxes at 30-60 FPS
   - Detection results captured and passed to JS thread
   - Photo capture with preserved detection data

2. **LLM Model (Llama 3.2 1B)**
   - Model loads successfully (~500MB download on first run)
   - Text-based medical assessments working
   - Streaming responses functional
   - Located in `ai-test/` tab

3. **Data Bridge (Worklet → JS)**
   - Detections successfully passed from GPU thread to JS thread
   - Photo capture preserves detection coordinates
   - User can add text description
   - Ready for LLM prompting

### ⏳ What's Next (Your Question):

**Connect the pieces:** Format detection results + user input → Send to LLM → Display assessment

---

## Current Architecture

### File Structure

```
app/(tabs)/
├── vision-test/index.tsx    ← Vision detection + photo capture (READY)
├── ai-test/index.tsx         ← LLM assessment (READY)
└── [NEW] Combined flow needs to be wired up
```

### Data Flow (Current State)

```
┌─────────────────────────────────────────────────────────────┐
│ VISION-TEST TAB (app/(tabs)/vision-test/index.tsx)        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
    ┌──────────────────────────────────────────┐
    │ 1. Camera Frame (30-60 FPS)              │
    │    - VisionCamera provides RGB frames    │
    └──────────────────────────────────────────┘
                          │
                          ▼
    ┌──────────────────────────────────────────┐
    │ 2. TFLite Detection (10 FPS, Worklet)   │
    │    - resize() → 300x300 RGB              │
    │    - model.runSync()                     │
    │    - Parse outputs                       │
    └──────────────────────────────────────────┘
                          │
                          ▼
    ┌──────────────────────────────────────────┐
    │ 3. Update Shared Values (Worklet)       │
    │    - cachedDetections.value = [...]     │
    │      (for rendering boxes at 60 FPS)    │
    │    - updateLatestDetections([...])       │
    │      (pass to JS thread)                │
    └──────────────────────────────────────────┘
                          │
                          ▼
    ┌──────────────────────────────────────────┐
    │ 4. JS State Updated (React)              │
    │    - latestDetections: Detection[]       │
    │    - Shows in console logs               │
    └──────────────────────────────────────────┘
                          │
                          ▼
    ┌──────────────────────────────────────────┐
    │ 5. User Captures Photo                   │
    │    - cameraRef.current.takePhoto()       │
    │    - setCapturedImage(photo.path)        │
    │    - setCapturedDetections(latestDetections) │
    └──────────────────────────────────────────┘
                          │
                          ▼
    ┌──────────────────────────────────────────┐
    │ 6. User Confirms & Adds Description      │
    │    - Shows photo with bounding boxes     │
    │    - User types symptoms/context         │
    │    - Clicks "Analyze with AI"            │
    └──────────────────────────────────────────┘
                          │
                          ▼
    ┌──────────────────────────────────────────┐
    │ 7. handleAnalyzeWithAI() Called          │
    │    ❌ TODO: Call LLM here               │
    │                                          │
    │    Available data:                       │
    │    - capturedImage: string (file path)   │
    │    - capturedDetections: Detection[]     │
    │    - userDescription: string             │
    └──────────────────────────────────────────┘
                          │
                          ▼
                    [MISSING LINK]
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ AI-TEST TAB (app/(tabs)/ai-test/index.tsx)                │
│                                                             │
│ LLM Model (Llama 3.2 1B):                                  │
│ - const llm = useLLM({ model: LLAMA3_2_1B_SPINQUANT })     │
│ - llm.generate(messages)                                   │
│ - llm.response (streaming output)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Current State: vision-test/index.tsx

### Key State Variables (Lines 55-84)

```typescript
// Vision detection state
const [isInitializing, setIsInitializing] = useState(true);
const [isCameraActive, setIsCameraActive] = useState(true);

// Latest detections in JS thread (updated at 10 FPS)
const [latestDetections, setLatestDetections] = useState<{
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}[]>([]);

// Capture state
const [capturedImage, setCapturedImage] = useState<string | null>(null);
const [capturedDetections, setCapturedDetections] = useState<Detection[] | null>(null);

// Confirmation state (for AI analysis flow)
const [isConfirmed, setIsConfirmed] = useState(false);
const [userDescription, setUserDescription] = useState("");
const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 });
const [frameDimensions, setFrameDimensions] = useState({ width: 0, height: 0 });

// Shared value for GPU rendering (worklet thread)
const cachedDetections = useSharedValue<Detection[]>([]);
```

### Detection Flow (Lines 140-236)

**Worklet Thread (GPU) → JS Thread Bridge:**

```typescript
// Line 102-111: Create callback to update JS from worklet
const updateLatestDetections = Worklets.createRunOnJS((detections: Detection[]) => {
  setLatestDetections(detections);  // ← Updates React state from worklet
});

// Line 216-225: Inside frame processor (worklet thread)
const detectionsForJS = newDetections.map(det => ({
  label: det.label,
  confidence: 0.85,  // Placeholder - can get actual confidence from scores array
  x: det.x,
  y: det.y,
  width: det.width,
  height: det.height,
}));
updateLatestDetections(detectionsForJS);  // ← Call JS function from worklet
```

**Key Insight:** `latestDetections` state is updated ~10 times per second with current detections!

### Photo Capture Flow (Lines 262-312)

```typescript
const handleCapture = async () => {
  // STEP 1: Get current detections from state
  const currentDetections = latestDetections;
  console.log('🎯 Detections at capture time:', currentDetections);

  // STEP 2: Take photo FIRST (while camera is still active)
  const photo = await cameraRef.current.takePhoto();
  console.log('📸 Photo captured:', photo.path);

  // STEP 3: Freeze camera AFTER photo is taken
  setIsCameraActive(false);

  // STEP 4: Convert file URI
  const photoUri = `file://${photo.path}`;

  // STEP 5: Map detections to include confidence
  const mappedDetections = currentDetections.map(d => ({
    ...d,
    confidence: 0.85  // TODO: Extract actual confidence from TFLite scores
  }));

  // STEP 6: Save to state
  setCapturedImage(photo.path);
  setCapturedDetections(mappedDetections);

  console.log('✅ Capture complete:', {
    photoPath: photo.path,
    detectionCount: mappedDetections.length
  });
};
```

### AI Analysis Handler (Lines 315-321)

**THIS IS WHERE YOU ARE NOW:**

```typescript
const handleAnalyzeWithAI = () => {
  console.log("🤖 Analyzing with AI:");
  console.log("  Image:", capturedImage);
  console.log("  Detections:", capturedDetections);
  console.log("  User Description:", userDescription);

  // TODO: Call LLM API here ← THIS IS YOUR NEXT STEP
};
```

**Available Data at This Point:**

1. **`capturedImage`**: `string` - File path to captured photo (e.g., `/data/.../photo_12345.jpg`)
2. **`capturedDetections`**: `Detection[]` - Array of objects detected:
   ```typescript
   [
     { label: "person", confidence: 0.85, x: 120, y: 300, width: 200, height: 400 },
     { label: "chair", confidence: 0.72, x: 450, y: 150, width: 180, height: 220 }
   ]
   ```
3. **`userDescription`**: `string` - What user typed (e.g., "I have a cut on my hand that's bleeding")

---

## Current State: ai-test/index.tsx

### LLM Integration (Lines 23-70)

```typescript
const SYSTEM_PROMPT = `You are a medical triage assistant for rural Alberta healthcare.
Provide brief, compassionate medical guidance. Keep responses under 150 words.`;

export default function AITest() {
  const [userInput, setUserInput] = useState("");

  // Initialize LLM
  const llm = useLLM({ model: LLAMA3_2_1B_SPINQUANT });

  const handleGenerate = async () => {
    const chat: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userInput }
    ];

    await llm.generate(chat);  // ← This triggers LLM inference
  };

  // LLM response available in: llm.response
  // Loading state: llm.isGenerating
  // Ready state: llm.isReady
}
```

**Key Insight:** The LLM is already fully functional! Just need to call it from vision-test tab.

---

## What You Need to Do Next

### Option 1: Add LLM to vision-test Tab (Recommended)

**File:** `app/(tabs)/vision-test/index.tsx`

**Step 1:** Import LLM hook at top:
```typescript
import { useLLM, LLAMA3_2_1B_SPINQUANT, Message } from "react-native-executorch";
```

**Step 2:** Initialize LLM (add after line 84):
```typescript
const llm = useLLM({ model: LLAMA3_2_1B_SPINQUANT });
```

**Step 3:** Create medical system prompt:
```typescript
const MEDICAL_SYSTEM_PROMPT = `You are a medical triage assistant for rural Alberta healthcare.
Analyze wound detection results and patient descriptions to provide first-aid guidance.
Keep responses under 150 words. Focus on:
1. Severity assessment
2. Immediate first-aid steps
3. Whether to call 911, visit clinic, or self-care
4. When to seek professional help`;
```

**Step 4:** Update `handleAnalyzeWithAI()` (replace lines 315-321):
```typescript
const handleAnalyzeWithAI = async () => {
  if (!llm.isReady) {
    console.error("❌ LLM not ready");
    return;
  }

  // Format detection results for LLM
  const detectionSummary = capturedDetections
    ? capturedDetections.map(d => `${d.label} (${Math.round(d.confidence * 100)}% confidence)`).join(", ")
    : "No detections";

  // Build prompt
  const userPrompt = `
Detected objects in wound image: ${detectionSummary}

Patient description: ${userDescription || "No description provided"}

Provide medical triage assessment and first-aid guidance.
  `.trim();

  // Call LLM
  const chat: Message[] = [
    { role: 'system', content: MEDICAL_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ];

  console.log("🤖 Sending to LLM:", userPrompt);

  try {
    await llm.generate(chat);
    console.log("✅ LLM response:", llm.response);
  } catch (error) {
    console.error("❌ LLM error:", error);
  }
};
```

**Step 5:** Display LLM response in UI (add after confirmation section ~line 670):
```typescript
{/* AI Assessment Results */}
{llm.response && (
  <View style={styles.assessmentCard}>
    <Text style={[styles.assessmentTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
      AI Medical Assessment
    </Text>
    {llm.isGenerating ? (
      <ActivityIndicator size="small" color="#2A7DE1" />
    ) : (
      <Text style={[styles.assessmentText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
        {llm.response}
      </Text>
    )}
  </View>
)}
```

---

## Option 2: Pass Data to ai-test Tab (Alternative)

Use React Navigation to pass data between tabs:

```typescript
// In vision-test/index.tsx
import { useRouter } from 'expo-router';

const router = useRouter();

const handleAnalyzeWithAI = () => {
  router.push({
    pathname: '/(tabs)/ai-test',
    params: {
      detections: JSON.stringify(capturedDetections),
      userDescription: userDescription,
      imagePath: capturedImage
    }
  });
};
```

Then in `ai-test/index.tsx`, read params and pre-fill the prompt.

**Downside:** User has to switch tabs, breaks UX flow.

---

## Key Technical Details

### Detection Data Structure

When `handleAnalyzeWithAI()` is called, you have:

```typescript
capturedDetections = [
  {
    label: "person",      // COCO label (will be "laceration", "burn" with wound model)
    confidence: 0.85,     // 0-1 confidence score
    x: 120,               // Pixel coordinates in captured image
    y: 300,
    width: 200,
    height: 400
  }
]
```

### LLM Input Format

The LLM expects an array of messages:

```typescript
const chat: Message[] = [
  {
    role: 'system',
    content: 'You are a medical triage assistant...'
  },
  {
    role: 'user',
    content: 'Detected wounds: laceration (87% confidence)\nPatient: Cut my hand while cooking'
  }
];

await llm.generate(chat);
```

### LLM Output

After calling `llm.generate()`:

- **`llm.isGenerating`**: `boolean` - True while generating (show loading spinner)
- **`llm.response`**: `string` - The LLM's full response (updates as it streams)
- **`llm.error`**: `string | undefined` - Error message if generation failed

---

## Example Prompt Format

### Current State (COCO Model):
```
Detected objects in wound image: person (85% confidence), chair (72% confidence)

Patient description: I have a cut on my hand that's bleeding

Provide medical triage assessment and first-aid guidance.
```

### Future State (Wound Model):
```
Detected wounds in image: laceration (87% confidence), moderate bleeding detected

Patient description: Cut my hand while cooking, bleeding has slowed but not stopped

Provide medical triage assessment and first-aid guidance.
```

---

## Recommended Implementation Plan

### Phase 1: Basic Integration (30 minutes)
1. Import LLM hook into vision-test/index.tsx
2. Initialize LLM model
3. Update `handleAnalyzeWithAI()` to format prompt and call LLM
4. Display `llm.response` in existing UI
5. Test with COCO detections (person, chair, etc.)

### Phase 2: Better UX (1 hour)
1. Add loading state while LLM generates
2. Show character count / progress indicator
3. Add "Regenerate" button
4. Save assessment to Convex (optional)
5. Add error handling for LLM failures

### Phase 3: Wound Model Integration (2 hours)
1. Replace COCO model with wound detection model
2. Update labels (person → laceration, burn, etc.)
3. Update prompt template for medical context
4. Test with real wound images
5. Validate LLM output quality

---

## Code Locations Quick Reference

| Feature | File | Line Numbers |
|---------|------|--------------|
| Vision detection (worklet) | vision-test/index.tsx | 140-236 |
| Photo capture | vision-test/index.tsx | 262-312 |
| AI analysis handler (TODO) | vision-test/index.tsx | 315-321 |
| LLM initialization | ai-test/index.tsx | 28 |
| LLM generate function | ai-test/index.tsx | 46-70 |
| COCO labels | assets/models/coco_labels.json | - |
| TFLite model | assets/models/coco_ssd_mobilenet_v1.tflite | - |

---

## Testing Checklist

Before connecting LLM:
- [x] Vision detection working (boxes appear)
- [x] Photo capture working (image saved)
- [x] Detections preserved during capture
- [x] User can add description
- [x] LLM model loads in ai-test tab
- [x] LLM generates responses from text

After connecting LLM:
- [ ] LLM loads in vision-test tab
- [ ] Prompt formatting correct
- [ ] LLM generates response
- [ ] Response displays in UI
- [ ] Loading state shows during generation
- [ ] Error handling works
- [ ] Full flow: capture → describe → analyze → results

---

## Next Session Starting Point

**You are here:**
- Vision model: ✅ Working
- Photo capture: ✅ Working
- Detection data: ✅ Passed to JS thread
- LLM model: ✅ Working in separate tab
- **Missing:** Wire up `handleAnalyzeWithAI()` to call LLM

**Immediate next step:**
1. Add LLM import to vision-test/index.tsx
2. Initialize LLM model
3. Format detection results into prompt
4. Call `llm.generate()` with formatted prompt
5. Display `llm.response` in UI

**Expected time:** 30-60 minutes

**Blocker risk:** None - all pieces are working, just need assembly

---

## Summary

You've done excellent work! The hard parts are done:
1. ✅ Real-time vision detection at 60 FPS
2. ✅ Detection results bridged from worklet → JS
3. ✅ Photo capture with preserved detection data
4. ✅ LLM model loaded and generating responses

**All you need now:** Call `llm.generate()` from `handleAnalyzeWithAI()` with a formatted prompt containing detection results + user description.

The implementation is straightforward - you're literally 20 lines of code away from a working Vision → LLM pipeline!

---

**End of Document**
