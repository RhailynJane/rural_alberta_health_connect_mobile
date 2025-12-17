/**
 * Photo Storage Utility
 *
 * Handles persistent storage of photos for offline-first architecture.
 * Copies temporary image picker files to permanent Documents directory.
 */

import * as FileSystem from 'expo-file-system/legacy';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface PhotoMetadata {
  /** Permanent local file path in Documents directory */
  localPath: string;
  /** Convex storage URL (null until uploaded) */
  convexUrl: string | null;
  /** Upload status for sync */
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  /** Original filename */
  filename: string;
  /** File size in bytes */
  size: number;
  /** Timestamp when photo was taken/added */
  createdAt: number;
}

export interface SavePhotoResult {
  success: boolean;
  metadata?: PhotoMetadata;
  error?: string;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Directory name for health entry photos */
const PHOTOS_DIR = 'health_photos';

/** Get the photos directory path */
const getPhotosDir = (): string => {
  return `${FileSystem.documentDirectory}${PHOTOS_DIR}/`;
};

// ═══════════════════════════════════════════════════════════
// DIRECTORY MANAGEMENT
// ═══════════════════════════════════════════════════════════

/**
 * Ensures the photos directory exists
 */
export async function ensurePhotosDirectory(): Promise<void> {
  const dir = getPhotosDir();
  const dirInfo = await FileSystem.getInfoAsync(dir);

  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    console.log('📁 [PhotoStorage] Created photos directory:', dir);
  }
}

// ═══════════════════════════════════════════════════════════
// FILE OPERATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Generates a unique filename for a photo
 */
function generateFilename(entryId: string, index: number): string {
  const timestamp = Date.now();
  return `${entryId}_${timestamp}_${index}.jpg`;
}

/**
 * Extracts file extension from URI or defaults to jpg
 */
function getExtension(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * Copies a temporary photo to permanent storage
 *
 * @param tempUri - Temporary URI from image picker (file:// or content://)
 * @param entryId - Health entry ID for organizing photos
 * @param index - Photo index within the entry
 * @returns SavePhotoResult with metadata or error
 */
export async function savePhotoToPermanentStorage(
  tempUri: string,
  entryId: string,
  index: number
): Promise<SavePhotoResult> {
  try {
    // Ensure directory exists
    await ensurePhotosDirectory();

    // Check if source file exists
    const sourceInfo = await FileSystem.getInfoAsync(tempUri);
    if (!sourceInfo.exists) {
      return {
        success: false,
        error: `Source file does not exist: ${tempUri}`,
      };
    }

    // Generate destination path
    const extension = getExtension(tempUri);
    const filename = `${entryId}_${Date.now()}_${index}.${extension}`;
    const destPath = `${getPhotosDir()}${filename}`;

    // Copy file to permanent storage
    await FileSystem.copyAsync({
      from: tempUri,
      to: destPath,
    });

    // Verify copy succeeded
    const destInfo = await FileSystem.getInfoAsync(destPath);
    if (!destInfo.exists) {
      return {
        success: false,
        error: 'Failed to copy file to permanent storage',
      };
    }

    const metadata: PhotoMetadata = {
      localPath: destPath,
      convexUrl: null,
      uploadStatus: 'pending',
      filename,
      size: destInfo.size || 0,
      createdAt: Date.now(),
    };

    console.log('✅ [PhotoStorage] Saved photo:', filename);
    return { success: true, metadata };

  } catch (error) {
    console.error('❌ [PhotoStorage] Error saving photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Saves multiple photos to permanent storage
 *
 * @param tempUris - Array of temporary URIs
 * @param entryId - Health entry ID
 * @returns Array of SavePhotoResults
 */
export async function savePhotosToPermanentStorage(
  tempUris: string[],
  entryId: string
): Promise<SavePhotoResult[]> {
  const results: SavePhotoResult[] = [];

  for (let i = 0; i < tempUris.length; i++) {
    const result = await savePhotoToPermanentStorage(tempUris[i], entryId, i);
    results.push(result);
  }

  return results;
}

/**
 * Checks if a photo file exists at the given path
 */
export async function photoExists(path: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Deletes a photo from permanent storage
 */
export async function deletePhoto(path: string): Promise<boolean> {
  try {
    const exists = await photoExists(path);
    if (exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
      console.log('🗑️ [PhotoStorage] Deleted photo:', path);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ [PhotoStorage] Error deleting photo:', error);
    return false;
  }
}

/**
 * Gets a valid URI for displaying a photo
 * Returns convexUrl if available, otherwise localPath
 * Returns null if neither exists
 */
export async function getDisplayUri(metadata: PhotoMetadata): Promise<string | null> {
  // Prefer Convex URL if uploaded
  if (metadata.convexUrl && metadata.uploadStatus === 'uploaded') {
    return metadata.convexUrl;
  }

  // Fall back to local path
  if (metadata.localPath) {
    const exists = await photoExists(metadata.localPath);
    if (exists) {
      return metadata.localPath;
    }
  }

  return null;
}

/**
 * Reads a photo as base64 for API uploads
 */
export async function readPhotoAsBase64(path: string): Promise<string | null> {
  try {
    const exists = await photoExists(path);
    if (!exists) {
      console.warn('⚠️ [PhotoStorage] File not found for base64 read:', path);
      return null;
    }

    const base64 = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return base64;
  } catch (error) {
    console.error('❌ [PhotoStorage] Error reading photo as base64:', error);
    return null;
  }
}

/**
 * Gets file info for a photo
 */
export async function getPhotoInfo(path: string): Promise<FileSystem.FileInfo | null> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists ? info : null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// MIGRATION HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Checks if a URI is a temporary cache path that needs migration
 */
export function isTempUri(uri: string): boolean {
  if (!uri) return false;

  // Common temp path patterns
  const tempPatterns = [
    '/ImagePicker/',
    '/tmp/',
    '/cache/',
    '/Caches/',
    'content://',  // Android content URIs
  ];

  return tempPatterns.some(pattern => uri.includes(pattern));
}

/**
 * Checks if a URI is a Convex storage URL
 */
export function isConvexUrl(uri: string): boolean {
  if (!uri) return false;
  return uri.includes('convex.cloud') || uri.includes('convex.site');
}

/**
 * Checks if a URI is a permanent local path
 */
export function isPermanentLocalPath(uri: string): boolean {
  if (!uri) return false;
  return uri.includes(PHOTOS_DIR);
}
