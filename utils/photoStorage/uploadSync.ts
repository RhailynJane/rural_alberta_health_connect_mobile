/**
 * Photo Upload Sync
 *
 * Handles background uploading of local photos to Convex storage.
 * Works with the offline-first architecture to sync photos when online.
 */

import * as FileSystem from 'expo-file-system/legacy';
import type { PhotoMetadata } from './index';
import { photoExists, readPhotoAsBase64 } from './index';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface UploadResult {
  success: boolean;
  convexUrl?: string;
  storageId?: string;
  error?: string;
}

export interface PhotoUploadCallbacks {
  /** Get upload URL from Convex */
  generateUploadUrl: () => Promise<string>;
  /** Store uploaded photo and get permanent URL */
  storeUploadedPhoto: (args: { storageId: string }) => Promise<string>;
}

// ═══════════════════════════════════════════════════════════
// UPLOAD FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Uploads a single photo to Convex storage
 *
 * @param localPath - Local file path
 * @param callbacks - Convex mutation callbacks
 * @returns UploadResult with convexUrl on success
 */
export async function uploadPhotoToConvex(
  localPath: string,
  callbacks: PhotoUploadCallbacks
): Promise<UploadResult> {
  try {
    // Check if file exists
    const exists = await photoExists(localPath);
    if (!exists) {
      return {
        success: false,
        error: `File not found: ${localPath}`,
      };
    }

    // Get upload URL from Convex
    const uploadUrl = await callbacks.generateUploadUrl();

    // Read file as blob
    const response = await fetch(localPath);
    const blob = await response.blob();

    // Upload to Convex storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'image/jpeg' },
      body: blob,
    });

    if (!uploadResponse.ok) {
      return {
        success: false,
        error: `Upload failed with status ${uploadResponse.status}`,
      };
    }

    const { storageId } = await uploadResponse.json();

    // Get permanent URL
    const convexUrl = await callbacks.storeUploadedPhoto({ storageId });

    console.log('✅ [PhotoUpload] Uploaded to Convex:', convexUrl);

    return {
      success: true,
      convexUrl,
      storageId,
    };
  } catch (error) {
    console.error('❌ [PhotoUpload] Error uploading photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Uploads multiple photos and returns updated metadata
 *
 * @param photos - Array of PhotoMetadata to upload
 * @param callbacks - Convex mutation callbacks
 * @returns Updated PhotoMetadata array with convexUrls
 */
export async function uploadPhotosToConvex(
  photos: PhotoMetadata[],
  callbacks: PhotoUploadCallbacks
): Promise<PhotoMetadata[]> {
  const results: PhotoMetadata[] = [];

  for (const photo of photos) {
    // Skip if already uploaded or no local path
    if (photo.uploadStatus === 'uploaded' || !photo.localPath) {
      results.push(photo);
      continue;
    }

    // Skip if already has a Convex URL
    if (photo.convexUrl) {
      results.push({ ...photo, uploadStatus: 'uploaded' });
      continue;
    }

    // Mark as uploading
    const uploadingPhoto: PhotoMetadata = { ...photo, uploadStatus: 'uploading' };

    try {
      const result = await uploadPhotoToConvex(photo.localPath, callbacks);

      if (result.success && result.convexUrl) {
        results.push({
          ...photo,
          convexUrl: result.convexUrl,
          uploadStatus: 'uploaded',
        });
      } else {
        results.push({
          ...photo,
          uploadStatus: 'failed',
        });
      }
    } catch (error) {
      console.error('❌ [PhotoUpload] Failed to upload:', photo.localPath, error);
      results.push({
        ...photo,
        uploadStatus: 'failed',
      });
    }
  }

  return results;
}

/**
 * Checks if any photos need uploading
 */
export function hasPhotosToUpload(photos: PhotoMetadata[]): boolean {
  return photos.some(
    photo => photo.uploadStatus === 'pending' && photo.localPath && !photo.convexUrl
  );
}

/**
 * Gets count of photos pending upload
 */
export function getPendingUploadCount(photos: PhotoMetadata[]): number {
  return photos.filter(
    photo => photo.uploadStatus === 'pending' && photo.localPath && !photo.convexUrl
  ).length;
}

/**
 * Converts PhotoMetadata array to string[] for Convex storage
 * Uses convexUrl if available, otherwise localPath
 */
export function photosToConvexFormat(photos: PhotoMetadata[]): string[] {
  return photos
    .map(photo => photo.convexUrl || photo.localPath)
    .filter(Boolean);
}
