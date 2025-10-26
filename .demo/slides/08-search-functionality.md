---
layout: default
---

# Search in Health Tracker
**Find Your Data Fast**

## The Problem
- Users logging health data daily for weeks/months
- Hundreds of entries accumulate
- No way to find specific symptoms or dates
- Scrolling endlessly through history

## The Solution
Real-time search in Daily Log and History.

## What It Does
**Search by:**
- Symptom name (e.g., "headache")
- Date (e.g., "Oct 15")
- Notes content
- Health metrics

**Features:**
- Real-time filtering as you type
- Case-insensitive matching
- Searches across all fields
- Instant results

## Why It Matters
**Use case:**
Doctor asks: "When was your last severe headache?"

**Before:** Scroll through weeks of entries, might miss it
**After:** Type "headache" → See all headache entries instantly

## Where It's Used
- **Daily Log:** Search today's entries
- **History:** Search all past entries

## Technical Implementation
`app/(tabs)/tracker/daily-log.tsx:89` - Daily log search
`app/(tabs)/tracker/history.tsx:123` - History search

## Demo Trigger
**User action:** Type in search bar → Watch entries filter in real-time
