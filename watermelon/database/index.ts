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

// Create adapter
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'RANCAppDB',
  jsi: true,
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

// Create database instance
export const database = new Database({
  adapter,
  modelClasses: [User, UserProfile, HealthEntry, MedicalFacility, Reminder],
});

export default database;