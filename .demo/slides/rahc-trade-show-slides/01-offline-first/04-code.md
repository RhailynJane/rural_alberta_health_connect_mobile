# Code: How Offline-First Works

---

## 1. Offline Detection

```typescript
// app/hooks/useNetworkStatus.ts
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);

  return { isOnline };
}
```

**What this does:**
- Monitors network connectivity in real-time
- Updates UI when offline/online status changes

---

## 2. Offline Banner Component

```typescript
// app/components/OfflineBanner.tsx
export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Text>📴 Offline Mode - Showing cached data</Text>
    </View>
  );
}
```

**What this does:**
- Shows orange banner when offline
- Automatically hides when connection returns
- Zero user interaction required

---

## 3. Local-First Data Storage

```typescript
// Using WatermelonDB for offline-first storage
import { useDatabase } from '@nozbe/watermelondb/hooks';

const database = useDatabase();
const healthEntries = await database
  .get('health_entries')
  .query(Q.where('user_id', userId))
  .fetch();

// Works offline - data is stored locally in SQLite
```

**What this does:**
- All data stored locally on device (SQLite)
- Instant reads, no network required
- Syncs to Convex when online

---

## Key Insight

**3 lines** to make any feature offline-capable:

```typescript
const { isOnline } = useNetworkStatus();  // 1. Detect
// ... your feature code ...
{!isOnline && <OfflineBanner />}          // 2. Show status
// ... data from WatermelonDB ...          // 3. Use local DB
```

