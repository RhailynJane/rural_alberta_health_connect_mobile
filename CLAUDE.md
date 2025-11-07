# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alberta Health Connect is a React Native mobile application designed to improve healthcare access in rural Alberta. The app features AI-powered triage, symptom assessment, health tracking, offline-first architecture with WatermelonDB, local notifications, and vision camera integration for symptom analysis.

## Development Commands

### Starting the App

```bash
npm start              # Start Expo dev server
npm run android        # Run on Android device/emulator
npm run ios            # Run on iOS simulator
npm run web            # Run in web browser
```

### Build & Deploy

```bash
npm run eas-install    # Install dependencies for EAS build
npm run prebuild       # Prebuild native projects (runs eas-install)
npx expo prebuild      # Generate native iOS/Android folders
```

### Code Quality

```bash
npm run lint           # Run ESLint
```

### Convex Backend

```bash
npx convex dev         # Start Convex backend in development mode
npx convex deploy      # Deploy backend to production
```

## Technical Architecture

### Frontend Stack

- **Framework**: React Native 0.81.5 with Expo SDK 54
- **Routing**: Expo Router (file-based) with typed routes enabled
- **Language**: TypeScript (strict mode disabled, experimentalDecorators enabled)
- **State Management**: Local state + Convex realtime subscriptions + WatermelonDB for offline
- **UI**: Custom curved components with react-native-svg
- **Form Handling**: Formik + Yup validation
- **Offline Storage**: WatermelonDB (v0.28.0) for local-first data persistence
- **Camera**: React Native Vision Camera (v4.7.2) for symptom image capture
- **Maps**: @rnmapbox/maps (v10.2.6) for location-based services
- **Notifications**: Expo Notifications with local scheduling and reminder management
- **ML/AI**: Vision camera integration with worklets for real-time processing

### Backend (Convex)

- **Architecture**: BFF (Backend for Frontend) pattern with layered structure
- **Authentication**: Convex Auth with Password provider + Expo SecureStore
- **Database**: Convex's built-in datastore with realtime sync
- **Key Schemas**: users, userProfiles, healthEntries, notifications, pushTokens, passwordResetCodes
- **AI Integration**: Google Gemini API for symptom assessment (via Convex actions)
- **Password Reset**: OTP-based system with Resend/Brevo email integration

### Navigation Structure

```
/ (index.tsx)                    # Splash screen
/onboarding                      # Onboarding flow
/auth/*                          # Authentication flow
  ├── signin                     # Sign in
  ├── signup                     # Sign up
  ├── personal-info              # Personal info collection
  ├── emergency-contact          # Emergency contact
  └── medical-history            # Medical history
/(tabs)/*                        # Main app (tab navigation)
  ├── dashboard                  # Home dashboard with recent assessments
  ├── ai-assess                  # AI symptom assessment (multi-step flow)
  ├── tracker                    # Health tracker (daily logs, history)
  ├── emergency                  # Emergency info and nearby facilities
  ├── profile                    # User profile and app settings
  ├── vision-test                # Vision camera demo with session context
  └── notifications              # Notification center
```

### Offline-First Architecture (WatermelonDB)

The app uses WatermelonDB for offline-first data persistence with bidirectional sync to Convex:

**Local Schema** (watermelon/database/schema.ts):

- `users` - Cached user data with snake_case and camelCase fields
- `user_profiles` - Profile data including reminders (JSON array)
- `health_entries` - Health logs with offline creation support
- `medical_facilities` - Cached clinic/hospital locations
- `reminders` - Symptom assessment reminders

**Sync Strategy** (watermelon/sync/):

- `syncManager.ts` - Queue-based sync with retry logic
- `convexSync.ts` - Bidirectional sync between WatermelonDB and Convex
- Network-aware: Auto-syncs when connection restored
- Conflict resolution: Last-write-wins with timestamp comparison

## Convex Backend Architecture

The backend follows a **BFF (Backend for Frontend) layered pattern** with clear separation between API and business logic:

### Directory Structure

```
convex/
├── personalInfoOnboarding/      # Personal info API (update.ts)
├── emergencyContactOnboarding/  # Emergency contact API
├── medicalHistoryOnboarding/    # Medical history API
├── profile/                     # Profile queries (ensureProfileExists, personalInformation, reminders)
├── dashboard/                   # Dashboard data (user.ts)
├── model/                       # Business logic layer (reusable)
│   ├── user.ts                  # User-related business logic
│   └── userProfile.ts           # UserProfile business logic
├── utils/                       # Utility functions
├── aiAssessment.ts              # AI assessment with Gemini (action)
├── healthEntries.ts             # Health tracking mutations/queries
├── locationServices.ts          # Location-based healthcare facility search
├── notifications.ts             # In-app and push notification helpers
├── sync.ts                      # WatermelonDB sync endpoints
├── passwordReset.ts             # Password reset mutations
├── ResendOTPPasswordReset.ts    # Resend email integration
├── BrevoOTPPasswordReset.ts     # Brevo email integration
├── users.ts                     # User queries
├── auth.ts                      # Auth configuration (Convex Auth)
├── auth.config.ts               # Auth provider configuration
├── http.ts                      # HTTP endpoints
└── schema.ts                    # Database schema (authTables + custom tables)
```

### API Layer Pattern

- **Thin wrappers**: API endpoints validate auth and delegate to model layer
- **Screen-based folders**: Each folder maps to a frontend screen/feature
- **Example usage**:

  ```typescript
  // API layer (screen-specific)
  api.personalInfoOnboarding.updateInfo({ ageRange: "25-34" })
  api.emergencyContactOnboarding.updateContact({ name: "John" })

  // Model layer (reusable business logic)
  model/userProfile.ts exports functions used by multiple API endpoints
  ```

### Key Convex Endpoints

- `api.auth.signIn/signOut` - Authentication
- `api.aiAssessment.generateContextWithGemini` - AI symptom analysis (action)
- `api.healthEntries.logAIAssessment/logManualEntry` - Health tracking with idempotency
- `api.profile.*` - Profile queries (getOnboardingStatus, getProfile, ensureProfileExists)
- `api.dashboard.user.getUserWithProfile` - Dashboard data
- `api.locationServices.*` - Location-based healthcare facility search
- `api.notifications.*` - Create/send notifications, manage push tokens
- `api.sync.*` - WatermelonDB sync endpoints
- `api.passwordReset.*` - OTP generation and verification

## Environment Setup

### Required Environment Variables (.env.local)

```
EXPO_PUBLIC_CONVEX_URL=<convex-deployment-url>
CONVEX_DEPLOYMENT=<convex-deployment-id>
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=<mapbox-public-token>
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=<mapbox-download-token>
```

Note: EAS builds use environment variables from eas.json (development, preview, production)

### Convex Deployment

- Development: `npx convex dev` (uses dev deployment from .env.local)
- Production: Configure via Convex dashboard and `npx convex deploy`

## Key Configuration Files

### Metro Config (metro.config.js)

- Custom asset extension: `.tflite` added for TensorFlow Lite models
- Models stored in `assets/models/`

### TypeScript (tsconfig.json)

- Strict mode: **disabled** (strict: false)
- Experimental decorators enabled (for WatermelonDB models)
- Path alias: `@/*` maps to root directory
- Includes Convex generated types
- Excludes: @rnmapbox/maps, @react-native-community, @shopify/react-native-skia

### Expo (app.json)

- **New Architecture**: Enabled (`newArchEnabled: true`)
- **React Compiler**: Experimental feature enabled
- **Typed Routes**: Enabled for type-safe navigation
- **Platform Support**: iOS (tablet), Android (edge-to-edge, minSdk 26), Web (static)
- **EAS Project ID**: 15cddcd7-b6e3-4d41-910e-2f0f3fe3dbd6
- **Plugins**: expo-router, react-native-vision-camera, @rnmapbox/maps, expo-notifications
- **Permissions**: Camera, microphone, location, notifications (see infoPlist/Android permissions)

### EAS Build (eas.json)

```
- development: Development client, internal distribution
- preview: Internal distribution
- production: Auto-increment versioning
```

## Authentication Flow

1. **Provider Setup** (app/\_layout.tsx):
   - ConvexAuthProvider wraps entire app
   - SecureStore for token persistence
   - Session refresh context for auth state management

2. **Sign In/Up** (app/auth/):
   - Password-based auth via Convex Auth
   - User profile includes: email, firstName, lastName, hasCompletedOnboarding

3. **Onboarding** (app/auth/personal-info, emergency-contact, medical-history):
   - Multi-step profile completion
   - Updates `hasCompletedOnboarding` flag on completion
   - Data stored in `userProfiles` table

## Camera & Vision Integration

### React Native Vision Camera

- **Package**: react-native-vision-camera (v4.7.2)
- **Implementation**: app/(tabs)/vision-test/
  - `VisionSessionContext.tsx` - Session state management for camera flow
  - `camera.tsx` - Camera capture screen
  - `review.tsx` - Photo review and retake
- **Worklets**: react-native-worklets-core (v1.6.2) for frame processing
- **Plugins**: vision-camera-resize-plugin (v3.2.0) for image optimization
- **Use Case**: Symptom image capture for AI-powered visual assessment

### AI Assessment (Convex Action)

- **Service**: Google Gemini API (via Convex action)
- **Endpoint**: `api.aiAssessment.generateContextWithGemini`
- **Flow**: Symptom input → Severity rating → Duration selection → AI Context Generation
- **Image Support**: Base64 photo upload with size checking (~800KB limit)
- **Fallback**: Rule-based assessment when AI unavailable or image too large

## Health Tracking System

### Data Models

- **healthEntries** table (Convex):
  - AI assessments (`type: "ai_assessment"`)
  - Manual entries (`type: "manual"`)
  - Fields: symptoms, severity (0-10), category, duration, aiContext, photos[], notes
  - Idempotency: Prevents duplicate entries on reconnection (timestamp + date check)
- **health_entries** (WatermelonDB):
  - Local-first storage with offline creation support
  - Syncs to Convex when online

### Tracking Features

- Daily health logs with symptom severity rating (0-10 scale)
- Photo attachments via expo-image-picker
- AI-generated context and recommendations
- Historical tracking with date-based queries
- Offline creation with automatic sync

## Notifications System

### Local Notifications (app/\_utils/notifications.ts)

- **Channels**: High-priority reminder channel for Android
- **Reminder Management**: Multiple reminders per user (stored as JSON array)
- **User Namespacing**: Per-user AsyncStorage keys to prevent cross-user data leakage
- **Reminder History**: Tracks notification delivery and read status
- **Migration**: Legacy single-reminder to multi-reminder migration
- **Scheduling**: Daily/weekly reminders with configurable time and day

### In-App Notifications (convex/notifications.ts)

- **Schema**: notifications table with userId, title, body, type, read status
- **Push Integration**: Expo push tokens stored in pushTokens table
- **Helper**: `createAndPushNotification()` for unified notification creation
- **Banner**: NotificationBanner component for foreground notifications
- **Bell Icon**: NotificationBell with unread count badge

## Common Development Patterns

### Using Convex Hooks

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Query
const profile = useQuery(api.profile.getProfile);

// Mutation
const updateInfo = useMutation(api.personalInfoOnboarding.updateInfo);
await updateInfo({ ageRange: "25-34", location: "Calgary" });
```

### Session Refresh Pattern

```typescript
import { useSessionRefresh } from "@/app/_layout";

const { refreshSession, isRefreshing } = useSessionRefresh();
// Call refreshSession() after auth changes
```

### Form Validation (Formik + Yup)

- Standard pattern in auth screens
- Email validation, password requirements
- Custom error messages

### WatermelonDB Patterns

```typescript
import { database } from "@/watermelon/database";
import { Q } from "@nozbe/watermelondb";

// Query local data
const healthEntries = await database.collections
  .get("health_entries")
  .query(Q.where("user_id", userId))
  .fetch();

// Create with offline support
await database.write(async () => {
  await database.collections.get("health_entries").create((entry) => {
    entry.userId = userId;
    entry.symptoms = "Headache";
    // Auto-syncs when online
  });
});
```

### Custom UI Components

- **CurvedHeader/CurvedBackground**: SVG-based curved designs
- **HealthStatusTag**: Severity-based status indicators
- **BottomNavigation**: Custom tab bar
- **NotificationBanner**: Foreground notification display
- **NotificationBell**: Bell icon with unread count
- **SpeechToTextButton**: Voice input for symptom entry
- **TimePickerModal**: Reminder time selection
- **OfflineBanner/MapDownloader**: Offline mode indicators

## Security & Privacy

- **Token Storage**: Expo SecureStore for auth tokens (encrypted storage)
- **Local-First**: WatermelonDB for offline health data (device-local encryption)
- **User Namespacing**: Per-user AsyncStorage keys prevent data leakage on shared devices
- **Password Reset**: OTP-based with expiration (passwordResetCodes table)
- **PIPEDA/HIPAA**: Health data handled according to Canadian/US regulations
- **Disclaimer**: App is not a substitute for professional medical advice
- **Encryption**: ITSAppUsesNonExemptEncryption set to false (iOS)

## Testing Strategy

Currently no automated testing framework configured. Future considerations:

- Jest + React Native Testing Library for unit/integration tests
- Detox for E2E testing
- Convex backend testing utilities

## Platform-Specific Notes

### iOS

- Tablet support enabled
- Bundle ID: `com.rahc.app`
- Permissions: Camera, microphone, location, speech recognition, notifications

### Android

- Edge-to-edge enabled
- Min SDK: 26
- Adaptive icons configured (foreground, background, monochrome)
- Predictive back gesture disabled
- Package: `com.rahc.app`
- Permissions: Camera, audio recording, location (fine/coarse), notifications

### Web

- Static output configured
- Limited feature set compared to native

## Development Workflow Best Practices

1. **Start Convex First**: Always run `npx convex dev` before starting Expo
2. **Auth State**: Use `useSessionRefresh()` from app/\_layout.tsx for auth-dependent screens
3. **Type Safety**: Leverage Convex generated types in `convex/_generated/api`
4. **Path Aliases**: Use `@/*` imports for cleaner code
5. **Offline Testing**: Test with airplane mode - WatermelonDB should handle gracefully
6. **Notifications**:
   - Call `setReminderUserKey(userId)` when user logs in to namespace AsyncStorage
   - Use `initializeNotificationsOnce()` to setup channels (called in app/\_layout.tsx)
7. **Camera Permissions**: Request via expo-camera plugin, configured in app.json
8. **Mapbox**: Requires both public token (runtime) and download token (build time)

## Known Issues & Limitations

- AI assessment requires internet (Gemini API) - falls back to rule-based when offline
- Large images (>800KB) may cause Gemini API payload issues - compression implemented
- WatermelonDB schema v9 - migrations must be handled carefully
- TypeScript strict mode disabled - type safety not enforced
- No automated testing infrastructure
- Speech recognition (@react-native-voice/voice) requires device support

## Important Implementation Details

### WatermelonDB Schema Migrations

- Current version: 9
- Schema uses both snake_case (legacy) and camelCase (Convex alignment)
- Migration files in watermelon/database/migrations.ts
- **Critical**: Always add new migration when changing schema, never modify existing ones

### Session Refresh Workaround

- `useSessionRefresh()` remounts ConvexAuthProvider to force session refresh
- Used after sign up/sign in to ensure auth state propagates
- `isRefreshing` flag prevents UI flickering during refresh

### Notification User Namespacing

- **Critical**: Each user's reminders stored with userId prefix in AsyncStorage
- Call `setReminderUserKey(userId)` on login to prevent cross-user data leakage
- Legacy non-namespaced keys migrated on first access

### Idempotency in Health Entries

- `logAIAssessment` checks for duplicate entries (userId + timestamp + date)
- Prevents duplicate logs on network reconnection/retry
- Returns existing entry ID if duplicate detected

### No commit unless user said so
