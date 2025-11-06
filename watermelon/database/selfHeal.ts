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

export default ensureUserProfilesSchema;
