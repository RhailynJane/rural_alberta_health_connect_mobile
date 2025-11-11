// Utility to de-duplicate health entry arrays that may contain rescue duplicates.
// Groups by convexId when available; otherwise falls back to a composite key.
// Chooses the "best" (latest, non-deleted) record according to scoring heuristics.

export interface HealthEntryLike {
  _id?: string;
  convexId?: string;
  symptoms?: string;
  severity?: number;
  timestamp?: number;
  type?: string;
  notes?: string;
  isDeleted?: boolean;
  lastEditedAt?: number;
  editCount?: number;
  [key: string]: any; // Allow extra fields
}

interface GroupPickMeta {
  pickedId: string | undefined;
  candidates: HealthEntryLike[];
}

// Score an entry. Higher score wins. Deleted entries get heavily penalized.
function scoreEntry(e: HealthEntryLike): number {
  if (e.isDeleted) return -1; // Always worse than any non-deleted
  const lastEdit = typeof e.lastEditedAt === 'number' ? e.lastEditedAt : (e.timestamp || 0);
  const editCount = typeof e.editCount === 'number' ? e.editCount : 0;
  // Weight: prioritize recency, then editCount for tie-breaking.
  return lastEdit + editCount * 1000; // 1000ms * editCount gives ~1s advantage per edit
}

function buildFallbackKey(e: HealthEntryLike): string {
  // Day bucket + primary content; reduces accidental merges across days.
  const day = e.timestamp ? new Date(e.timestamp).toISOString().split('T')[0] : 'unknown';
  return `${day}|${e.symptoms || ''}|${e.severity || 0}|${e.type || ''}`;
}

export function dedupeHealthEntries(entries: HealthEntryLike[]): HealthEntryLike[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const groups = new Map<string, HealthEntryLike[]>();
  for (const e of entries) {
    const key = e.convexId && typeof e.convexId === 'string' && e.convexId.length > 0
      ? `cid:${e.convexId}`
      : `fb:${buildFallbackKey(e)}`;
    const arr = groups.get(key);
    if (arr) arr.push(e); else groups.set(key, [e]);
  }
  const result: HealthEntryLike[] = [];
  for (const [key, group] of groups.entries()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }
    let best: HealthEntryLike | undefined;
    let bestScore = -Infinity;
    for (const e of group) {
      const s = scoreEntry(e);
      if (s > bestScore) {
        bestScore = s;
        best = e;
      }
    }
    if (best) result.push(best);
  }
  return result;
}

// Debug helper to log duplicate groups (can be selectively enabled where imported)
export function analyzeDuplicates(entries: HealthEntryLike[]): GroupPickMeta[] {
  const groups: Record<string, HealthEntryLike[]> = {};
  for (const e of entries) {
    const key = e.convexId && typeof e.convexId === 'string' && e.convexId.length > 0
      ? `cid:${e.convexId}`
      : `fb:${buildFallbackKey(e)}`;
    (groups[key] = groups[key] || []).push(e);
  }
  return Object.entries(groups).filter(([, arr]) => arr.length > 1).map(([k, arr]) => {
    let best: HealthEntryLike | undefined; let bestScore = -Infinity;
    for (const e of arr) { const s = scoreEntry(e); if (s > bestScore) { bestScore = s; best = e; } }
    return { pickedId: best?._id, candidates: arr };
  });
}
