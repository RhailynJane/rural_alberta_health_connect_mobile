# AI Assessment Flow - Online vs Offline Implementation

## Current Implementation Status

### ✅ VERIFIED: Online Flow (User is Connected)

**Location**: `app/(tabs)/ai-assess/assessment-results.tsx` - Lines 383-575

When `isOnline === true`:

1. **YOLO Detection** (Lines 640-680)
   - Runs local object/injury detection on any uploaded photos
   - Uses the `runPipeline()` function to detect wounds and injuries
   - Results are logged and formatted for Gemini

2. **Gemini Assessment** (Lines 460-490)
   - Calls `generateContext()` action with:
     - User's symptom description
     - Severity level
     - Duration
     - Category
     - Environmental factors
     - Images (base64 encoded)
     - YOLO detection context (if available)
   - **Gemini provides AI-powered medical assessment**

3. **Automatic Logging to Convex** (Lines 495-560)
   - Saves assessment to Convex backend
   - Also mirrors to WatermelonDB for offline access
   - Creates health entry with:
     - symptoms, severity, category, duration
     - aiContext (Gemini response)
     - photos
     - type: "ai_assessment"
     - isSynced: true
   - Emits event to update dashboard/tracker

---

### ✅ VERIFIED: Offline Flow (User is Disconnected)

**Location**: `app/(tabs)/ai-assess/assessment-results.tsx` - Lines 383-445

When `isOnline === false`:

1. **YOLO Detection** (Still Runs)
   - Local object/injury detection still executes
   - Works completely offline since YOLO model is bundled locally

2. **NO Gemini Call**
   - Does NOT attempt to call Gemini
   - Skips external API call entirely

3. **Local Database Storage**
   - Saves directly to WatermelonDB (offline database)
   - Creates health entry with:
     - symptoms, severity, category
     - type: "ai_assessment"
     - isSynced: false (marked for later sync)
   - Uses locally stored user ID

4. **UI Feedback**
   - Shows message: "Your assessment has been saved offline and will be analyzed when you reconnect"
   - Entry immediately visible in health history/tracker

---

## Current Behavior Summary

| Feature | Online | Offline |
|---------|--------|---------|
| YOLO Detection | ✅ Yes | ✅ Yes |
| Gemini Assessment | ✅ Yes | ❌ No |
| Logging | ✅ To Convex + WatermelonDB | ✅ To WatermelonDB only |
| User Notification | Assessment provided + logged | Saved locally for later analysis |

---

## Code Flow Diagram

### Online Path
```
User submits symptoms + photos
    ↓
Display photos loaded
    ↓
YOLO Detection runs (offline)
    ↓
Images converted to base64
    ↓
generateContext() called → Gemini API
    ↓
Assessment received & displayed
    ↓
logAIAssessment() saves to Convex
    ↓
Mirror saved to WatermelonDB
    ↓
Event emitted to update tracker
```

### Offline Path
```
User submits symptoms + photos
    ↓
Display photos loaded
    ↓
YOLO Detection runs (offline)
    ↓
Check isOnline? → FALSE
    ↓
Save directly to WatermelonDB
    ↓
Show offline success message
    ↓
Event emitted to update tracker
```

---

## Key Implementation Details

### Network Status Check
- Hook: `useNetworkStatus()` from `app/hooks/useNetworkStatus.ts`
- Provides: `isOnline`, `isChecking`
- Used in: Line 307 of assessment-results.tsx

### YOLO Pipeline
- Import: `import { formatForGemini, runPipeline } from "../../../utils/yolo"`
- Detects: Wounds, injuries, skin conditions
- Works: Completely offline (bundled model)
- Output: PipelineResult with detections and annotated images

### Gemini Integration
- Action: `api.aiAssessment.generateContextWithGemini`
- Input: symptoms, severity, duration, category, images, yoloContext
- Output: AI assessment with medical guidance

### Database Layer
- **Online**: Convex (backend sync)
- **Offline**: WatermelonDB (local-first)
- **Sync**: Happens when user reconnects (via sync service)

---

## Logging Verification

✅ **Online Logging**: Confirmed
- Line 495: `await logAIAssessment()` called with full context
- Line 520: Message logged: "AI assessment automatically logged to health entries"

✅ **Offline Logging**: Confirmed  
- Line 400: `await collection.create()` saves to WatermelonDB
- Line 410: Message logged: "AI assessment saved offline successfully"

---

## Recommendations / Next Steps

If changes needed:

1. **Add Offline YOLO Assessment Summary**
   - Currently, offline users see "saved for later analysis"
   - Could display local YOLO detection results immediately

2. **Improve Offline Feedback**
   - Show YOLO detection badges even when offline
   - Provide basic assessment from YOLO results (not just "saved")

3. **Enhanced Logging**
   - Add telemetry to track online vs offline assessment usage
   - Log which assessments were Gemini vs YOLO-only

4. **Sync Handling**
   - Ensure offline assessments get Gemini analysis when reconnected
   - Track assessment version (Gemini vs local fallback)

