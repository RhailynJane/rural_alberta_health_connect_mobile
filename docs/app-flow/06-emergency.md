# Emergency Module Documentation

## Overview
The Emergency module provides critical healthcare contact information and emergency services access for rural Alberta users. This module prioritizes immediate access to life-saving services while providing contextual information about local healthcare resources.

## Module Structure

```
emergency/
└── index.tsx              # Emergency contacts and services
```

---

## Emergency Screen (`/emergency`)

### Purpose
Centralized emergency contact hub providing immediate access to critical healthcare services with location-aware information for rural Alberta communities.

### Frontend Implementation
```tsx
// app/emergency/index.tsx
export default function Emergency() {
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleEmergencyCall = (number: string) => {
    Linking.openURL(`tel:${number}`).catch((err) =>
      Alert.alert("Error", "Could not make the call. Please check your device.")
    );
  };

  return (
    <CurvedBackground>
      <CurvedHeader title="Emergency" height={120} showLogo={true} />
      
      {/* Emergency Warning Banner */}
      <View style={styles.emergencyBanner}>
        <Icon name="warning" size={24} color="#cb2a2aff" />
        <Text>If you or someone else is experiencing a life-threatening emergency,
              call 911 immediately. Don't wait.</Text>
      </View>
      
      {/* Emergency Contacts */}
      <EmergencyServiceCard />
      <HealthLinkCard />
      <LocalClinicCard />
      
      {/* Location Information */}
      <LocationServicesCard />
      
      {/* Emergency Preparedness */}
      <EmergencyReminders />
    </CurvedBackground>
  );
}
```

### Key Components

#### 1. Emergency Warning Banner
```tsx
<View style={styles.emergencyBanner}>
  <Icon name="warning" size={24} color="#cb2a2aff" />
  <Text style={styles.emergencyText}>
    If you or someone else is experiencing a life-threatening emergency,
    call 911 immediately. Don't wait.
  </Text>
</View>
```

**Design Specifications:**
- Background: Light red `#FFE5E5` with red left border `#E12D2D`
- Warning icon with high visibility
- Clear, urgent language prioritizing immediate action

#### 2. Emergency Service Cards
```tsx
// 911 Emergency Services
<View style={styles.card}>
  <View style={styles.cardHeader}>
    <Icon name="local-hospital" size={24} color="#E12D2D" />
    <Text>Emergency Services</Text>
  </View>
  <Text>Life-threatening emergencies</Text>
  <View style={styles.cardFooter}>
    <Text style={styles.cardNumber}>911</Text>
    <TouchableOpacity onPress={() => handleEmergencyCall("911")}>
      <Icon name="call" size={20} color="#FFF" />
    </TouchableOpacity>
  </View>
</View>
```

**Service Hierarchy:**
1. **911 Emergency Services** (Red `#E12D2D`) - Life-threatening emergencies
2. **Health Link Alberta - 811** (Blue `#2D89E1`) - 24/7 health advice
3. **Local Clinic** (Green `#2DE16B`) - Non-emergency medical care

### Data Structures

#### Emergency Contact Interface
```typescript
interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  description: string;
  priority: 'critical' | 'urgent' | 'standard';
  icon: string;
  color: string;
  availability: '24/7' | 'business_hours' | 'on_call';
}

interface ClinicInfo {
  name: string;
  number: string;
  distance?: string;
  address?: string;
  hours?: {
    weekday: string;
    weekend: string;
    holiday: string;
  };
  services?: string[];
}
```

#### Location Service Data
```typescript
interface LocationData {
  isEnabled: boolean;
  approximateLocation: string;
  nearestHospital: {
    name: string;
    distance: string;
    driveTime: string;
  };
  emergencyResponseTime: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}
```

---

## Backend Integration (Convex)

### Database Schema
```typescript
// convex/schema.ts
export default defineSchema({
  emergencyContacts: defineTable({
    name: v.string(),
    number: v.string(),
    description: v.string(),
    priority: v.union(v.literal("critical"), v.literal("urgent"), v.literal("standard")),
    icon: v.string(),
    color: v.string(),
    availability: v.string(),
    region: v.string(), // Alberta-specific contacts
    isActive: v.boolean(),
  })
  .index("by_priority", ["priority"])
  .index("by_region", ["region"]),
  
  healthcareFacilities: defineTable({
    name: v.string(),
    type: v.union(v.literal("hospital"), v.literal("clinic"), v.literal("urgent_care")),
    address: v.string(),
    phone: v.string(),
    coordinates: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    services: v.array(v.string()),
    hours: v.object({
      weekday: v.string(),
      weekend: v.string(),
      holiday: v.string(),
    }),
    region: v.string(),
    isActive: v.boolean(),
  })
  .index("by_type", ["type"])
  .index("by_region", ["region"]),
  
  userLocations: defineTable({
    userId: v.id("users"),
    coordinates: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    address: v.string(),
    region: v.string(),
    lastUpdated: v.number(),
    isEmergencyEnabled: v.boolean(),
  })
  .index("by_user", ["userId"]),
});
```

### API Functions

#### Get Emergency Contacts
```typescript
// convex/emergency.ts
export const getEmergencyContacts = query({
  args: { region: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const region = args.region || "alberta";
    
    return await ctx.db
      .query("emergencyContacts")
      .withIndex("by_region", (q) => q.eq("region", region))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();
  },
});
```

#### Find Nearest Healthcare Facilities
```typescript
export const getNearestFacilities = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    maxDistance: v.optional(v.number()), // km
    facilityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const facilities = await ctx.db
      .query("healthcareFacilities")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    // Calculate distances using Haversine formula
    const facilitiesWithDistance = facilities.map(facility => {
      const distance = calculateDistance(
        args.latitude,
        args.longitude,
        facility.coordinates.latitude,
        facility.coordinates.longitude
      );
      
      return {
        ...facility,
        distance,
        estimatedDriveTime: calculateDriveTime(distance),
      };
    });
    
    // Sort by distance and filter by maxDistance if provided
    return facilitiesWithDistance
      .filter(f => !args.maxDistance || f.distance <= args.maxDistance)
      .filter(f => !args.facilityType || f.type === args.facilityType)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10); // Return top 10 nearest
  },
});

// Helper function for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateDriveTime(distance: number): string {
  // Estimate drive time for rural areas (average 60 km/h)
  const timeInHours = distance / 60;
  const hours = Math.floor(timeInHours);
  const minutes = Math.round((timeInHours - hours) * 60);
  
  if (hours === 0) {
    return `${minutes} minutes`;
  } else {
    return `${hours}h ${minutes}m`;
  }
}
```

#### Update User Location
```typescript
export const updateUserLocation = mutation({
  args: {
    coordinates: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!user) throw new Error("User not found");
    
    // Determine region based on coordinates (simplified for Alberta)
    const region = determineRegion(args.coordinates.latitude, args.coordinates.longitude);
    
    const existingLocation = await ctx.db
      .query("userLocations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    
    if (existingLocation) {
      return await ctx.db.patch(existingLocation._id, {
        coordinates: args.coordinates,
        address: args.address || existingLocation.address,
        region,
        lastUpdated: Date.now(),
      });
    } else {
      return await ctx.db.insert("userLocations", {
        userId: user._id,
        coordinates: args.coordinates,
        address: args.address || "Unknown",
        region,
        lastUpdated: Date.now(),
        isEmergencyEnabled: true,
      });
    }
  },
});

function determineRegion(latitude: number, longitude: number): string {
  // Simplified region detection for Alberta
  // In production, use more sophisticated geocoding
  if (latitude >= 49 && latitude <= 60 && longitude >= -120 && longitude <= -110) {
    return "alberta";
  }
  return "canada";
}
```

---

## Location Services Integration

### Permission Handling
```typescript
// utils/location.ts
import * as Location from 'expo-location';

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

export const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    return location;
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
};
```

### Location-Aware Emergency Data
```tsx
// Emergency screen with location integration
const Emergency = () => {
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const nearestFacilities = useQuery(
    api.emergency.getNearestFacilities,
    userLocation ? {
      latitude: userLocation.coords.latitude,
      longitude: userLocation.coords.longitude,
      maxDistance: 100, // 100km radius
    } : "skip"
  );

  useEffect(() => {
    const loadLocation = async () => {
      const location = await getCurrentLocation();
      if (location) {
        setUserLocation(location);
        // Update user location in database
        updateUserLocation({
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        });
      }
    };

    loadLocation();
  }, []);

  return (
    // Component rendering with location-aware data
    <LocationServicesCard 
      isEnabled={!!userLocation}
      nearestHospital={nearestFacilities?.[0]}
    />
  );
};
```

---

## Critical Safety Features

### Call Functionality
```typescript
const handleEmergencyCall = (number: string) => {
  // Clean phone number for dialing
  const cleanNumber = number.replace(/[^0-9+]/g, '');
  
  // Confirm emergency calls
  if (number === '911') {
    Alert.alert(
      'Emergency Call',
      'You are about to call 911 Emergency Services.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call 911', 
          style: 'destructive',
          onPress: () => Linking.openURL(`tel:${cleanNumber}`)
        },
      ]
    );
  } else {
    Linking.openURL(`tel:${cleanNumber}`).catch((err) =>
      Alert.alert("Error", "Could not make the call. Please check your device.")
    );
  }
};
```

### Emergency Preparedness Reminders
```tsx
const emergencyReminders = [
  "Keep your phone charged for emergencies",
  "Know your exact address or GPS coordinates", 
  "Have a list of current medications ready",
  "Inform family members of your health status",
];

const EmergencyReminders = () => (
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>Remember</Text>
    {emergencyReminders.map((reminder, index) => (
      <View key={index} style={styles.reminderItem}>
        <View style={styles.bulletPoint} />
        <Text style={styles.reminderText}>{reminder}</Text>
      </View>
    ))}
  </View>
);
```

---

## Visual Design System

### Color Coding by Urgency
| Service | Color | Hex Code | Use Case |
|---------|-------|----------|----------|
| Emergency 911 | Red | `#E12D2D` | Life-threatening situations |
| Health Link 811 | Blue | `#2D89E1` | Health advice and guidance |
| Local Clinic | Green | `#2DE16B` | Non-emergency medical care |
| Warning Banner | Light Red | `#FFE5E5` | Alert background |

### Typography Hierarchy
```css
/* Section titles */
.sectionTitle {
  fontSize: 22px;
  fontWeight: '700';
  color: '#333';
  fontFamily: 'BarlowSemiCondensed';
}

/* Card titles */
.cardTitle {
  fontSize: 18px;
  fontWeight: '600';
  color: '#333';
  fontFamily: 'BarlowSemiCondensed';
}

/* Phone numbers */
.cardNumber {
  fontSize: 24px;
  fontWeight: '700';
  color: '#333';
  fontFamily: 'BarlowSemiCondensed';
}

/* Emergency warning text */
.emergencyText {
  fontSize: 16px;
  fontWeight: '500';
  color: '#333';
  fontFamily: 'BarlowSemiCondensed';
}
```

### Card Component Design
```typescript
interface EmergencyCardProps {
  title: string;
  description: string;
  phoneNumber: string;
  icon: string;
  color: string;
  onPress: (number: string) => void;
}

const EmergencyCard: React.FC<EmergencyCardProps> = ({
  title, description, phoneNumber, icon, color, onPress
}) => (
  <View style={styles.card}>
    <View style={styles.cardContent}>
      <View style={styles.cardHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardNumber}>{phoneNumber}</Text>
        <TouchableOpacity
          style={[styles.callButton, { backgroundColor: color }]}
          onPress={() => onPress(phoneNumber)}
        >
          <Icon name="call" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);
```

---

## Accessibility & Compliance

### Accessibility Features
```tsx
// Screen reader support for emergency contacts
<TouchableOpacity
  style={styles.callButton}
  onPress={() => handleEmergencyCall("911")}
  accessibilityRole="button"
  accessibilityLabel="Call 911 Emergency Services"
  accessibilityHint="Double tap to dial emergency services immediately"
>
  <Icon name="call" size={20} color="#FFF" />
</TouchableOpacity>
```

### Legal Considerations
- **Medical Disclaimer**: Clear messaging that app doesn't replace professional medical care
- **Emergency Services**: Direct users to call 911 for life-threatening situations
- **Location Privacy**: Obtain explicit consent for location sharing
- **Data Retention**: Secure handling of location and emergency contact data

---

## Data Seeding & Configuration

### Alberta Emergency Contacts
```typescript
// convex/seed.ts - Emergency contacts for Alberta
const albertaEmergencyContacts = [
  {
    name: "Emergency Services",
    number: "911",
    description: "Life-threatening emergencies",
    priority: "critical",
    icon: "local-hospital",
    color: "#E12D2D",
    availability: "24/7",
    region: "alberta",
    isActive: true,
  },
  {
    name: "Health Link Alberta", 
    number: "811",
    description: "24/7 health advice",
    priority: "urgent",
    icon: "healing",
    color: "#2D89E1",
    availability: "24/7",
    region: "alberta",
    isActive: true,
  },
  {
    name: "Poison & Drug Information Service",
    number: "1-800-332-1414",
    description: "Poison control and drug information",
    priority: "urgent",
    icon: "warning",
    color: "#FFA500",
    availability: "24/7",
    region: "alberta",
    isActive: true,
  },
];
```

### Rural Healthcare Facilities
```typescript
const albertaHealthcareFacilities = [
  {
    name: "Stettler Hospital",
    type: "hospital",
    address: "4500 52 Ave, Stettler, AB T0C 2L0",
    phone: "(403) 742-7000",
    coordinates: { latitude: 52.3139, longitude: -112.7169 },
    services: ["emergency", "acute_care", "diagnostic_imaging"],
    hours: {
      weekday: "Emergency: 24/7, General: 8:00 AM - 4:30 PM",
      weekend: "Emergency: 24/7, General: Closed",
      holiday: "Emergency: 24/7, General: Closed",
    },
    region: "alberta",
    isActive: true,
  },
  // Additional rural facilities...
];
```

This emergency module prioritizes user safety while providing comprehensive healthcare resource information tailored for rural Alberta communities. The implementation emphasizes immediate access to critical services while maintaining location awareness and emergency preparedness guida