# AI Assessment Logging Fixes - December 7, 2025

## Issues Found

### 1. Inconsistent `createdBy` Field
**Problem**: Online AI assessments showed `createdBy: "System AI"` instead of `createdBy: "AI Assessment"`

**Root Cause**: Backend mutation `logAIAssessment` in `convex/healthEntries.ts` was hardcoded to "System AI"

**Fix**: Changed line 45 from `createdBy: "System AI"` to `createdBy: "AI Assessment"` to match offline behavior

**Location**: `convex/healthEntries.ts:45`

---

### 2. Gemini Always Returns Fallback Message
**Problem**: Gemini consistently returns generic fallback message instead of actual assessment:
```
I apologize, but I'm unable to provide a detailed visual analysis at this time. 
Based on your reported symptoms (the symptoms you described) with severity 5/10...
```

**Possible Root Causes**:
1. **API Response Structure Issue**: Gemini API may be returning data in unexpected format
2. **Safety Filter Blocking**: Medical content might be blocked by safety filters
3. **Empty Context**: API succeeds but returns empty/null context
4. **Error Not Being Logged**: Silent failure falling back without proper logging

**Diagnostic Logging Added**:

#### Frontend (`app/(tabs)/ai-assess/assessment-results.tsx`)
- Added response logging after `generateContext()` call (lines 490-501)
- Logs:
  - Context length
  - Context preview (first 150 chars)
  - Whether context exists
  - Cleaned context details

#### Backend (`convex/aiAssessment.ts`)
- Enhanced request logging (lines 329-339)
- Enhanced response logging (lines 360-366)
- Detailed fallback logging when no context (lines 418-435)
- Success logging with preview (lines 438-441)

**What to Check**:
1. Run an AI assessment with photos
2. Check Convex logs in dashboard
3. Look for these log entries:
   - `📤 Request details:` - verify images are being sent
   - `📥 Gemini response status:` - should be 200
   - `📋 Prompt Feedback:` - check for blockReason
   - `📋 Candidates count:` - should be > 0
   - `❌ No medical assessment generated` - indicates structure issue
   - `✅ Medical assessment completed successfully` - success path

**Next Steps**:
1. Deploy these changes to see Convex logs
2. Run a test assessment and review logs
3. If blocked by safety filters, adjust safety settings further
4. If response structure issue, may need to update API version or format

---

## Files Modified

1. **convex/healthEntries.ts**
   - Line 45: Changed `createdBy: "System AI"` → `createdBy: "AI Assessment"`

2. **app/(tabs)/ai-assess/assessment-results.tsx**
   - Lines 490-501: Added Gemini response logging
   - Logs raw response and cleaned context

3. **convex/aiAssessment.ts**
   - Lines 329-339: Enhanced request logging
   - Lines 360-366: Enhanced response status logging
   - Lines 418-435: Detailed fallback logging with full diagnostic data
   - Lines 438-441: Success logging with content preview

---

## Testing Checklist

- [ ] Test online AI assessment with photos
- [ ] Verify `createdBy` field shows "AI Assessment" (not "System AI")
- [ ] Check Convex logs for Gemini response details
- [ ] Verify Gemini returns actual medical assessment (not fallback)
- [ ] Test offline AI assessment (should still save with createdBy: "AI Assessment")
- [ ] Confirm YOLO detection results are sent to Gemini

---

## Expected Log Flow (Successful Assessment)

```
🔍 Gemini Medical Assessment Request: { category, severity, hasImages: true, ... }
📸 Adding 2 medical images for clinical analysis...
✓ Added medical image 1/2
✓ Added medical image 2/2
📤 Sending medical assessment request to Gemini...
📤 Request details: { modelName, hasImages: true, imageCount: 2, ... }
📥 Gemini response status: 200
📊 Response length: 2458 characters
📋 Candidates count: 1
📋 Candidate 0: { finishReason: 'STOP', safetyRatings: [...] }
✅ Medical assessment completed successfully
✅ Assessment preview: "1. CLINICAL ASSESSMENT\n\nOverall impression..."
✅ Assessment length: 2458 characters
```

---

## Expected Log Flow (If Blocked/Failed)

```
🔍 Gemini Medical Assessment Request: { ... }
📥 Gemini response status: 200
⚠️ Medical content blocked: SAFETY
📋 Prompt Feedback: { blockReason: 'SAFETY', ... }
❌ No medical assessment generated
❌ Candidates data: [...]
❌ Full response structure: { hasCandidates: false, ... }
```

Or:

```
📥 Gemini response status: 400
❌ Non-200 status code: 400
❌ Response preview: { error: { message: "...", code: 400 } }
❌ Gemini API error: ...
```
