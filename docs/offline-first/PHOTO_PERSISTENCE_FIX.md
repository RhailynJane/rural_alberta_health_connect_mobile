# Photo Persistence Fix (December 2025)

## Problem

Photos attached to health entries were stored as temporary URIs from `expo-image-picker`. These URIs expire when the app cache clears or the app restarts, causing photos to show as gray placeholders.

## Solution

Implemented offline-first photo storage with permanent local persistence.

### Architecture

```
Photo Capture → Permanent Storage → WatermelonDB (PhotoMetadata) → Display/Sync
                     ↓
              Documents/health_photos/
```

### Key Components

#### 1. PhotoMetadata Type (`utils/photoStorage/index.ts`)

```typescript
interface PhotoMetadata {
  localPath: string;        // Permanent path in Documents directory
  convexUrl: string | null; // Cloud URL after upload
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  filename: string;
  size: number;
  createdAt: number;
}
```

#### 2. Permanent Storage (`utils/photoStorage/index.ts`)

- `savePhotoToPermanentStorage()`: Copies temp URI to `Documents/health_photos/`
- `savePhotosToPermanentStorage()`: Batch save
- `getDisplayUri()`: Returns best available URI (convexUrl > localPath)

#### 3. WatermelonDB Integration (`watermelon/models/HealthEntry.ts`)

The `photos` field uses `@json` decorator with a backward-compatible sanitizer:
- Handles new `PhotoMetadata[]` format
- Converts legacy `string[]` format automatically
- Filters out invalid entries

#### 4. Sync to Convex (`app/hooks/useSyncOnOnline.ts`)

When syncing offline entries to Convex:
- Extracts URIs from PhotoMetadata objects
- Prefers `convexUrl` over `localPath`
- Handles both new and legacy formats

```typescript
photos = photos.map((photo) => {
  if (typeof photo === 'string') return photo;
  if (typeof photo === 'object') {
    return photo.convexUrl || photo.localPath || '';
  }
  return '';
}).filter(Boolean);
```

### Data Flow

| Flow | Photo Storage | WatermelonDB | Convex |
|------|--------------|--------------|--------|
| AI Assessment | Permanent local | PhotoMetadata[] | string[] |
| Manual Entry (Online) | Convex upload | PhotoMetadata[] | string[] |
| Manual Entry (Offline) | Permanent local | PhotoMetadata[] | Synced later |
| Edit Entry | Loaded from DB | PhotoMetadata[] | string[] |

### Display Logic

All display components use URI extraction:
```typescript
const displayUri = photo.convexUrl || photo.localPath || '';
```

### Backward Compatibility

- Legacy entries with `string[]` photos continue to work
- Sanitizer auto-converts legacy format to PhotoMetadata on read
- No schema migration required (column type unchanged)

### Files Modified

- `utils/photoStorage/index.ts` - Core storage utilities
- `utils/photoStorage/uploadSync.ts` - Convex upload helpers
- `watermelon/models/HealthEntry.ts` - PhotoMetadata sanitizer
- `app/(tabs)/ai-assess/index.tsx` - Photo capture
- `app/(tabs)/ai-assess/assessment-results.tsx` - Save flow
- `app/(tabs)/tracker/add-health-entry.tsx` - Manual entry + edit
- `app/(tabs)/tracker/log-details.tsx` - Display
- `app/hooks/useSyncOnOnline.ts` - Offline sync
