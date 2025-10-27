import { Q } from '@nozbe/watermelondb';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "../../watermelon/database";
import { NotificationBellEvent } from "./NotificationBellEvent";

const STORAGE_KEY = "symptomReminderNotificationId";
const BELL_UNREAD_KEY = "notificationBellUnread";
const LAST_READ_DATE_KEY = "notificationLastReadDate";
const REMINDERS_KEY = "symptomRemindersList";
// Android heads-up reminder channel
const REMINDER_CHANNEL_ID = "reminders-high";
// Per-user namespace for AsyncStorage keys to avoid cross-user leakage on the same device
let USER_NS: string | null = null;
export function setReminderUserKey(ns: string | null) {
  USER_NS = (ns && String(ns).trim().length > 0) ? String(ns) : null;
}
function nk(key: string): string { return USER_NS ? `${USER_NS}:${key}` : key; }
let handlerInitialized = false;

// Convex sync callback - set by the app component that has access to useMutation
let convexSyncCallback: ((reminders: ReminderItem[]) => Promise<void>) | null = null;
export function setConvexSyncCallback(callback: ((reminders: ReminderItem[]) => Promise<void>) | null) {
  convexSyncCallback = callback;
}

export type ReminderFrequency = "daily" | "weekly";

export type ReminderSettings = {
  enabled: boolean;
  frequency: ReminderFrequency;
  time: string; // HH:mm 24h
  dayOfWeek?: string; // Mon..Sun if weekly
};

// Multiple reminders support
export type MultiReminderFrequency = "hourly" | "daily" | "weekly";

export type ReminderItem = {
  id: string; // unique id
  enabled: boolean;
  frequency: MultiReminderFrequency;
  time?: string; // HH:mm for daily/weekly
  dayOfWeek?: string; // Mon..Sun for weekly
  createdAt: string;
  updatedAt: string;
};

function genId(): string {
  return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

export async function getReminders(): Promise<ReminderItem[]> {
  try {
    const raw = await AsyncStorage.getItem(nk(REMINDERS_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ReminderItem[];
    return [];
  } catch {
    return [];
  }
}

async function saveReminders(list: ReminderItem[]): Promise<void> {
  try { await AsyncStorage.setItem(nk(REMINDERS_KEY), JSON.stringify(list)); } catch {}
  // Mirror to WatermelonDB for offline/local queries
  try { await syncRemindersToWatermelon(list); } catch {}
  // Sync to Convex if callback is set
  if (convexSyncCallback) {
    try { await convexSyncCallback(list); } catch (e) { console.error("Failed to sync reminders to Convex:", e); }
  }
}

export async function addReminder(item: Omit<ReminderItem, "id"|"createdAt"|"updatedAt">): Promise<ReminderItem[]> {
  const list = await getReminders();
  const now = new Date().toISOString();
  const newItem: ReminderItem = { id: genId(), createdAt: now, updatedAt: now, ...item };
  const updated = [...list, newItem];
  await saveReminders(updated);
  // Don't schedule immediately - wait for explicit scheduleAllReminderItems call
  return updated;
}

export async function updateReminder(id: string, patch: Partial<ReminderItem>): Promise<ReminderItem[]> {
  const list = await getReminders();
  const now = new Date().toISOString();
  const updated = list.map(r => r.id === id ? { ...r, ...patch, updatedAt: now } : r);
  await saveReminders(updated);
  // Don't schedule immediately - wait for explicit scheduleAllReminderItems call
  return updated;
}

export async function deleteReminder(id: string): Promise<ReminderItem[]> {
  const list = await getReminders();
  const remaining = list.filter(r => r.id !== id);
  await saveReminders(remaining);
  // Don't schedule immediately - wait for explicit scheduleAllReminderItems call
  return remaining;
}

async function getNotificationsModule() {
  // Minimal stub to prevent crashes in environments without native support
  const stub: any = {
    setNotificationHandler: () => {},
    setNotificationChannelAsync: async () => {},
    getPermissionsAsync: async () => ({ granted: false }),
    requestPermissionsAsync: async () => ({ granted: false }),
    cancelScheduledNotificationAsync: async () => {},
    scheduleNotificationAsync: async () => "",
    AndroidImportance: { DEFAULT: 3 },
    IosAuthorizationStatus: { PROVISIONAL: 1 },
  };

  // Prefer dynamic import first; fall back to stub on any error or unsupported platform
  try {
    const Notifications = await import("expo-notifications");
    return Notifications as any;
  } catch {
    // As a fallback for platforms where the module isn't available (web or missing native), return stub
    return stub;
  }
}

export async function initializeNotificationsOnce() {
  if (handlerInitialized) return;
  handlerInitialized = true;

  const Notifications = await getNotificationsModule();
  if (typeof (Notifications as any).setNotificationHandler === 'function') {
    (Notifications as any).setNotificationHandler({
      handleNotification: async (notification: any) => {
        const type = notification?.request?.content?.data?.type;
        const isReminder = type === 'symptom_reminder' || type === 'daily_reminder' || type === 'weekly_reminder';
        // For reminders: show banner and play sound even in foreground. For others: keep silent.
        const result = {
          // Android relies on shouldShowAlert; iOS 17+ uses shouldShowBanner/shouldShowList
          shouldShowAlert: !!isReminder,
          shouldShowBanner: !!isReminder,
          shouldShowList: true,
          shouldPlaySound: !!isReminder,
          shouldSetBadge: true,
        };
        return result as any;
      },
    });
  }

  // When a reminder notification is received, immediately set bell unread and notify UI
  try {
    if (typeof (Notifications as any).addNotificationReceivedListener === 'function') {
      (Notifications as any).addNotificationReceivedListener(async (notification: any) => {
        const type = notification?.request?.content?.data?.type;
        const isReminder = type === 'symptom_reminder' || type === 'daily_reminder' || type === 'weekly_reminder';
        if (isReminder) {
          try { await setBellUnread(true); } catch {}
          NotificationBellEvent.emit('due');
        }
      });
    }
  } catch {}

  // Create Android channel for persistent high-priority notifications (heads-up)
  try {
    if (typeof (Notifications as any).setNotificationChannelAsync === 'function') {
      const HIGH = (Notifications as any).AndroidImportance?.HIGH ?? 4;
      await (Notifications as any).setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: "Symptom Reminders (Heads-up)",
        importance: HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00695C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        bypassDnd: false,
        lockscreenVisibility: 1,
      } as any);
    }
  } catch {
    // Ignore when channel API isn't available (iOS/Web)
  }

  // One-time migration: reschedule reminders to use the new heads-up channel
  try {
    const migratedKey = nk('reminderChannelMigratedV1');
    const already = await AsyncStorage.getItem(migratedKey);
    if (!already) {
      try { await scheduleAllReminderItems(); } catch {}
      try { await AsyncStorage.setItem(migratedKey, '1'); } catch {}
    }
  } catch {}
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  
  console.log("🔔 [requestNotificationPermissions] Module loaded:", {
    hasGetPermissions: typeof (Notifications as any).getPermissionsAsync === 'function',
    hasRequestPermissions: typeof (Notifications as any).requestPermissionsAsync === 'function',
  });
  
  try {
    if (typeof (Notifications as any).getPermissionsAsync !== 'function') {
      console.log("⚠️ getPermissionsAsync not available - likely web or missing module");
      return false;
    }
    if (typeof (Notifications as any).requestPermissionsAsync !== 'function') {
      console.log("⚠️ requestPermissionsAsync not available");
      return false;
    }
    
    console.log("🔔 Requesting permissions...");
    const req = await (Notifications as any).requestPermissionsAsync();
    console.log("🔔 Permission request result:", req);
    
    return (
      (req as any)?.granted ||
      (req as any)?.ios?.status === (Notifications as any).IosAuthorizationStatus?.PROVISIONAL ||
      false
    );
  } catch (err) {
    console.error("❌ Error requesting permissions:", err);
    return false;
  }
}

export async function cancelSymptomReminder() {
  const Notifications = await getNotificationsModule();
  const existingId = await AsyncStorage.getItem(nk(STORAGE_KEY));
  if (existingId) {
    try {
      if (typeof (Notifications as any).cancelScheduledNotificationAsync === 'function') {
        await (Notifications as any).cancelScheduledNotificationAsync(existingId);
      }
    } catch {}
    await AsyncStorage.removeItem(nk(STORAGE_KEY));
  }
  // Clear bell unread flag when canceling
  try { await AsyncStorage.setItem(nk(BELL_UNREAD_KEY), "0"); } catch {}
}

// Dismiss all delivered notifications from notification center
export async function dismissAllNotifications() {
  const Notifications = await getNotificationsModule();
  try {
    if (typeof (Notifications as any).dismissAllNotificationsAsync === 'function') {
      await (Notifications as any).dismissAllNotificationsAsync();
      console.log('🔕 Dismissed all delivered notifications');
    }
  } catch (e) {
    console.error('Error dismissing notifications:', e);
  }
}

function parseTimeToHourMinute(t: string): { hour: number; minute: number } {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t);
  if (!m) return { hour: 9, minute: 0 };
  return { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10) };
}

function weekdayStringToNumber(d?: string): number {
  const map: Record<string, number> = {
    Sun: 1,
    Mon: 2,
    Tue: 3,
    Wed: 4,
    Thu: 5,
    Fri: 6,
    Sat: 7,
  };
  if (!d) return 2; // default Monday
  return map[d] ?? 2;
}

export async function scheduleSymptomReminder(settings: ReminderSettings) {
  await initializeNotificationsOnce();

  if (!settings.enabled) {
    await cancelSymptomReminder();
    return;
  }

  const ok = await requestNotificationPermissions();
  if (!ok) {
    await cancelSymptomReminder();
    return;
  }

  // Cancel existing before scheduling new
  await cancelSymptomReminder();

  const Notifications = await getNotificationsModule();
  const { hour, minute } = parseTimeToHourMinute(settings.time);

  let trigger: any;
  if (settings.frequency === "daily") {
    trigger = { type: "calendar", hour, minute, repeats: true, channelId: REMINDER_CHANNEL_ID } as any;
  } else {
    trigger = {
      type: "calendar",
      weekday: weekdayStringToNumber(settings.dayOfWeek),
      hour,
      minute,
      repeats: true,
      channelId: REMINDER_CHANNEL_ID,
    } as any;
  }

  if (typeof (Notifications as any).scheduleNotificationAsync !== 'function') {
    return; // running in an environment without notifications support
  }

  const id = await (Notifications as any).scheduleNotificationAsync({
    content: {
      title: "Symptom Assessment Reminder",
      body: "It's time to complete your daily symptoms check.",
      sound: 'default',
      priority: 'max', // Android: request highest priority
      data: {
        type: 'symptom_reminder',
        timestamp: Date.now(),
      },
    },
    trigger,
  });

  await AsyncStorage.setItem(nk(STORAGE_KEY), id);
}

export async function getAllScheduledNotifications(): Promise<any[]> {
  const Notifications = await getNotificationsModule();
  try {
    if (typeof (Notifications as any).getAllScheduledNotificationsAsync === 'function') {
      const notifications = await (Notifications as any).getAllScheduledNotificationsAsync();
      return notifications || [];
    }
  } catch (e) {
    console.error('Error getting scheduled notifications:', e);
  }
  return [];
}

export async function getSymptomReminderDetails(): Promise<{
  id: string | null;
  scheduled: boolean;
  nextTriggerDate?: Date;
  trigger?: any;
} | null> {
  const Notifications = await getNotificationsModule();
  const storedId = await AsyncStorage.getItem(nk(STORAGE_KEY));
  
  if (!storedId) {
    return { id: null, scheduled: false };
  }

  try {
    if (typeof (Notifications as any).getAllScheduledNotificationsAsync === 'function') {
      const allNotifications = await (Notifications as any).getAllScheduledNotificationsAsync();
      const reminder = allNotifications?.find((n: any) => n.identifier === storedId);
      
      if (reminder) {
        return {
          id: storedId,
          scheduled: true,
          trigger: reminder.trigger,
          nextTriggerDate: reminder.trigger?.date ? new Date(reminder.trigger.date) : undefined,
        };
      }
    }
  } catch (e) {
    console.error('Error getting reminder details:', e);
  }

  return { id: storedId, scheduled: false };
}

// Bell unread helpers
export async function setBellUnread(unread: boolean): Promise<void> {
  try {
    const prev = await AsyncStorage.getItem(nk(BELL_UNREAD_KEY));
    const prevBool = prev === "1";
    if (prevBool !== unread) {
      await AsyncStorage.setItem(nk(BELL_UNREAD_KEY), unread ? "1" : "0");
      // Emit events so all bells update immediately across screens
      if (unread) {
        NotificationBellEvent.emit('due');
      } else {
        NotificationBellEvent.emit('cleared');
      }
    } else {
      // No change; still persist to ensure key exists
      await AsyncStorage.setItem(nk(BELL_UNREAD_KEY), unread ? "1" : "0");
    }
  } catch {}
}

export async function isBellUnread(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(nk(BELL_UNREAD_KEY));
    return v === "1";
  } catch {
    return false;
  }
}

export async function markBellRead(): Promise<void> {
  await setBellUnread(false);
  // Store the date/time when user marked as read, so we don't re-trigger until next reminder
  const now = new Date().toISOString();
  try { await AsyncStorage.setItem(nk(LAST_READ_DATE_KEY), now); } catch {}
}

// Legacy helper no longer used; kept for reference
// function hasReadTodaysNotification(reminderTime: string): Promise<boolean> { return Promise.resolve(false); }

/**
 * Check if the current time has passed the reminder time today/this week.
 * If so, automatically mark as unread. Returns true if notification is due.
 * The unread flag stays until manually cleared (by clicking the bell).
 */
export async function checkAndUpdateReminderDue(settings: ReminderSettings | null): Promise<boolean> {
  // Back-compat for legacy single reminder API. Convert to list and delegate.
  if (!settings) {
    await setBellUnread(false);
    return false;
  }
  const item: ReminderItem = {
    id: 'legacy',
    enabled: settings.enabled,
    frequency: settings.frequency as any,
    time: settings.time,
    dayOfWeek: settings.dayOfWeek,
    createdAt: '',
    updatedAt: '',
  };
  return checkAndUpdateAnyReminderDue([item]);
}

export async function checkAndUpdateAnyReminderDue(list?: ReminderItem[]): Promise<boolean> {
  // Ignore deprecated 'hourly' reminders entirely for due logic
  const reminders = (list ?? (await getReminders()))
    .filter(r => r.enabled)
    .filter(r => r.frequency !== 'hourly');
  if (reminders.length === 0) {
    await setBellUnread(false);
    return false;
  }

  // If user already read after the most recent due window start, keep cleared until next occurrence
  // We use LAST_READ_DATE_KEY as a global read marker.
  const lastReadStr = await AsyncStorage.getItem(nk(LAST_READ_DATE_KEY));
  const lastRead = lastReadStr ? new Date(lastReadStr) : undefined;

  const now = new Date();

  // Helper: for a reminder, compute the latest occurrence time (Date) that should trigger unread
  const latestOccurrence = (r: ReminderItem): Date | null => {
    if (r.frequency === 'hourly') {
      const d = new Date();
      d.setMinutes(0, 0, 0); // top of current hour
      return d;
    }
    if (r.frequency === 'daily') {
      if (!r.time) return null;
      const { hour, minute } = parseTimeToHourMinute(r.time);
      const d = new Date();
      d.setHours(hour, minute, 0, 0);
      
      // If the scheduled time hasn't happened yet today, it's for tomorrow
      if (d.getTime() > now.getTime()) {
        return null; // Not due yet today
      }
      return d;
    }
    // weekly
    if (!r.time) return null;
    const { hour, minute } = parseTimeToHourMinute(r.time);
    const targetWeekday = weekdayStringToNumber(r.dayOfWeek);
    // Compute this week's day (1..7)
    const today = now.getDay() + 1;
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    // Adjust date to the target weekday within current week
    const diff = targetWeekday - today; // can be negative
    d.setDate(d.getDate() + diff);
    
    // If the target day/time hasn't happened yet this week, it's for next week
    if (d.getTime() > now.getTime()) {
      return null; // Not due yet this week
    }
    return d;
  };

  let anyDue = false;
  const NOTIFICATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour window after scheduled time
  
  for (const r of reminders) {
    const occ = latestOccurrence(r);
    if (!occ) continue;
    
    // Check if we're within the notification window (scheduled time to 1 hour after)
    const timeSinceOccurrence = now.getTime() - occ.getTime();
    const isWithinWindow = timeSinceOccurrence >= 0 && timeSinceOccurrence <= NOTIFICATION_WINDOW_MS;
    
    if (isWithinWindow) {
      // If never read or last read is before this occurrence -> due
      if (!lastRead || lastRead < occ) {
        anyDue = true;
        break;
      }
    }
  }

  await setBellUnread(anyDue);
  return anyDue;
}

// Schedule a single reminder item (best-effort; no-op if not supported)
export async function scheduleReminderItem(item: ReminderItem) {
  if (!item.enabled) return;
  await initializeNotificationsOnce();
  const Notifications = await getNotificationsModule();
  if (typeof (Notifications as any).scheduleNotificationAsync !== 'function') return;

  try {
    // Ensure we have permission before scheduling multi-reminders
    const ok = await requestNotificationPermissions();
    if (!ok) return;

    if (item.frequency === "hourly") {
      // Hourly reminders are deprecated/removed - skip scheduling
      console.log('⚠️ Hourly reminders are no longer supported, skipping schedule');
      return;
    }

    const { hour, minute } = parseTimeToHourMinute(item.time || "09:00");
    let trigger: any;
    if (item.frequency === "daily") {
      trigger = { type: "calendar", hour, minute, repeats: true, channelId: REMINDER_CHANNEL_ID } as any;
    } else {
      trigger = { type: "calendar", weekday: weekdayStringToNumber(item.dayOfWeek), hour, minute, repeats: true, channelId: REMINDER_CHANNEL_ID } as any;
    }
    const schedId = await (Notifications as any).scheduleNotificationAsync({
      content: {
        title: "Symptom Assessment Reminder",
        body: "It's time to complete your symptoms check.",
        sound: 'default',
        priority: 'max',
        categoryIdentifier: 'reminder',
        data: {
          type: item.frequency === 'daily' ? 'daily_reminder' : 'weekly_reminder',
          timestamp: Date.now(),
          dayOfWeek: item.dayOfWeek,
        },
      },
      trigger,
    });
    console.log('🗓️ Scheduled notification id:', schedId, 'trigger:', JSON.stringify(trigger));
  } catch {}
}

export async function scheduleAllReminderItems(list?: ReminderItem[]) {
  const reminders = list ?? (await getReminders());
  
  // Cancel ALL existing scheduled notifications first
  const Notifications = await getNotificationsModule();
  try {
    if (typeof (Notifications as any).cancelAllScheduledNotificationsAsync === 'function') {
      await (Notifications as any).cancelAllScheduledNotificationsAsync();
      console.log('🔕 Cancelled all scheduled notifications');
    }
  } catch (e) {
    console.error('Error cancelling notifications:', e);
  }
  
  // Also try the legacy cancellation
  try { await cancelSymptomReminder(); } catch {}
  
  // Only schedule enabled reminders
  const enabledReminders = reminders.filter(r => r.enabled);
  console.log(`📅 Scheduling ${enabledReminders.length} enabled reminders`);
  
  for (const r of enabledReminders) {
    try { 
      await scheduleReminderItem(r);
      console.log(`✅ Scheduled ${r.frequency} reminder on channel ${REMINDER_CHANNEL_ID}`);
    } catch (e) {
      console.error(`❌ Failed to schedule ${r.frequency} reminder:`, e);
    }
  }
}

// Sync the in-memory reminders list to WatermelonDB (per-user namespace)
async function syncRemindersToWatermelon(list: ReminderItem[]) {
  if (!USER_NS) return; // need user id to scope rows
  const userId = USER_NS;
  try {
    await (database as any).write(async () => {
      const collection = (database as any).get('reminders');
      // Remove existing rows for this user
      const existing = await collection.query(Q.where('user_id', userId)).fetch();
      for (const row of existing) {
        await row.destroyPermanently();
      }
      // Insert current list
      for (const r of list) {
        await collection.create((rec: any) => {
          rec.user_id = userId;
          rec.reminder_id = r.id;
          rec.enabled = !!r.enabled;
          rec.frequency = r.frequency;
          rec.time = r.time || null;
          rec.day_of_week = r.dayOfWeek || null;
          rec.created_at = new Date(r.createdAt).getTime();
          rec.updated_at = new Date(r.updatedAt).getTime();
        });
      }
    });
  } catch (err) {
    console.error('WatermelonDB syncRemindersToWatermelon error:', err);
  }
}

// Manual trigger to re-apply channels and re-schedule all reminders
export async function forceRescheduleAllReminders(): Promise<number> {
  try {
    await initializeNotificationsOnce();
  } catch {}
  const list = await getReminders();
  await scheduleAllReminderItems(list);
  // Return count of enabled, non-hourly reminders scheduled
  return list.filter(r => r.enabled && r.frequency !== 'hourly').length;
}