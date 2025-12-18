# Rebase Log: On-Device LLM Feature onto Dev

**Date**: 2025-12-12
**Branch**: `yue/on-device-wound-assessment` (rebased onto `origin/dev`)
**Backup**: `backup/rn-bouy-integration-20251212`

## Commits (5 total)

```
6a5bce2 feat: add useWoundLLMStatic hook and fix on-device assessment saving
e435706 fix: optimize useWoundLLM hook with individual selectors to reduce re-renders
f535a39 fix(llm): use expo-modules-core EventEmitter and fix useSyncExternalStore
6c79bd7 refactor: simplify useWoundLLM hook implementation
f38636b feat: integrate ExecuTorch on-device LLM for wound assessment (Android)
```

---

## Conflicts Resolved

### 1. `app/_layout.tsx`

**Conflict**: Dev refactored to use `RootLayoutContent` component; our branch added `<LLMHost />` inside `SafeAreaProvider`.

**Resolution**: Placed `<LLMHost />` as sibling before `<RootLayoutContent />` inside `<SignUpFormProvider>`:

```tsx
<SignUpFormProvider>
  {/* LLM Host - singleton model manager (persists across tab switches) */}
  <LLMHost />
  <RootLayoutContent ... />
</SignUpFormProvider>
```

**Why**: `LLMHost` must render at root level (outside tabs) to persist model across navigation. Placing it before `RootLayoutContent` ensures it mounts first and never unmounts.

**Potential Issue**: If `RootLayoutContent` expects to be the only child, layout issues may occur. Test navigation and LLM availability across tabs.

---

### 2. `app/(tabs)/ai-assess/assessment-results.tsx`

**Conflict**: Dev added `healthEntriesEvents.emit()` and WatermelonDB entry ID capture; our branch had different save flow without event emission.

**Resolution**: Merged both:
- Keep `const newEntry = await collection.create(...)` to capture entry ID
- Keep `uid || "offline_user"` fallback for robustness
- Keep `healthEntriesEvents.emit()` for tracker/daily-log sync
- Keep our branch's `source` parameter in log messages

```tsx
const newEntry = await collection.create((entry: any) => {
  entry.userId = uid || "offline_user";
  // ... other fields
  entry.isSynced = source === "Cloud";
});
wmEntryId = newEntry.id;

// Emit event for tracker sync
healthEntriesEvents.emit({
  type: 'add',
  watermelonId: wmEntryId,
  timestamp
});
```

**Why**: Event emission is required for real-time tracker updates. Without it, new assessments won't appear in daily log until refresh.

**Potential Issue**: If `healthEntriesEvents` import is missing or API changed, runtime error. Verify import exists.

---

### 3. `app/(tabs)/ai-assess/index.tsx`

**Conflict**: Dev removed `Pressable` import; our branch added `Platform` import for AI source toggle.

**Resolution**: Keep `Platform`, remove `Pressable` (not used):

```tsx
import {
  Modal,
  Platform,  // Added for AI source toggle (Android check)
  ScrollView,
  // ... Pressable removed
}
```

**Why**: `Platform.OS === 'android'` check needed to conditionally show AI source toggle (ExecuTorch only works on Android).

**Potential Issue**: None expected. `Platform` is standard React Native API.

---

## Key Changes in This Feature

1. **LLM Singleton Pattern**: Prevents OOM from repeated model init on tab switch
2. **useWoundLLMStatic Hook**: Prevents 1000+ re-renders during generation (no response subscription)
3. **On-Device Assessment Saving**: Now saves to Convex when online + authenticated
4. **AI Source Toggle**: User can choose Cloud AI vs On-Device AI (Android only)

## Testing Checklist

- [ ] Navigate between tabs while LLM is generating - should not crash
- [ ] On-device assessment saves to Convex when online
- [ ] On-device assessment saves to WatermelonDB when offline
- [ ] New assessments appear in tracker/daily-log immediately (event emission)
- [ ] AI source toggle visible only on Android
- [ ] Cloud AI toggle disabled when offline
- [ ] On-device toggle disabled when model not downloaded
