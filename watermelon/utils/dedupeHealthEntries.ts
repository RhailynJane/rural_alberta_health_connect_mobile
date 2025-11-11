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

// Score an entry using multi-level priority (matches edit loader logic).
// Returns array: [isDeleted, lastEditedAt, editCount, timestamp]
// Higher values at each priority level win.
function scoreEntry(e: HealthEntryLike): number[] {
  return [
    e.isDeleted ? 0 : 1,              // Level 0: non-deleted always wins
    e.lastEditedAt || 0,              // Level 1: most recently edited
    e.editCount || 0,                 // Level 2: most edits
    e.timestamp || 0                  // Level 3: newest creation time
  ];
}

// Compare two score arrays (multi-level priority)
function betterScore(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    return a[i] > b[i] ? 1 : -1;
  }
  return 0; // Equal
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
    let bestScore: number[] | undefined;
    // Debug: log scores for each candidate in groups with duplicates
    const debugScores = group.map(e => ({
      id: e._id,
      symptoms: e.symptoms?.substring(0, 30),
      score: scoreEntry(e),
      isDeleted: e.isDeleted,
      lastEditedAt: e.lastEditedAt,
      editCount: e.editCount,
      timestamp: e.timestamp
    }));
    console.log('🔍 [DEDUPE] Scoring group for key:', key);
    debugScores.forEach(d => {
      console.log('  ', d.id, '→', d.score, '| symptoms:', d.symptoms, '| meta:', {
        isDeleted: d.isDeleted,
        lastEditedAt: d.lastEditedAt,
        editCount: d.editCount,
        timestamp: d.timestamp
      });
    });
    for (const e of group) {
      const s = scoreEntry(e);
      if (!bestScore || betterScore(s, bestScore) > 0) {
        bestScore = s;
        best = e;
      }
    }
    console.log('  ✅ Selected:', best?._id, 'with score:', bestScore);
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
    let best: HealthEntryLike | undefined;
    let bestScore: number[] | undefined;
    for (const e of arr) {
      const s = scoreEntry(e);
      if (!bestScore || betterScore(s, bestScore) > 0) {
        bestScore = s;
        best = e;
      }
    }
    return { pickedId: best?._id, candidates: arr };
  });
}
