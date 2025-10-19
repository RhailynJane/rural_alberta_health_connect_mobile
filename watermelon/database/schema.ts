import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'convex_user_id', type: 'string', isIndexed: true },
        { name: 'email', type: 'string' },
        { name: 'first_name', type: 'string' },
        { name: 'last_name', type: 'string' },
        { name: 'has_completed_onboarding', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: '_status', type: 'string' },
        { name: '_changed', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'user_profiles',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'age_range', type: 'string', isOptional: true },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'emergency_contact_name', type: 'string', isOptional: true },
        { name: 'emergency_contact_phone', type: 'string', isOptional: true },
        { name: 'medical_conditions', type: 'string', isOptional: true },
        { name: 'current_medications', type: 'string', isOptional: true },
        { name: 'allergies', type: 'string', isOptional: true },
        { name: 'onboarding_completed', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: '_status', type: 'string' },
        { name: '_changed', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'health_entries',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'convex_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'date', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'symptoms', type: 'string' },
        { name: 'severity', type: 'number' },
        { name: 'category', type: 'string', isOptional: true },
        { name: 'duration', type: 'string', isOptional: true },
        { name: 'ai_context', type: 'string', isOptional: true },
        { name: 'photos', type: 'string', isOptional: true }, // Store as JSON string
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'type', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'sync_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: '_status', type: 'string' },
        { name: '_changed', type: 'string' },
      ],
    }),
  ],
});