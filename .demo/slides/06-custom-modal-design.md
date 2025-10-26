---
layout: default
---

# Custom Modal Design System
**Cohesive UI Language**

## The Problem
- Default React Native `Alert.alert` modals (gray, system-style)
- Inconsistent design across app
- Not matching app's visual identity
- Generic, unprofessional look

## The Solution
Custom modal component with consistent design system.

## Design Specs
- **Background:** Pure white (`#FFFFFF`)
- **Elevation:** 8 (subtle shadow)
- **Border radius:** 16px (soft corners)
- **Button color:** Brand blue (`#2A7DE1`)
- **Typography:** BarlowSemiCondensed (app font)
- **Layout:** Centered, clean, accessible

## Where It's Used
Replaced gray modals in:
- Address validation errors
- Phone number validation
- Photo upload limits
- Emergency contact validation
- Medical history validation
- Profile save confirmations

## Why It Matters
- **Brand consistency** - every modal feels like RAHC
- **Professionalism** - polished, intentional design
- **User trust** - cohesive experience builds confidence

## Technical Implementation
`app/components/CustomModal.tsx` - Modal component
Used throughout: personal-info, emergency-contact, medical-history, profile, tracker, ai-assess

## Demo Trigger
**User action:** Trigger any validation error → See custom white modal (not gray Alert)
