import { api } from '@/convex/_generated/api';
import { Q } from '@nozbe/watermelondb';
import { useQuery } from 'convex/react';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text } from 'react-native';
import { database } from '../../../watermelon/database';
import { getReminders, scheduleAllReminderItems } from '../../_utils/notifications';

export default function ReminderDebug() {
  const [permission, setPermission] = useState<any>(null);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [wmReminders, setWmReminders] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const convexSettings = useQuery(api.profile.reminders.getReminderSettings, {});

  useEffect(() => {
    (async () => {
      try {
        setPermission(await Notifications.getPermissionsAsync());
      } catch (e) { setPermission({ error: String(e) }); }
      try {
        if (Notifications.getAllScheduledNotificationsAsync) {
          setScheduled(await Notifications.getAllScheduledNotificationsAsync());
        }
      } catch (e) { setScheduled([{ error: String(e) }]); }
      let loadedReminders = [];
      try {
        loadedReminders = await getReminders();
        setReminders(loadedReminders);
      } catch (e) { setReminders([{ error: String(e) }]); }
      try {
        const userId = loadedReminders[0]?.userId || loadedReminders[0]?.id?.split('_')[0];
        if (userId) {
          const collection = database.get('reminders');
          setWmReminders(await collection.query(Q.where('user_id', userId)).fetch());
        }
      } catch (e) { setWmReminders([{ error: String(e) }]); }
    })();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Notification Diagnostics</Text>
      <Text style={styles.label}>OS Notification Permission:</Text>
      <Text selectable style={styles.value}>{JSON.stringify(permission, null, 2)}</Text>
      <Text style={styles.label}>Scheduled Notifications (OS):</Text>
      <Text selectable style={styles.value}>{JSON.stringify(scheduled, null, 2)}</Text>
      <Text style={styles.label}>Reminders (AsyncStorage):</Text>
      <Text selectable style={styles.value}>{JSON.stringify(reminders, null, 2)}</Text>
      <Text style={styles.label}>Reminders (WatermelonDB):</Text>
      <Text selectable style={styles.value}>{JSON.stringify(wmReminders, null, 2)}</Text>
      <Text style={styles.label}>Convex Reminder Settings:</Text>
      <Text selectable style={styles.value}>{JSON.stringify(convexSettings, null, 2)}</Text>
  <Button title="Resync & Reschedule All Reminders" onPress={async () => { try { await scheduleAllReminderItems(); } catch (e) { console.error('❌ Error rescheduling reminders:', e); } await (async () => { try { setPermission(await Notifications.getPermissionsAsync()); } catch (e) { setPermission({ error: String(e) }); } try { if (Notifications.getAllScheduledNotificationsAsync) { setScheduled(await Notifications.getAllScheduledNotificationsAsync()); } } catch (e) { setScheduled([{ error: String(e) }]); } let loadedReminders = []; try { loadedReminders = await getReminders(); setReminders(loadedReminders); } catch (e) { setReminders([{ error: String(e) }]); } try { const userId = loadedReminders[0]?.userId || loadedReminders[0]?.id?.split('_')[0]; if (userId) { const collection = database.get('reminders'); setWmReminders(await collection.query(Q.where('user_id', userId)).fetch()); } else { setWmReminders([]); } } catch (e) { setWmReminders([{ error: String(e) }]); } })(); }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { fontWeight: 'bold', marginTop: 16 },
  value: { fontFamily: 'monospace', fontSize: 12, color: '#333' },
});
