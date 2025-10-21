import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

const STORAGE_KEY = "symptomReminderNotificationId";
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