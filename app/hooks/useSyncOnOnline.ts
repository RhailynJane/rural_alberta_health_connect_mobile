// No direct Watermelon query operators needed; using in-memory filtering
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useEffect, useRef } from 'react';
import { api } from '../../convex/_generated/api';
import { useWatermelonDatabase } from '../../watermelon/hooks/useDatabase';
import { getPhoneSecurely } from '../utils/securePhone';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Hook that automatically syncs offline data to Convex when coming online
 */
export function useSyncOnOnline() {
  const hasSyncedProfilesRef = useRef(false);
  const previousOnlineRef = useRef<boolean | null>(null);
  const { isOnline } = useNetworkStatus();
  const database = useWatermelonDatabase();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated && isOnline ? {} : 'skip'
  );
  
  // Get mutations for syncing
  const logManualEntry = useMutation(api.healthEntries.logManualEntry);
  const logAIAssessment = useMutation(api.healthEntries.logAIAssessment);
  const updatePhone = useMutation(api.users.updatePhone);
  const toggleLocationServices = useMutation(api.locationServices.toggleLocationServices);
  // Use the correct Convex mutation path for updating personal info
  const updatePersonalInfo = useMutation(
    (api as any)["profile/personalInformation"].updatePersonalInfo
  );
  const updateEmergencyContact = useMutation(
    (api as any)["emergencyContactOnboarding/update"].withNameAndPhone
  );
  const updateMedicalHistory = useMutation(
    (api as any)["medicalHistoryOnboarding/update"].withAllConditions
  );

  // Wait for WatermelonDB to finish setting up/migrating before syncing
  const waitForDatabaseReady = async (retries = 3, delayMs = 150): Promise<void> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Try a harmless query on a small table
        await database.get('user_profiles').query().fetch();
        return; // DB is ready
      } catch (err) {
        if (attempt === retries) {
          console.warn('⚠️ Database not ready after retries, proceeding anyway:', err);
          return;
        }
        const wait = delayMs * attempt; // linear backoff: 150ms, 300ms, 450ms
        console.log(`⏳ Waiting for DB (attempt ${attempt}/${retries}) for ${wait}ms...`);
        await new Promise((res) => setTimeout(res, wait));
      }
    }
  };

  const syncHealthEntries = async () => {
    try {
      const healthEntriesCollection = database.get('health_entries');
      
      // First, log ALL health entries in the database
      const allEntries = await healthEntriesCollection.query().fetch();
      console.log(`📋 Total health entries in WatermelonDB: ${allEntries.length}`);
      
      if (allEntries.length > 0) {
        allEntries.forEach((entry, index) => {
          const e = entry as any;
          const raw = e._raw || {};
          console.log(`📄 Entry ${index + 1}:`, {
            id: entry.id,
            userId: e.userId || raw.userId || raw.user_id,
            date: e.date || raw.date,
            symptoms: e.symptoms || raw.symptoms,
            severity: e.severity ?? raw.severity,
            isSynced: e.isSynced ?? raw.isSynced ?? raw.is_synced,
            syncError: e.syncError || raw.syncError || raw.sync_error,
            rawPhotos: raw.photos ? (typeof raw.photos === 'string' ? raw.photos.substring(0, 50) : 'not-string') : 'none',
          });
        });
      } else {
        console.log('⚠️ No health entries found in WatermelonDB at all!');
      }
      
      // Backfill legacy snake_case columns to new camelCase columns if needed (no skipping)
      for (const entry of allEntries as any[]) {
        const raw = entry._raw || {};
        let changed = false;
        await database.write(async () => {
          // Apply per-field updates with isolated try/catch to avoid aborting the whole record
          const safeUpdate = async (setter: (e: any) => void) => {
            try { await entry.update(setter); } catch { /* continue with other fields */ }
          };

          if ((!entry.userId || (entry as any).userId === undefined) && raw.user_id) {
            await safeUpdate((e: any) => { e.userId = raw.user_id; }); changed = true;
          }
          if (!(entry as any).convexId && raw.convex_id) {
            await safeUpdate((e: any) => { e.convexId = raw.convex_id; }); changed = true;
          }
          if (!(entry as any).aiContext && raw.ai_context) {
            await safeUpdate((e: any) => { e.aiContext = raw.ai_context; }); changed = true;
          }
          if (!(entry as any).createdBy && raw.created_by) {
            await safeUpdate((e: any) => { e.createdBy = raw.created_by; }); changed = true;
          }
          if ((entry as any).isSynced === undefined && raw.is_synced !== undefined) {
            await safeUpdate((e: any) => { e.isSynced = raw.is_synced; }); changed = true;
          }
          if (!(entry as any).syncError && raw.sync_error) {
            await safeUpdate((e: any) => { e.syncError = raw.sync_error; }); changed = true;
          }
          // Ensure type field is set for all entries (default to manual_entry if missing)
          if (!(entry as any).type && !raw.type) {
            await safeUpdate((e: any) => { e.type = 'manual_entry'; }); changed = true;
          }
        });
        if (changed) {
          console.log(`🔁 Backfilled legacy health entry fields for id=${entry.id}`);
        }
      }

      // Now find unsynced entries
      // Build unsynced list considering both camelCase and legacy flags
      // ONLY sync entries for the currently authenticated user
      const authUserId = currentUser?._id ? String(currentUser._id) : '';
      
      // First, clean up: delete or mark as synced any entries that belong to other users
      if (authUserId) {
        for (const entry of allEntries as any[]) {
          const raw = entry._raw || {};
          const entryUserId = entry.userId || raw.userId || raw.user_id || '';
          const isSynced = entry.isSynced ?? raw.isSynced ?? raw.is_synced;
          
          // If entry has a userId that's NOT the current user AND it's already synced,
          // it was synced by a previous user - mark it to skip future syncs
          if (entryUserId && entryUserId !== authUserId && isSynced) {
            try {
              await database.write(async () => {
                // Ensure type field exists before updating syncError
                const safeUpdate = async (setter: (e: any) => void) => {
                  try { await entry.update(setter); } catch { /* ignore */ }
                };
                if (!entry.type && !raw.type) {
                  await safeUpdate((e: any) => { e.type = 'manual_entry'; });
                }
                await safeUpdate((e: any) => { e.syncError = 'Synced by different user - skipping'; });
              });
              console.log(`🗑️ Marked entry ${entry.id} (userId: ${entryUserId}) as belonging to different user`);
            } catch (err) {
              console.warn(`⚠️ Could not mark entry ${entry.id}:`, err);
            }
          }
        }
      }
      
      const unsyncedEntries = (allEntries as any[]).filter((entry: any) => {
        const raw = entry._raw || {};
        const camel = entry.isSynced;
        const legacy = raw.is_synced;
        const isUnsynced = camel === false || (camel === undefined && legacy === false);
        
        // Only include if unsynced AND belongs to current authenticated user
        if (!isUnsynced) return false;
        
        const entryUserId = entry.userId || raw.userId || raw.user_id || '';
        // Include entries with no userId (we'll backfill from authUserId) or matching authUserId
        return !entryUserId || entryUserId === authUserId;
      });

      console.log(`📊 Found ${unsyncedEntries.length} unsynced health entries (including legacy is_synced=false)`);

      for (const entry of unsyncedEntries) {
        try {
          const entryData = (entry as any);
          const raw = entryData._raw || {};
          
          // Get userId from entry - DO NOT backfill from currentUser
          // Entries without userId are orphaned and should be skipped
          let entryUserId = entryData.userId || raw.userId || raw.user_id || '';
          
          // Skip entries with no userId or invalid userId
          if (!entryUserId || entryUserId === 'offline_user') {
            console.warn(`⚠️ Skipping entry ${entry.id}: no valid userId (orphaned entry from different session)`);
            // Mark as synced with error so it doesn't keep retrying
            await database.write(async () => {
              const safeUpdate = async (setter: (e: any) => void) => {
                try { await entry.update(setter); } catch { /* ignore */ }
              };
              if (!entry.type && !raw.type) {
                await safeUpdate((e: any) => { e.type = 'manual_entry'; });
              }
              await safeUpdate((e: any) => { e.isSynced = true; });
              await safeUpdate((e: any) => { e.syncError = 'No valid userId - orphaned entry'; });
            });
            continue;
          }
          
          // Access raw column data directly to avoid @json decorator parsing issues
          const rawPhotos = raw.photos || entryData.photos;
          
          // Safely parse photos if stored as JSON string
          let photos: string[] = [];
          if (rawPhotos) {
            try {
              if (typeof rawPhotos === 'string') {
                photos = JSON.parse(rawPhotos);
              } else if (Array.isArray(rawPhotos)) {
                photos = rawPhotos;
              }
            } catch (parseError) {
              console.warn('Could not parse photos, using empty array:', parseError);
              photos = [];
            }
          }

          // Safely parse symptoms if stored as JSON string
          let symptomsData = entryData.symptoms || '';
          if (typeof symptomsData === 'string' && symptomsData.startsWith('[')) {
            try {
              symptomsData = JSON.parse(symptomsData);
            } catch {
              // Keep as string if parse fails
            }
          }

          console.log(`📤 Syncing health entry:`, {
            symptoms: typeof symptomsData === 'string' ? symptomsData : JSON.stringify(symptomsData),
            userId: entryUserId,
            photoCount: photos.length,
            type: entryData.type || raw.type || 'manual_entry',
          });

          // Use correct mutation based on entry type
          const entryType = entryData.type || raw.type || 'manual_entry';
          let newId: any;
          
          if (entryType === 'ai_assessment') {
            // Sync AI assessment with proper fields
            newId = await logAIAssessment({
              userId: entryUserId,
              date: entryData.date,
              timestamp: entryData.timestamp,
              symptoms: symptomsData,
              severity: entryData.severity,
              category: entryData.category || raw.category || 'General Symptoms',
              duration: entryData.duration || raw.duration || '',
              aiContext: entryData.aiContext || raw.aiContext || raw.ai_context || '',
              photos: photos,
              notes: entryData.notes || '',
            });
            console.log(`✅ Synced AI assessment entry`);
          } else {
            // Sync as manual entry
            newId = await logManualEntry({
              userId: entryUserId,
              date: entryData.date,
              timestamp: entryData.timestamp,
              symptoms: symptomsData,
              severity: entryData.severity,
              notes: entryData.notes || '',
              photos: photos,
              createdBy: entryData.createdBy || entryData.created_by || 'User',
            });
            console.log(`✅ Synced manual entry`);
          }

          // Mark as synced locally
          await database.write(async () => {
            const safeUpdate = async (setter: (e: any) => void) => {
              try { await entry.update(setter); } catch { /* ignore */ }
            };
            if (!entry.type && !raw.type) {
              await safeUpdate((e: any) => { e.type = 'manual_entry'; });
            }
            await safeUpdate((e: any) => { e.isSynced = true; });
            // Attach server id for de-duplication with hydration
            await safeUpdate((e: any) => { (e as any).convexId = newId; });
          });
        } catch (syncError) {
          console.error(`Failed to sync entry:`, syncError);
          // Store error message but continue with next entry
          try {
            const entryData = (entry as any);
            const raw = entryData._raw || {};
            await database.write(async () => {
              const safeUpdate = async (setter: (e: any) => void) => {
                try { await entry.update(setter); } catch { /* ignore */ }
              };
              if (!entry.type && !raw.type) {
                await safeUpdate((e: any) => { e.type = 'manual_entry'; });
              }
              await safeUpdate((e: any) => {
                e.syncError = syncError instanceof Error ? syncError.message : String(syncError);
              });
            });
          } catch (updateError) {
            console.error('Failed to update sync error status:', updateError);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing health entries:', error);
    }
  };

  const syncPersonalInfo = async () => {
    try {
      const authUserId = currentUser?._id ? String(currentUser._id) : '';
      
      // WMDB profile sync is DISABLED due to stale data issues.
      // All profile syncing now uses AsyncStorage as the source of truth.
      console.log('📋 [Sync] Using AsyncStorage-only profile sync (WMDB disabled)');
      
      // Check for explicit offline markers set by editors
      const needsSyncFlag = authUserId ? await AsyncStorage.getItem(`${authUserId}:profile_needs_sync`) : null;
      const needsEmergencyFlag = authUserId ? await AsyncStorage.getItem(`${authUserId}:profile_emergency_needs_sync`) : null;
      const needsMedicalFlag = authUserId ? await AsyncStorage.getItem(`${authUserId}:profile_medical_needs_sync`) : null;
      const needsPhoneFlag = authUserId ? await AsyncStorage.getItem(`${authUserId}:phone_needs_sync`) : null;
      
      // Only sync if we have flags indicating pending offline changes
      if (!needsSyncFlag && !needsEmergencyFlag && !needsMedicalFlag && !needsPhoneFlag) {
        console.log('⏭️ [Sync] No pending profile changes to sync from AsyncStorage');
        return;
      }
      
      // Read cached profile data
      let cached: any = {};
      if (authUserId) {
        try {
          const rawCache = await AsyncStorage.getItem(`${authUserId}:profile_cache_v1`);
          if (rawCache) {
            cached = JSON.parse(rawCache) || {};
          }
        } catch {}
      }
      
      // Sync personal info if flagged
      if (needsSyncFlag === '1') {
        const payload = {
          age: String(cached.age ?? ''),
          address1: String(cached.address1 ?? ''),
          address2: String(cached.address2 ?? ''),
          city: String(cached.city ?? ''),
          province: String(cached.province ?? ''),
          postalCode: String(cached.postalCode ?? ''),
          location: String(cached.location ?? ''),
        };
        if (!payload.age || !payload.city || !payload.province || !payload.location) {
          console.warn('⏭️ [Sync] Skipping personal info sync - missing required fields in cache');
        } else {
          console.log(`📤 [Sync] Syncing personal info from AsyncStorage for user ${authUserId}`);
          await updatePersonalInfo(payload);
          console.log(`✅ [Sync] Synced personal info from AsyncStorage`);
          if (authUserId) {
            try { await AsyncStorage.removeItem(`${authUserId}:profile_needs_sync`); } catch {}
          }
        }
      }

      // Sync emergency contact if flagged
      if (needsEmergencyFlag === '1') {
        console.log(`📤 [Sync] Syncing emergency contact from AsyncStorage for user ${authUserId}`);
        await updateEmergencyContact({
          emergencyContactName: cached.emergencyContactName || '',
          emergencyContactPhone: cached.emergencyContactPhone || '',
        });
        console.log(`✅ [Sync] Synced emergency contact from AsyncStorage`);
        if (authUserId) {
          try { await AsyncStorage.removeItem(`${authUserId}:profile_emergency_needs_sync`); } catch {}
        }
      }

      // Sync medical info if flagged
      if (needsMedicalFlag === '1') {
        console.log(`📤 [Sync] Syncing medical info from AsyncStorage for user ${authUserId}`);
        await updateMedicalHistory({
          allergies: cached.allergies || '',
          currentMedications: cached.currentMedications || '',
          medicalConditions: cached.medicalConditions || '',
        });
        console.log(`✅ [Sync] Synced medical info from AsyncStorage`);
        if (authUserId) {
          try { await AsyncStorage.removeItem(`${authUserId}:profile_medical_needs_sync`); } catch {}
        }
      }

      // Independently sync phone if needed, even if no profile rows found
      if (authUserId && needsPhoneFlag === '1') {
        try {
          const phone = await getPhoneSecurely(authUserId);
          if (phone) {
            await updatePhone({ phone });
            console.log('✅ Synced phone number from SecureStore to server');
            await AsyncStorage.removeItem(`${authUserId}:phone_needs_sync`);
          } else {
            console.warn('⏭️ No phone in SecureStore; skipping phone sync');
          }
        } catch (e) {
          console.error('❌ Failed to sync phone number (post-login path):', e);
        }
      }
    } catch (error) {
      console.error('Error syncing personal info:', error);
    }
  };

  useEffect(() => {
    // Track if we just transitioned from offline to online
    const wasOffline = previousOnlineRef.current === false;
    const isNowOnline = isOnline === true;
    const justCameOnline = wasOffline && isNowOnline;
    
    // Update the ref for next render
    previousOnlineRef.current = isOnline;
    
    console.log('🔍 [Sync] Online state changed:', { 
      wasOffline, 
      isNowOnline, 
      justCameOnline, 
      isAuthenticated,
      hasCurrentUser: !!currentUser?._id 
    });
    
    if (!justCameOnline) {
      console.log('⏭️ [Sync] Not triggering sync - not a fresh online transition');
      return;
    }
    
    if (!isAuthenticated) {
      console.log('⏭️ [Sync] Not triggering sync - user not authenticated');
      return;
    }

    // When coming online, sync all offline data
    const syncOfflineData = async () => {
      try {
        console.log('🔄 Coming online - syncing offline data...');
        // Ensure DB migrations finished before we access tables
        await waitForDatabaseReady();
        
        // Only sync if we have current user data
        if (currentUser?._id) {
          const uid = String(currentUser._id);
          
          // Sync health entries from WatermelonDB (still works)
          await syncHealthEntries();
          
          // Sync profile from AsyncStorage (WatermelonDB sync disabled due to schema errors)
          try {
            const needsSync = await AsyncStorage.getItem(`${uid}:profile_needs_sync`);
            const needsEmergency = await AsyncStorage.getItem(`${uid}:profile_emergency_needs_sync`);
            const needsMedical = await AsyncStorage.getItem(`${uid}:profile_medical_needs_sync`);
            const needsPhone = await AsyncStorage.getItem(`${uid}:phone_needs_sync`);

            // Personal info
            if (needsSync === '1') {
              console.log('📤 [Sync] Syncing profile from AsyncStorage cache...');
              const cacheRaw = await AsyncStorage.getItem(`${uid}:profile_cache_v1`);
              if (cacheRaw) {
                const cached = JSON.parse(cacheRaw);
                const payload = {
                  age: String(cached.age ?? ''),
                  address1: String(cached.address1 ?? ''),
                  address2: String(cached.address2 ?? ''),
                  city: String(cached.city ?? ''),
                  province: String(cached.province ?? ''),
                  postalCode: String(cached.postalCode ?? ''),
                  location: String(cached.location ?? ''),
                };
                if (!payload.age || !payload.city || !payload.province || !payload.location) {
                  console.warn('⏭️ [Sync] Skipping personal info sync - missing required fields in cache');
                } else {
                  await updatePersonalInfo(payload);
                  console.log('✅ [Sync] Synced profile from AsyncStorage to server');
                  await AsyncStorage.removeItem(`${uid}:profile_needs_sync`);
                }
              }
            } else {
              console.log('⏭️ [Sync] No personal info changes to sync');
            }

            // Emergency contact
            if (needsEmergency === '1') {
              console.log('📤 [Sync] Syncing emergency contact from AsyncStorage cache...');
              const cacheRaw = await AsyncStorage.getItem(`${uid}:profile_cache_v1`);
              if (cacheRaw) {
                const cached = JSON.parse(cacheRaw);
                await updateEmergencyContact({
                  emergencyContactName: cached.emergencyContactName || '',
                  emergencyContactPhone: cached.emergencyContactPhone || '',
                });
                console.log('✅ [Sync] Synced emergency contact from AsyncStorage to server');
                await AsyncStorage.removeItem(`${uid}:profile_emergency_needs_sync`);
              }
            } else {
              console.log('⏭️ [Sync] No emergency contact changes to sync');
            }

            // Medical info
            if (needsMedical === '1') {
              console.log('📤 [Sync] Syncing medical info from AsyncStorage cache...');
              const cacheRaw = await AsyncStorage.getItem(`${uid}:profile_cache_v1`);
              if (cacheRaw) {
                const cached = JSON.parse(cacheRaw);
                await updateMedicalHistory({
                  allergies: cached.allergies || '',
                  currentMedications: cached.currentMedications || '',
                  medicalConditions: cached.medicalConditions || '',
                });
                console.log('✅ [Sync] Synced medical info from AsyncStorage to server');
                await AsyncStorage.removeItem(`${uid}:profile_medical_needs_sync`);
              }
            } else {
              console.log('⏭️ [Sync] No medical changes to sync');
            }

            // Phone number
            if (needsPhone === '1') {
              try {
                const phone = await getPhoneSecurely(uid);
                if (phone) {
                  await updatePhone({ phone });
                  console.log('✅ [Sync] Synced phone number from SecureStore to server');
                  await AsyncStorage.removeItem(`${uid}:phone_needs_sync`);
                } else {
                  console.warn('⏭️ [Sync] No phone found in SecureStore; skipping phone sync');
                }
              } catch (e) {
                console.error('❌ [Sync] Failed to sync phone number:', e);
              }
            } else {
              console.log('⏭️ [Sync] No phone changes to sync');
            }

            // Location services setting
            try {
              const LOCATION_STATUS_CACHE_KEY = "@app_settings_location_enabled";
              const cachedLocationStatus = await AsyncStorage.getItem(LOCATION_STATUS_CACHE_KEY);
              
              if (cachedLocationStatus !== null) {
                const enabled = cachedLocationStatus === "1";
                console.log(`📤 [Sync] Syncing location services setting from cache (enabled: ${enabled})`);
                await toggleLocationServices({ enabled });
                console.log('✅ [Sync] Synced location services setting to server');
              } else {
                console.log('⏭️ [Sync] No cached location services setting to sync');
              }
            } catch (e) {
              console.error('❌ [Sync] Failed to sync location services setting:', e);
            }
          } catch (syncErr) {
            console.error('❌ [Sync] Failed to sync profile from AsyncStorage:', syncErr);
          }
          
          hasSyncedProfilesRef.current = true;
        } else {
          console.log('⏭️ Skipping sync - current user not loaded yet');
        }
        console.log('✅ Offline sync completed');
      } catch (error) {
        console.error('❌ Error syncing offline data:', error);
      }
    };

    // Reduced delay - Convex client is usually ready quickly
    const timer = setTimeout(syncOfflineData, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, isAuthenticated]);

  // Kick off profile sync when current user becomes available while online
  useEffect(() => {
    if (!isOnline) return;
    if (!isAuthenticated) return; // Don't sync when user isn't logged in
    if (!currentUser?._id) return;
    if (hasSyncedProfilesRef.current) return;

    const run = async () => {
      try {
        await waitForDatabaseReady();
        await syncPersonalInfo();
        hasSyncedProfilesRef.current = true;
      } catch (e) {
        console.error('❌ Error syncing personal info after user loaded:', e);
      }
    };
    // Reduced delay for faster sync
    const t = setTimeout(run, 100);
    return () => clearTimeout(t);
  }, 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [isOnline, isAuthenticated, currentUser?._id]);
 }