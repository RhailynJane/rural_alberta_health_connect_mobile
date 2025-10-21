# Clinic Data Caching System

## Overview

The app now includes a complete offline clinic caching system using WatermelonDB. This allows users to:
- ✅ View clinic information even when offline
- ✅ See clinic address, distance, and phone number
- ✅ Access recently searched clinics without internet
- ✅ Reduce data usage by caching results

---

## Architecture

### Database Schema (Already Implemented)

```typescript
// watermelon/database/schema.ts
tableSchema({
  name: 'medical_facilities',
  columns: [
    { name: 'facility_id', type: 'string', isIndexed: true },
    { name: 'name', type: 'string' },
    { name: 'type', type: 'string' }, // hospital, clinic, urgent care, etc.
    { name: 'address', type: 'string' }, // ✅ Full address
    { name: 'phone', type: 'string', isOptional: true }, // ✅ Phone number
    { name: 'latitude', type: 'number' },
    { name: 'longitude', type: 'number' },
    { name: 'distance', type: 'number' }, // ✅ Distance in km
    { name: 'distance_text', type: 'string' }, // ✅ Human-readable distance
    { name: 'source', type: 'string' }, // Foursquare or OpenStreetMap
    { name: 'user_location', type: 'string' }, // User's location when searched
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
})
```

### Model (Already Implemented)

```typescript
// watermelon/models/MedicalFacility.ts
export default class MedicalFacility extends Model {
  @field('facility_id') facilityId!: string;
  @field('name') name!: string;
  @field('type') type!: string;
  @field('address') address!: string; // ✅
  @field('phone') phone?: string; // ✅
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('distance') distance!: number; // ✅
  @field('distance_text') distanceText!: string; // ✅
  @field('source') source!: string;
  @field('user_location') userLocation!: string;
}
```

---

## Usage: `useClinics` Hook

### Import

```typescript
import { useClinics } from '@/watermelon/hooks/useClinics';
```

### Basic Usage

```typescript
const {
  cachedClinics,      // Array of cached clinics
  isLoading,          // Loading state
  lastSyncTime,       // When data was last cached
  isCacheStale,       // True if cache is > 7 days old
  saveClinics,        // Function to save new clinics
  clearCache,         // Function to clear all cached data
  refreshCache,       // Function to reload from database
} = useClinics({
  userLocation: '51.0447,-114.0719', // User's GPS coordinates
  maxDistance: 50, // Max distance in km (optional, default: 50)
});
```

### Clinic Data Structure

```typescript
interface ClinicData {
  id: string;                    // Unique facility ID
  name: string;                  // "Foothills Medical Centre"
  type: string;                  // "hospital", "clinic", "urgent care"
  address: string;               // ✅ "1403 29 St NW, Calgary, AB T2N 2T9"
  phone: string | null;          // ✅ "(403) 944-1110" or null
  coordinates: {
    latitude: number;            // 51.0643
    longitude: number;           // -114.1335
  };
  distance: number;              // ✅ 2.5 (km)
  distanceText: string;          // ✅ "2.5 km away"
  source: string;                // "Foursquare" or "OpenStreetMap"
}
```

---

## Implementation Example

### Step 1: Update Emergency Page

```typescript
// app/(tabs)/emergency/index.tsx

import { useClinics } from '@/watermelon/hooks/useClinics';

export default function EmergencyPage() {
  const locationStatus = useQuery(api.locationServices.getLocationServicesStatus);
  
  // Use the clinic caching hook
  const {
    cachedClinics,
    isLoading: isCacheLoading,
    isCacheStale,
    saveClinics,
  } = useClinics({
    userLocation: locationStatus?.location || null,
    maxDistance: 50,
  });

  // Get real-time data from API
  const getRealTimeClinicData = useAction(api.locationServices.getRealTimeClinicData);

  useEffect(() => {
    const loadClinicData = async () => {
      if (!locationStatus?.locationServicesEnabled || !locationStatus?.location) {
        return;
      }

      try {
        // 1. Try to get real-time data (when online)
        const realTimeData = await getRealTimeClinicData({
          location: locationStatus.location,
        });

        if (realTimeData?.facilities) {
          // 2. Save to cache for offline use
          await saveClinics(realTimeData.facilities, locationStatus.location);
          
          // 3. Use real-time data
          setRealTimeClinics(realTimeData.facilities);
        }
      } catch (error) {
        console.log('Failed to fetch real-time data, using cache');
        // 4. Fallback to cached data when offline
        // cachedClinics will automatically populate from hook
      }
    };

    loadClinicData();
  }, [locationStatus?.location, locationStatus?.locationServicesEnabled]);

  // 5. Decide which data to display
  const clinicsToDisplay = realTimeClinics.length > 0 ? realTimeClinics : cachedClinics;

  return (
    <View>
      {/* Show cache status */}
      {cachedClinics.length > 0 && isCacheStale && (
        <Text style={styles.cacheWarning}>
          📦 Using cached data (offline mode). Last updated: {lastSyncTime?.toLocaleDateString()}
        </Text>
      )}

      {/* Display clinics */}
      {clinicsToDisplay.map(clinic => (
        <View key={clinic.id} style={styles.clinicCard}>
          <Text style={styles.clinicName}>{clinic.name}</Text>
          <Text style={styles.clinicType}>{clinic.type}</Text>
          
          {/* ✅ Address */}
          <View style={styles.infoRow}>
            <Icon name="location-on" size={16} color="#666" />
            <Text style={styles.address}>{clinic.address}</Text>
          </View>

          {/* ✅ Distance */}
          <View style={styles.infoRow}>
            <Icon name="directions" size={16} color="#666" />
            <Text style={styles.distance}>{clinic.distanceText}</Text>
          </View>

          {/* ✅ Phone (if available) */}
          {clinic.phone && (
            <View style={styles.infoRow}>
              <Icon name="phone" size={16} color="#666" />
              <Text style={styles.phone}>{clinic.phone}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${clinic.phone}`)}>
                <Icon name="call" size={20} color="#2A7DE1" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
```

---

## API Functions

### `saveClinics(clinics, userLocation)`

Save clinic data to cache for offline access.

```typescript
const clinicData = [
  {
    id: 'facility-123',
    name: 'Calgary Medical Clinic',
    type: 'clinic',
    address: '123 Main St, Calgary, AB T2P 1K3',
    phone: '(403) 555-0100',
    coordinates: { latitude: 51.0447, longitude: -114.0719 },
    distance: 2.5,
    distanceText: '2.5 km away',
    source: 'Foursquare',
  },
];

await saveClinics(clinicData, '51.0447,-114.0719');
```

### `clearCache()`

Clear all cached clinic data.

```typescript
await clearCache();
```

### `refreshCache()`

Reload cached data from database.

```typescript
await refreshCache();
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      App Startup                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  1. User Enables Location Services                          │
│     GPS → "51.0447,-114.0719"                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Check Internet Connection                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
       [Online]               [Offline]
           │                       │
           ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│ 3a. Fetch from API   │  │ 3b. Load from Cache  │
│ - Foursquare         │  │ - WatermelonDB       │
│ - OpenStreetMap      │  │ - Last 20 clinics    │
│                      │  │ - Within 50km        │
└──────┬───────────────┘  └──────┬───────────────┘
       │                         │
       ▼                         │
┌──────────────────────┐         │
│ 4. Save to Cache     │         │
│ - Store in           │         │
│   WatermelonDB       │         │
└──────┬───────────────┘         │
       │                         │
       └────────┬────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Display Clinics                                          │
│     - Name                                                   │
│     - Address ✅                                             │
│     - Distance (km) ✅                                       │
│     - Phone ✅                                               │
│     - Map marker                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Cache Strategy

### When to Cache
- ✅ After every successful API call
- ✅ When location changes significantly (> 5km)
- ✅ When user manually refreshes data

### When to Use Cache
- ✅ No internet connection
- ✅ API request fails
- ✅ Immediate display while fetching fresh data

### Cache Expiry
- Cache is considered "stale" after **7 days**
- Shows warning to user: "Using cached data (offline mode)"
- Automatically refreshes when online

### Cache Limits
- Max **20 clinics** per location
- Only within **50km** radius (configurable)
- Automatically deletes old data when saving new location

---

## Storage Size

### Estimated Storage per Location
- **20 clinics** × ~200 bytes each = **~4KB**
- Very minimal storage impact
- 100 locations cached = **~400KB**

---

## Benefits

### For Users
- ✅ **Offline access** to recently viewed clinics
- ✅ **Faster load times** (no network delay)
- ✅ **Reduced data usage** (cache reused)
- ✅ **Works in poor connectivity** (rural areas)

### For Emergency Scenarios
- ✅ **Always shows nearest clinic** (even offline)
- ✅ **Phone numbers cached** (can call immediately)
- ✅ **Addresses available** for directions
- ✅ **Distance calculated** from last known position

---

## Next Steps

### To Implement:
1. ✅ Schema and model already exist
2. ✅ `useClinics` hook created
3. ⏳ Update emergency page to use hook
4. ⏳ Add cache status indicator
5. ⏳ Add manual refresh button
6. ⏳ Show "offline mode" badge

### To Test:
1. Enable location services
2. Load clinics (online)
3. Check WatermelonDB database (should have 20 clinics)
4. Turn on airplane mode
5. Reopen emergency page
6. Verify clinics still display with:
   - ✅ Address
   - ✅ Distance
   - ✅ Phone number

---

## Troubleshooting

### Cache not saving
- Check database initialization in `app/_layout.tsx`
- Verify WatermelonDB setup is complete
- Check console for error messages

### Cache not loading
- Ensure `userLocation` is provided as string
- Check location format: `"51.0447,-114.0719"`
- Verify `medical_facilities` table exists

### Stale data
- Cache expires after 7 days automatically
- Use `clearCache()` to manually clear
- App will fetch fresh data when online

---

## Example Code

See full implementation example in: `app/(tabs)/emergency/index.tsx`

**Key files:**
- `watermelon/hooks/useClinics.ts` - Caching hook (NEW)
- `watermelon/models/MedicalFacility.ts` - Data model (EXISTS)
- `watermelon/database/schema.ts` - Database schema (EXISTS)
- `convex/locationServices.ts` - API calls (EXISTS)

Ready to integrate! 🚀
