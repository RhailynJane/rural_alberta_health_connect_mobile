import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline deletion fallback layer ("tombstones") for devices where WatermelonDB
 * cannot mutate legacy rows due to missing columns / inability to ALTER TABLE
 * (no adapter.unsafeSqlQuery). We persist a lightweight set of IDs that should
 * be treated as deleted by UI selectors & dedupe without attempting a failing
 * model.update().
 *
 * Keys stored:
 *  - @health_entry_tombstones_v1 : JSON { ids: string[] } where each string is
 *    either a convexId (preferred) or a local Watermelon id if no convexId yet.
 */

const TOMBSTONES_KEY = '@health_entry_tombstones_v1';

export interface TombstoneState { ids: string[] }

async function readRaw(): Promise<TombstoneState> {
  try {
    const raw = await AsyncStorage.getItem(TOMBSTONES_KEY);
    if (!raw) return { ids: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.ids)) return { ids: parsed.ids.filter((x: any) => typeof x === 'string') };
  } catch {}
  return { ids: [] };
}

async function writeRaw(state: TombstoneState) {
  try { await AsyncStorage.setItem(TOMBSTONES_KEY, JSON.stringify(state)); } catch {}
}

export async function listTombstones(): Promise<Set<string>> {
  const { ids } = await readRaw();
  return new Set(ids);
}

export async function addTombstone(id: string) {
  if (!id) return;
  const state = await readRaw();
  if (!state.ids.includes(id)) {
    state.ids.push(id);
    await writeRaw(state);
  }
}

export async function removeTombstones(ids: string[]) {
  if (!ids.length) return;
  const state = await readRaw();
  const before = state.ids.length;
  state.ids = state.ids.filter(x => !ids.includes(x));
  if (state.ids.length !== before) await writeRaw(state);
}

export async function clearAllTombstones() {
  try { await AsyncStorage.removeItem(TOMBSTONES_KEY); } catch {}
}

/** Decide the stable identifier to tombstone for an entry. */
export function getPreferredEntryId(entry: { convexId?: string | null; _id?: string; id?: string }): string | null {
  if (!entry) return null;
  return (entry as any).convexId || (entry as any)._id || (entry as any).id || null;
}

/** Convenience predicate for in-memory filtering. */
export function isEntryTombstoned(entry: any, tombstoneSet: Set<string>): boolean {
  const pid = getPreferredEntryId(entry);
  if (!pid) return false;
  return tombstoneSet.has(pid);
}

/**
 * Best-effort helper to detect if we should AVOID Watermelon updates for delete.
 * We fallback when adapter.unsafeSqlQuery is missing (cannot self-heal reliably) which
 * correlates with the TypeError crashes on updates in legacy DBs.
 */
export function shouldUseTombstoneFallback(db: any): boolean {
  try {
    const adapter = db?.adapter;
    return !adapter?.unsafeSqlQuery; // no direct SQL => cannot self-heal reliably
  } catch {
    return true;
  }
}
