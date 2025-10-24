# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Notes
- **Main Branch**: `main` (use for PRs)
- **Current Branch**: Feature branches should merge to `main` via PR
- **Bundle ID**: `com.amirzhou.rahcapp` (iOS & Android)
- **EAS Owner**: `rahcapp`

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
- **Language**: TypeScript (strict mode disabled for compatibility)
- **State Management**: Local state + Convex realtime subscriptions
- **Local Database**: WatermelonDB for offline-first data persistence
- **UI**: Custom curved components with react-native-svg
- **Form Handling**: Formik + Yup validation
- **Camera**: react-native-vision-camera (v4.7.2) for camera functionality
- **ML/AI**:
  - TensorFlow Lite (`react-native-fast-tflite`) for on-device object detection
  - ExecutorCH integration (`react-native-executorch` v0.5.8) for edge models
  - COCO-SSD MobileNetV1 model for vision tasks
  - Custom RAHC Resistance model (v1.1 fp32) for symptom analysis
  - Llama 3.2 3B integration for local medical assessment

### Backend (Convex)
- **Architecture**: BFF (Backend for Frontend) pattern with layered structure
- **Authentication**: Convex Auth with Password provider + Expo SecureStore
- **Database**: Convex's built-in datastore with realtime sync
- **Email Service**: Resend for OTP password reset emails
- **Key Schemas**: users, userProfiles, healthEntries, passwordResetCodes
- **AI Integration**: Google Gemini API (gemini-2.5-flash-lite) for medical triage

### Local Persistence (WatermelonDB)
- **Purpose**: Offline-first architecture with local SQLite storage
- **Sync Strategy**: Bidirectional sync with Convex backend
- **Models**: User, UserProfile, HealthEntry, MedicalFacility, Reminder
- **Hooks**: `useDatabase`, `useSync`, `useClinics`, `useCachedClinics`
- **Location**: `watermelon/` directory with models, schema, and sync logic

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
- `api.passwordReset.requestReset/verifyAndReset` - Password reset flow
- `api.profile.reminders.getReminderSettings/updateReminderSettings` - Reminder management

## Environment Setup

### Required Environment Variables

Different env files for different environments:
- `.env.local` - Local development
- `.env.development` - Development builds
- `.env.production` - Production builds

**Required Variables:**
```
EXPO_PUBLIC_CONVEX_URL=<your-convex-deployment-url>
CONVEX_DEPLOYMENT=<convex-deployment-id>
GEMINI_API_KEY=<google-gemini-api-key>
RESEND_API_KEY=<resend-email-service-key>
```

**Optional Variables:**
```
FOURSQUARE_SERVICE_KEY=<optional-for-location-services>
MAPBOX_ACCESS_TOKEN=<for-mapbox-offline-maps>
```

### Convex Deployment
- Development: `npx convex dev` (uses dev deployment from .env.local)
- Production: Configure via Convex dashboard and `npx convex deploy`

## Key Configuration Files

### Metro Config (metro.config.js)
- Custom asset extension: `.tflite` added for TensorFlow Lite models
- Models stored in `assets/models/`

### TypeScript (tsconfig.json)
- Strict mode disabled for WatermelonDB compatibility
- Path alias: `@/*` maps to root directory
- Includes Convex generated types and .expo types
- Experimental decorators enabled for WatermelonDB models

### Expo (app.json)
- **New Architecture**: Enabled (`newArchEnabled: true`)
- **React Compiler**: Experimental feature enabled
- **Typed Routes**: Enabled for type-safe navigation
- **Platform Support**: iOS (tablet), Android (edge-to-edge, minSdk 26), Web (static)
- **EAS Project ID**: 15cddcd7-b6e3-4d41-910e-2f0f3fe3dbd6
- **Camera Permissions**: Configured for iOS/Android with usage descriptions
- **Location Permissions**: Foreground-only (no background tracking)
- **Plugins**: Mapbox Maps, Vision Camera, Location, SecureStore

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
   - DatabaseProvider for WatermelonDB access

2. **Sign In/Up** (app/auth/):
   - Password-based auth via Convex Auth
   - User profile includes: email, firstName, lastName, hasCompletedOnboarding
   - SignUpFormProvider context for multi-step signup

3. **Password Reset** (app/auth/forgot-password.tsx):
   - OTP-based reset via Resend email service
   - 6-digit code with 10-minute expiration
   - Convex endpoints: `passwordReset.requestReset`, `passwordReset.verifyAndReset`
   - Code stored in `passwordResetCodes` table

4. **Onboarding** (app/auth/personal-info, emergency-contact, medical-history):
   - Multi-step profile completion
   - Updates `hasCompletedOnboarding` flag on completion
   - Data stored in `userProfiles` table
   - Personal info: age, address (address1, address2, city, province, postalCode)
   - Emergency contact: name and phone number
   - Medical history: conditions, medications, allergies

## Machine Learning Integration

### TensorFlow Lite Models
**COCO-SSD MobileNetV1** (`coco_ssd_mobilenet_v1.tflite`)
- Object detection for general vision testing
- Labels from `assets/models/coco_labels.json`
- Hook: `useTensorflowModel` from `react-native-fast-tflite`
- Implementation: app/(tabs)/vision-test/index.tsx

**RAHC Resistance Model** (`rahc-resistance-v1.1-fp32_float32.tflite`)
- Custom-trained model for symptom visual analysis
- FP32 precision for accuracy
- Metadata: `assets/models/metadata.yaml`

### ExecutorCH Integration (Llama 3.2 3B)
- Package: `react-native-executorch` (v0.5.8)
- Purpose: On-device LLM for local medical assessment
- Benefits: Privacy-focused, offline capability, no API costs
- Integration: Vision test feature with real-time medical guidance

### AI Assessment (Convex Action)
- **Service**: Google Gemini API (gemini-2.5-flash-lite)
- **Endpoint**: `api.aiAssessment.generateContextWithGemini`
- **Flow**: Symptom → Severity → Duration → Image Upload → AI Context Generation
- **Safety Settings**: Most permissive for medical content (BLOCK_NONE for dangerous content)
- **Image Support**: Up to 3 images per assessment (size limit: ~800KB each)
- **Fallback**: Detailed rule-based assessment when AI blocked or unavailable
- **Special Handling**: Burns, injuries, wounds with specific emergency protocols

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

### Reminder System
- **Multiple Reminders**: Users can set multiple symptom assessment reminders
- **Storage**: Stored as JSON array in `userProfiles.reminders` field
- **Legacy Support**: Single reminder fields (`symptomReminderEnabled`, `symptomReminderFrequency`, etc.) maintained for backward compatibility
- **Endpoints**: `api.profile.reminders.getReminderSettings`, `api.profile.reminders.updateReminderSettings`
- **UI**: Notification bell in CurvedHeader shows reminder status
- **Local Model**: WatermelonDB `Reminder` model for offline access

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

### WatermelonDB Integration
```typescript
import { useDatabase } from '@/watermelon/hooks/useDatabase';
import { useSync } from '@/watermelon/hooks/useSync';

// Access local database
const database = useDatabase();
const { syncWithConvex, isSyncing } = useSync();

// Query local data
const healthEntries = database.collections.get('health_entries');
```

### Custom UI Components
- **CurvedHeader**: Reusable header with SVG curves + notification bell
- **CurvedBackground**: Background with curved design
- **HealthStatusTag**: Status indicators
- **BottomNavigation**: Custom tab navigation
- **MapboxOfflineMap**: Offline map tiles for rural areas
- **NotificationBell**: Reminder notification badge

### Location Services
- **Purpose**: Find nearby clinics, hospitals, and medical facilities
- **Implementation**: `convex/locationServices.ts` with Foursquare API integration
- **Endpoints**:
  - `searchNearbyFacilities(latitude, longitude, radius)` - Find facilities within radius
  - `geocodeAddress(address)` - Convert address to coordinates
- **Caching**: WatermelonDB `MedicalFacility` model caches facility data locally
- **Offline Maps**: Mapbox offline map tiles downloadable per region
- **Permissions**: Foreground-only location access (no background tracking)

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

1. **Start Convex First**: Always run `npx convex dev` before starting Expo dev server
2. **Check Auth State**: Use session refresh context for auth-dependent screens
3. **Type Safety**: Leverage Convex generated types in `convex/_generated/`
4. **Path Aliases**: Use `@/*` imports for cleaner code
5. **Asset Management**:
   - ML models: `assets/models/` (must be .tflite format)
   - Images: `assets/images/`
   - Model labels: JSON format in `assets/models/`
6. **Screen Options**: Configure in `_layout.tsx` files per route group
7. **Image Compression**: Compress images before sending to Gemini (800KB limit per image)
8. **WatermelonDB Models**: Use decorators for model definitions (`@field`, `@readonly`)
9. **Offline Support**: Test with airplane mode enabled - core features should work

## Known Issues & Limitations

- AI assessment requires active internet connection (Gemini API)
- Gemini may block medical content despite safety settings (fallback logic implemented)
- Large images (>800KB) may cause API payload issues - compression needed
- TFLite integration is demo/foundation (custom RAHC model not fully integrated)
- ExecutorCH/Llama 3.2 integration is in progress
- WatermelonDB sync strategy needs optimization
- Testing infrastructure needs setup
- Camera permissions must be granted for vision features
- Mapbox offline maps require manual download per region

## Common Troubleshooting

### Convex Connection Issues
- Ensure `npx convex dev` is running before starting Expo
- Check `.env.local` has correct `EXPO_PUBLIC_CONVEX_URL`
- Verify internet connection (required for Convex realtime sync)

### Session/Auth Issues
- Use `refreshSession()` from `useSessionRefresh` hook after auth operations
- Clear SecureStore if stuck: Uninstall/reinstall app during development
- Check `hasCompletedOnboarding` flag if redirected to onboarding unexpectedly

### ML Model Loading Failures
- Verify `.tflite` files exist in `assets/models/`
- Check Metro bundler includes `.tflite` extension in `metro.config.js`
- Ensure model files aren't too large (>50MB may cause issues)

### Camera/Vision Issues
- Grant camera permissions in device settings
- Check app.json includes camera permission descriptions
- Vision Camera requires physical device (doesn't work well in simulator)

### Image Upload to Gemini Failures
- Compress images to <800KB before upload
- Limit to 3 images per assessment
- Check `GEMINI_API_KEY` in environment variables
- Review Convex action logs for detailed error messages

### WatermelonDB Sync Issues
- Check `watermelon/sync/syncManager.ts` for sync errors
- Ensure database schema matches between local and Convex
- Use migration scripts when schema changes

## Future Development Areas

- Complete ExecutorCH integration for edge AI models
- Integrate vision analysis with symptom assessment
- Implement offline-first data sync
- Add push notifications for health reminders
- Enhance location-based healthcare facility search
- Build comprehensive testing suite
- Add accessibility improvements (screen reader support, etc.)
