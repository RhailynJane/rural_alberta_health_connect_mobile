import { Q } from '@nozbe/watermelondb';
import { useMutation } from 'convex/react';
import { useEffect } from 'react';
import { api } from '../../convex/_generated/api';
import { useWatermelonDatabase } from '../../watermelon/hooks/useDatabase';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Hook that automatically syncs offline data to Convex when coming online
 */
export function useSyncOnOnline() {
  const { isOnline } = useNetworkStatus();
  const database = useWatermelonDatabase();
  
  // Get mutations for syncing
  const logManualEntry = useMutation(api.healthEntries.logManualEntry);
  const updatePersonalInfo = useMutation((api as any).users.updatePersonalInfo);

  const syncHealthEntries = async () => {
    try {
      const healthEntriesCollection = database.get('health_entries');
      const unsyncedEntries = await healthEntriesCollection
        .query(Q.where('is_synced', false))
        .fetch();

      console.log(`📊 Found ${unsyncedEntries.length} unsynced health entries`);

      for (const entry of unsyncedEntries) {
        try {
          const entryData = (entry as any);
          
          // Parse photos if stored as JSON string
          let photos: string[] = [];
          if (entryData.photos) {
            try {
              photos = typeof entryData.photos === 'string' 
                ? JSON.parse(entryData.photos) 
                : entryData.photos;
            } catch (e) {
              console.warn('Could not parse photos:', e);
            }
          }

          console.log(`📤 Syncing health entry: ${entryData.symptoms}`);

          // Call Convex mutation to save
          await logManualEntry({
            userId: entryData.userId,
            date: entryData.date,
            timestamp: entryData.timestamp,
            symptoms: entryData.symptoms,
            severity: entryData.severity,
            notes: entryData.notes || '',
            photos: photos,
            createdBy: entryData.createdBy || 'User',
          });

          // Mark as synced locally
          await database.write(async () => {
            await entry.update((e: any) => {
              e.is_synced = true;
            });
          });

          console.log(`✅ Synced entry: ${entryData.symptoms}`);
        } catch (error) {
          console.error(`Failed to sync entry:`, error);
          // Store error but continue with next entry
          await database.write(async () => {
            await entry.update((e: any) => {
              e.sync_error = error instanceof Error ? error.message : 'Unknown error';
            });
          });
        }
      }
    } catch (error) {
      console.error('Error syncing health entries:', error);
    }
  };

  const syncPersonalInfo = async () => {
    try {
      const userProfilesCollection = database.get('user_profiles');
      const unsyncedProfiles = await userProfilesCollection
        .query(Q.where('onboarding_completed', false))
        .fetch();

      console.log(`👤 Found ${unsyncedProfiles.length} unsynced profiles`);

      for (const profile of unsyncedProfiles) {
        try {
          const profileData = (profile as any);
          
          console.log(`📤 Syncing personal info for user: ${profileData.userId}`);

          await updatePersonalInfo({
            age: profileData.age_range || profileData.age,
            address1: profileData.address1 || '',
            address2: profileData.address2 || '',
            city: profileData.city || '',
            province: profileData.province || '',
            postalCode: profileData.postal_code || profileData.postalCode || '',
            location: profileData.location || '',
            onboardingCompleted: true,
          });

          // Mark as completed locally
          await database.write(async () => {
            await profile.update((p: any) => {
              p.onboarding_completed = true;
            });
          });

          console.log(`✅ Synced personal info`);
        } catch (error) {
          console.error(`Failed to sync profile:`, error);
        }
      }
    } catch (error) {
      console.error('Error syncing personal info:', error);
    }
  };

  useEffect(() => {
    if (!isOnline) return;

    // When coming online, sync all offline data
    const syncOfflineData = async () => {
      try {
        console.log('🔄 Coming online - syncing offline data...');
        await syncHealthEntries();
        await syncPersonalInfo();
        console.log('✅ Offline sync completed');
      } catch (error) {
        console.error('❌ Error syncing offline data:', error);
      }
    };

    // Small delay to ensure Convex client is ready
    const timer = setTimeout(syncOfflineData, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);
}
