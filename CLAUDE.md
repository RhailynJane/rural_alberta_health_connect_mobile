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

## Environment Setup

### Required Environment Variables (.env.local)
```
EXPO_PUBLIC_CONVEX_URL=<your-convex-deployment-url>
CONVEX_DEPLOYMENT=<convex-deployment-id>
FOURSQUARE_SERVICE_KEY=<optional-for-location-services>
```

### Convex Deployment
- Development: `npx convex dev` (uses dev deployment from .env.local)
- Production: Configure via Convex dashboard and `npx convex deploy`

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
- **EAS Project ID**: d37c258e-54b3-4dc4-83d2-1422379e9f4a

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
2. **Check Auth State**: Use session refresh context for auth-dependent screens
3. **Type Safety**: Leverage Convex generated types in `convex/_generated/`
4. **Path Aliases**: Use `@/*` imports for cleaner code
5. **Asset Management**: Place ML models in `assets/models/`, images in `assets/images/`
6. **Screen Options**: Configure in `_layout.tsx` files per route group

## Known Issues & Limitations

- AI assessment requires active internet connection (Gemini API)
- TFLite integration is demo/foundation (not yet integrated with health assessment)
- ExecutorCH integration is in progress
- No offline-first sync strategy implemented yet
- Testing infrastructure needs setup

## Future Development Areas

- Complete ExecutorCH integration for edge AI models
- Integrate vision analysis with symptom assessment
- Implement offline-first data sync
- Add push notifications for health reminders
- Enhance location-based healthcare facility search
- Build comprehensive testing suite
- Add accessibility improvements (screen reader support, etc.)
