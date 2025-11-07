# Timestamp Handling Strategy for Edit/Delete Feature

## The Challenge

WatermelonDB and Convex handle timestamps differently, which creates complexity during sync:

### WatermelonDB Auto-managed Fields (READ-ONLY)
```typescript
@readonly @date('createdAt') createdAt!: number;  // Set once on creation
@readonly @date('updatedAt') updatedAt!: number;  // Auto-updated on ANY change
```

**Key Points:**
- These are AUTOMATICALLY managed by WatermelonDB
- They are READ-ONLY - we cannot manually set them
- `createdAt`: Set once when record is created
- `updatedAt`: Updated automatically every time the record changes
- During sync from Convex, we CANNOT override these values

### Our Custom Fields (We Control These)
```typescript
@field('lastEditedAt') lastEditedAt?: number;     // Track user edits
@field('editCount') editCount?: number;           // Version tracking
@field('isDeleted') isDeleted?: boolean;          // Soft delete flag
```

## The Solution

We use a **dual-timestamp** strategy:

1. **WatermelonDB timestamps** (`createdAt`, `updatedAt`)
   - Used for local database operations
   - Track when the local record was created/modified
   - Cannot be synced from Convex (read-only)

2. **Custom timestamps** (`lastEditedAt`)
   - Used for business logic and sync
   - Track when the user actually edited the content
   - Can be synced between Convex and WatermelonDB

## Implementation Details

### Local Operations (WatermelonDB)

```typescript
// When updating locally
await entry.update((record) => {
  // Business fields
  record.symptoms = "Updated symptoms";

  // Our custom tracking
  record.lastEditedAt = Date.now();      // We set this
  record.editCount = (record.editCount || 0) + 1;
  record.isSynced = false;

  // WatermelonDB automatically updates 'updatedAt'
  // We don't touch createdAt or updatedAt
});
```

### Sync Strategy

#### Syncing TO Convex (Local → Server)

```typescript
// The sync should send our custom fields
await updateHealthEntry({
  entryId: convexId,
  userId: userId,
  symptoms: entry.symptoms,
  severity: entry.severity,
  // Don't send createdAt/updatedAt - Convex doesn't need them
  // lastEditedAt is already on the server from the mutation
});
```

#### Syncing FROM Convex (Server → Local)

```typescript
// When pulling data from Convex
await entry.update((record) => {
  record.symptoms = convexData.symptoms;
  record.lastEditedAt = convexData.lastEditedAt;  // Sync custom field
  record.editCount = convexData.editCount;

  // DON'T try to set:
  // record.createdAt = convexData.timestamp;  // This would fail!
  // record.updatedAt = convexData.lastEditedAt;  // This would fail!
});
```

## Conflict Resolution

When resolving sync conflicts:

1. **Use `editCount`** for version tracking
   - Higher editCount = newer version
   - If equal, use `lastEditedAt` as tiebreaker

2. **Last-Write-Wins** for simple conflicts
   - Compare `lastEditedAt` timestamps
   - Newer timestamp wins

3. **Deleted entries** take precedence
   - If one version is deleted and one isn't, deleted wins
   - Prevents "zombie" entries from reappearing

## Important Notes

1. **Never rely on WatermelonDB's `updatedAt` for business logic**
   - It changes on ANY update, including sync operations
   - Use `lastEditedAt` for tracking actual user edits

2. **Idempotency considerations**
   - Current Convex mutations check timestamp+date for duplicates
   - With edits, this check needs adjustment (use convexId instead)

3. **Photos field complexity**
   - Local: file:/// URLs (before upload)
   - Remote: https:// URLs (after upload)
   - Phase 1: Don't edit photo URLs during sync

## Testing Checklist

- [ ] Create entry offline, edit offline, sync online
- [ ] Create entry online, edit offline, sync when back online
- [ ] Delete entry offline, ensure it syncs as deleted
- [ ] Edit same entry on two devices, verify conflict resolution
- [ ] Verify `editCount` increments correctly
- [ ] Verify `lastEditedAt` is preserved during sync
- [ ] Verify WatermelonDB's `updatedAt` changes on sync (expected)
- [ ] Verify `createdAt` never changes (critical)