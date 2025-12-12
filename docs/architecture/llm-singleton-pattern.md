# LLM Singleton Pattern

## Problem

React Native tab navigation unmounts components on tab switch. The ExecuTorch `useLLM` hook holds the model instance, so tab switching causes:
- Model re-initialization on each tab visit
- OOM crashes from multiple model instances

## Solution

Singleton pattern that manages the LLM outside React's component lifecycle.

```
┌─────────────────────────────────────────────────────────┐
│  App Root (_layout.tsx)                                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │  LLMHost (never unmounts)                         │  │
│  │  - Calls useLLM() hook                            │  │
│  │  - Syncs state to LLMSingleton                    │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  LLMSingleton (module-level, persists forever)    │  │
│  │  - Holds model reference                          │  │
│  │  - Broadcasts state via EventEmitter              │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│           ┌──────────────┴──────────────┐               │
│           ▼                             ▼               │
│  ┌─────────────────┐          ┌─────────────────┐       │
│  │  Tab A          │          │  Tab B          │       │
│  │  useWoundLLM()  │          │  useWoundLLM()  │       │
│  │  (subscribes)   │          │  (subscribes)   │       │
│  └─────────────────┘          └─────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `utils/llm/LLMSingleton.ts` | Singleton manager, holds model instance |
| `utils/llm/LLMHost.tsx` | Root-level component that calls `useLLM()` |
| `utils/llm/useWoundLLM.ts` | Consumer hook using `useSyncExternalStore` |

## Implementation Notes

**EventEmitter**: Uses `expo-modules-core` EventEmitter (not Node.js `events` module).

**State Sync**: `useSyncExternalStore` requires stable object references. `getState()` returns `this.state` directly since `updateState()` creates new objects on change.

**Platform**: Android only. iOS excluded via `react-native.config.js` due to OpenCV pod conflict.
