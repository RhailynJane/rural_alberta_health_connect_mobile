# Notification List - Consistent Display Across All Pages

## Overview

The notification system now provides consistent notification list display across all pages in the app. This is achieved through a shared React Context that manages notification data globally.

## Architecture

### Components

1. **NotificationContext** (`app/components/NotificationContext.tsx`)
   - Global state management for notifications
   - Loads and merges local reminders and cached server notifications
   - Deduplicates notifications by `_id` and timestamp
   - Auto-refreshes every 30 seconds
   - Listens to NotificationBellEvent for real-time updates

2. **NotificationList** (`app/components/NotificationList.tsx`)
   - Reusable component to display notifications on any page
   - Supports limiting the number of displayed items
   - Shows mark-as-read functionality
   - Responsive to both online and offline states

3. **NotificationProvider** (in `app/_layout.tsx`)
   - Wraps the entire app to provide notification context
   - Ensures notifications are available on all pages

## Usage

### Basic Display

To show notifications on any page, simply import and use the `NotificationList` component:

```tsx
import { NotificationList } from "@/app/components/NotificationList";

export default function MyScreen() {
  return (
    <View>
      <Text>My Page Title</Text>
      
      {/* Show the latest 5 notifications */}
      <NotificationList maxItems={5} showEmpty={false} />
    </View>
  );
}
```

### Props

- `maxItems` (optional, default: 5): Maximum number of notifications to display
- `showEmpty` (optional, default: true): Whether to show "No notifications" when list is empty

### Accessing Raw Data

If you need direct access to the notification data (not just the UI component):

```tsx
import { useNotifications } from "@/app/components/NotificationContext";

export default function MyScreen() {
  const { notificationList, refreshNotifications, isLoading } = useNotifications();

  // notificationList: Array of all notifications (merged, deduplicated, sorted)
  // refreshNotifications: Function to manually refresh the list
  // isLoading: Boolean indicating if initial load is in progress

  return (
    <View>
      <Text>You have {notificationList.length} notifications</Text>
      <Button title="Refresh" onPress={refreshNotifications} />
    </View>
  );
}
```

## Data Structure

Each notification item has the following structure:

```typescript
interface NotificationItem {
  _id: string;           // Unique identifier
  localId?: string;      // Original ID for local reminders
  title: string;         // Notification title
  body?: string;         // Notification body (optional)
  createdAt: number;     // Timestamp
  read: boolean;         // Read status
  _local?: boolean;      // True if it's a local reminder
}
```

## Features

### Real-time Updates

The notification list automatically updates when:
- A new reminder becomes due (via NotificationBellEvent)
- A notification is marked as read
- A notification is cleared
- Server notifications are fetched (when online)

### Offline Support

- Local reminders are always available (stored in AsyncStorage)
- Server notifications are cached when online
- Cached notifications are displayed when offline
- Seamless transition between online/offline states

### Deduplication

The system automatically deduplicates notifications:
1. By `_id` - removes exact duplicates
2. By timestamp - groups reminders within the same minute
3. Ensures clean, non-redundant notification lists

## Examples

### Dashboard Widget

```tsx
// app/(tabs)/dashboard.tsx
import { NotificationList } from "@/app/components/NotificationList";

export default function Dashboard() {
  return (
    <ScrollView>
      <Text style={styles.sectionTitle}>Recent Notifications</Text>
      <NotificationList maxItems={3} showEmpty={false} />
    </ScrollView>
  );
}
```

### Full Notification Screen

The full notification screen (`app/(tabs)/notifications.tsx`) already uses the shared context and displays all notifications with additional features like "Clear all" and banner notifications.

### Custom Notification Display

```tsx
import { useNotifications } from "@/app/components/NotificationContext";

export default function CustomNotifications() {
  const { notificationList } = useNotifications();
  
  const unreadCount = notificationList.filter(n => !n.read).length;
  
  return (
    <View>
      <Text>Unread: {unreadCount}</Text>
      {notificationList.slice(0, 3).map(n => (
        <View key={n._id}>
          <Text>{n.title}</Text>
        </View>
      ))}
    </View>
  );
}
```

## Implementation Details

### Initialization

The `NotificationProvider` is initialized in `app/_layout.tsx` and wraps the entire app:

```tsx
<NotificationProvider>
  <SignUpFormProvider>
    <SafeAreaProvider>
      {/* App content */}
    </SafeAreaProvider>
  </SignUpFormProvider>
</NotificationProvider>
```

### Auto-refresh

The context automatically refreshes the notification list:
- Every 30 seconds (matches the bell check interval)
- When NotificationBellEvent fires ('due', 'read', 'cleared')
- When explicitly calling `refreshNotifications()`

### Cache Management

Server notifications are cached in AsyncStorage:
- Key: `'notifications_cache'`
- Format: `{ data: NotificationItem[], unreadCount: number, timestamp: number }`
- Updated whenever new server notifications are fetched
- Used when offline to show previously loaded notifications

## Best Practices

1. **Use NotificationList for simple displays**: For most cases, the pre-built component is sufficient
2. **Use useNotifications for custom logic**: When you need notification data for calculations or custom UI
3. **Limit displayed items**: Use `maxItems` prop to avoid overwhelming users with too many notifications
4. **Hide empty state on non-notification pages**: Set `showEmpty={false}` on dashboard widgets
5. **Manual refresh**: Call `refreshNotifications()` after marking notifications as read for immediate UI update

## Troubleshooting

### Notifications not showing

1. Check if NotificationProvider is wrapping your component in the tree
2. Verify AsyncStorage permissions are granted
3. Check if reminders are properly stored in AsyncStorage

### Duplicate notifications

The system has built-in deduplication, but if you see duplicates:
1. Check if multiple NotificationProviders exist (there should only be one)
2. Verify reminder IDs are unique
3. Check for multiple event listeners on NotificationBellEvent

### Notifications not updating

1. Ensure NotificationBellEvent is emitting correctly ('due', 'read', 'cleared')
2. Check if AsyncStorage writes are successful
3. Verify the 30-second auto-refresh interval is running

## Migration from Old System

If you were previously loading notifications locally in your component:

**Before:**
```tsx
const [notifications, setNotifications] = useState([]);

useEffect(() => {
  const load = async () => {
    const history = await getReminderHistory();
    setNotifications(history);
  };
  load();
}, []);
```

**After:**
```tsx
import { useNotifications } from "@/app/components/NotificationContext";

const { notificationList } = useNotifications();
// Use notificationList directly - it's already loaded and updated
```

## Future Enhancements

Potential improvements for the notification system:
- Push notification integration
- Notification categories and filtering
- Persistent notification preferences
- Rich notification actions (dismiss, snooze, etc.)
- Notification grouping by type or date
