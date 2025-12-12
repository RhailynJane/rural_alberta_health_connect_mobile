import { Q } from '@nozbe/watermelondb';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "../../watermelon/database";
import { NotificationBellEvent } from "./NotificationBellEvent";

const STORAGE_KEY = "symptomReminderNotificationId";
const BELL_UNREAD_KEY = "notificationBellUnread";
const BELL_READ_NOT_CLEARED_KEY = "notificationBellReadNotCleared";
const LAST_READ_DATE_KEY = "notificationLastReadDate";
const REMINDERS_KEY = "symptomRemindersList";
const REMINDER_HISTORY_KEY = "symptomReminderHistory"; // array of { id, title, body, createdAt, read }
// Android heads-up reminder channel
const REMINDER_CHANNEL_ID = "reminders-high";
// Per-user namespace for AsyncStorage keys to avoid cross-user leakage on the same device
let USER_NS: string | null = null;
const USER_NS_KEY = "reminderUserNsV1";
export function setReminderUserKey(ns: string | null) {
  USER_NS = (ns && String(ns).trim().length > 0) ? String(ns) : null;
  // Persist active namespace so other screens (that don't load Profile first) can adopt it
  try {
    if (USER_NS) AsyncStorage.setItem(USER_NS_KEY, USER_NS);
    else AsyncStorage.removeItem(USER_NS_KEY);
  } catch {}
}
function nk(key: string): string { return USER_NS ? `${USER_NS}:${key}` : key; }
let handlerInitialized = false;

// Ensure we use a stable per-user namespace when available and migrate legacy non-namespaced keys
async function ensureUserNamespace() {
  try {
    if (!USER_NS) {
      // First, adopt persisted namespace if available (set during prior sessions or by Profile/App Settings)
      const savedNs = await AsyncStorage.getItem(USER_NS_KEY);
      if (savedNs && savedNs.trim().length > 0) {
        USER_NS = savedNs.trim();
        return;
      }
      // Fallback: try to infer from cached user (set by profile page)
      const cachedUserRaw = await AsyncStorage.getItem("@profile_user");
      if (cachedUserRaw) {
        try {
          const cachedUser = JSON.parse(cachedUserRaw);
          const uid = String(cachedUser?._id || cachedUser?.id || "").trim();
          if (uid) {
            USER_NS = uid;
            try { await AsyncStorage.setItem(USER_NS_KEY, uid); } catch {}
          }
        } catch {}
      }
    }
  } catch {}
}

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
  await ensureUserNamespace();
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
  await ensureUserNamespace();
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

  // Adopt per-user namespace as early as possible so all screens use the same keys
  try { await ensureUserNamespace(); } catch {}

  const Notifications = await getNotificationsModule();
  if (typeof (Notifications as any).setNotificationHandler === 'function') {
    (Notifications as any).setNotificationHandler({
      handleNotification: async (notification: any) => {
        // Show ALL notifications on device (both reminders and push notifications)
        const result = {
          // Android relies on shouldShowAlert; iOS 17+ uses shouldShowBanner/shouldShowList
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
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
          // Append to local reminder history so the Notifications screen can show all previous reminders
          try {
            const title = notification?.request?.content?.title || 'Symptom Assessment Reminder';
            const body = notification?.request?.content?.body || "It's time to complete your symptoms check.";
            const deliveredAt = typeof (notification as any)?.date === 'number' ? (notification as any).date : Date.now();
            const notifId = `${notification?.request?.identifier || 'reminder'}-${deliveredAt}`;
            await appendReminderHistory({
              id: notifId,
              title,
              body,
              createdAt: deliveredAt,
              read: false,
            });
          } catch {}
        }
      });
    }
  } catch {}

  // Capture when user taps a delivered notification while the app is backgrounded/cold-started
  try {
    if (typeof (Notifications as any).addNotificationResponseReceivedListener === 'function') {
      (Notifications as any).addNotificationResponseReceivedListener(async (response: any) => {
        try {
          const n = response?.notification;
          const type = n?.request?.content?.data?.type;
          const isReminder = type === 'symptom_reminder' || type === 'daily_reminder' || type === 'weekly_reminder';
          if (!isReminder) return;
          const deliveredAt = typeof (n as any)?.date === 'number' ? (n as any).date : Date.now();
          const id = `${n?.request?.identifier || 'reminder'}-${deliveredAt}`;
          // Ensure the tapped notification exists in history (deduped) then mark it as read
          await appendReminderHistory({
            id,
            title: n?.request?.content?.title || 'Symptom Assessment Reminder',
            body: n?.request?.content?.body || "It's time to complete your symptoms check.",
            createdAt: deliveredAt,
            read: false,
          });
          try { await markReminderHistoryItemRead(id); } catch {}
          // Clear bell unread state since user interacted with the notification
          try { await setBellUnread(false); } catch {}
          NotificationBellEvent.emit('read');
        } catch {}
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
  await ensureUserNamespace();
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
    // response listener is registered in initializeNotificationsOnce()
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
  await ensureUserNamespace();
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
  await ensureUserNamespace();
  try {
    const v = await AsyncStorage.getItem(nk(BELL_UNREAD_KEY));
    return v === "1";
  } catch {
    return false;
  }
}

export async function isBellReadNotCleared(): Promise<boolean> {
  await ensureUserNamespace();
  try {
    const v = await AsyncStorage.getItem(nk(BELL_READ_NOT_CLEARED_KEY));
    return v === "1";
  } catch {
    return false;
  }
}

export async function markBellRead(): Promise<void> {
  await ensureUserNamespace();
  await setBellUnread(false);
  // Mark as read but not cleared
  try { await AsyncStorage.setItem(nk(BELL_READ_NOT_CLEARED_KEY), "1"); } catch {}
  // Store the date/time when user marked as read, so we don't re-trigger until next reminder
  const now = new Date().toISOString();
  try { await AsyncStorage.setItem(nk(LAST_READ_DATE_KEY), now); } catch {}
}

export async function clearBellNotification(): Promise<void> {
  await ensureUserNamespace();
  await setBellUnread(false);
  try { await AsyncStorage.setItem(nk(BELL_READ_NOT_CLEARED_KEY), "0"); } catch {}
}

// --- Reminder history helpers -------------------------------------------------
type ReminderHistoryItem = {
  id: string;
  title: string;
  body: string;
  createdAt: number; // epoch ms
  read: boolean;
};

async function loadReminderHistory(): Promise<ReminderHistoryItem[]> {
  await ensureUserNamespace();
  try {
    const currentKey = nk(REMINDER_HISTORY_KEY);
    const rawCurrent = await AsyncStorage.getItem(currentKey);
    let main: ReminderHistoryItem[] = [];
    if (rawCurrent) {
      try {
        const arr = JSON.parse(rawCurrent);
        if (Array.isArray(arr)) main = arr as ReminderHistoryItem[];
      } catch {}
    }
    // If we have a user namespace, merge any legacy non-namespaced data
    if (USER_NS) {
      const rawLegacy = await AsyncStorage.getItem(REMINDER_HISTORY_KEY);
      if (rawLegacy) {
        try {
          const legacyArr = JSON.parse(rawLegacy);
          if (Array.isArray(legacyArr)) {
            // Merge, preferring read=true when duplicate ids found
            const byId: Record<string, ReminderHistoryItem> = {};
            for (const it of [...main, ...legacyArr]) {
              const ex = byId[it.id];
              if (!ex) byId[it.id] = it;
              else if (!ex.read && it.read) byId[it.id] = { ...it, read: true };
              else if (ex.read === it.read) {
                // Keep the newer createdAt for stability
                byId[it.id] = ex.createdAt >= it.createdAt ? ex : it;
              }
            }
            main = Object.values(byId);
            // Migrate: write merged to namespaced key and remove legacy key
            try { await AsyncStorage.setItem(currentKey, JSON.stringify(main.slice(-100))); } catch {}
            try { await AsyncStorage.removeItem(REMINDER_HISTORY_KEY); } catch {}
            console.log(`🧹 [loadReminderHistory] Migrated legacy reminder history to namespaced key for user ${USER_NS}`);
          }
        } catch {}
      }
    }
    console.log(`🧹 [loadReminderHistory] Loaded ${main.length} notifications from storage:`, main.map((item: any) => ({ id: item.id, read: item.read, time: new Date(item.createdAt).toLocaleTimeString() })));
    return main;
  } catch (err) {
    console.error(`🧹 [loadReminderHistory] Error loading history:`, err);
  }
  return [];
}

async function saveReminderHistory(list: ReminderHistoryItem[]) {
  await ensureUserNamespace();
  // Ensure we always save to the correct (possibly namespaced) key
  try { await AsyncStorage.setItem(nk(REMINDER_HISTORY_KEY), JSON.stringify(list.slice(-100))); } catch {}
  // If we have a namespace, also remove legacy key to avoid divergence
  if (USER_NS) {
    try { await AsyncStorage.removeItem(REMINDER_HISTORY_KEY); } catch {}
  }
}

async function appendReminderHistory(item: ReminderHistoryItem) {
  console.log(`📝 [appendReminderHistory] Adding new notification:`, { id: item.id, title: item.title, read: item.read, time: new Date(item.createdAt).toLocaleTimeString() });
  const list = await loadReminderHistory();
  console.log(`📝 [appendReminderHistory] Current history before append:`, list.map(r => ({ id: r.id, read: r.read, time: new Date(r.createdAt).toLocaleTimeString() })));
  // De-dupe by id: if an entry already exists, do NOT create another copy.
  // Preserve existing read status (especially if user already marked it as read).
  const existingIdx = list.findIndex(r => r.id === item.id);
  if (existingIdx !== -1) {
    const existing = list[existingIdx];
    // Merge title/body if missing on existing, but never downgrade read=true to false
    list[existingIdx] = {
      ...existing,
      title: existing.title || item.title,
      body: existing.body || item.body,
      createdAt: existing.createdAt || item.createdAt,
      read: existing.read || item.read,
    };
    await saveReminderHistory(list);
    console.log(`📝 [appendReminderHistory] Skipped duplicate; preserved existing item`, { id: item.id, read: list[existingIdx].read });
    return;
  }
  list.push(item);
  await saveReminderHistory(list);
  console.log(`📝 [appendReminderHistory] History after append:`, list.map(r => ({ id: r.id, read: r.read, time: new Date(r.createdAt).toLocaleTimeString() })));
}

export async function getReminderHistory(): Promise<ReminderHistoryItem[]> {
  const list = await loadReminderHistory();
  console.log(`📚 [getReminderHistory] Loaded ${list.length} items before sorting/dedup`);
  // newest first
  const sorted = list.sort((a, b) => b.createdAt - a.createdAt);
  // Deduplicate by id, preferring a version marked read=true if present among duplicates
  const byId: Record<string, ReminderHistoryItem> = {};
  for (const it of sorted) {
    const existing = byId[it.id];
    if (!existing) {
      byId[it.id] = it;
    } else if (!existing.read && it.read) {
      // Upgrade to read=true if any duplicate has been read
      byId[it.id] = { ...it, read: true };
    }
  }
  const deduped = Object.values(byId).sort((a, b) => b.createdAt - a.createdAt);
  console.log(`📚 [getReminderHistory] Returning ${deduped.length} sorted+deduped items:`, deduped.map(r => ({ id: r.id, read: r.read, time: new Date(r.createdAt).toLocaleTimeString() })));
  return deduped;
}

export async function markReminderHistoryAllRead(): Promise<void> {
  const list = await loadReminderHistory();
  if (list.length === 0) return;
  for (const it of list) it.read = true;
  await saveReminderHistory(list);
}

export async function markLatestReminderHistoryRead(): Promise<void> {
  const list = await loadReminderHistory();
  if (list.length === 0) return;
  // mark most recent item as read
  const newestIndex = list.reduce((idx, it, i, arr) => (it.createdAt > arr[idx].createdAt ? i : idx), 0);
  list[newestIndex].read = true;
  await saveReminderHistory(list);
}

// Mark a specific reminder history item as read by id
export async function markReminderHistoryItemRead(id: string): Promise<void> {
  console.log(`📖 [markReminderHistoryItemRead] Marking notification as read:`, id);
  const list = await loadReminderHistory();
  console.log(`📖 [markReminderHistoryItemRead] Current history before update:`, list.map(r => ({ id: r.id, read: r.read, time: new Date(r.createdAt).toLocaleTimeString() })));
  let changed = false;
  for (const it of list) {
    if (it.id === id && !it.read) {
      it.read = true;
      changed = true;
      console.log(`📖 [markReminderHistoryItemRead] Marked as read:`, { id: it.id, time: new Date(it.createdAt).toLocaleTimeString() });
    }
  }
  if (changed) {
    await saveReminderHistory(list);
    console.log(`📖 [markReminderHistoryItemRead] Saved updated history`);
  } else {
    console.log(`📖 [markReminderHistoryItemRead] No changes made - item already read or not found`);
  }
}

// Clear all locally stored reminder history and dismiss delivered notifications
export async function clearReminderHistory(): Promise<void> {
  await ensureUserNamespace();
  try {
    await AsyncStorage.removeItem(nk(REMINDER_HISTORY_KEY));
  } catch {}
  // Also clear bell state so UI reflects empty state
  try { await setBellUnread(false); } catch {}
  try { await AsyncStorage.setItem(nk(BELL_READ_NOT_CLEARED_KEY), "0"); } catch {}
  // Mark the current time as "last read" so checkAndUpdateReminderDue doesn't recreate old entries
  try { 
    await AsyncStorage.setItem(nk(LAST_READ_DATE_KEY), new Date().toISOString());
    console.log(`📅 [clearReminderHistory] Updated last read date to now - preventing recreation of old notifications`);
  } catch {}
  // Best-effort: dismiss delivered notifications from tray
  try { await dismissAllNotifications(); } catch {}
}

// Clear notification history entries for a specific reminder
export async function clearReminderHistoryForReminder(reminderId: string): Promise<void> {
  await ensureUserNamespace();
  try {
    const list = await loadReminderHistory();
    // Filter out any notification with ID containing this reminder ID
    // Format is: occ-{reminderId}-{timestamp} or {identifier}-{timestamp}
    const filtered = list.filter(item => !item.id.includes(reminderId));
    const removedCount = list.length - filtered.length;
    if (removedCount > 0) {
      await saveReminderHistory(filtered);
      console.log(`🗑️ [clearReminderHistoryForReminder] Removed ${removedCount} notification(s) for reminder ${reminderId}`);
    }
  } catch (err) {
    console.error(`🗑️ [clearReminderHistoryForReminder] Error:`, err);
  }
}

// Ingest delivered notifications still sitting in the tray (e.g., after app cold start)
export async function harvestDeliveredReminderNotifications(): Promise<number> {
  await ensureUserNamespace();
  const Notifications = await getNotificationsModule();
  if (typeof (Notifications as any).getDeliveredNotificationsAsync !== 'function') return 0;
  try {
    const delivered = await (Notifications as any).getDeliveredNotificationsAsync();
    const list = await loadReminderHistory();
    let added = 0;
    for (const d of delivered || []) {
      const type = d?.request?.content?.data?.type;
      const isReminder = type === 'symptom_reminder' || type === 'daily_reminder' || type === 'weekly_reminder';
      if (!isReminder) continue;
      const deliveredAt = typeof d?.date === 'number' ? d.date : Date.now();
      const id = `${d?.request?.identifier || 'reminder'}-${deliveredAt}`;
      // De-dupe by the stable id (identifier + time) rather than bare identifier
      if (!list.find((x) => x.id === id)) {
        list.push({
          id,
          title: d?.request?.content?.title || 'Symptom Assessment Reminder',
          body: d?.request?.content?.body || "It's time to complete your symptoms check.",
          createdAt: deliveredAt,
          read: false,
        });
        added++;
      }
    }
    if (added > 0) await saveReminderHistory(list);
    return added;
  } catch {
    return 0;
  }
}

// Backfill synthetic history entries for recent occurrences based on schedule.
// This helps users see a short list of previous reminders even if the OS replaced old notifications.
// 
// ⚠️ DISABLED: This function creates synthetic notifications with hardcoded read: false,
// causing bugs where previously read notifications reappear as unread.
// Real notifications are now properly tracked by the notification listener.
/*
export async function backfillReminderHistory(maxDaysBack: number = 2, maxWeeksBack: number = 1): Promise<number> {
  const reminders = (await getReminders()).filter(r => r.enabled && r.frequency !== 'hourly');
  if (reminders.length === 0) return 0;
  const now = new Date();
  const history = await loadReminderHistory();
  let added = 0;

  const ensureEntry = (id: string, whenMs: number) => {
    if (!history.find(h => h.id === id)) {
      history.push({
        id,
        title: 'Symptom Assessment Reminder',
        body: "It's time to complete your symptoms check.",
        createdAt: whenMs,
        read: false,
      });
      added++;
    }
  };

  for (const r of reminders) {
    if (r.frequency === 'daily') {
      if (!r.time) continue;
      const { hour, minute } = parseTimeToHourMinute(r.time);
      for (let i = 0; i <= Math.max(0, maxDaysBack); i++) {
        const d = new Date(now);
        d.setHours(hour, minute, 0, 0);
        d.setDate(d.getDate() - i);
        if (d.getTime() <= now.getTime()) {
          ensureEntry(`occ-${r.id}-${d.getTime()}`, d.getTime());
        }
      }
    } else if (r.frequency === 'weekly') {
      if (!r.time) continue;
      const { hour, minute } = parseTimeToHourMinute(r.time);
      const targetWeekday = weekdayStringToNumber(r.dayOfWeek);
      // current week and previous few weeks
      for (let w = 0; w <= Math.max(0, maxWeeksBack); w++) {
        const d = new Date(now);
        d.setHours(hour, minute, 0, 0);
        // Set to target weekday of current week, then subtract weeks
        const today = now.getDay() + 1;
        const diff = targetWeekday - today;
        d.setDate(d.getDate() + diff - w * 7);
        if (d.getTime() <= now.getTime()) {
          ensureEntry(`occ-${r.id}-${d.getTime()}`, d.getTime());
        }
      }
    }
  }
  if (added > 0) await saveReminderHistory(history);
  return added;
}
*/

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
  await ensureUserNamespace();
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
  // Track due occurrences so we can persist a history entry even if the OS replaced tray notifications
  const dueOccurrences: { id: string; createdAt: number; title: string; body: string }[] = [];
  const NOTIFICATION_WINDOW_MS = 5 * 60 * 1000; // 5 minute window after scheduled time (reduced from 1 hour to avoid showing old notifications)
  
  for (const r of reminders) {
    const occ = latestOccurrence(r);
    if (!occ) continue;
    
    // Check if we're within the notification window (scheduled time to 5 minutes after)
    const timeSinceOccurrence = now.getTime() - occ.getTime();
    const isWithinWindow = timeSinceOccurrence >= 0 && timeSinceOccurrence <= NOTIFICATION_WINDOW_MS;
    
    if (isWithinWindow) {
      // If never read or last read is before this occurrence -> due
      if (!lastRead || lastRead < occ) {
        anyDue = true;
        // Prepare a stable history id for this occurrence so it doesn't get overwritten by the OS
        dueOccurrences.push({
          id: `occ-${r.id}-${occ.getTime()}`,
          createdAt: occ.getTime(),
          title: 'Symptom Assessment Reminder',
          body: "It's time to complete your symptoms check.",
        });
        // Don't break - check all reminders to add all due occurrences
      }
    }
  }

  await setBellUnread(anyDue);

  // Persist due occurrences into local reminder history if missing,
  // so the Notifications screen shows a list even when the tray only keeps the latest
  if (dueOccurrences.length > 0) {
    try {
      const history = await loadReminderHistory();
      let changed = false;
      for (const occ of dueOccurrences) {
        const existing = history.find(h => h.id === occ.id);
        if (!existing) {
          // Only add if it doesn't exist - preserve read status if it does
          history.push({ id: occ.id, title: occ.title, body: occ.body, createdAt: occ.createdAt, read: false });
          changed = true;
          console.log(`➕ [checkAndUpdateReminderDue] Added new due occurrence:`, { id: occ.id, time: new Date(occ.createdAt).toLocaleTimeString() });
        } else {
          console.log(`✅ [checkAndUpdateReminderDue] Occurrence already exists, preserving read status:`, { id: occ.id, read: existing.read, time: new Date(occ.createdAt).toLocaleTimeString() });
        }
      }
      if (changed) await saveReminderHistory(history);
    } catch {}
  }
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
      // Remove existing rows for this user (both legacy snake_case and new camelCase)
      const existingCamel = await collection.query(Q.where('userId', userId)).fetch();
      for (const row of existingCamel) {
        await row.destroyPermanently();
      }
      const existingSnake = await collection.query(Q.where('user_id', userId)).fetch();
      for (const row of existingSnake) {
        await row.destroyPermanently();
      }
      // Insert current list using camelCase columns (v7+)
      for (const r of list) {
        await collection.create((rec: any) => {
          rec.userId = userId;
          rec.reminderId = r.id;
          rec.enabled = !!r.enabled;
          rec.frequency = r.frequency;
          rec.time = r.time || null;
          rec.dayOfWeek = r.dayOfWeek || null;
          // createdAt and updatedAt are @readonly and set automatically by WatermelonDB
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