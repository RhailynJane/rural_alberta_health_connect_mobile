/**
 * Offline Photo Upload Utility
 *
 * Handles uploading locally-stored photos to Convex Storage when syncing
 * offline health entries back to the server.
 *
 * Uses the same upload pattern as the working code in:
 * - assessment-results.tsx (uploadPhotosToStorage)
 * - add-health-entry.tsx (handleImageSelected)
 */

const LOG_PREFIX = '[PhotoSync]';

/**
 * Check if a URI is already a Convex Storage URL
 */
export function isConvexUrl(uri: string): boolean {
  if (!uri || typeof uri !== 'string') return false;
  return uri.includes('convex.cloud') || uri.includes('convex.site');
}

/**
 * Upload a single local photo to Convex Storage
 * Uses the same pattern as the working upload in assessment-results.tsx
 *
 * @returns Convex Storage URL or null if upload failed
 */
async function uploadSinglePhoto(
  localUri: string,
  generateUploadUrl: () => Promise<string>,
  storeUploadedPhoto: (args: { storageId: any }) => Promise<string>
): Promise<string | null> {
  try {
    console.log(`${LOG_PREFIX} 📤 Starting upload for:`, localUri.substring(0, 60));

    // Generate upload URL from Convex
    const uploadUrl = await generateUploadUrl();
    console.log(`${LOG_PREFIX} 🔗 Got upload URL`);

    // Fetch the local file as blob (same pattern as working code)
    const response = await fetch(localUri);
    if (!response.ok) {
      console.error(`${LOG_PREFIX} ❌ Could not fetch local file:`, response.status);
      return null;
    }
    const blob = await response.blob();
    console.log(`${LOG_PREFIX} 📦 Got blob, size:`, blob.size, 'type:', blob.type);

    // Upload to Convex Storage
    const result = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'image/jpeg' },
      body: blob,
    });

    if (!result.ok) {
      console.error(`${LOG_PREFIX} ❌ Upload failed:`, result.status);
      return null;
    }

    // Get storage ID and convert to permanent URL
    const { storageId } = await result.json();
    if (!storageId) {
      console.error(`${LOG_PREFIX} ❌ No storageId in response`);
      return null;
    }

    const photoUrl = await storeUploadedPhoto({ storageId });
    console.log(`${LOG_PREFIX} ✅ Got Convex URL:`, photoUrl?.substring(0, 50));

    return photoUrl;
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Upload error for ${localUri}:`, error);
    return null;
  }
}

export interface UploadResult {
  /** Successfully uploaded photo URLs (Convex Storage URLs) */
  uploadedUrls: string[];
  /** Count of photos that were already Convex URLs (skipped) */
  skippedCount: number;
  /** Count of photos that failed to upload */
  failedCount: number;
  /** URIs of photos that failed to upload */
  failedUris: string[];
}

/**
 * Upload local photos to Convex Storage
 *
 * This function:
 * 1. Skips photos that are already Convex URLs
 * 2. Checks if local files exist before attempting upload
 * 3. Uploads each photo to Convex Storage
 * 4. Returns the new Convex Storage URLs
 *
 * @param localUris - Array of photo URIs (mix of local and Convex URLs)
 * @param generateUploadUrl - Convex mutation to generate upload URL
 * @param storeUploadedPhoto - Convex mutation to get permanent URL from storage ID
 * @returns Upload result with new URLs and stats
 */
export async function uploadOfflinePhotos(
  localUris: string[],
  generateUploadUrl: () => Promise<string>,
  storeUploadedPhoto: (args: { storageId: any }) => Promise<string>
): Promise<UploadResult> {
  const result: UploadResult = {
    uploadedUrls: [],
    skippedCount: 0,
    failedCount: 0,
    failedUris: [],
  };

  if (!localUris || localUris.length === 0) {
    console.log(`${LOG_PREFIX} No photos to process`);
    return result;
  }

  console.log(`${LOG_PREFIX} 🔍 Processing ${localUris.length} photo(s) for upload...`);
  console.log(`${LOG_PREFIX} 📋 Input URIs:`, localUris.map(u => u?.substring(0, 50)));

  for (const uri of localUris) {
    // Skip empty URIs
    if (!uri || (typeof uri === 'string' && uri.trim() === '')) {
      console.log(`${LOG_PREFIX} ⏭️ Skipping empty URI`);
      continue;
    }

    // Handle non-string URIs (shouldn't happen but be defensive)
    if (typeof uri !== 'string') {
      console.warn(`${LOG_PREFIX} ⚠️ Non-string URI:`, typeof uri, uri);
      continue;
    }

    // Already a Convex URL - keep as-is
    if (isConvexUrl(uri)) {
      console.log(`${LOG_PREFIX} ⏭️ Already Convex URL, keeping:`, uri.substring(0, 50));
      result.uploadedUrls.push(uri);
      result.skippedCount++;
      continue;
    }

    // Upload to Convex Storage (fetch will fail if file doesn't exist)
    const convexUrl = await uploadSinglePhoto(uri, generateUploadUrl, storeUploadedPhoto);

    if (convexUrl) {
      result.uploadedUrls.push(convexUrl);
    } else {
      result.failedCount++;
      result.failedUris.push(uri);
    }
  }

  console.log(`${LOG_PREFIX} ✅ Upload complete:`, {
    total: localUris.length,
    uploaded: result.uploadedUrls.length - result.skippedCount,
    skipped: result.skippedCount,
    failed: result.failedCount,
    resultUrls: result.uploadedUrls.map(u => u?.substring(0, 50)),
  });

  return result;
}

/**
 * Check if an array of photo URIs contains any local (non-Convex) URIs
 * that need to be uploaded
 */
export function hasLocalPhotos(photos: string[]): boolean {
  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    console.log(`${LOG_PREFIX} hasLocalPhotos: no photos array or empty`);
    return false;
  }

  const hasLocal = photos.some(uri => {
    if (!uri || typeof uri !== 'string') return false;
    const isLocal = !isConvexUrl(uri);
    return isLocal;
  });

  console.log(`${LOG_PREFIX} hasLocalPhotos:`, hasLocal, 'photos:', photos.length,
    'sample:', photos[0]?.substring(0, 40));

  return hasLocal;
}
