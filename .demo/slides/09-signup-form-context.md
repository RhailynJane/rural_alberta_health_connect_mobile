---
layout: two-columns
---

# SignUp Form Context
**Never Lose Your Data**

## The Problem
**User scenario:**
1. Fill out signup form (5+ fields)
2. Click "Terms & Conditions" to read
3. Navigate to Terms page
4. Come back to signup
5. ❌ All form data lost - start over

## The Solution
React Context persists form state across navigation.

## How It Works
- **SignUpFormContext** wraps the signup flow
- Form data stored in context, not component state
- Navigate to Terms/Privacy/etc → data preserved
- Return to form → all fields still filled

## Why It Matters
**Before:**
- Users frustrated re-entering data
- Many abandon signup
- Poor conversion rate

**After:**
- Seamless navigation
- No data loss
- Higher signup completion

## User Flow Now
1. Fill out signup form
2. Click "Terms & Conditions"
3. Read terms
4. Go back
5. ✅ All form data still there

## Technical Implementation
`app/auth/SignUpFormContext.tsx` - Context provider
`app/auth/signup.tsx` - Consumes context
`app/auth/terms.tsx` - Navigation target

## Demo Trigger
**User action:** Fill form → Navigate to Terms → Return → Data persisted
