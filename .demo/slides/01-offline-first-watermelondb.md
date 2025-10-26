---
layout: content
---

# Offline-First Architecture
**The Invisible Foundation**

## The Problem
Rural Alberta has unreliable internet. App must work offline.

## The Solution
WatermelonDB local database with intelligent sync.

## What It Does
- **Works completely offline** - no internet required
- **Queues data locally** when connection drops
- **Auto-syncs** when connection returns
- **No data loss** - everything persists locally first

## Why It Matters
Users in remote areas can:
- Book appointments offline
- Access medical records without connectivity
- Track health data anywhere
- Never lose progress

## The Invisible Work
Most users won't notice - it just works. That's the point.

## Technical Implementation
`app/_layout.tsx:46` - WatermelonDB wrapper configuration
`tsconfig.json` - Database type definitions
Database schema throughout `convex/` backend

## Demo Trigger
**User action:** Toggle airplane mode → App still fully functional
