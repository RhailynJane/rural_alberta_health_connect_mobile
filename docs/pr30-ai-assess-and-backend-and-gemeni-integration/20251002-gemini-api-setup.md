# Gemini API Setup Guide

**Date:** October 2, 2025

---

## How They Handle Gemini API Key

### Backend (Convex Action)

**File:** `convex/aiAssessment.ts`

**Line 145:**
```typescript
const apiKey = process.env.GEMINI_API_KEY;
```

The API key is accessed from **Convex environment variables**, not from your local `.env` files.

### Important: Convex Environment Variables ≠ Local .env

**Your `.env.local` file contains:**
- `CONVEX_DEPLOYMENT` - Your Convex project
- `EXPO_PUBLIC_CONVEX_URL` - Convex cloud URL
- `FOURSQUARE_SERVICE_KEY` - For location services

**But NOT Gemini API key!**

Why? Because:
- Convex **actions** run on Convex servers (not your local machine)
- They need environment variables set **in Convex dashboard**, not locally
- This keeps API keys secure and separate from your code

---

## Where Prompts Are Stored

### Main Prompt Location

**File:** `convex/aiAssessment.ts`

**Lines 67-92: System Prompt**
```typescript
const systemPrompt = `CRITICAL: You are a licensed emergency medicine physician
providing legitimate medical triage in rural Alberta, Canada...`
```

This defines the AI's role as an emergency medicine physician with trauma experience.

**Lines 96-142: User Prompt**
```typescript
const userPrompt = `
HEALTHCARE TRIAGE ASSESSMENT - RURAL ALBERTA EMERGENCY MEDICINE

PATIENT MEDICAL PRESENTATION:
Chief Complaint: ${description}
Medical Category: ${category}
Patient-Reported Pain/Severity: ${severity}/10
...
`;
```

This creates the specific patient case for the AI to analyze.

**Everything is in code** - no separate prompt files.

---

## How to Get a Gemini API Key

### Step 1: Go to Google AI Studio

**URL:** https://aistudio.google.com/apikey

### Step 2: Create API Key

1. Sign in with your Google account
2. Click "Get API Key" or "Create API Key"
3. Select a Google Cloud project (or create new one)
4. Copy the API key (starts with `AI...`)

### Step 3: Add to Convex Environment Variables

**Two ways to do this:**

#### Method A: Convex Dashboard (Recommended)

1. Go to https://dashboard.convex.dev
2. Select your project: `rural-alberta-health-connect-mobile`
3. Click "Settings" → "Environment Variables"
4. Add new variable:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** Your API key (e.g., `AIzaSy...`)
5. Save

#### Method B: Convex CLI

```bash
npx convex env set GEMINI_API_KEY "your-api-key-here"
```

---

## Verify It's Working

### Test the Setup

1. Set the environment variable in Convex (steps above)

2. Run the AI assessment flow in your app:
   - Go to AI Assess tab
   - Describe symptoms
   - Rate severity
   - Select duration
   - Submit

3. Check Convex dashboard logs for:
   ```
   ✅ Medical assessment completed successfully
   ```

   Or errors like:
   ```
   ❌ Gemini API key missing
   ```

---

## Which Gemini Model They Use

**File:** `convex/aiAssessment.ts`, **Line 156:**

```typescript
const modelName = "gemini-2.5-flash-lite";
```

**Why this model:**
- ✅ Supports **vision** (can analyze images)
- ✅ **Fast** and cheap
- ✅ Good for medical triage
- ✅ Latest model with better safety handling

**API Endpoint:**
```
https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent
```

---

## Safety Settings

**Lines 198-215** in `aiAssessment.ts`:

```typescript
safetySettings: [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
]
```

**Why so permissive:**
- Medical content (burns, wounds, injuries) can trigger safety filters
- Setting to `BLOCK_NONE` allows legitimate medical analysis
- `SEXUALLY_EXPLICIT` kept at `BLOCK_ONLY_HIGH` for appropriateness

---

## Fallback Handling

**If Gemini fails or blocks content:**

The code has multiple fallback strategies:

1. **Prompt feedback blocking** (Line 255-302)
   - Tries to use partial response
   - Special handling for burns
   - Returns structured fallback assessment

2. **Error handling** (Line 318-352)
   - Category-specific fallbacks (e.g., burn-specific advice)
   - Generic fallback with severity-based recommendations

**Fallback Function:** `getDetailedFallbackAssessment()` (Lines 18-36)

Returns basic triage advice based on severity without AI.

---

## Cost Considerations

**Gemini 2.5 Flash Lite Pricing:**
- Free tier: 15 requests/minute, 1M requests/day
- Input: $0.0375 per million tokens
- Output: $0.15 per million tokens
- Vision: $0.0002 per image

**For MVP:**
- Free tier is more than enough
- Even with 100 users/day doing assessments = well under limits

---

## Summary Checklist

- [ ] Get Gemini API key from https://aistudio.google.com/apikey
- [ ] Add to Convex dashboard: `GEMINI_API_KEY`
- [ ] Test AI assessment flow
- [ ] Check Convex logs for success/errors
- [ ] Monitor usage in Google AI Studio

**Prompts:** Already in code at `convex/aiAssessment.ts`
**Model:** `gemini-2.5-flash-lite`
**Cost:** Free for MVP usage

---

## Next Steps After Getting API Key

Once you have the key set up:
1. Focus on fixing image upload in AI assessment flow
2. Test end-to-end with real images
3. Verify Gemini receives and analyzes images properly
4. Ship MVP

The AI infrastructure is already built - you just need the API key!
