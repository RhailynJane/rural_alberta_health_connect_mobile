import { Q } from '@nozbe/watermelondb';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";
import { database } from "../../watermelon/database";

const STORAGE_KEY = "symptomReminderNotificationId";
const BELL_UNREAD_KEY = "notificationBellUnread";
const LAST_READ_DATE_KEY = "notificationLastReadDate";
const REMINDERS_KEY = "symptomRemindersList";
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
  // Optionally schedule
  try { await scheduleReminderItem(newItem); } catch {}
  return updated;
}

export async function updateReminder(id: string, patch: Partial<ReminderItem>): Promise<ReminderItem[]> {
  const list = await getReminders();
  const now = new Date().toISOString();
  const updated = list.map(r => r.id === id ? { ...r, ...patch, updatedAt: now } : r);
  await saveReminders(updated);
  // Re-schedule this reminder
  try { const r = updated.find(x => x.id === id); if (r) await scheduleReminderItem(r); } catch {}
  return updated;
}

export async function deleteReminder(id: string): Promise<ReminderItem[]> {
  const list = await getReminders();
  const remaining = list.filter(r => r.id !== id);
  await saveReminders(remaining);
  // We don't track per-reminder scheduled id here; best-effort: cancel all and re-schedule
  try { await cancelSymptomReminder(); await scheduleAllReminderItems(remaining); } catch {}
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

  // Never attempt to load on web
  if (Platform.OS === "web") return stub;

  // If the native module isn't available (e.g., Expo Go without this module), bail out
  const hasNative = !!(NativeModules as any)?.ExpoNotifications || !!(NativeModules as any)?.ExpoPushTokenManager;
  if (!hasNative) return stub;

  // Dynamically import to avoid requiring native module on startup and to catch load errors
  try {
    const Notifications = await import("expo-notifications");
    return Notifications as any;
  } catch {
    return stub;
  }
}

export async function initializeNotificationsOnce() {
  if (handlerInitialized) return;
  handlerInitialized = true;

  const Notifications = await getNotificationsModule();
  if (typeof (Notifications as any).setNotificationHandler === 'function') {
    (Notifications as any).setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true as any,
        shouldShowList: true as any,
      } as any),
    });
  }

  // Create Android channel if available (no-op on iOS/Web)
  try {
    if (typeof (Notifications as any).setNotificationChannelAsync === 'function') {
      await (Notifications as any).setNotificationChannelAsync("default", {
        name: "Default",
        importance: (await getNotificationsModule()).AndroidImportance?.DEFAULT ?? 3,
      } as any);
    }
  } catch {
    // Ignore when channel API isn't available (iOS/Web)
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  try {
    if (typeof (Notifications as any).getPermissionsAsync !== 'function') return false;
    const settings = await (Notifications as any).getPermissionsAsync();
    if (
      (settings as any)?.granted ||
      (settings as any)?.ios?.status === (Notifications as any).IosAuthorizationStatus?.PROVISIONAL
    ) {
      return true;
    }
    if (typeof (Notifications as any).requestPermissionsAsync !== 'function') return false;
    const req = await (Notifications as any).requestPermissionsAsync();
    return (
      (req as any)?.granted ||
      (req as any)?.ios?.status === (Notifications as any).IosAuthorizationStatus?.PROVISIONAL ||
      false
    );
  } catch {
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
    trigger = { type: "calendar", hour, minute, repeats: true } as any;
  } else {
    trigger = {
      type: "calendar",
      weekday: weekdayStringToNumber(settings.dayOfWeek),
      hour,
      minute,
      repeats: true,
    } as any;
  }

  if (typeof (Notifications as any).scheduleNotificationAsync !== 'function') {
    return; // running in an environment without notifications support
  }

  const id = await (Notifications as any).scheduleNotificationAsync({
    content: {
      title: "Symptom assessment reminder",
      body: "It's time to complete your daily symptoms check.",
      sound: undefined,
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
  try { await AsyncStorage.setItem(nk(BELL_UNREAD_KEY), unread ? "1" : "0"); } catch {}
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
  const reminders = (list ?? (await getReminders())).filter(r => r.enabled);
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
    return d;
  };

  let anyDue = false;
  for (const r of reminders) {
    const occ = latestOccurrence(r);
    if (!occ) continue;
    if (now >= occ) {
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
      // Use time interval trigger every 3600 seconds
      await (Notifications as any).scheduleNotificationAsync({
        content: { title: "Symptom assessment reminder", body: "Hourly reminder.", sound: undefined },
        trigger: { seconds: 3600, repeats: true } as any,
      });
      return;
    }

    const { hour, minute } = parseTimeToHourMinute(item.time || "09:00");
    let trigger: any;
    if (item.frequency === "daily") {
      trigger = { type: "calendar", hour, minute, repeats: true } as any;
    } else {
      trigger = { type: "calendar", weekday: weekdayStringToNumber(item.dayOfWeek), hour, minute, repeats: true } as any;
    }
    await (Notifications as any).scheduleNotificationAsync({
      content: { title: "Symptom assessment reminder", body: "It's time to complete your symptoms check.", sound: undefined },
      trigger,
    });
  } catch {}
}

export async function scheduleAllReminderItems(list?: ReminderItem[]) {
  const reminders = list ?? (await getReminders());
  // Best-effort: cancel previous single reminder id and schedule all; in real app track ids per item
  try { await cancelSymptomReminder(); } catch {}
  for (const r of reminders) {
    try { await scheduleReminderItem(r); } catch {}
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