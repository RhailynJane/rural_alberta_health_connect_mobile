---
layout: default
---

# Photo Upload Validation
**Smart Limits & Feedback**

## The Problem
- No upload limits (users could spam photos)
- Race conditions when selecting multiple photos quickly
- No visual feedback when limit reached
- Unclear how many photos uploaded

## The Solution
3-photo limit with intelligent validation and UX.

## What It Does
- **Hard limit: 3 photos max**
- **Visual feedback:**
  - Counter shows `(2/3)` format
  - Buttons gray out at limit
  - Custom modal explains limit
- **Race condition protection** - validates before picker opens
- **Clear state management** - prevents simultaneous uploads

## Why It Matters
- **Prevents abuse** - API cost control
- **Better UX** - clear expectations
- **Data management** - reasonable storage per entry

## Where It's Used
- **Health Tracker:** Log symptoms with up to 3 photos
- **AI Assessment:** Submit 3 photos for analysis

## Technical Implementation
`app/(tabs)/tracker/add-health-entry.tsx:234` - Photo limit logic
`app/(tabs)/ai-assess/index.tsx:189` - Assessment photo validation

## Demo Trigger
**User action:** Upload 3 photos → Try to add 4th → See disabled button + counter
