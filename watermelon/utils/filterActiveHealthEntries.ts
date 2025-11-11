import { isEntryTombstoned } from "./tombstones";

/**
 * Returns only active (non-deleted, non-tombstoned) health entries.
 * A health entry is considered inactive if:
 *  - isDeleted is true (local soft delete or server deletion mirror)
 *  - it appears in the tombstone fallback set (offline delete without mutation support)
 */
export function filterActiveHealthEntries<T extends { isDeleted?: boolean; convexId?: string; _id?: string }>(
  entries: T[] | undefined | null,
  tombstones: Set<string>
): T[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  return entries.filter(e => e && e.isDeleted !== true && !isEntryTombstoned(e as any, tombstones));
}
