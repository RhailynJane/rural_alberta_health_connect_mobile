import { useEffect, useState } from 'react';
import { syncManager } from '../sync/syncManager';

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const unsubscribe = syncManager.onSyncStatusChange((status) => {
      if (status === 'syncing') {
        setIsSyncing(true);
        setLastSyncStatus(null);
      } else {
        setIsSyncing(false);
        setLastSyncStatus(status);
      }
    });

    // Update pending count
    const updateCount = async () => {
      const count = await syncManager.getPendingSyncCount();
      setPendingCount(count);
    };
    
    updateCount();
    const interval = setInterval(updateCount, 30000); // Update every 30s

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    await syncManager.syncAll();
  };

  return {
    isSyncing,
    pendingCount,
    lastSyncStatus,
    triggerSync,
  };
}
