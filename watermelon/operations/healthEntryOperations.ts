import { Q } from "@nozbe/watermelondb";
import { database } from "../database";
import HealthEntry from "../models/HealthEntry";
import { safeWrite } from "../utils/safeWrite";
import type { PhotoMetadata } from "../../utils/photoStorage";

/**
 * Local operations for health entries
 * These handle edit/delete operations on the local WatermelonDB
 *
 * IMPORTANT: WatermelonDB auto-manages createdAt and updatedAt fields
 * - createdAt: Set once on creation (readonly)
 * - updatedAt: Auto-updated on any modification (readonly)
 * - lastEditedAt: Our custom field for tracking user edits (we control this)
 * - editCount: Our custom field for version tracking
 */

/**
 * Security helper: Find health entry or throw
 */
async function findHealthEntry(entryId: string): Promise<HealthEntry> {
  return await database
    .get<HealthEntry>("health_entries")
    .find(entryId)
    .catch(() => {
      throw new Error("Health entry not found");
    });
}

/**
 * Security helper: Verify user owns the entry
 */
function verifyOwnership(entry: HealthEntry, userId: string): void {
  if (entry.userId !== userId) {
    throw new Error("Unauthorized: You can only access your own entries");
  }
}

/**
 * Security helper: Verify entry is not an AI assessment
 */
function verifyNotAIAssessment(entry: HealthEntry): void {
  if (entry.type === "ai_assessment") {
    throw new Error("AI assessments cannot be modified");
  }
}

/**
 * Security helper: Verify entry is not deleted
 */
function verifyNotDeleted(entry: HealthEntry): void {
  if (entry.isDeleted) {
    throw new Error("Cannot modify deleted entry");
  }
}

/**
 * Security helper: Verify entry is deleted
 */
function verifyIsDeleted(entry: HealthEntry): void {
  if (!entry.isDeleted) {
    throw new Error("Entry is not deleted");
  }
}

/**
 * Validation helper: Verify severity is in valid range
 */
function validateSeverity(severity: number): void {
  if (severity < 0 || severity > 10) {
    throw new Error("Severity must be between 0 and 10");
  }
}

interface UpdateHealthEntryParams {
  entryId: string;
  userId: string;
  updates: {
    symptoms?: string;
    severity?: number;
    notes?: string;
    photos?: PhotoMetadata[] | string[];
  };
}

/**
 * Update a health entry locally
 * Security: Verifies user ownership and entry type
 */
export async function updateHealthEntryLocal({
  entryId,
  userId,
  updates,
}: UpdateHealthEntryParams): Promise<HealthEntry> {
  return await safeWrite(
    database,
    async () => {
    // Find entry and run all security checks
    const entry = await findHealthEntry(entryId);
    verifyOwnership(entry, userId);
    verifyNotAIAssessment(entry);
    verifyNotDeleted(entry);

    // Validate severity if provided
    if (updates.severity !== undefined) {
      validateSeverity(updates.severity);
    }

    // Update the entry
    const updated = await entry.update((record) => {
      // Update provided fields
      if (updates.symptoms !== undefined) {
        record.symptoms = updates.symptoms;
      }
      if (updates.severity !== undefined) {
        record.severity = updates.severity;
      }
      if (updates.notes !== undefined) {
        record.notes = updates.notes;
      }
      if (updates.photos !== undefined) {
        // Convert string[] to PhotoMetadata[] if needed
        const photosAsMetadata: PhotoMetadata[] = updates.photos.map((photo) => {
          // If already PhotoMetadata format
          if (typeof photo === 'object' && photo !== null && 'localPath' in photo) {
            return photo as PhotoMetadata;
          }
          // Convert string URI to PhotoMetadata
          const uri = photo as string;
          const isConvexUrl = uri.includes('convex.cloud') || uri.includes('convex.site');
          return {
            localPath: isConvexUrl ? '' : uri,
            convexUrl: isConvexUrl ? uri : null,
            uploadStatus: isConvexUrl ? 'uploaded' as const : 'pending' as const,
            filename: uri.split('/').pop() || 'unknown',
            size: 0,
            createdAt: Date.now(),
          };
        });
        record.photos = photosAsMetadata;
      }

      // Clear AI context since manual edit invalidates it
      if (entry.aiContext) {
        record.aiContext = null;
        record.category = null;
        record.duration = null;
      }

      // Update our custom tracking fields
      record.lastEditedAt = Date.now();
      record.editCount = (entry.editCount || 0) + 1;

      // Mark as not synced since we've made local changes
      record.isSynced = false;
      record.syncError = null;

      // NOTE: updatedAt is automatically updated by WatermelonDB
      // We cannot and should not try to set it manually
    });

    return updated;
    },
    10000,
    'updateHealthEntry'
  );
}

/**
 * Soft delete a health entry locally
 * Security: Verifies user ownership
 */
export async function deleteHealthEntryLocal(
  entryId: string,
  userId: string
): Promise<HealthEntry> {
  return await safeWrite(
    database,
    async () => {
    // Find entry and run all security checks
    const entry = await findHealthEntry(entryId);
    verifyOwnership(entry, userId);
    verifyNotAIAssessment(entry);
    verifyNotDeleted(entry);

    // Soft delete - mark as deleted
    const deleted = await entry.update((record) => {
      record.isDeleted = true;
      record.lastEditedAt = Date.now();

      // Mark as not synced
      record.isSynced = false;
      record.syncError = null;

      // NOTE: updatedAt is automatically updated by WatermelonDB
    });

    return deleted;
    },
    10000,
    'deleteHealthEntry'
  );
}

/**
 * Restore a deleted health entry locally
 */
export async function restoreHealthEntryLocal(
  entryId: string,
  userId: string
): Promise<HealthEntry> {
  return await safeWrite(
    database,
    async () => {
    // Find entry and run all security checks
    const entry = await findHealthEntry(entryId);
    verifyOwnership(entry, userId);
    verifyIsDeleted(entry);

    // Restore the entry
    const restored = await entry.update((record) => {
      record.isDeleted = false;
      record.lastEditedAt = Date.now();

      // Mark as not synced
      record.isSynced = false;
      record.syncError = null;
    });

    return restored;
    },
    10000,
    'restoreHealthEntry'
  );
}

/**
 * Query helpers that filter out deleted entries
 */

/**
 * Get all non-deleted entries for a user
 */
export async function getUserHealthEntries(
  userId: string
): Promise<HealthEntry[]> {
  const entries = await database
    .get<HealthEntry>("health_entries")
    .query(
      Q.and(
        Q.where("userId", userId),
        Q.or(
          Q.where("isDeleted", false),
          Q.where("isDeleted", Q.eq(null)) // Handle entries created before v10
        )
      ),
      Q.sortBy("timestamp", Q.desc)
    )
    .fetch();

  return entries;
}

/**
 * Get today's non-deleted entries for a user
 */
export async function getTodaysHealthEntries(
  userId: string,
  localDate: string
): Promise<HealthEntry[]> {
  const entries = await database
    .get<HealthEntry>("health_entries")
    .query(
      Q.and(
        Q.where("userId", userId),
        Q.where("date", localDate),
        Q.or(Q.where("isDeleted", false), Q.where("isDeleted", Q.eq(null)))
      ),
      Q.sortBy("timestamp", Q.desc)
    )
    .fetch();

  return entries;
}

/**
 * Get deleted entries (for trash/restore feature)
 */
export async function getDeletedHealthEntries(
  userId: string
): Promise<HealthEntry[]> {
  const entries = await database
    .get<HealthEntry>("health_entries")
    .query(
      Q.and(Q.where("userId", userId), Q.where("isDeleted", true)),
      Q.sortBy("updatedAt", Q.desc)
    )
    .fetch();

  return entries;
}

/**
 * Get entries that need to be synced
 * (modified locally but not synced to Convex)
 * use batch, don't go 1+N
 */
export async function getUnsyncedHealthEntries(
  userId: string
): Promise<HealthEntry[]> {
  const entries = await database
    .get<HealthEntry>("health_entries")
    .query(Q.and(Q.where("userId", userId), Q.where("isSynced", false)))
    .fetch();

  return entries;
}

/**
 * Mark an entry as synced after successful Convex sync
 * This should be called after the Convex mutation succeeds
 */
export async function markHealthEntryAsSynced(
  entryId: string,
  convexId?: string
): Promise<void> {
  await safeWrite(
    database,
    async () => {
    const entry = await findHealthEntry(entryId);

    await entry.update((record) => {
      record.isSynced = true;
      record.syncError = null;
      if (convexId) {
        record.convexId = convexId;
      }
    });
    },
    10000,
    'markHealthEntryAsSynced'
  );
}

/**
 * Mark sync error for an entry
 */
export async function markHealthEntrySyncError(
  entryId: string,
  error: string
): Promise<void> {
  await safeWrite(
    database,
    async () => {
    const entry = await findHealthEntry(entryId);

    await entry.update((record) => {
      record.isSynced = false;
      record.syncError = error;
    });
    },
    10000,
    'markHealthEntrySyncError'
  );
}
