# Profile Completion Mutations - Usage Guide

This document demonstrates how to use the step-wise profile completion mutations that have been implemented for the healthcare app.

## Overview

The profile completion workflow consists of 3 steps:
1. **Personal Info** (`/auth/personal-info.tsx`) - Age range and location
2. **Emergency Contact** (`/auth/emergency-contact.tsx`) - Emergency contact details
3. **Medical History** (`/auth/medical-history.tsx`) - Medical information (optional fields)

## Implemented Mutations

### 1. `updatePersonalInfo`
Handles the first step of profile completion.

```typescript
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const updatePersonalInfo = useMutation(api.userProfile.updatePersonalInfo);

// Usage
await updatePersonalInfo({
  ageRange: "25-34",
  location: "northern"
});
```

**Required Fields:**
- `ageRange`: string (e.g., "under18", "18-24", "25-34", etc.)
- `location`: string (e.g., "northern", "central", "edmonton", etc.)

### 2. `updateEmergencyContact`
Handles the second step of profile completion.

```typescript
const updateEmergencyContact = useMutation(api.userProfile.updateEmergencyContact);

// Usage
await updateEmergencyContact({
  emergencyContactName: "John Doe",
  emergencyContactPhone: "+1-403-555-0123"
});
```

**Required Fields:**
- `emergencyContactName`: string
- `emergencyContactPhone`: string

### 3. `updateMedicalHistory`
Handles the final step of profile completion and marks onboarding as completed.

```typescript
const updateMedicalHistory = useMutation(api.userProfile.updateMedicalHistory);

// Usage
await updateMedicalHistory({
  medicalConditions: "Diabetes Type 2", // optional
  currentMedications: "Metformin 500mg", // optional
  allergies: "Penicillin" // optional
});
```

**Optional Fields:**
- `medicalConditions`: string (optional)
- `currentMedications`: string (optional)
- `allergies`: string (optional)

⚠️ **Important:** This mutation automatically sets `onboardingCompleted: true` when executed.

## Queries

### `checkOnboardingStatus`
Checks if the user has completed the onboarding process.

```typescript
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const onboardingStatus = useQuery(api.userProfile.checkOnboardingStatus);

// Returns:
// {
//   isCompleted: boolean,
//   profile: UserProfile | null
// }

if (onboardingStatus?.isCompleted) {
  // User has completed onboarding
  router.push("/(tabs)/dashboard");
} else {
  // User needs to complete profile
  router.push("/auth/personal-info");
}
```

### `getUserProfile`
Gets the complete user profile.

```typescript
const userProfile = useQuery(api.userProfile.getUserProfile);

// Returns the complete profile object or null if not found
```

## Error Handling

All mutations include proper error handling:

```typescript
const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    await updatePersonalInfo({ ageRange, location });
    router.push("/auth/emergency-contact");
  } catch (error) {
    console.error("Error saving personal info:", error);
    Alert.alert("Error", "Failed to save personal information. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};
```

## Data Flow

1. **Step 1:** User completes personal info → `updatePersonalInfo` → `onboardingCompleted: false`
2. **Step 2:** User completes emergency contact → `updateEmergencyContact` → `onboardingCompleted: false`
3. **Step 3:** User completes medical history → `updateMedicalHistory` → `onboardingCompleted: true`

## Authentication Requirements

All mutations require user authentication. They will throw "Not authenticated" error if:
- User is not logged in
- Authentication token is invalid
- User session has expired

## Database Schema

The mutations work with the following schema:

```typescript
userProfiles: defineTable({
  userId: v.id("users"),
  ageRange: v.optional(v.string()),
  location: v.optional(v.string()),
  emergencyContactName: v.optional(v.string()),
  emergencyContactPhone: v.optional(v.string()),
  medicalConditions: v.optional(v.string()),
  currentMedications: v.optional(v.string()),
  allergies: v.optional(v.string()),
  onboardingCompleted: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("byUserId", ["userId"])
```

## Integration with Existing Screens

The mutations have been integrated into the existing screen files:

- `/app/auth/personal-info.tsx` - Uses `updatePersonalInfo`
- `/app/auth/emergency-contact.tsx` - Uses `updateEmergencyContact`
- `/app/auth/medical-history.tsx` - Uses `updateMedicalHistory`

Each screen includes:
- State management for form fields
- Loading states with ActivityIndicator
- Form validation
- Error handling with Alert dialogs
- Disabled button states
- Navigation to next step on success

## Testing the Implementation

1. Start the development server: `npm start`
2. Navigate to the authentication flow
3. Complete each step and verify data is saved in Convex dashboard
4. Check that `onboardingCompleted` becomes `true` after the final step
5. Verify navigation flows work correctly between steps

The implementation provides a robust, step-wise profile completion system with proper error handling and user feedback.