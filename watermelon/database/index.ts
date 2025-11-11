import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import migrations from './migrations';
import schema from './schema';

// Models
import HealthEntry from '../models/HealthEntry';
import MedicalFacility from '../models/MedicalFacility';
import Reminder from '../models/Reminder';
import User from '../models/User';
import UserProfile from '../models/UserProfile';
import { ensureHealthEntriesCoreColumns, ensureHealthEntriesType, ensureHealthEntriesV10Columns, ensureUserProfilesSchema } from './selfHeal';

// Log migration info
console.log(`🔧 [WMDB] Schema version: v${schema.version}`);
console.log(`🔧 [WMDB] Migrations available: v${migrations.minVersion} to v${migrations.maxVersion}`);
console.log(`🔧 [WMDB] Total migration steps: ${migrations.sortedMigrations.length}`);

// Create adapter
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'RANCAppDB',
  jsi: true,
  onSetUpError: (error) => {
    console.error('❌ [WMDB] Database setup error:', error);
  },
});

console.log('✅ [WMDB] Adapter created successfully');

// Create database instance
export const database = new Database({
  adapter,
  modelClasses: [User, UserProfile, HealthEntry, MedicalFacility, Reminder],
});

// Query actual database version and auto-reset if corrupted
(async () => {
  try {
    const getVersion = async () =>
      await database.adapter.getLocal('__watermelon_schema_version');

    const logVersions = (v: string | null) => {
      console.log(`📊 [WMDB] Actual DB version on device: v${v || 'unknown'}`);
      console.log(`📊 [WMDB] Expected schema version: v${schema.version}`);
    };

    // initial read
    let actualVersion: string | null = await getVersion();
    logVersions(actualVersion);

    // Helper to decide whether DB files exist (to avoid resetting when nothing exists yet)
    const { doesDbExist, resetCorruptedDatabase } = await import('./resetDatabase');
    let dbExists = await doesDbExist();

    // On a fresh install, version may be temporarily unknown/null right after adapter creation.
    // Warm up the adapter's local store to force file creation, then re-check once before any destructive action.
    if (!actualVersion || actualVersion === 'unknown') {
      if (!dbExists) {
        console.warn('ℹ️ [WMDB] DB files not found yet — treating as first-time init. Skipping auto-reset.');
        try {
          await database.adapter.setLocal('__wmdb_warmup', new Date().toISOString());
        } catch (warmErr) {
          console.log('ℹ️ [WMDB] Warm-up setLocal failed or not needed:', (warmErr as any)?.message);
        }
        await new Promise((r) => setTimeout(r, 150));
        actualVersion = await getVersion();
        dbExists = await doesDbExist();
        console.log(`🧊 [WMDB] Warm-up check — version: v${actualVersion || 'unknown'}, dbExists: ${dbExists}`);
        // If still unknown, perform one-time in-app reset using Watermelon's API to ensure schema is created
        if ((!actualVersion || actualVersion === 'unknown')) {
          const alreadyReset = await database.adapter.getLocal('__wmdb_reset_performed');
          if (alreadyReset !== '1') {
            console.warn('🔧 [WMDB AUTO-FIX] Performing in-app unsafeResetDatabase to recreate schema...');
            try {
              await database.write(async () => {
                await database.unsafeResetDatabase();
              });
              await database.adapter.setLocal('__wmdb_reset_performed', '1');
              await database.adapter.setLocal('__watermelon_schema_version', String(schema.version));
              // Clear any profile repair flags since we just recreated the database with proper schema
              await database.adapter.setLocal('__wmdb_fix_attempted_v9', '0');
              await database.adapter.setLocal('__wmdb_schema_repaired_v9', '0');
              const verifyAfter = await getVersion();
              console.log(`✅ [WMDB] In-app reset complete. Schema version now: v${verifyAfter || 'unknown'}`);
            } catch (rErr: any) {
              console.error(`❌ [WMDB] In-app unsafeResetDatabase failed: ${rErr.message}`);
            }
          }
        }
      } else {
        await new Promise((r) => setTimeout(r, 300));
        actualVersion = await getVersion();
        console.log(`🔁 [WMDB] Re-check DB version after delay: v${actualVersion || 'unknown'}`);
        if (!actualVersion || actualVersion === 'unknown') {
          const alreadyReset = await database.adapter.getLocal('__wmdb_reset_performed');
          if (alreadyReset !== '1') {
            console.warn('🔧 [WMDB AUTO-FIX] Performing in-app unsafeResetDatabase to recreate schema...');
            try {
              await database.write(async () => {
                await database.unsafeResetDatabase();
              });
              await database.adapter.setLocal('__wmdb_reset_performed', '1');
              await database.adapter.setLocal('__watermelon_schema_version', String(schema.version));
              // Clear any profile repair flags since we just recreated the database with proper schema
              await database.adapter.setLocal('__wmdb_fix_attempted_v9', '0');
              await database.adapter.setLocal('__wmdb_schema_repaired_v9', '0');
              const verifyAfter = await getVersion();
              console.log(`✅ [WMDB] In-app reset complete. Schema version now: v${verifyAfter || 'unknown'}`);
            } catch (rErr: any) {
              console.error(`❌ [WMDB] In-app unsafeResetDatabase failed: ${rErr.message}`);
            }
          }
        }
      }
    }

    // Run lightweight self-heal routines for schema drift / missing data defaults
    try {
      await ensureUserProfilesSchema(database);
    } catch (e) {
      console.warn('⚠️ [WMDB] ensureUserProfilesSchema failed (continuing):', (e as any)?.message);
    }
    // Make sure v10 columns exist even if migrations did not run previously
    try {
      await ensureHealthEntriesCoreColumns(database);
    } catch (e) {
      console.warn('⚠️ [WMDB] ensureHealthEntriesCoreColumns failed (continuing):', (e as any)?.message);
    }
    try {
      await ensureHealthEntriesV10Columns(database);
    } catch (e) {
      console.warn('⚠️ [WMDB] ensureHealthEntriesV10Columns failed (continuing):', (e as any)?.message);
    }
    try {
      await ensureHealthEntriesType(database);
    } catch (e) {
      console.warn('⚠️ [WMDB] ensureHealthEntriesType failed (continuing):', (e as any)?.message);
    }

    // CRITERIA FOR RESET:
    // - Known bad legacy installs stuck at v1
    // - Or after re-check, version still unknown while DB files definitively exist
    if (actualVersion === '1') {
      console.error(`❌ [WMDB CRITICAL] Database schema is corrupted!`);
      console.error(`❌ [WMDB] Database was created at v9 but migrations v2-v8 never ran`);
      console.error(`❌ [WMDB] Missing columns: age, address1, address2, city, province, postalCode, location, onboardingCompleted`);
      console.warn(`\n🔧 [WMDB AUTO-FIX] Attempting to reset and recreate database...\n`);

      try {
        const resetSuccess = await resetCorruptedDatabase();

        if (resetSuccess) {
          console.log(`✅ [WMDB] Database reset successful!`);
          console.warn(`⚠️ [WMDB] PLEASE RESTART THE APP NOW to recreate database with proper schema!`);
          console.warn(`⚠️ [WMDB] After restart, all columns will exist and UPDATE operations will work.`);
        } else {
          console.error(`❌ [WMDB] Failed to reset database automatically`);
          console.error(`❌ [WMDB] Please manually clear app data: Settings → Apps → Storage → Clear Data`);
        }
      } catch (resetError: any) {
        console.error(`❌ [WMDB] Error during auto-reset: ${resetError.message}`);
        console.error(`❌ [WMDB] Please manually clear app data: Settings → Apps → Storage → Clear Data`);
      }
    } else if (dbExists && (!actualVersion || actualVersion === 'unknown')) {
      // Fresh DB likely created with full schema but the local version isn't set yet.
      // Bootstrap the local version to prevent repeated checks and allow updates to proceed.
      try {
        await database.adapter.setLocal('__watermelon_schema_version', String(schema.version));
        const verified = await getVersion();
        console.log(`🛠️ [WMDB] Bootstrapped schema version to v${schema.version}. Verify: v${verified || 'unknown'}`);
      } catch (e: any) {
        console.warn(`⚠️ [WMDB] Failed to bootstrap local version: ${e.message}`);
      }
    } else if (actualVersion && parseInt(actualVersion) < schema.version) {
      console.warn(`⚠️ [WMDB] Database is outdated! Device: v${actualVersion}, Expected: v${schema.version}`);
      console.warn(`⚠️ [WMDB] Migrations should auto-run from v${actualVersion} to v${schema.version}`);
    } else if (actualVersion && parseInt(actualVersion) === schema.version) {
      console.log(`✅ [WMDB] Database is up-to-date at v${schema.version}`);
    }
  } catch (e: any) {
    console.error(`❌ [WMDB] Could not check/fix DB version: ${e.message}`);
  }
})();

export default database;