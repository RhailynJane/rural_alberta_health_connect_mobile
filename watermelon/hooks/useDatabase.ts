import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/react';

export const useWatermelonDatabase = () => {
  return useDatabase();
};

export const useUsers = () => {
  const database = useDatabase();
  return database.get('users').query();
};

export const useHealthEntries = (userId: string) => {
  const database = useDatabase();
  return database.get('health_entries').query(
    Q.where('user_id', userId),
    Q.sortBy('timestamp', Q.desc)
  );
};