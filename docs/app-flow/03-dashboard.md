# Dashboard Component - Complete Documentation

## Overview

The Dashboard is the main landing page for authenticated users in the Alberta Health Connect application. It provides personalized health information, quick access to symptom assessment, and emergency contact options.

## Frontend Implementation

### File Location
`/app/dashboard.tsx`

### Dependencies
```javascript
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../convex/_generated/api";
import BottomNavigation from "../components/bottomNavigation";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import HealthStatusTag from "../components/HealthStatusTag";
import { FONTS } from "../constants/constants";
```

### Component Structure
```typescript
export default function Dashboard() {
  const router = useRouter();
  const [healthStatus, setHealthStatus] = useState<string>("Good");
  const userWithProfile = useQuery(api.dashboard.user.getUserWithProfile);
  
  // State handling and UI rendering
}
```

### Key Features
1. **User Welcome Section** - Displays personalized greeting
2. **Health Status Indicator** - Shows current health status with visual tag
3. **Symptom Assessment** - Primary call-to-action button
4. **Medical Disclaimer** - Important legal information
5. **Emergency Services** - Quick access to 911 and Health Link Alberta (811)

### Navigation
- Symptom Assessment → `/ai-assess` screen
- Emergency calls → Device phone dialer (911/811)

### UI Components Used
- `CurvedHeader` - App header with logo
- `CurvedBackground` - Themed background
- `HealthStatusTag` - Visual health status indicator
- `BottomNavigation` - App navigation bar

## Backend Requirements

### Database Schema

**Users Collection**:
```javascript
{
  _id: Id("users"),
  // Authentication fields
  email: string,                    // Required, unique
  firstName: string,                // Required
  lastName: string,                 // Required
  
  // Profile fields (from onboarding)
  ageRange: string,                 // "under18", "18-24", "25-34", etc.
  location: string,                 // "northern", "central", "edmonton", etc.
  emergencyContactName: string,     // Required
  emergencyContactPhone: string,    // Required
  
  // Medical information (optional)
  medicalConditions: string,        // Optional
  currentMedications: string,       // Optional
  allergies: string,                // Optional
  
  // Health status
  healthStatus: string,             // "Good", "Fair", "Poor", "Critical"
  lastAssessment: number,           // Timestamp
  
  // System fields
  onboardingComplete: boolean,      // Default: false
  createdAt: number,                // Timestamp
  updatedAt: number,                // Timestamp
}
```

### Required Backend Query

**File: `convex/dashboard.ts`**
```javascript
import { query } from "./_generated/server";

export const getUserWithProfile = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    // Authentication check
    if (!identity) return null;
    
    // Fetch user from database
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();
    
    // User not found (shouldn't happen with proper auth flow)
    if (!user) return null;
    
    // Return specific fields needed for dashboard
    return {
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      healthStatus: user.healthStatus || "Good" // Default value
    };
  },
});
```

### API Response Format
The dashboard expects the query to return:
```typescript
{
  userName: string;    // Format: "FirstName LastName"
  userEmail: string;   // User's email address
  healthStatus?: string; // Optional health status
}
```

OR `null` if user is not authenticated.

## Data Flow

### Loading Sequence
1. **Component Mount** → Calls `useQuery(api.dashboard.user.getUserWithProfile)`
2. **Loading State** → Shows "Loading..." while query is pending
3. **Authentication Check** → If `null`, shows "Please sign in" message
4. **Data Display** → Renders user information and health status

### State Management
```typescript
// Current health status (will be replaced with backend data)
const [healthStatus, setHealthStatus] = useState<string>("Good");

// User data from backend
const userWithProfile = useQuery(api.dashboard.user.getUserWithProfile);
```

## Functionality Details

### Emergency Services Integration
```typescript
const handleEmergencyCall = (): void => {
  Alert.alert(
    "Emergency Call",
    "For life-threatening emergencies, call 911 immediately.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call 911",
        onPress: () => Linking.openURL("tel:911"),
        style: "destructive",
      },
    ]
  );
};

const callHealthLink = (): void => {
  Alert.alert(
    "Health Link Alberta",
    "Call 811 for non-emergency health advice?",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Call 811", onPress: () => Linking.openURL("tel:811") },
    ]
  );
};
```

### Navigation
```typescript
const handleSymptomAssessment = (): void => {
  router.push("../ai-assess");
};
```

## Error Handling

### Backend Error Handling
- Returns `null` for unauthenticated users
- Handles database query errors
- Manages missing user records

### Frontend Error Handling
- Loading states during data fetch
- Authentication error messages
- Phone call error handling with user feedback

## Security Considerations

### Authentication
- Query automatically checks authentication via `ctx.auth`
- Returns null if no authenticated user
- Prevents unauthorized data access

### Data Privacy
- Only returns user's own data
- No sensitive medical data exposed in this component
- Emergency calls use native dialer (no data passing)

## Performance Optimizations

### Database Indexing
```javascript
// Recommended index for efficient user queries
db.collection('users').createIndex({ email: 1 });
```

### Frontend Optimization
- Only fetches necessary fields
- Uses Convex's built-in caching
- Efficient re-rendering with React hooks
- Flatlist for better scroll performance

## Styling System

### Color Scheme
- **Primary**: Blue (#2A7DE1) - Main actions
- **Warning**: Yellow (#FFF3CD) - Disclaimer section
- **Danger**: Red (#F8D7DA) - Emergency section
- **Neutral**: White and grays - Content areas

### Typography
- Consistent use of `FONTS.BarlowSemiCondensed`
- Hierarchical text sizes for readability
- Responsive text scaling support

### Layout
- Responsive design for different screen sizes
- Adequate touch targets (minimum 44px)
- Proper spacing and alignment

## Testing Requirements

### Backend Tests
1. **Authentication** - Returns null for unauthenticated requests
2. **Database Query** - Returns correct user data for authenticated users
3. **Error Handling** - Gracefully handles database errors

### Frontend Tests
1. **Loading States** - Properly displays loading indicator
2. **Authentication States** - Handles both authenticated and unauthenticated states
3. **Navigation** - Correctly navigates to symptom assessment
4. **Emergency Calls** - Properly handles phone dialing
5. **Error States** - Displays appropriate error messages

### Sample Test Data
```javascript
// Valid user for testing
const testUser = {
  _id: "user_123",
  email: "test@example.com",
  firstName: "John",
  lastName: "Doe",
  healthStatus: "Good",
  onboardingComplete: true
};

// Expected API response
const expectedResponse = {
  userName: "John Doe",
  userEmail: "test@example.com",
  healthStatus: "Good"
};
```

This comprehensive documentation ensures both frontend and backend teams understand the requirements, and implementation details for the Dashboard component.