---
layout: default
---

# Multi-Photo AI Assessment
**Powered by Gemini**

## The Problem
- AI assessment only worked with single photo
- Multiple photos caused crashes
- Users couldn't get comprehensive assessments

## The Solution
Fixed Gemini API integration for multi-photo handling.

## What It Does
- **Accepts up to 3 photos** for one assessment
- **Analyzes all photos together** using Gemini 1.5 Pro
- **Comprehensive results** considering multiple angles
- **Better accuracy** with more visual data

## Why It Matters
- **Medical context** - symptoms often need multiple views
- **Accuracy** - AI sees the full picture
- **User confidence** - more data = better assessment

## Use Case
User has a skin rash on arm:
- Photo 1: Wide view of affected area
- Photo 2: Close-up of texture
- Photo 3: Comparison with unaffected skin
→ AI gives more accurate assessment

## Technical Implementation
`app/(tabs)/ai-assess/index.tsx:142` - Multi-photo upload
`app/(tabs)/ai-assess/result.tsx:67` - Result display
Gemini API integration in backend

## Demo Trigger
**User action:** Upload 3 photos → Submit for assessment → See comprehensive results
