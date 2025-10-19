import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../database';

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;

export async function syncWithConvex() {
  if (!CONVEX_URL) {
    throw new Error('EXPO_PUBLIC_CONVEX_URL is not defined');
  }

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      // Pull changes from Convex
      const response = await fetch(`${CONVEX_URL}/sync/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastPulledAt, schemaVersion, migration }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to pull changes from Convex');
      }
      
      const { changes, timestamp } = await response.json();
      return { changes, timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      // Push changes to Convex
      const response = await fetch(`${CONVEX_URL}/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes, lastPulledAt }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to push changes to Convex');
      }
    },
    migrationsEnabledAtVersion: 1,
  });
}