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
    // v4: add camelCase columns to user_profiles aligning with Convex schema
    {
      toVersion: 4,
      steps: [
        {
          type: 'add_columns',
          table: 'user_profiles',
          columns: [
            { name: 'userId', type: 'string', isOptional: true },
            { name: 'address1', type: 'string', isOptional: true },
            { name: 'address2', type: 'string', isOptional: true },
            { name: 'age', type: 'string', isOptional: true },
            { name: 'ageRange', type: 'string', isOptional: true },
            { name: 'city', type: 'string', isOptional: true },
            { name: 'createdAt', type: 'number', isOptional: true },
            { name: 'currentMedications', type: 'string', isOptional: true },
            { name: 'emergencyContactName', type: 'string', isOptional: true },
            { name: 'emergencyContactPhone', type: 'string', isOptional: true },
            { name: 'locationServicesEnabled', type: 'boolean', isOptional: true },
            { name: 'medicalConditions', type: 'string', isOptional: true },
            { name: 'onboardingCompleted', type: 'boolean', isOptional: true },
            { name: 'postalCode', type: 'string', isOptional: true },
            { name: 'province', type: 'string', isOptional: true },
            { name: 'reminders', type: 'string', isOptional: true },
            { name: 'symptomReminderDayOfWeek', type: 'string', isOptional: true },
            { name: 'symptomReminderEnabled', type: 'boolean', isOptional: true },
            { name: 'symptomReminderFrequency', type: 'string', isOptional: true },
            { name: 'symptomReminderTime', type: 'string', isOptional: true },
            { name: 'updatedAt', type: 'number', isOptional: true },
          ],
        },
      ],
    },
    // v5: add camelCase columns to health_entries aligning with Convex schema
    {
      toVersion: 5,
      steps: [
        {
          type: 'add_columns',
          table: 'health_entries',
          columns: [
            { name: 'userId', type: 'string', isOptional: true },
            { name: 'convexId', type: 'string', isOptional: true },
            { name: 'aiContext', type: 'string', isOptional: true },
            { name: 'createdBy', type: 'string', isOptional: true },
            { name: 'isSynced', type: 'boolean', isOptional: true },
            { name: 'syncError', type: 'string', isOptional: true },
            { name: 'createdAt', type: 'number', isOptional: true },
            { name: 'updatedAt', type: 'number', isOptional: true },
          ],
        },
      ],
    },
    // v6: add camelCase columns to users aligning with Convex schema
    {
      toVersion: 6,
      steps: [
        {
          type: 'add_columns',
          table: 'users',
          columns: [
            { name: 'convexUserId', type: 'string', isOptional: true },
            { name: 'firstName', type: 'string', isOptional: true },
            { name: 'lastName', type: 'string', isOptional: true },
            { name: 'hasCompletedOnboarding', type: 'boolean', isOptional: true },
            { name: 'emailVerificationTime', type: 'number', isOptional: true },
            { name: 'phoneVerificationTime', type: 'number', isOptional: true },
            { name: 'isAnonymous', type: 'boolean', isOptional: true },
            { name: 'createdAt', type: 'number', isOptional: true },
            { name: 'updatedAt', type: 'number', isOptional: true },
          ],
        },
      ],
    },
    // v7: add camelCase columns to reminders aligning with Convex schema
    {
      toVersion: 7,
      steps: [
        {
          type: 'add_columns',
          table: 'reminders',
          columns: [
            { name: 'userId', type: 'string', isOptional: true },
            { name: 'reminderId', type: 'string', isOptional: true },
            { name: 'dayOfWeek', type: 'string', isOptional: true },
            { name: 'createdAt', type: 'number', isOptional: true },
            { name: 'updatedAt', type: 'number', isOptional: true },
          ],
        },
      ],
    },
    // v8: Add only the truly new columns to user_profiles (avoid duplicates)
    // Original v4 already added most camelCase columns. The ones introduced later are:
    // - allergies (string)
    // - location (string)
    {
      toVersion: 8,
      steps: [
        {
          type: 'add_columns',
          table: 'user_profiles',
          columns: [
            { name: 'allergies', type: 'string', isOptional: true },
            { name: 'location', type: 'string', isOptional: true },
          ],
        },
      ],
    },
    // v9: No-op safety bump. We keep this version to ensure devices that already marked v8
    // as applied can move forward without duplicate-column errors.
    {
      toVersion: 9,
      steps: [],
    },
    // v10: Add soft delete and edit tracking fields to health_entries
    {
      toVersion: 10,
      steps: [
        {
          type: 'add_columns',
          table: 'health_entries',
          columns: [
            { name: 'isDeleted', type: 'boolean', isOptional: true },
            { name: 'lastEditedAt', type: 'number', isOptional: true },
            { name: 'editCount', type: 'number', isOptional: true },
          ],
        },
      ],
    },
  ],
});