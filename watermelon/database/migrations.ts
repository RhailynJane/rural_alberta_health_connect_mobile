import { tableSchema } from '@nozbe/watermelondb';
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
    // v3: add reminders table
    {
      toVersion: 3,
      steps: [
        {
          type: 'create_table',
          schema: tableSchema({
            name: 'reminders',
            columns: [
              { name: 'user_id', type: 'string', isIndexed: true },
              { name: 'reminder_id', type: 'string', isIndexed: true },
              { name: 'enabled', type: 'boolean' },
              { name: 'frequency', type: 'string' },
              { name: 'time', type: 'string', isOptional: true },
              { name: 'day_of_week', type: 'string', isOptional: true },
              { name: 'created_at', type: 'number' },
              { name: 'updated_at', type: 'number' },
            ],
          }),
        },
      ],
    },
  ],
});