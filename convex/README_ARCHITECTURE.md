# Convex Backend Architecture - BFF Pattern

## Architecture Overview

The Convex backend has been restructured from a flat architecture to a proper BFF (Backend for Frontend) layered architecture with clear separation of concerns.

## Folder Structure

```
convex/
├── personalInfo/
│   └── index.ts          # exports updateInfo mutation
├── emergencyContact/
│   └── index.ts          # exports updateContact mutation
├── medicalHistory/
│   └── index.ts          # exports updateHistory, completeUserOnboarding mutations
├── profile/
│   └── index.ts          # exports getOnboardingStatus, getProfile queries
├── dashboard/
│   └── user.ts           # exports getUserWithProfile query (existing)
├── model/
│   ├── user.ts           # user-related business logic (existing)
│   └── userProfile.ts    # userProfile business logic (new)
├── utils/
│   └── sanitize.ts       # utility functions
└── userProfile.ts        # LEGACY - maintains backward compatibility
```

## New API Endpoints

### Personal Information
```typescript
// NEW: api.personalInfo.updateInfo
const updateInfo = useMutation(api.personalInfo.updateInfo);
await updateInfo({ ageRange: "25-34", location: "Calgary" });
```

### Emergency Contact
```typescript
// NEW: api.emergencyContact.updateContact
const updateContact = useMutation(api.emergencyContact.updateContact);
await updateContact({
  emergencyContactName: "John Doe",
  emergencyContactPhone: "+1234567890"
});
```

### Medical History
```typescript
// NEW: api.medicalHistory.updateHistory
const updateHistory = useMutation(api.medicalHistory.updateHistory);
await updateHistory({
  medicalConditions: "Hypertension",
  currentMedications: "Aspirin",
  allergies: "Peanuts"
});

// NEW: api.medicalHistory.completeUserOnboarding
const completeOnboarding = useMutation(api.medicalHistory.completeUserOnboarding);
await completeOnboarding();
```

### Profile Status
```typescript
// NEW: api.profile.getOnboardingStatus
const getOnboardingStatus = useQuery(api.profile.getOnboardingStatus);

// NEW: api.profile.getProfile
const getProfile = useQuery(api.profile.getProfile);
```

### Dashboard (Existing)
```typescript
// EXISTING: api.dashboard.user.getUserWithProfile
const getUserWithProfile = useQuery(api.dashboard.user.getUserWithProfile);
```

## Legacy Support

The original `convex/userProfile.ts` file has been updated to maintain backward compatibility while delegating to the new model layer:

```typescript
// LEGACY (still works): api.userProfile.updatePersonalInfo
// NEW (recommended): api.personalInfo.updateInfo

// LEGACY (still works): api.userProfile.updateEmergencyContact
// NEW (recommended): api.emergencyContact.updateContact

// LEGACY (still works): api.userProfile.updateMedicalHistory
// NEW (recommended): api.medicalHistory.updateHistory

// LEGACY (still works): api.userProfile.checkOnboardingStatus
// NEW (recommended): api.profile.getOnboardingStatus

// LEGACY (still works): api.userProfile.getUserProfile
// NEW (recommended): api.profile.getProfile
```

## Architecture Principles

### API Layer (Screen-based folders)
- **Thin wrappers**: Only handle validation and authentication
- **Screen-specific naming**: Each folder represents a frontend screen/feature
- **Clean exports**: Each `index.ts` exports relevant mutations/queries
- **Authentication**: All endpoints validate user authentication

### Model Layer (`model/` folder)
- **Pure business logic**: No direct client access
- **Reusable functions**: Take `userId` as parameter for cross-feature usage
- **Database operations**: All direct database operations happen here
- **Error handling**: Business logic errors thrown and caught by API layer

### Naming Conventions
- API endpoints use present tense: `updateInfo`, `updateContact`, `updateHistory`
- Model functions use descriptive names: `updatePersonalInfo`, `updateEmergencyContact`
- Folders match frontend screen structure: `personalInfo`, `emergencyContact`, etc.

## Migration Path

1. **Immediate**: All existing code continues to work (backward compatibility)
2. **Gradual**: Update frontend calls to use new API structure
3. **Future**: Remove legacy endpoints from `userProfile.ts`

## Benefits

1. **Screen-based organization**: Easy to find code for specific UI screens
2. **Separation of concerns**: Clear distinction between API and business logic
3. **Reusability**: Model functions can be called from multiple API endpoints
4. **Maintainability**: Easier to understand and modify specific features
5. **Scalability**: Easy to add new features following the same pattern

## TypeScript Support

All functions maintain full TypeScript support with proper type inference and validation using Convex's `v` validation library.