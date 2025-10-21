import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

const STORAGE_KEY = "symptomReminderNotificationId";
const BELL_UNREAD_KEY = "notificationBellUnread";
const LAST_READ_DATE_KEY = "notificationLastReadDate";
let handlerInitialized = false;

export type ReminderFrequency = "daily" | "weekly";

export type ReminderSettings = {
  enabled: boolean;
  frequency: ReminderFrequency;
  time: string; // HH:mm 24h
  dayOfWeek?: string; // Mon..Sun if weekly
};

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
  const existingId = await AsyncStorage.getItem(STORAGE_KEY);
  if (existingId) {
    try {
      if (typeof (Notifications as any).cancelScheduledNotificationAsync === 'function') {
        await (Notifications as any).cancelScheduledNotificationAsync(existingId);
      }
    } catch {}
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
  // Clear bell unread flag when canceling
  try { await AsyncStorage.setItem(BELL_UNREAD_KEY, "0"); } catch {}
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

  await AsyncStorage.setItem(STORAGE_KEY, id);
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
  const storedId = await AsyncStorage.getItem(STORAGE_KEY);
  
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
  try { await AsyncStorage.setItem(BELL_UNREAD_KEY, unread ? "1" : "0"); } catch {}
}

export async function isBellUnread(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(BELL_UNREAD_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

export async function markBellRead(): Promise<void> {
  await setBellUnread(false);
  // Store the date/time when user marked as read, so we don't re-trigger until next reminder
  const now = new Date().toISOString();
  try { await AsyncStorage.setItem(LAST_READ_DATE_KEY, now); } catch {}
}

/**
 * Check if user has already read today's notification
 */
async function hasReadTodaysNotification(reminderTime: string): Promise<boolean> {
  try {
    const lastReadStr = await AsyncStorage.getItem(LAST_READ_DATE_KEY);
    if (!lastReadStr) return false;
    
    const lastRead = new Date(lastReadStr);
    const { hour, minute } = parseTimeToHourMinute(reminderTime);
    
    // Get today's reminder time
    const todaysReminder = new Date();
    todaysReminder.setHours(hour, minute, 0, 0);
    
    // If last read was after today's reminder time, user has already read it
    if (lastRead >= todaysReminder) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if the current time has passed the reminder time today/this week.
 * If so, automatically mark as unread. Returns true if notification is due.
 * The unread flag stays until manually cleared (by clicking the bell).
 */
export async function checkAndUpdateReminderDue(settings: ReminderSettings | null): Promise<boolean> {
  if (!settings || !settings.enabled) {
    // Clear unread if reminders are disabled
    await setBellUnread(false);
    console.log('[checkAndUpdateReminderDue] Reminders disabled, clearing unread');
    return false;
  }

  const now = new Date();
  const { hour, minute } = parseTimeToHourMinute(settings.time);
  
  // Check if user has already read today's notification
  const hasRead = await hasReadTodaysNotification(settings.time);
  console.log('[checkAndUpdateReminderDue] User has read today?', hasRead);
  if (hasRead) {
    // User already dismissed this notification, don't show it again
    await setBellUnread(false);
    console.log('[checkAndUpdateReminderDue] Already read, clearing unread');
    return false;
  }
  
  if (settings.frequency === "daily") {
    // For daily: check if current time >= reminder time today
    const reminderTimeToday = new Date();
    reminderTimeToday.setHours(hour, minute, 0, 0);
    
    console.log('[checkAndUpdateReminderDue] Daily - Current time:', now.toLocaleTimeString(), 'Reminder time:', reminderTimeToday.toLocaleTimeString());
    
    if (now >= reminderTimeToday) {
      // It's past the reminder time today - mark as unread
      await setBellUnread(true);
      console.log('[checkAndUpdateReminderDue] Past reminder time, marking as unread');
      return true;
    }
  } else if (settings.frequency === "weekly") {
    // For weekly: check if today is the reminder day and time has passed
    const reminderDay = weekdayStringToNumber(settings.dayOfWeek);
    const todayDay = now.getDay() + 1; // JS: 0=Sun...6=Sat -> 1=Sun...7=Sat
    
    console.log('[checkAndUpdateReminderDue] Weekly - Today:', todayDay, 'Reminder day:', reminderDay);
    
    if (todayDay === reminderDay) {
      const reminderTimeToday = new Date();
      reminderTimeToday.setHours(hour, minute, 0, 0);
      
      console.log('[checkAndUpdateReminderDue] Correct day - Current time:', now.toLocaleTimeString(), 'Reminder time:', reminderTimeToday.toLocaleTimeString());
      
      if (now >= reminderTimeToday) {
        await setBellUnread(true);
        console.log('[checkAndUpdateReminderDue] Past reminder time, marking as unread');
        return true;
      }
    }
  }
  
  // Not yet time for reminder
  await setBellUnread(false);
  console.log('[checkAndUpdateReminderDue] Not yet time, clearing unread');
  return false;
}