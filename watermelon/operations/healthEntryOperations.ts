import { Q } from "@nozbe/watermelondb";
import { database } from "../database";
import HealthEntry from "../models/HealthEntry";

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

interface UpdateHealthEntryParams {
  entryId: string;
  userId: string;
  updates: {
    symptoms?: string;
    severity?: number;
    notes?: string;
    photos?: string[];
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
  return await database.write(async () => {
    const entry = await database
      .get<HealthEntry>("health_entries")
      .find(entryId)
      .catch(() => {
        throw new Error("Healthe entry not found");
      });

    // Security checks
    if (entry.userId !== userId) {
      throw new Error("Unauthorized: You can only edit your own entries");
    }

    if (entry.type === "ai_assessment") {
      throw new Error("AI assessments cannot be edited");
    }

    if (entry.isDeleted) {
      throw new Error("Cannot edit deleted entry");
    }

    // Validate severity if provided
    if (updates.severity !== undefined) {
      if (updates.severity < 0 || updates.severity > 10) {
        throw new Error("Severity must be between 0 and 10");
      }
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
        // Store photos as JSON string (WatermelonDB limitation)
        // already a json field
        record.photos = updates.photos;
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
  });
}

/**
 * Soft delete a health entry locally
 * Security: Verifies user ownership
 */
export async function deleteHealthEntryLocal(
  entryId: string,
  userId: string
): Promise<HealthEntry> {
  return await database.write(async () => {
    const entry = await database
      .get<HealthEntry>("health_entries")
      .find(entryId)
      .catch(() => {
        throw new Error("Healthe entry not found");
      });

    // Security checks
    if (entry.userId !== userId) {
      throw new Error("Unauthorized: You can only delete your own entries");
    }

    if (entry.type === "ai_assessment") {
      throw new Error("AI assessments cannot be deleted");
    }

    if (entry.isDeleted) {
      throw new Error("Entry is already deleted");
    }

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
  });
}

/**
 * Restore a deleted health entry locally
 */
export async function restoreHealthEntryLocal(
  entryId: string,
  userId: string
): Promise<HealthEntry> {
  return await database.write(async () => {
    const entry = await database
      .get<HealthEntry>("health_entries")
      .find(entryId)
      .catch(() => {
        throw new Error("Healthe entry not found");
      });

    // Security check
    if (entry.userId !== userId) {
      throw new Error("Unauthorized: You can only restore your own entries");
    }

    if (!entry.isDeleted) {
      throw new Error("Entry is not deleted");
    }

    // Restore the entry
    const restored = await entry.update((record) => {
      record.isDeleted = false;
      record.lastEditedAt = Date.now();

      // Mark as not synced
      record.isSynced = false;
      record.syncError = null;
    });

    return restored;
  });
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
  await database.write(async () => {
    const entry = await database
      .get<HealthEntry>("health_entries")
      .find(entryId)
      .catch(() => {
        throw new Error("Healthe entry not found");
      });

    await entry.update((record) => {
      record.isSynced = true;
      record.syncError = null;
      if (convexId) {
        record.convexId = convexId;
      }
    });
  });
}

/**
 * Mark sync error for an entry
 */
export async function markHealthEntrySyncError(
  entryId: string,
  error: string
): Promise<void> {
  await database.write(async () => {
    const entry = await database
      .get<HealthEntry>("health_entries")
      .find(entryId)
      .catch(() => {
        throw new Error("Healthe entry not found");
      });

    await entry.update((record) => {
      record.isSynced = false;
      record.syncError = error;
    });
  });
}
