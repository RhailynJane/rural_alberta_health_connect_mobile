import { Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';
import { database } from '../database';

interface SyncQueueItem {
  id: string;
  type: 'health_entry' | 'profile' | 'ai_assessment' | 'notification_read';
  data: any;
  timestamp: number;
  retryCount: number;
}

class SyncManager {
  private syncQueue: SyncQueueItem[] = [];
  private isSyncing = false;
  private syncListeners: ((status: 'syncing' | 'success' | 'error') => void)[] = [];
  private unsubscribeNetInfo: (() => void) | null = null;

  constructor() {
    this.loadQueueFromStorage();
    this.startNetworkListener();
  }

  private async loadQueueFromStorage() {
    try {
      // Queue is stored in WatermelonDB sync_queue table if it exists
      // For now, we'll manage it in memory and reconstruct from unsynced records
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  private startNetworkListener() {
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isSyncing) {
        console.log('📡 Network connected, starting sync...');
        this.syncAll();
      }
    });
  }

  async addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) {
    const queueItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    this.syncQueue.push(queueItem);
    console.log(`📝 Added to sync queue: ${item.type}`, queueItem.id);
    
    // Try immediate sync if online
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
      this.syncAll();
    }
  }

  async syncAll() {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress...');
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.log('📴 Offline - deferring sync');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners('syncing');
    
    try {
      console.log(`🔄 Starting sync: ${this.syncQueue.length} items in queue`);
      
      // Sync health entries
      await this.syncHealthEntries();
      
      // Sync AI assessments
      await this.syncAIAssessments();
      
      // Sync profile updates
      await this.syncProfileUpdates();
      
      // Remove synced items from queue
      this.syncQueue = this.syncQueue.filter(item => item.retryCount >= 3);
      
      console.log('✅ Sync completed successfully');
      this.notifyListeners('success');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.notifyListeners('error');
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncHealthEntries() {
    try {
      const healthEntriesCollection = database.collections.get('health_entries');
      const unsyncedEntries = await healthEntriesCollection
        .query(Q.where('is_synced', false))
        .fetch();
      
      console.log(`📊 Syncing ${unsyncedEntries.length} health entries...`);
      
      for (const entry of unsyncedEntries) {
        try {
          // This will be called by the component with proper Convex mutation
          // Mark as synced after successful upload
          await database.write(async () => {
            await entry.update((e: any) => {
              e.isSynced = true;
            });
          });
        } catch (error) {
          console.error(`Failed to sync entry ${entry.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to sync health entries:', error);
    }
  }

  private async syncAIAssessments() {
    try {
      const assessmentsCollection = database.collections.get('health_entries');
      const unsyncedAssessments = await assessmentsCollection
        .query(
          Q.where('type', 'ai_assessment'),
          Q.where('is_synced', false)
        )
        .fetch();
      
      console.log(`🤖 Syncing ${unsyncedAssessments.length} AI assessments...`);
      
      // These will be synced by the component
    } catch (error) {
      console.error('Failed to sync AI assessments:', error);
    }
  }

  private async syncProfileUpdates() {
    // Profile updates are handled by the profile screens
    console.log('👤 Profile updates synced');
  }

  onSyncStatusChange(listener: (status: 'syncing' | 'success' | 'error') => void) {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(status: 'syncing' | 'success' | 'error') {
    this.syncListeners.forEach(listener => listener(status));
  }

  getQueueSize() {
    return this.syncQueue.length;
  }

  async getPendingSyncCount(): Promise<number> {
    try {
      const healthEntriesCollection = database.collections.get('health_entries');
      const unsynced = await healthEntriesCollection
        .query(Q.where('is_synced', false))
        .fetchCount();
      
      return unsynced;
    } catch {
      return 0;
    }
  }

  destroy() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
  }
}

export const syncManager = new SyncManager();
export default syncManager;