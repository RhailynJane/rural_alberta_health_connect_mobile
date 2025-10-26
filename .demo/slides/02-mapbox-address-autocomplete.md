---
layout: content
---

# Smart Address Autocomplete
**Powered by Mapbox**

## The Problem
- Users typing full addresses manually
- House numbers getting lost
- Invalid addresses entered
- Poor data quality

## The Solution
Mapbox Geocoding API with Canadian filtering.

## What It Does
- **Real-time suggestions** as you type (500ms debounce)
- **Canada-only results** (`country=ca` filter)
- **Preserves house numbers** (previous version stripped them)
- **Auto-populates** all fields:
  - Street address with house number
  - City
  - Province
  - Postal code
  - Region (derived from City, Province)

## Why It Matters
- **Data accuracy** - validated addresses only
- **Speed** - 5 seconds vs 30 seconds to enter address
- **Less frustration** - no typing long addresses

## Technical Implementation
`app/auth/personal-info.tsx:147` - Mapbox integration
`app.json` - Mapbox configuration (removed old Google Maps)

## Demo Trigger
**User action:** Start typing address → Suggestions appear → Select → All fields fill
