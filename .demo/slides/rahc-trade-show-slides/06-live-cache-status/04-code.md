# Code: Live/Cache Status Implementation

---

## 1. Network Status Hook

```typescript
// app/hooks/useNetworkStatus.ts
import NetInfo from '@react-native-community/netinfo';

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
- Real-time network detection
- Updates when connection changes
- One hook, reusable everywhere

---

## 2. Cache Timestamp Tracking

```typescript
// Save data with timestamp
const saveWithTimestamp = async (key: string, data: any) => {
  const cache = {
    data,
    timestamp: Date.now(),
  };
  await AsyncStorage.setItem(key, JSON.stringify(cache));
};

// Retrieve with age calculation
const getWithAge = async (key: string) => {
  const cached = await AsyncStorage.getItem(key);
  if (!cached) return null;

  const { data, timestamp } = JSON.parse(cached);
  const ageMs = Date.now() - timestamp;
  const ageHours = Math.floor(ageMs / (1000 * 60 * 60));

  return { data, ageHours };
};
```

**What this does:**
- Stores data with timestamp
- Calculates age automatically
- Returns human-readable age

---

## 3. Status Badge Component

```typescript
// app/components/DataStatusBadge.tsx
export function DataStatusBadge({ cacheAge }: { cacheAge?: number }) {
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return (
      <View style={styles.liveBadge}>
        <Icon name="cloud-done" color="#4CAF50" />
        <Text>Live data</Text>
      </View>
    );
  }

  return (
    <View style={styles.cachedBadge}>
      <Icon name="cached" color="#FFA500" />
      <Text>Cached · {cacheAge}h ago</Text>
    </View>
  );
}
```

**What this does:**
- Shows green badge when online
- Shows yellow badge with age when offline
- Automatically updates based on network

---

## 4. Clinic List with Status

```typescript
// app/(tabs)/emergency/index.tsx
const { data: clinics, ageHours } = await getWithAge('clinics');
const { isOnline } = useNetworkStatus();

// Fetch fresh data if online
if (isOnline) {
  const fresh = await fetchClinics();
  await saveWithTimestamp('clinics', fresh);
}

return (
  <View>
    <DataStatusBadge cacheAge={ageHours} />
    {clinics.map(clinic => (
      <ClinicCard {...clinic} />
    ))}
  </View>
);
```

**What this does:**
- Shows status badge at top
- Fetches fresh data if online
- Falls back to cache if offline
- User always knows data freshness

---

## Simple Status Tracking

**Add to any screen:**

```typescript
const { isOnline } = useNetworkStatus();

<DataStatusBadge
  cacheAge={dataAge}
  isOnline={isOnline}
/>
```

**2 lines = Complete transparency**

---

## Key Insight

**Users trust what they understand**
- Show data age = Show respect
- Transparency = Better decisions
- Simple badge = Huge UX win

