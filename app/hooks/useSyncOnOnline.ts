// No direct Watermelon query operators needed; using in-memory filtering
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useEffect, useRef } from 'react';
import { api } from '../../convex/_generated/api';
import { useWatermelonDatabase } from '../../watermelon/hooks/useDatabase';
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
      const userProfilesCollection = database.get('user_profiles');
      const usersCollection = database.get('users');
      const authUserId = currentUser?._id ? String(currentUser._id) : '';
      
      // First, log ALL profiles in the database
      const allProfiles = await userProfilesCollection.query().fetch();
      console.log(`📋 Total profiles in WatermelonDB: ${allProfiles.length}`);
      
      if (allProfiles.length > 0) {
        allProfiles.forEach((profile, index) => {
          const p = profile as any;
          const rawData = p._raw || {};
          console.log(`📄 Profile ${index + 1}:`, {
            id: profile.id,
            userId: p.userId || rawData.userId,
            age: p.age || rawData.age,
            ageRange: p.ageRange || rawData.ageRange,
            location: p.location || rawData.location,
            onboardingCompleted: p.onboardingCompleted ?? rawData.onboardingCompleted,
          });
        });
      } else {
        console.log('⚠️ No profiles found in WatermelonDB at all!');
      }
      
      // Backfill users table camelCase from legacy snake_case (v6) - do not skip on errors
      try {
        const allUsers = await usersCollection.query().fetch();
        for (const user of allUsers as any[]) {
          const raw = user._raw || {};
          let changed = false;
          await database.write(async () => {
            const safeUpdate = async (setter: (u: any) => void) => { try { await user.update(setter); } catch {} };
            if (!(user as any).convexUserId && raw.convex_user_id) { await safeUpdate((u: any) => { u.convexUserId = raw.convex_user_id; }); changed = true; }
            if (!(user as any).firstName && raw.first_name) { await safeUpdate((u: any) => { u.firstName = raw.first_name; }); changed = true; }
            if (!(user as any).lastName && raw.last_name) { await safeUpdate((u: any) => { u.lastName = raw.last_name; }); changed = true; }
            if ((user as any).hasCompletedOnboarding === undefined && raw.has_completed_onboarding !== undefined) { await safeUpdate((u: any) => { u.hasCompletedOnboarding = raw.has_completed_onboarding; }); changed = true; }
            if ((user as any).emailVerificationTime === undefined && raw.email_verification_time !== undefined) { await safeUpdate((u: any) => { u.emailVerificationTime = raw.email_verification_time; }); changed = true; }
            if ((user as any).phoneVerificationTime === undefined && raw.phone_verification_time !== undefined) { await safeUpdate((u: any) => { u.phoneVerificationTime = raw.phone_verification_time; }); changed = true; }
            if ((user as any).isAnonymous === undefined && raw.is_anonymous !== undefined) { await safeUpdate((u: any) => { u.isAnonymous = raw.is_anonymous; }); changed = true; }
          });
          if (changed) {
            console.log(`🔁 Backfilled legacy user fields for id=${user.id}`);
          }
        }
      } catch (uErr) {
        console.warn('⚠️ User backfill encountered errors but continued:', uErr);
      }

    // Load all profiles (we'll scope and decide below)
    const allProfilesForSync = await userProfilesCollection.query().fetch();

      // Backfill legacy snake_case fields into new camelCase fields if needed (no skipping)
      for (const profile of allProfilesForSync as any[]) {
        const raw = profile._raw || {};
        let changed = false;
        await database.write(async () => {
          const safeUpdate = async (setter: (p: any) => void) => { try { await profile.update(setter); } catch {} };
          if (!(profile as any).userId && raw.user_id) { await safeUpdate((p: any) => { p.userId = raw.user_id; }); changed = true; }
          if (!(profile as any).ageRange && raw.age_range) { await safeUpdate((p: any) => { p.ageRange = raw.age_range; }); changed = true; }
          if (!(profile as any).age && raw.age) { await safeUpdate((p: any) => { p.age = raw.age; }); changed = true; }
          if (!(profile as any).location && raw.location) { await safeUpdate((p: any) => { p.location = raw.location; }); changed = true; }
          if ((profile as any).onboardingCompleted === undefined && raw.onboarding_completed !== undefined) { await safeUpdate((p: any) => { p.onboardingCompleted = raw.onboarding_completed; }); changed = true; }
          if (!(profile as any).emergencyContactName && raw.emergency_contact_name) { await safeUpdate((p: any) => { p.emergencyContactName = raw.emergency_contact_name; }); changed = true; }
          if (!(profile as any).emergencyContactPhone && raw.emergency_contact_phone) { await safeUpdate((p: any) => { p.emergencyContactPhone = raw.emergency_contact_phone; }); changed = true; }
          if (!(profile as any).medicalConditions && raw.medical_conditions) { await safeUpdate((p: any) => { p.medicalConditions = raw.medical_conditions; }); changed = true; }
          if (!(profile as any).currentMedications && raw.current_medications) { await safeUpdate((p: any) => { p.currentMedications = raw.current_medications; }); changed = true; }
          if ((profile as any).locationServicesEnabled === undefined && raw.location_services_enabled !== undefined) { await safeUpdate((p: any) => { p.locationServicesEnabled = raw.location_services_enabled; }); changed = true; }
          if (!(profile as any).postalCode && raw.postal_code) { await safeUpdate((p: any) => { p.postalCode = raw.postal_code; }); changed = true; }
          if (!(profile as any).province && raw.province) { await safeUpdate((p: any) => { p.province = raw.province; }); changed = true; }
          if (!(profile as any).address1 && raw.address1) { await safeUpdate((p: any) => { p.address1 = raw.address1; }); changed = true; }
          if (!(profile as any).address2 && raw.address2) { await safeUpdate((p: any) => { p.address2 = raw.address2; }); changed = true; }
          if (!(profile as any).city && raw.city) { await safeUpdate((p: any) => { p.city = raw.city; }); changed = true; }
        });
        if (changed) {
          console.log(`🔁 Backfilled legacy profile fields for id=${profile.id}`);
        }
      }
      // Decide if we should attempt a sync
      // 1) Prefer explicit offline marker set by editors
      const needsSyncFlag = authUserId ? await AsyncStorage.getItem(`${authUserId}:profile_needs_sync`) : null;
      // 2) Also consider any present profile rows as candidates to merge
      const candidates = allProfilesForSync as any[];

      // Scope to the currently logged-in user only (and assign unknowns to them)
      const scopedProfiles = (candidates as any[]).filter((p) => {
        if (!authUserId) return true; // if we somehow don't have auth user yet, fall back to all
        const r = p._raw || {};
        const uid = p.userId || r.userId || r.user_id || '';
        return uid === authUserId || !uid;
      });

      // Group by userId and merge the best fields to avoid partial duplicate updates
      const groups = new Map<string, any[]>();
      for (const p of scopedProfiles as any[]) {
        const raw = p._raw || {};
        // If userId is missing and we know the auth user, group under auth user id
        const computedUid = (p.userId || raw.userId || raw.user_id || (authUserId || '')) as string;
        const key = computedUid || `unknown-${p.id}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(p);
      }
      // If we have auth user id, keep only that group
      if (authUserId) {
        for (const k of Array.from(groups.keys())) {
          if (k !== authUserId) groups.delete(k);
        }
      }
  console.log(`👤 Found ${scopedProfiles.length} profile row(s) scoped to ${authUserId ? authUserId : 'all users'} across ${groups.size} group(s)`);

      for (const [userKey, profiles] of groups) {
        try {
          // Ensure each profile has userId set where we can
          for (const pr of profiles) {
            if ((!pr.userId || pr.userId === '') && userKey && userKey.startsWith('k')) { // looks like a Convex id
              try {
                await database.write(async () => {
                  await pr.update((p: any) => { p.userId = userKey; });
                });
                console.log(`🔁 Backfilled profile.userId for profile ${pr.id}`);
              } catch (e) {
                console.warn(`⚠️ Failed to backfill userId for profile ${pr.id}:`, e);
              }
            }
          }

          // Merge best values across duplicates
          let bestAge = '';
          let bestAgeRange = '';
          let bestLocation = '';
          let bestAddress1 = '';
          let bestAddress2 = '';
          let bestCity = '';
          let bestProvince = '';
          let bestPostalCode = '';
          let bestEmergencyName = '';
          let bestEmergencyPhone = '';
          let bestAllergies = '';
          let bestMedications = '';
          let bestConditions = '';
          
          for (const pr of profiles) {
            const r = pr._raw || {};
            const a = pr.age || r.age || '';
            const ar = pr.ageRange || r.ageRange || r.age_range || '';
            const loc = pr.location || r.location || '';
            const addr1 = pr.address1 || r.address1 || '';
            const addr2 = pr.address2 || r.address2 || '';
            const ct = pr.city || r.city || '';
            const prov = pr.province || r.province || '';
            const postal = pr.postalCode || r.postalCode || r.postal_code || '';
            const emergName = pr.emergencyContactName || r.emergencyContactName || r.emergency_contact_name || '';
            const emergPhone = pr.emergencyContactPhone || r.emergencyContactPhone || r.emergency_contact_phone || '';
            const allerg = pr.allergies || r.allergies || '';
            const meds = pr.currentMedications || r.currentMedications || r.current_medications || '';
            const conds = pr.medicalConditions || r.medicalConditions || r.medical_conditions || '';
            
            if (!bestAge && a) bestAge = a;
            if (!bestAgeRange && ar) bestAgeRange = ar;
            if (!bestLocation || (loc && loc.length > bestLocation.length)) bestLocation = loc;
            if (!bestAddress1 && addr1) bestAddress1 = addr1;
            if (!bestAddress2 && addr2) bestAddress2 = addr2;
            if (!bestCity && ct) bestCity = ct;
            if (!bestProvince && prov) bestProvince = prov;
            if (!bestPostalCode && postal) bestPostalCode = postal;
            if (!bestEmergencyName && emergName) bestEmergencyName = emergName;
            if (!bestEmergencyPhone && emergPhone) bestEmergencyPhone = emergPhone;
            if (!bestAllergies && allerg) bestAllergies = allerg;
            if (!bestMedications && meds) bestMedications = meds;
            if (!bestConditions && conds) bestConditions = conds;
          }

          // Merge in AsyncStorage cache (set by offline editors) when present
          if (authUserId) {
            try {
              const rawCache = await AsyncStorage.getItem(`${authUserId}:profile_cache_v1`);
              if (rawCache) {
                const cached = JSON.parse(rawCache) || {};
                if (!bestAge && cached.age) bestAge = String(cached.age);
                if (!bestAddress1 && cached.address1) bestAddress1 = String(cached.address1);
                if (!bestAddress2 && cached.address2) bestAddress2 = String(cached.address2);
                if (!bestCity && cached.city) bestCity = String(cached.city);
                if (!bestProvince && cached.province) bestProvince = String(cached.province);
                if (!bestPostalCode && cached.postalCode) bestPostalCode = String(cached.postalCode);
                if (!bestLocation && cached.location) bestLocation = String(cached.location);
                if (!bestEmergencyName && cached.emergencyContactName) bestEmergencyName = String(cached.emergencyContactName);
                if (!bestEmergencyPhone && cached.emergencyContactPhone) bestEmergencyPhone = String(cached.emergencyContactPhone);
                if (!bestAllergies && cached.allergies) bestAllergies = String(cached.allergies);
                if (!bestMedications && cached.currentMedications) bestMedications = String(cached.currentMedications);
                if (!bestConditions && cached.medicalConditions) bestConditions = String(cached.medicalConditions);
              }
            } catch {}
          }

          const finalAge = bestAge || bestAgeRange || '';
          const location = bestLocation;

          // Sync personal info if any fields present
          const shouldSyncPersonal = !!(needsSyncFlag || finalAge || location || bestAddress1 || bestCity || bestProvince || bestPostalCode);
          if (shouldSyncPersonal) {
            console.log(`📤 Syncing personal info for user ${userKey || authUserId}`);
            await updatePersonalInfo({
              age: finalAge,
              address1: bestAddress1,
              address2: bestAddress2,
              city: bestCity,
              province: bestProvince,
              postalCode: bestPostalCode,
              location,
            });
            console.log(`✅ Synced personal info`);
          }

          // Sync emergency contact if fields present
          const shouldSyncEmergency = !!(needsSyncFlag || bestEmergencyName || bestEmergencyPhone);
          if (shouldSyncEmergency) {
            console.log(`📤 Syncing emergency contact for user ${userKey || authUserId}`);
            await updateEmergencyContact({
              emergencyContactName: bestEmergencyName,
              emergencyContactPhone: bestEmergencyPhone,
            });
            console.log(`✅ Synced emergency contact`);
          }

          // Sync medical info if fields present
          const shouldSyncMedical = !!(needsSyncFlag || bestAllergies || bestMedications || bestConditions);
          if (shouldSyncMedical) {
            console.log(`📤 Syncing medical info for user ${userKey || authUserId}`);
            await updateMedicalHistory({
              allergies: bestAllergies,
              currentMedications: bestMedications,
              medicalConditions: bestConditions,
            });
            console.log(`✅ Synced medical info`);
          }

          // Mark all local duplicates as synced (best-effort)
          for (const pr of profiles) {
            try {
              await database.write(async () => {
                await pr.update((p: any) => { 
                  p.onboardingCompleted = false; // Reset so we don't sync again
                });
              });
            } catch (localErr) {
              console.warn('⚠️ Local profile update (onboardingCompleted) failed but server sync succeeded:', localErr);
            }
          }

          // Clear offline sync flag once we've attempted server sync
          if (authUserId) {
            try { await AsyncStorage.removeItem(`${authUserId}:profile_needs_sync`); } catch {}
          }
        } catch (error) {
          console.error(`Failed to sync profile:`, error);
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
          // Sync both in parallel for faster completion
          await Promise.all([
            syncHealthEntries(),
            syncPersonalInfo()
          ]);
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