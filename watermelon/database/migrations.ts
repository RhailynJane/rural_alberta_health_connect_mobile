import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    // v2: add hours column to medical_facilities
    {
      toVersion: 2,
      steps: [
        {
          type: 'add_columns',
          table: 'medical_facilities',
          columns: [
            { name: 'hours', type: 'string', isOptional: true },
          ],
        },
      ],
    },
  ],
});