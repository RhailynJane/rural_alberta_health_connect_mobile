import { Model } from '@nozbe/watermelondb';
import { date, field, json, readonly } from '@nozbe/watermelondb/decorators';
import type { PhotoMetadata } from '../../utils/photoStorage';

/**
 * Sanitizer for photos field - handles both legacy string[] format
 * and new PhotoMetadata[] format for backward compatibility
 */
const photosJsonSanitizer = (raw: unknown): PhotoMetadata[] => {
  try {
    if (!raw) return [];

    let parsed: unknown;
    if (typeof raw === 'string') {
      parsed = JSON.parse(raw);
    } else {
      parsed = raw;
    }

    if (!Array.isArray(parsed)) return [];

    // Handle both formats
    return parsed.map((item: unknown): PhotoMetadata => {
      // New PhotoMetadata format
      if (typeof item === 'object' && item !== null && 'localPath' in item) {
        const meta = item as Record<string, unknown>;
        return {
          localPath: String(meta.localPath || ''),
          convexUrl: meta.convexUrl ? String(meta.convexUrl) : null,
          uploadStatus: (meta.uploadStatus as PhotoMetadata['uploadStatus']) || 'pending',
          filename: String(meta.filename || ''),
          size: Number(meta.size) || 0,
          createdAt: Number(meta.createdAt) || Date.now(),
        };
      }

      // Legacy string URI format - convert to PhotoMetadata
      if (typeof item === 'string') {
        return {
          localPath: item, // Legacy URIs stored as localPath
          convexUrl: item.includes('convex.cloud') || item.includes('convex.site') ? item : null,
          uploadStatus: item.includes('convex.cloud') || item.includes('convex.site') ? 'uploaded' : 'pending',
          filename: item.split('/').pop() || 'unknown',
          size: 0,
          createdAt: Date.now(),
        };
      }

      // Fallback for unknown format
      return {
        localPath: '',
        convexUrl: null,
        uploadStatus: 'pending',
        filename: 'unknown',
        size: 0,
        createdAt: Date.now(),
      };
    }).filter(meta => meta.localPath || meta.convexUrl); // Filter out empty entries
  } catch {
    return [];
  }
};

export default class HealthEntry extends Model {
  static table = 'health_entries';

  @field('userId') userId!: string;
  @field('convexId') convexId?: string;
  @field('date') date!: string;
  @field('timestamp') timestamp!: number;
  @field('symptoms') symptoms!: string;
  @field('severity') severity!: number;
  @field('category') category?: string;
  @field('duration') duration?: string;
  @field('aiContext') aiContext?: string;

  @json('photos', photosJsonSanitizer)
  photos?: PhotoMetadata[];
  
  // Convex schema requires notes (string, non-null) and type (string, non-null)
  // WatermelonDB column for notes is optional in schema, so we defensively coalesce at read/update time.
  @field('notes') notes?: string; // will treat undefined as '' in accessors
  @field('createdBy') createdBy!: string;
  @field('type') type!: string; // make non-optional in model to match Convex; self-heal guarantees value
  @field('isSynced') isSynced!: boolean;
  @field('syncError') syncError?: string;

  // Soft delete and edit tracking (added in v10)
  @field('isDeleted') isDeleted?: boolean;
  @field('lastEditedAt') lastEditedAt?: number;
  @field('editCount') editCount?: number;

  @readonly @date('createdAt') createdAt!: number;
  @readonly @date('updatedAt') updatedAt!: number;

  // Helper getters to ensure safe consumption
  get safeType(): string {
    return this.type || 'manual_entry';
  }
  get safeNotes(): string {
    return this.notes || '';
  }
  get safePhotos(): PhotoMetadata[] {
    return this.photos || [];
  }

  /**
   * Get display URIs for photos - returns best available URI for each photo
   * Prefers convexUrl (remote) over localPath (local file)
   */
  getDisplayUris(): string[] {
    return (this.photos || [])
      .map(photo => photo.convexUrl || photo.localPath)
      .filter(Boolean);
  }

  /**
   * Get photos that need to be uploaded to Convex
   */
  getPendingUploads(): PhotoMetadata[] {
    return (this.photos || []).filter(
      photo => photo.uploadStatus === 'pending' && photo.localPath
    );
  }
}