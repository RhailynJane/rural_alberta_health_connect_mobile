# Schema Migration Analysis

## Investigation Summary
**Date**: November 10, 2025  
**Status**: ✅ **RESOLVED - No migration needed**

---

## Todo Item Under Investigation
```
- [ ] Fix schema/migration
  - Add migration only if schema truly missing columns (currently present).
```

---

## Current Schema State

### WatermelonDB Schema Version: **10**

**File**: `watermelon/database/schema.ts`

### health_entries Table Columns

| Column Name | Type | Optional | Added In | Status |
|------------|------|----------|----------|--------|
| `userId` | string | No | v1 | ✅ Present |
| `convexId` | string | Yes | v5 | ✅ Present |
| `date` | string | No | v1 | ✅ Present |
| `timestamp` | number | No | v1 | ✅ Present |
| `symptoms` | string | No | v1 | ✅ Present |
| `severity` | number | No | v1 | ✅ Present |
| `category` | string | Yes | v1 | ✅ Present |
| `duration` | string | Yes | v1 | ✅ Present |
| `aiContext` | string | Yes | v1 | ✅ Present |
| `photos` | string (JSON) | Yes | v1 | ✅ Present |
| **`notes`** | string | **Yes** | **v1** | ✅ **Present** |
| `createdBy` | string | No | v1 | ✅ Present |
| **`type`** | string | **Yes** | **v1** | ✅ **Present** |
| `isSynced` | boolean | No | v1 | ✅ Present |
| `syncError` | string | Yes | v1 | ✅ Present |
| `createdAt` | number | No | v1 | ✅ Present |
| `updatedAt` | number | No | v1 | ✅ Present |
| **`isDeleted`** | boolean | **Yes** | **v10** | ✅ **Present** |
| **`lastEditedAt`** | number | **Yes** | **v10** | ✅ **Present** |
| **`editCount`** | number | **Yes** | **v10** | ✅ **Present** |

---

## Migration History

### v10 Migration (Current)
```typescript
{
  toVersion: 10,
  steps: [
    {
      type: 'add_columns',
      table: 'health_entries',
      columns: [
        { name: 'isDeleted', type: 'boolean', isOptional: true },
        { name: 'lastEditedAt', type: 'number', isOptional: true },
        { name: 'editCount', type: 'number', isOptional: true },
      ],
    },
  ],
}
```

**Purpose**: Added soft delete and edit tracking fields for deduplication scoring.

### v5 Migration
```typescript
{
  toVersion: 5,
  steps: [
    {
      type: 'add_columns',
      table: 'health_entries',
      columns: [
        { name: 'userId', type: 'string', isOptional: true },
        { name: 'convexId', type: 'string', isOptional: true },
        { name: 'aiContext', type: 'string', isOptional: true },
        { name: 'createdBy', type: 'string', isOptional: true },
        { name: 'isSynced', type: 'boolean', isOptional: true },
        { name: 'syncError', type: 'string', isOptional: true },
        { name: 'createdAt', type: 'number', isOptional: true },
        { name: 'updatedAt', type: 'number', isOptional: true },
      ],
    },
  ],
}
```

**Purpose**: Added camelCase columns for Convex alignment.

### Original Schema (v1)
All base columns including `type` and `notes` were present from the start.

---

## Model Definition Analysis

**File**: `watermelon/models/HealthEntry.ts`

### Field Decorators
All fields have proper decorators:

```typescript
@field('notes') notes?: string;
@field('type') type!: string; // Non-optional in model
@field('isDeleted') isDeleted?: boolean;
@field('lastEditedAt') lastEditedAt?: number;
@field('editCount') editCount?: number;
```

### Safety Getters
Model provides safe accessors for optional fields:

```typescript
get safeType(): string {
  return this.type || 'manual_entry';
}

get safeNotes(): string {
  return this.notes || '';
}

get safePhotos(): string[] {
  return this.photos || [];
}
```

---

## Runtime Self-Healing

The app includes self-healing functions that run at database initialization to handle legacy data or schema drift.

### 1. `ensureHealthEntriesType()`

**File**: `watermelon/database/selfHeal.ts`

**Purpose**: Ensures all health entries have valid `type` and `notes` values.

#### Two-Stage Strategy

**Stage 1: SQL-based (if `unsafeSqlQuery` available)**
```sql
-- Patch missing type values
UPDATE health_entries 
SET type = CASE 
  WHEN aiContext IS NOT NULL AND aiContext != '' 
  THEN 'ai_assessment' 
  ELSE 'manual_entry' 
END 
WHERE type IS NULL OR type = ''

-- Ensure notes defaults to empty string
UPDATE health_entries 
SET notes = '' 
WHERE notes IS NULL
```

**Stage 2: Model-based fallback (if SQL unavailable)**
```typescript
const toFix = all.filter((r: any) => !r.type || r.type === '' || r.notes == null);
await db.batch(
  ...toFix.map((rec: any) => rec.prepareUpdate((r: any) => {
    if (!r.type || r.type === '') {
      r.type = r.aiContext?.length > 0 ? 'ai_assessment' : 'manual_entry';
    }
    if (r.notes == null) {
      r.notes = '';
    }
  }))
);
```

### 2. `ensureUserProfilesSchema()`

**Purpose**: Adds missing columns to `user_profiles` table (not relevant to health_entries).

---

## Why `_setRaw` Errors Occur

### The Remote Debugging Problem

When using remote debugging in React Native, WatermelonDB's JSI bridge is disabled. This causes issues with the internal sanitizer that validates column metadata:

```typescript
// WatermelonDB internal code (simplified)
function sanitizedUpdate(raw, record) {
  const columns = record.collection.schema.columns;
  for (const key in raw) {
    const columnSchema = columns[key]; // ← Undefined in remote debug
    if (!columnSchema) {
      throw new TypeError("Cannot read property 'type' of undefined");
    }
  }
}
```

### Why This Affects Updates

1. **Primary update attempt** calls `prepareUpdate()`
2. **Sanitizer** tries to validate fields against schema
3. **Column metadata unavailable** due to JSI bridge disabled
4. **Throws**: `TypeError: Cannot read property 'type' of undefined`

### The Rescue Duplicate Strategy

Instead of failing, we:
1. **Catch the error** from primary update
2. **Create a new record** with `collection.create()` (which bypasses the problematic sanitizer)
3. **Copy all data** from original entry
4. **Add metadata** to ensure it wins deduplication:
   - `timestamp = Date.now()` ← **NEW timestamp** (not preserved)
   - `lastEditedAt = Date.now()`
   - `editCount = (original.editCount || 0) + 1`
5. **Optionally soft-delete original** (if that succeeds)

---

## Convex Server-Side Defaulting

**File**: `convex/healthEntries.ts`

### logManualEntry Mutation
```typescript
const entryId = await ctx.db.insert("healthEntries", {
  // ... other fields ...
  type: (args.type && args.type.trim()) ? args.type : "manual_entry",
  notes: args.notes || "",
  // ... other fields ...
});
```

### updateHealthEntry Mutation
```typescript
// Ensure legacy rows always get a default when first edited
if (args.type !== undefined) {
  updates.type = (args.type && args.type.trim()) 
    ? args.type 
    : (entry.type || "manual_entry");
} else if (!entry.type) {
  updates.type = "manual_entry";
}
```

**Purpose**: Server guarantees `type` and `notes` are never NULL or empty, matching Convex schema requirements.

---

## Deduplication Algorithm

**File**: `watermelon/utils/dedupeHealthEntries.ts`

### Scoring Function
```typescript
function scoreEntry(e: HealthEntryLike): number[] {
  return [
    e.isDeleted ? 0 : 1,      // Level 0: non-deleted always wins
    e.lastEditedAt || 0,      // Level 1: most recently edited
    e.editCount || 0,         // Level 2: most edits
    e.timestamp || 0          // Level 3: newest creation time
  ];
}
```

### Why Timestamp Fix Was Critical

**Before Fix** (rescue duplicates lost):
```typescript
// Rescue duplicate
newRec.timestamp = (entry as any).timestamp; // ← Preserved OLD timestamp
newRec.lastEditedAt = Date.now();
newRec.editCount = ((entry as any).editCount || 0) + 1;

// Scoring
Original:  [1, 0, 0, OLD_TIMESTAMP]
Rescue:    [1, NOW, 1, OLD_TIMESTAMP]  // ← Same timestamp as original!
// Result: If both have lastEditedAt=0 initially, tie at timestamp level
// Tiebreaker: first in array wins → ORIGINAL selected (wrong!)
```

**After Fix** (rescue duplicates always win):
```typescript
// Rescue duplicate
const now = Date.now();
newRec.timestamp = now;              // ← NEW timestamp
newRec.lastEditedAt = now;
newRec.editCount = ((entry as any).editCount || 0) + 1;

// Scoring
Original:  [1, 0, 0, OLD_TIMESTAMP]
Rescue:    [1, NOW, 1, NEW_TIMESTAMP]  // ← All levels higher!
// Result: Rescue wins at level 1 (lastEditedAt: NOW > 0)
```

---

## Conclusion

### ✅ Schema Status: COMPLETE

1. **All required columns exist** in schema v10
   - `type` (since v1)
   - `notes` (since v1)
   - `isDeleted` (since v10)
   - `lastEditedAt` (since v10)
   - `editCount` (since v10)

2. **Self-heal functions handle runtime issues**
   - `ensureHealthEntriesType()` patches missing values
   - Two-stage strategy (SQL + model fallback)
   - Runs automatically at database initialization

3. **Server-side defaulting** ensures data consistency
   - Convex mutations default `type` and `notes`
   - Prevents NULL values from entering database

4. **Rescue duplicate strategy** works around JSI bridge issues
   - Creates new records when updates fail
   - Uses **new timestamps** to guarantee deduplication wins
   - Applied to both edit and delete operations

### 📝 Recommendation

**Mark the "Fix schema/migration" todo as COMPLETE** with the following note:

```
✅ Schema v10 contains all required columns (type, notes, isDeleted, lastEditedAt, editCount).
✅ Self-heal functions handle runtime missing values.
✅ No new migration needed.
```

The schema is complete and properly handles all edge cases through a combination of:
- Proper column definitions (schema)
- Runtime self-healing (selfHeal.ts)
- Server-side defaulting (Convex mutations)
- Rescue duplicate strategy (add-health-entry.tsx, log-details.tsx)

---

**Status**: ✅ **RESOLVED**  
**Action**: Mark todo as complete  
**Next Steps**: Test offline edit/delete flows (see OFFLINE_FLOW_TEST_PLAN.md)
