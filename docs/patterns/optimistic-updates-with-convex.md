# Optimistic Updates with Convex

## Problem

When using Convex mutations with reactive queries, there's a race condition between:
1. User interaction (e.g., toggling a switch)
2. Mutation execution (async operation to Convex)
3. Query re-execution (reactive update from Convex)
4. UI state update (useEffect syncing query results to local state)

This causes **flickering** when users interact with UI controls, especially during rapid interactions.

## Why It Happens

```tsx
// ❌ BAD: No optimistic update
const handleToggle = async (enabled: boolean) => {
  await toggleMutation({ enabled }); // Wait for Convex
  // UI doesn't update until query re-runs and useEffect fires
};

useEffect(() => {
  if (queryResult !== undefined) {
    setLocalState(queryResult.value); // Delayed update causes flicker
  }
}, [queryResult]);
```

**Timeline of flicker:**
1. User toggles ON → no immediate visual feedback
2. Mutation sent to Convex (network delay)
3. Query re-runs after mutation completes
4. useEffect updates local state
5. **Total delay: ~200-500ms** → visible flicker

## Rapid Toggle Race Condition

Even with optimistic updates, rapid toggling causes issues:

```tsx
// ❌ STILL PROBLEMATIC: Optimistic update without guard
const handleToggle = async (enabled: boolean) => {
  setLocalState(enabled); // Optimistic update
  await toggleMutation({ enabled });
};

useEffect(() => {
  if (queryResult !== undefined) {
    setLocalState(queryResult.value); // Overwrites optimistic updates!
  }
}, [queryResult]);
```

**What happens with rapid toggling:**
1. Toggle ON → optimistic `setLocalState(true)`
2. Mutation 1 starts
3. Toggle OFF (before mutation 1 completes) → optimistic `setLocalState(false)`
4. Mutation 2 starts
5. **Mutation 1 completes** → query returns `true`
6. **useEffect fires** → overwrites with `true` ⚠️ **FLICKER**
7. Mutation 2 completes → query returns `false`
8. useEffect fires → updates to `false`

## Solution: Pending Flag Pattern

Use a **pending flag** to block query updates during active mutations:

```tsx
// ✅ CORRECT: Optimistic update with pending guard
const [isPending, setIsPending] = useState(false);

const handleToggle = async (enabled: boolean) => {
  // 1. Set pending flag to block query updates
  setIsPending(true);

  // 2. Optimistic update for instant UI feedback
  setLocalState(enabled);

  try {
    // 3. Execute mutation
    await toggleMutation({ enabled });
  } catch (error) {
    // 4. Revert on error
    setLocalState(!enabled);
  } finally {
    // 5. Clear pending flag to allow query sync
    setIsPending(false);
  }
};

useEffect(() => {
  // Only update from query if no pending mutations
  if (queryResult !== undefined && !isPending) {
    setLocalState(queryResult.value);
  }
}, [queryResult, isPending]);
```

## Key Principles

1. **Immediate UI feedback**: Update local state before mutation
2. **Block stale updates**: Prevent query results from overwriting optimistic updates
3. **Error recovery**: Revert optimistic update on mutation failure
4. **Eventual consistency**: Sync with Convex once all mutations complete

## Example Implementation

See `app/(tabs)/profile/index.tsx:45-84` for the location services toggle implementation:

```tsx
// Track pending state
const [isPendingLocationToggle, setIsPendingLocationToggle] = useState(false);

// Query with pending guard
useEffect(() => {
  if (locationStatus !== undefined && !isPendingLocationToggle) {
    setUserData((prev) => ({
      ...prev,
      locationServices: locationStatus.locationServicesEnabled || false,
    }));
  }
}, [locationStatus, isPendingLocationToggle]);

// Handler with optimistic update + pending flag
const handleLocationServicesToggle = async (enabled: boolean) => {
  setIsPendingLocationToggle(true);

  setUserData((prev) => ({
    ...prev,
    locationServices: enabled,
  }));

  try {
    await toggleLocationServices({ enabled });
  } catch (error) {
    Alert.alert("Error", "Failed to update location services settings");
    setUserData((prev) => ({
      ...prev,
      locationServices: !enabled,
    }));
  } finally {
    setIsPendingLocationToggle(false);
  }
};
```

## When to Use This Pattern

- ✅ Toggle switches
- ✅ Increment/decrement counters
- ✅ Form inputs with server sync
- ✅ Any UI control that updates server state
- ✅ Rapid user interactions (button mashing, rapid toggles)

## Alternative: Debouncing

For text inputs, consider debouncing instead:

```tsx
const debouncedSave = useMemo(
  () => debounce((value: string) => {
    updateMutation({ value });
  }, 500),
  []
);

const handleChange = (value: string) => {
  setLocalState(value); // Immediate local update
  debouncedSave(value); // Debounced mutation
};
```

## Related Patterns

- **Optimistic UI**: Update UI before server confirms
- **Pessimistic UI**: Wait for server before updating UI
- **Debouncing**: Delay execution until user stops interacting
- **Throttling**: Limit execution frequency
