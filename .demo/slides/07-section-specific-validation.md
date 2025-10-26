---
layout: two-columns
---

# Section-Specific Profile Validation
**Independent Save Logic**

## The Problem
**Before:**
- Cannot save Personal Info if Emergency Contact has errors
- All-or-nothing validation
- Frustrating UX - fix unrelated errors to save current section

**User scenario:**
1. Fill out Personal Info correctly
2. Leave Emergency Contact incomplete
3. Try to save Personal Info
4. ❌ "Fix emergency contact first"

## The Solution
Independent validation per section.

## How It Works
Three separate validation functions:
- `validatePersonalInfo()` - only checks personal fields
- `validateEmergencyContact()` - only checks emergency fields
- `validateMedicalInfo()` - only checks medical fields

Each section saves independently.

## Why It Matters
- **Flexibility** - save what's complete, finish rest later
- **Less frustration** - no forced completion
- **Better UX** - incremental progress allowed

## User Flow Now
1. Fill out Personal Info correctly
2. Leave Emergency Contact incomplete
3. Save Personal Info
4. ✅ Saved successfully
5. Come back later for Emergency Contact

## Technical Implementation
`app/(tabs)/profile/index.tsx:156` - `validatePersonalInfo()`
`app/(tabs)/profile/index.tsx:234` - `validateEmergencyContact()`
`app/(tabs)/profile/index.tsx:312` - `validateMedicalInfo()`

## Demo Trigger
**User action:** Save Personal Info with empty Emergency Contact → Success
