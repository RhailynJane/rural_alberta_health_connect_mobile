import type { Database } from '@nozbe/watermelondb';

// Best-effort self-healing for user_profiles schema drift on device SQLite
// Adds any missing camelCase columns so WatermelonDB updates stop throwing
// "Cannot read property 'type' of undefined" for undefined column definitions.
export async function ensureUserProfilesSchema(db: Database | any) {
  console.log('🔧 [WMDB] ensureUserProfilesSchema called - starting schema heal...');
  try {
    const adapter: any = (db as any)?.adapter;
    console.log('🔧 [WMDB] Adapter exists:', !!adapter, 'unsafeSqlQuery exists:', !!adapter?.unsafeSqlQuery);
    if (!adapter?.unsafeSqlQuery) {
      console.warn('⚠️ [WMDB] No unsafeSqlQuery method available - cannot heal schema');
      return;
    }

    // Gather existing columns if possible (shape varies across platforms)
    const existing = new Set<string>();
    try {
      const pragma: any = await adapter.unsafeSqlQuery("PRAGMA table_info('user_profiles')");
      const rows: any[] = Array.isArray(pragma)
        ? pragma
        : Array.isArray(pragma?.rows)
          ? pragma.rows
          : (pragma?.map ? pragma : []);
      for (const row of rows) {
        const name = row?.name ?? row?.[1] ?? row?.column_name;
        if (typeof name === 'string') existing.add(name);
      }
      console.log('🧪 [WMDB] user_profiles actual columns (pre-heal):', Array.from(existing));
    } catch (e) {
      console.warn('⚠️ [WMDB] Failed to read PRAGMA table_info(user_profiles) before heal:', e);
    }

    type Col = { name: string; type: 'TEXT' | 'INTEGER' };
    const expected: Col[] = [
      { name: 'userId', type: 'TEXT' },
      { name: 'address1', type: 'TEXT' },
      { name: 'address2', type: 'TEXT' },
      { name: 'age', type: 'TEXT' },
      { name: 'ageRange', type: 'TEXT' },
      { name: 'allergies', type: 'TEXT' },
      { name: 'city', type: 'TEXT' },
      { name: 'createdAt', type: 'INTEGER' },
      { name: 'currentMedications', type: 'TEXT' },
      { name: 'emergencyContactName', type: 'TEXT' },
      { name: 'emergencyContactPhone', type: 'TEXT' },
      { name: 'location', type: 'TEXT' },
      { name: 'locationServicesEnabled', type: 'INTEGER' },
      { name: 'medicalConditions', type: 'TEXT' },
      { name: 'onboardingCompleted', type: 'INTEGER' },
      { name: 'postalCode', type: 'TEXT' },
      { name: 'province', type: 'TEXT' },
      { name: 'reminders', type: 'TEXT' },
      { name: 'symptomReminderDayOfWeek', type: 'TEXT' },
      { name: 'symptomReminderEnabled', type: 'INTEGER' },
      { name: 'symptomReminderFrequency', type: 'TEXT' },
      { name: 'symptomReminderTime', type: 'TEXT' },
      { name: 'updatedAt', type: 'INTEGER' },
    ];

    for (const col of expected) {
      if (existing.size > 0 && existing.has(col.name)) continue;
      const sql = `ALTER TABLE user_profiles ADD COLUMN ${col.name} ${col.type}`;
      try {
        await adapter.unsafeSqlQuery(sql);
        console.log(`🛠️ [WMDB] Added missing column user_profiles.${col.name} (${col.type})`);
      } catch (e) {
        // Ignore errors if column already exists or ALTER TABLE not supported in this context
        console.warn(`ℹ️ [WMDB] Could not add column ${col.name} (likely exists):`, String(e));
      }
    }

    // Log post-heal columns
    try {
      const pragma2: any = await adapter.unsafeSqlQuery("PRAGMA table_info('user_profiles')");
      const rows2: any[] = Array.isArray(pragma2)
        ? pragma2
        : Array.isArray(pragma2?.rows)
          ? pragma2.rows
          : (pragma2?.map ? pragma2 : []);
      const after = new Set<string>();
      for (const row of rows2) {
        const name = row?.name ?? row?.[1] ?? row?.column_name;
        if (typeof name === 'string') after.add(name);
      }
      console.log('🧪 [WMDB] user_profiles actual columns (post-heal):', Array.from(after));
    } catch (e) {
      console.warn('⚠️ [WMDB] Failed to read PRAGMA table_info(user_profiles) after heal:', e);
    }
  } catch (err) {
    console.warn('⚠️ [WMDB] ensureUserProfilesSchema encountered an error (continuing):', err);
  }
}

// Ensure legacy health_entries have a valid `type` value so updates don't fail.
// Strategy:
// - If `type` is NULL or empty, set it to:
//   - 'ai_assessment' when aiContext is non-empty
//   - otherwise 'manual_entry'
export async function ensureHealthEntriesType(db: Database | any) {
  console.log('🔧 [WMDB] ensureHealthEntriesType called - patching missing type values...');
  try {
    const adapter: any = (db as any)?.adapter;
    if (!adapter?.unsafeSqlQuery) {
      console.warn('⚠️ [WMDB] No unsafeSqlQuery available - using model-level fallback to patch types/notes');
      try {
        const collection = db.get('health_entries');
        const all = await collection.query().fetch();
        const toFix = all.filter((r: any) => !r.type || r.type === '' || r.notes == null);
        if (toFix.length > 0) {
          await db.write(async () => {
            await db.batch(
              ...toFix.map((rec: any) => rec.prepareUpdate((r: any) => {
                if (!r.type || r.type === '') {
                  r.type = r.aiContext && String(r.aiContext).length > 0 ? 'ai_assessment' : 'manual_entry';
                }
                if (r.notes == null) {
                  r.notes = '';
                }
              }))
            );
          });
          console.log(`✅ [WMDB] Patched ${toFix.length} records via model-level fallback (no unsafeSqlQuery)`);
        } else {
          console.log('👍 [WMDB] No records required model-level patch');
        }
      } catch (e) {
        console.warn('⚠️ [WMDB] Model-level ensureHealthEntriesType fallback failed:', e);
      }
      return;
    }

    // Verify the column exists to avoid exceptions on some devices
    let hasTypeCol = false;
    try {
      const pragma: any = await adapter.unsafeSqlQuery("PRAGMA table_info('health_entries')");
      const rows: any[] = Array.isArray(pragma)
        ? pragma
        : Array.isArray((pragma as any)?.rows)
          ? (pragma as any).rows
          : ((pragma as any)?.map ? pragma : []);
      for (const row of rows) {
        const name = row?.name ?? row?.[1] ?? row?.column_name;
        if (name === 'type') {
          hasTypeCol = true;
          break;
        }
      }
      console.log('🧪 [WMDB] health_entries has type column:', hasTypeCol);
    } catch (e) {
      console.warn('⚠️ [WMDB] Failed to introspect health_entries schema:', e);
      // Assume it exists — we've seen duplicate-column errors previously
      hasTypeCol = true;
    }

    if (!hasTypeCol) {
      console.warn('⚠️ [WMDB] health_entries.type column missing. Skipping data patch to avoid ALTER TABLE conflicts.');
      return;
    }

    // Count how many rows need patching
    let needsPatch = 0;
    try {
      const res: any = await adapter.unsafeSqlQuery(
        "SELECT COUNT(*) as cnt FROM health_entries WHERE type IS NULL OR type = ''"
      );
      const row = Array.isArray(res)
        ? res[0]
        : Array.isArray(res?.rows)
          ? res.rows[0]
          : (res?.[0] ?? res);
      const cntVal = row?.cnt ?? row?.["COUNT(*)"] ?? row?.[0] ?? 0;
      needsPatch = Number(cntVal) || 0;
      console.log(`🧮 [WMDB] health_entries needing type patch: ${needsPatch}`);
    } catch (e) {
      console.warn('⚠️ [WMDB] Could not count rows needing type patch:', e);
    }

    if (needsPatch > 0) {
      try {
        await adapter.unsafeSqlQuery(
          "UPDATE health_entries SET type = CASE WHEN aiContext IS NOT NULL AND aiContext != '' THEN 'ai_assessment' ELSE 'manual_entry' END WHERE type IS NULL OR type = ''"
        );
        console.log('✅ [WMDB] Patched missing health_entries.type values successfully');
      } catch (e) {
        console.warn('⚠️ [WMDB] Failed to patch health_entries.type via SQL, will attempt record-by-record fallback:', e);
        // Fallback: try to patch via Watermelon where possible
        try {
          const collection = db.get('health_entries');
          const allMissing = await collection.query().fetch();
          const toFix = allMissing.filter((r: any) => !r.type || r.type === '');
          if (toFix.length > 0) {
            await db.write(async () => {
              await db.batch(
                ...toFix.map((rec: any) => rec.prepareUpdate((r: any) => {
                  r.type = r.aiContext && String(r.aiContext).length > 0 ? 'ai_assessment' : 'manual_entry';
                }))
              );
            });
            console.log(`✅ [WMDB] Patched ${toFix.length} records via model fallback`);
          }
        } catch (e2) {
          console.warn('⚠️ [WMDB] Model-level fallback also failed:', e2);
        }
      }
    } else {
      console.log('👍 [WMDB] No health_entries records require type patch');
    }

    // Also ensure notes defaults to empty string if NULL to match Convex required string
    try {
      await adapter.unsafeSqlQuery(
        "UPDATE health_entries SET notes = '' WHERE notes IS NULL"
      );
      console.log('✅ [WMDB] Ensured notes has empty-string defaults for NULL values');
    } catch (e) {
      console.warn('⚠️ [WMDB] Could not normalize notes defaults:', e);
    }
  } catch (err) {
    console.warn('⚠️ [WMDB] ensureHealthEntriesType encountered an error (continuing):', err);
  }
}

export default ensureUserProfilesSchema;
