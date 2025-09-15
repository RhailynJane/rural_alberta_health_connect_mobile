# Rural Alberta Health Connect Mobile App

## Project Overview

This is a React Native healthcare application built with Expo, specifically designed for rural Alberta communities. The app serves as a trusted healthcare companion providing health services and information to rural areas.

## Technical Stack

- **Framework**: React Native with Expo SDK ~54.0.7
- **Routing**: Expo Router with file-based routing and typed routes
- **Language**: TypeScript with strict mode enabled
- **UI Components**: React Native built-in components + custom curved components
- **Form Handling**: Formik with Yup validation
- **Fonts**: Barlow font family (@expo-google-fonts/barlow)
- **Icons**: Expo Vector Icons
- **Navigation**: React Navigation v7 with bottom tabs
- **SVG Support**: react-native-svg for custom graphics

## Project Structure

```
├── app/                          # Main application code (Expo Router structure)
│   ├── _layout.tsx              # Root layout with Stack navigation
│   ├── index.tsx                # Splash screen with 5s timer → onboarding
│   ├── onboarding.tsx           # Main onboarding flow
│   ├── auth/                    # Authentication screens
│   │   ├── signin.tsx           # Sign in form with validation
│   │   └── signup.tsx           # Sign up screen (placeholder)
│   ├── (tabs)/                  # Tab-based navigation group
│   │   └── dashboard.tsx        # Main dashboard (placeholder)
│   ├── components/              # Reusable UI components
│   │   ├── curvedHeader.tsx     # Custom curved header with SVG
│   │   └── curvedBackground.tsx # Custom curved background component
│   └── constants/               # App constants and configuration
│       └── constants.js         # Font constants and configurations
├── assets/images/               # Static image assets including logos and icons
├── .vscode/                     # VS Code configuration
└── Configuration files (package.json, app.json, etc.)
```

## Key Features & Architecture

### Navigation Flow
1. **Splash Screen** (`/`) - 5-second logo display → redirects to onboarding
2. **Onboarding** (`/onboarding`) - Healthcare companion introduction
3. **Authentication** (`/auth/signin`, `/auth/signup`) - User authentication
4. **Main App** (`/(tabs)/dashboard`) - Tab-based main interface

### Authentication System
- Sign-in form with email/password validation using Formik + Yup
- Client-side validation with custom error messages
- Redirects to dashboard upon successful authentication

### Custom UI Components
- **CurvedHeader**: Reusable header with SVG curved design, supports different screen types (onboarding/signin)
- **CurvedBackground**: Custom background component with curved styling
- Responsive design using screen dimensions
- Custom font integration (Barlow SemiBold)

### Styling Approach
- StyleSheet-based styling throughout
- Consistent color scheme (#D6E3F0 backgrounds, #2c3e50 text)
- Responsive design with screen width calculations
- SafeAreaView for proper mobile display

## Development Setup

### Prerequisites
- Node.js and npm
- Expo CLI
- iOS Simulator / Android Emulator (optional)

### Available Scripts
- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint
- `npm run reset-project` - Reset to blank project template

### Configuration Files
- **app.json**: Expo configuration with platform-specific settings
- **tsconfig.json**: TypeScript config with path aliases (`@/*`)
- **eslint.config.js**: ESLint configuration using Expo presets
- **package.json**: Dependencies and scripts

## Development Notes

### Current State
- Basic navigation structure is implemented
- Authentication UI is built with form validation
- Custom components for branding consistency
- Dashboard is a placeholder awaiting implementation
- No testing framework currently configured
- No backend integration implemented yet

### Key Dependencies
- **expo-router**: File-based routing system
- **formik + yup**: Form handling and validation
- **react-native-svg**: Custom curved UI elements
- **@expo-google-fonts**: Custom font loading
- **react-navigation**: Tab and stack navigation

### Code Quality
- TypeScript strict mode enabled
- ESLint with Expo configuration
- Organized import sorting in VS Code
- Consistent code formatting rules

## Development Guidelines

### File Organization
- Follow Expo Router file-based routing conventions
- Group related screens in folders (e.g., `auth/`)
- Use parentheses for route groups (e.g., `(tabs)/`)
- Keep components modular and reusable

### Styling
- Use StyleSheet.create() for all styles
- Maintain consistent color scheme throughout
- Use responsive design patterns with Dimensions API
- Follow React Native styling best practices

### State Management
- Currently using local component state
- Form state managed by Formik
- No global state management implemented yet

### Navigation
- Leverage Expo Router's typed routes feature
- Use useRouter hook for programmatic navigation
- Implement proper screen options and layouts

## Future Development Areas

- Backend API integration for authentication and health data
- User profile and settings management
- Health tracking features specific to rural healthcare needs
- Push notifications for health reminders
- Offline data synchronization
- Testing framework setup (Jest + React Native Testing Library)
- State management solution (Redux Toolkit or Zustand)
- Accessibility improvements
- Performance optimization

## Platform Support
- iOS (supports tablet)
- Android (adaptive icons, edge-to-edge enabled)
- Web (static output)

This healthcare application is designed to serve rural Alberta communities with a focus on accessibility and user-friendly healthcare management tools.