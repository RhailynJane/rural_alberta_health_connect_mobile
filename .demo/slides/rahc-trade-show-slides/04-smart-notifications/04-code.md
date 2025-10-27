# Code: Smart Notifications Implementation

---

## 1. Schedule Local Notification

```typescript
// app/utils/pushNotifications.ts
import * as Notifications from 'expo-notifications';

export async function scheduleDailyReminder(
  time: { hour: number; minute: number },
  title: string,
  body: string
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      hour: time.hour,
      minute: time.minute,
      repeats: true,  // Daily reminder
    },
  });
}
```

**What this does:**
- Schedules recurring notification
- Works offline (local notifications)
- No server required

---

## 2. In-App Banner Component

```typescript
// app/components/DueReminderBanner.tsx
export function DueReminderBanner({ reminder }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => router.push('/tracker/add-health-entry')}
    >
      <Icon name="notifications" color="#FFA500" />
      <Text>⏰ {reminder.message}</Text>
      <Text>Tap to complete →</Text>
    </TouchableOpacity>
  );
}
```

**What this does:**
- Shows banner for due reminders
- Tappable - takes user to action
- Auto-dismisses when completed

---

## 3. Notification Permissions

```typescript
// Request permission on first use
const { status } = await Notifications
  .requestPermissionsAsync();

if (status !== 'granted') {
  Alert.alert(
    'Permission Required',
    'Enable notifications to receive health reminders'
  );
}
```

**What this does:**
- Asks user for permission
- Clear explanation why it's needed
- Respects user choice

---

## 4. Notification History

```typescript
// Fetch notification history from local storage
const notifications = await AsyncStorage.getItem('notification_history');
const history = notifications ? JSON.parse(notifications) : [];

// Display in UI
{history.map(notif => (
  <NotificationItem
    title={notif.title}
    time={notif.timestamp}
    completed={notif.completed}
  />
))}
```

**What this does:**
- Stores notification history locally
- Shows past reminders
- User can review health tracking history

---

## Key Insight

**Local notifications = Work offline**
- No server dependency
- Scheduled on device
- Reliable delivery

