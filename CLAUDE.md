# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alberta Health Connect is a React Native mobile application designed to improve healthcare access in rural Alberta. The app features AI-powered triage, symptom assessment, health tracking, and on-device machine learning for visual analysis.

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
- **Framework**: React Native 0.81.4 with Expo SDK 54
- **Routing**: Expo Router (file-based) with typed routes enabled
- **Language**: TypeScript with strict mode
- **State Management**: Local state + Convex realtime subscriptions
- **Offline Database**: WatermelonDB v0.28.0 with SQLite adapter for local persistence
- **Data Sync**: Bidirectional sync between WatermelonDB and Convex (see `/watermelon` directory)
- **UI**: Custom curved components with react-native-svg
- **Form Handling**: Formik + Yup validation
- **ML/AI**:
  - TensorFlow Lite (`react-native-fast-tflite`) for on-device object detection
  - ExecutorCH integration (`react-native-executorch`) for edge models
  - COCO-SSD MobileNetV1 model for vision tasks

### Backend (Convex)
- **Architecture**: BFF (Backend for Frontend) pattern with layered structure
- **Authentication**: Convex Auth with Password provider + Expo SecureStore
- **Database**: Convex's built-in datastore with realtime sync
- **Key Schemas**: users, userProfiles, healthEntries
- **Sync Layer**: `convex/sync.ts` handles WatermelonDB synchronization

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
  ├── dashboard                  # Home dashboard
  ├── ai-assess                  # AI symptom assessment
  ├── tracker                    # Health tracker
  ├── emergency                  # Emergency info
  ├── profile                    # User profile
  ├── vision-test                # TFLite object detection demo
  └── ai-test                    # AI testing features
```

## Offline-First Architecture with WatermelonDB

RAHC implements a robust offline-first architecture critical for rural areas with intermittent connectivity:

### WatermelonDB Structure (`/watermelon` directory)
- **database/**: SQLite adapter configuration and database initialization
- **models/**: Local data models mirroring Convex schemas
- **sync/**: Synchronization logic for bidirectional sync with Convex
- **hooks/**: React hooks for WatermelonDB operations

### Sync Strategy
- **Local-First**: All data operations happen on WatermelonDB first
- **Background Sync**: When online, changes sync bidirectionally with Convex
- **Conflict Resolution**: Convex `sync.ts` handles merge conflicts
- **Queued Operations**: Offline mutations queue and execute when connectivity returns

### Key Integration Points
- `convex/sync.ts`: Server-side sync endpoint
- `watermelon/sync/`: Client-side sync implementation
- Network state monitoring via `@react-native-community/netinfo`

## Convex Backend Architecture

The backend follows a **BFF (Backend for Frontend) layered pattern** with clear separation between API and business logic:

### Directory Structure
```
convex/
├── personalInfoOnboarding/      # Personal info API endpoints
├── emergencyContactOnboarding/  # Emergency contact API endpoints
├── medicalHistoryOnboarding/    # Medical history API endpoints
├── profile/                     # Profile queries
├── dashboard/                   # Dashboard data
├── model/                       # Business logic layer (reusable)
│   ├── user.ts
│   └── userProfile.ts
├── utils/                       # Utility functions
├── aiAssessment.ts              # AI assessment logic with Gemini
├── healthEntries.ts             # Health tracking mutations/queries
├── locationServices.ts          # Location-based services
├── auth.ts                      # Auth configuration
└── schema.ts                    # Database schema
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
- `api.aiAssessment.generateContextWithGemini` - AI symptom analysis
- `api.healthEntries.logAIAssessment/logManualEntry` - Health tracking
- `api.profile.getOnboardingStatus/getProfile` - User profile
- `api.dashboard.user.getUserWithProfile` - Dashboard data
- `api.locationServices.*` - Location-based healthcare facility search

## Environment Setup

### Required Environment Variables (.env.local)
```
EXPO_PUBLIC_CONVEX_URL=<your-convex-deployment-url>
CONVEX_DEPLOYMENT=<convex-deployment-id>
FOURSQUARE_SERVICE_KEY=<optional-for-location-services>
MAPBOX_ACCESS_TOKEN=<mapbox-api-key>
```

### Convex Deployment
- Development: `npx convex dev` (uses dev deployment from .env.local)
  - Dev URL: `https://judicious-pony-253.convex.cloud`
- Production: Configure via Convex dashboard and `npx convex deploy`
  - Production URL: `https://energized-cormorant-495.convex.cloud`

### Mapbox Setup
- Required for offline maps and location services
- Configure in `@rnmapbox/maps` plugin
- Supports offline tile downloads for rural areas without connectivity

## Key Configuration Files

### Metro Config (metro.config.js)
- Custom asset extension: `.tflite` added for TensorFlow Lite models
- Models stored in `assets/models/`

### TypeScript (tsconfig.json)
- Strict mode enabled
- Path alias: `@/*` maps to root directory
- Includes Convex generated types

### Expo (app.json)
- **New Architecture**: Enabled (`newArchEnabled: true`)
- **React Compiler**: Experimental feature enabled
- **Typed Routes**: Enabled for type-safe navigation
- **Platform Support**: iOS (tablet), Android (edge-to-edge), Web (static)
- **EAS Project ID**: 15cddcd7-b6e3-4d41-910e-2f0f3fe3dbd6
- **EAS Owner**: rahcapp

### EAS Build (eas.json)
```
- development: Development client, internal distribution
- preview: Internal distribution
- production: Auto-increment versioning
```

## Authentication Flow

1. **Provider Setup** (app/_layout.tsx):
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

## Machine Learning Integration

### TensorFlow Lite (Vision Test)
- **Model**: COCO-SSD MobileNetV1 (`coco_ssd_mobilenet_v1.tflite`)
- **Hook**: `useTensorflowModel` from `react-native-fast-tflite`
- **Implementation**: app/(tabs)/vision-test/index.tsx
- **Labels**: Static import from `assets/models/coco_labels.json`
- **Use Case**: Object detection demo for future symptom image analysis

### ExecutorCH Integration
- Package: `react-native-executorch` (v0.5.8)
- Purpose: On-device edge model execution for privacy-focused AI

### AI Assessment (Convex Action)
- **Service**: Google Gemini API (via Convex action)
- **Endpoint**: `api.aiAssessment.generateContextWithGemini`
- **Flow**: Symptom → Severity → Duration → AI Context Generation
- **Fallback**: Rule-based assessment when AI unavailable

## Health Tracking System

### Data Models
- **healthEntries** table:
  - AI assessments (`type: "ai_assessment"`)
  - Manual entries (`type: "manual"`)
  - Fields: symptoms, severity (0-10), category, duration, aiContext, photos

### Tracking Features
- Daily health logs
- Symptom severity rating
- Photo attachments (image picker integration)
- AI-generated context and recommendations
- Historical tracking and visualization

## Common Development Patterns

### Using WatermelonDB (Offline-First)
```typescript
// For offline-first operations, use WatermelonDB hooks
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';

// Local database operations (work offline)
const database = useDatabase();
const healthEntries = await database.get('health_entries')
  .query(Q.where('user_id', userId))
  .fetch();

// Changes sync automatically when online
```

### Using Convex Hooks (Online Operations)
```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Query (requires connection)
const profile = useQuery(api.profile.getProfile);

// Mutation (requires connection)
const updateInfo = useMutation(api.personalInfoOnboarding.updateInfo);
await updateInfo({ ageRange: "25-34", location: "Calgary" });
```

### Hybrid Pattern (Recommended for Rural Use)
- Use WatermelonDB for read/write operations requiring offline support
- Use Convex directly for operations requiring real-time data or server processing (e.g., AI assessment)
- Background sync handles bidirectional synchronization

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

### Custom UI Components
- **CurvedHeader**: Reusable header with SVG curves
- **CurvedBackground**: Background with curved design
- **HealthStatusTag**: Status indicators
- **BottomNavigation**: Custom tab navigation

## Security & Privacy

- **Data Storage**: Expo SecureStore for auth tokens
- **On-Device Processing**: TFLite models run locally (no data sent to cloud)
- **PIPEDA/HIPAA Considerations**: Health data handled according to regulations
- **Disclaimer**: App is not a substitute for professional medical advice

## Testing Strategy

Currently no automated testing framework configured. Future considerations:
- Jest + React Native Testing Library for unit/integration tests
- Detox for E2E testing
- Convex backend testing utilities

## Platform-Specific Notes

### iOS
- Tablet support enabled
- Bundle ID: `com.amirzhou.rahcapp`

### Android
- Edge-to-edge enabled
- Adaptive icons configured
- Predictive back gesture disabled
- Package: `com.amirzhou.rahcapp`

### Web
- Static output configured
- Limited feature set compared to native

## Development Workflow Best Practices

1. **Start Convex First**: Run `npx convex dev` before starting Expo
2. **Offline-First Mindset**: Design features to work offline using WatermelonDB, then sync when online
3. **Check Auth State**: Use session refresh context for auth-dependent screens
4. **Type Safety**: Leverage Convex generated types in `convex/_generated/`
5. **Path Aliases**: Use `@/*` imports for cleaner code
6. **Asset Management**: Place ML models in `assets/models/`, images in `assets/images/`
7. **Screen Options**: Configure in `_layout.tsx` files per route group
8. **Test Offline**: Regularly test with airplane mode to ensure offline functionality works

## Known Issues & Limitations

- AI assessment requires active internet connection (Gemini API)
- TFLite integration is demo/foundation (vision-test screen shows capability but not integrated with health assessment)
- ExecutorCH integration is in progress
- WatermelonDB sync implementation in development (offline-first capability exists but sync layer needs refinement)
- Testing infrastructure needs setup (no Jest, Detox, or automated tests currently configured)
- Location services require Mapbox API key configuration

## Troubleshooting & Common Issues

### Build Issues
- **Metro bundler cache**: Run `npx expo start -c` to clear cache
- **Native modules**: Run `npx expo prebuild --clean` to regenerate native folders
- **Android build failures**: Ensure Android SDK 26+ and check `android/` for gradle issues

### WatermelonDB Issues
- **Database not initialized**: Check `watermelon/database/` initialization
- **Sync conflicts**: Review `convex/sync.ts` and `watermelon/sync/` logs
- **Schema mismatches**: Ensure WatermelonDB models match Convex schemas

### Convex Connection Issues
- **Auth failures**: Verify `.env.local` has correct `EXPO_PUBLIC_CONVEX_URL`
- **Deployment mismatch**: Ensure dev uses `judicious-pony-253`, prod uses `energized-cormorant-495`
- **Session expiry**: Use session refresh context (`useSessionRefresh`)

### Camera/Vision Issues
- **Permissions**: Check camera permissions in `app.json` and device settings
- **TFLite model not loading**: Verify `.tflite` files in `assets/models/`
- **Vision Camera errors**: Ensure `react-native-vision-camera` native setup is correct

### Location/Mapbox Issues
- **Maps not loading**: Verify `MAPBOX_ACCESS_TOKEN` in environment
- **Offline maps**: Ensure tiles are downloaded for target regions
- **Permission errors**: Check location permissions in `app.json`

## Future Development Areas

- Complete ExecutorCH integration for edge AI models
- Integrate vision analysis with symptom assessment
- Complete WatermelonDB bidirectional sync with Convex
- Add push notifications for health reminders
- Enhance location-based healthcare facility search
- Build comprehensive testing suite (Jest + Detox)
- Add accessibility improvements (screen reader support, etc.)
- Implement proper error boundaries and crash reporting
