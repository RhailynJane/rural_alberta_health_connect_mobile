# Onboarding Flow Documentation

## Overview
This document covers the onboarding and initial user experience flow, including the splash screen and onboarding screens that introduce users to the healthcare companion app.

## Flow Structure

```
Index (Splash) → Onboarding → Authentication (Sign In)
     5s delay      Features      Call-to-Action
```

---

## 1. Index (Splash Screen)

### Purpose
Initial loading screen that displays the app logo while the application initializes, providing a smooth transition into the onboarding experience.

### Frontend Implementation
```tsx
// app/index.tsx
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";

export default function Index() {
  const router = useRouter();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/onboarding');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}
```

### Features
- **5-Second Display Duration**: Automatic transition to onboarding
- **Logo Display**: Centered app logo with responsive sizing
- **Clean Background**: Light gray background for professional appearance
- **Memory Management**: Proper timer cleanup on unmount

### Technical Details
| Property | Value | Purpose |
|----------|-------|---------|
| `backgroundColor` | `#f8f9fa` | Light gray, professional appearance |
| `logo.width/height` | `300px` | Large, prominent display |
| `logo.maxWidth` | `80%` | Responsive scaling for smaller screens |
| `timer` | `5000ms` | Balance between branding and UX |

### Backend Considerations
- **App Initialization**: Use splash duration for critical app setup
- **Version Checking**: Potential integration point for app updates
- **User Session**: Check authentication state during splash
- **Analytics**: Track app launch events and timing

---

## 2. Onboarding Screen

### Purpose
Feature introduction screen that educates users about the app's core capabilities and builds trust before authentication.

### Frontend Implementation
```tsx
// app/onboarding.tsx
import CurvedBackground from "../app/components/curvedBackground";
import CurvedHeader from "../app/components/curvedHeader";

export default function Onboarding() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <CurvedHeader
            title="Your trusted healthcare companion for rural Alberta communities"
            height={150}
          />
          
          {/* Feature sections */}
          {/* Get Started button */}
        </ScrollView>
      </CurvedBackground>
    </SafeAreaView>
  );
}
```

### Content Structure

#### Header Section
- **Title**: "Your trusted healthcare companion for rural Alberta communities"
- **Component**: Uses `CurvedHeader` with 150px height
- **Purpose**: Establishes app identity and target demographic

#### Feature Highlights

**1. AI-Powered Triage**
```tsx
<View style={styles.featureContainer}>
  <Ionicons name="medical" size={32} color="#2A7DE1" />
  <Text>AI-Powered Triage</Text>
  <Text>Get instant guidance for your health concerns</Text>
</View>
```

**2. Rural-Focused**
```tsx
<View style={styles.featureContainer}>
  <Ionicons name="location" size={32} color="#2A7DE1" />
  <Text>Rural-Focused</Text>
  <Text>Designed specifically for Alberta's remote communities</Text>
</View>
```

**3. Secure & Private**
```tsx
<View style={styles.featureContainer}>
  <Ionicons name="lock-closed" size={32} color="#2A7DE1" />
  <Text>Secure & Private</Text>
  <Text>Your health data is protected and confidential</Text>
</View>
```

### Visual Design System

#### Layout Structure
- **SafeAreaView**: Ensures content respects device boundaries
- **ScrollView**: Accommodates various screen sizes
- **Feature Cards**: Horizontal layout with icon + text
- **Consistent Spacing**: 32px between features, 24px padding

#### Icon Design
- **Container**: 60x60px circular background
- **Background Color**: `#E8F2FF` (light blue tint)
- **Icon Color**: `#2A7DE1` (primary blue)
- **Icon Size**: 32px for optimal visibility

#### Typography Hierarchy
| Element | Font Size | Weight | Color | Purpose |
|---------|-----------|--------|-------|---------|
| Header Title | Dynamic | 600 | `#2c3e50` | Main value proposition |
| Feature Title | 18px | 600 | `#1A1A1A` | Feature names |
| Feature Description | 14px | Normal | `#666` | Feature explanations |
| Button Text | 16px | 600 | `#fff` | Call-to-action |
| Disclaimer | 12px | Normal | `#888` | Legal text |

### Call-to-Action Section

#### Get Started Button
```tsx
<TouchableOpacity
  style={styles.getStartedButton}
  onPress={() => router.push("/auth/signin")}
>
  <Text>Get Started</Text>
</TouchableOpacity>
```

**Design Specifications:**
- **Background**: `#2A7DE1` (primary blue)
- **Border Radius**: 30px (fully rounded)
- **Padding**: 16px vertical
- **Shadow**: Subtle drop shadow for depth
- **Margin**: 90px top spacing for emphasis

#### Legal Disclaimer
```
"By continuing, you acknowledge that this app provides health
information only and does not replace professional medical advice,
diagnosis, or treatment."
```

**Purpose**: Legal compliance and user expectation management

---

## User Experience Flow

### Journey Mapping
1. **App Launch** → Index screen displays (5s)
2. **Automatic Transition** → Onboarding screen loads
3. **Feature Discovery** → User scrolls through capabilities
4. **Trust Building** → Security/privacy messaging
5. **Action Decision** → User taps "Get Started"
6. **Authentication** → Navigate to sign-in flow

### Accessibility Features
- **Screen Reader Support**: All text and buttons properly labeled
- **Touch Targets**: Minimum 44px touch areas
- **Color Contrast**: WCAG compliant color ratios
- **Font Scaling**: Supports system font size preferences

### Performance Considerations
- **Image Optimization**: Logo should be optimized for file size
- **Animation Performance**: CurvedBackground animations may impact battery
- **Memory Management**: Proper cleanup of timers and event listeners
- **Loading States**: Consider loading indicators for slow devices

---

## Backend Integration Points

### Analytics & Tracking
```json
{
  "events": [
    {
      "name": "app_launch",
      "timestamp": "2024-01-15T10:30:00Z",
      "properties": {
        "platform": "ios",
        "app_version": "1.0.0",
        "device_type": "iPhone"
      }
    },
    {
      "name": "onboarding_viewed",
      "timestamp": "2024-01-15T10:30:05Z",
      "properties": {
        "session_id": "abc123",
        "time_on_splash": 5000
      }
    },
    {
      "name": "get_started_clicked",
      "timestamp": "2024-01-15T10:31:30Z",
      "properties": {
        "time_on_onboarding": 85000,
        "scrolled_to_bottom": true
      }
    }
  ]
}
```

### Configuration Management
```json
{
  "onboarding_config": {
    "splash_duration_ms": 5000,
    "features": [
      {
        "id": "ai_triage",
        "title": "AI-Powered Triage",
        "description": "Get instant guidance for your health concerns",
        "icon": "medical",
        "enabled": true,
        "order": 1
      },
      {
        "id": "rural_focus",
        "title": "Rural-Focused", 
        "description": "Designed specifically for Alberta's remote communities",
        "icon": "location",
        "enabled": true,
        "order": 2
      }
    ],
    "legal_disclaimer": "By continuing, you acknowledge...",
    "cta_text": "Get Started"
  }
}
```

### A/B Testing Support
- **Splash Duration**: Test 3s vs 5s vs 7s display times
- **Feature Order**: Test different feature prioritization
- **CTA Variations**: Test button text and positioning
- **Visual Design**: Test color schemes and layouts

---

## Route Configuration

### File Structure
```
app/
├── index.tsx                 # Splash screen (root route)
├── onboarding.tsx           # Feature introduction
├── auth/
│   └── signin.tsx          # Authentication entry
└── (tabs)/
    └── dashboard.tsx       # Post-auth main screen
```

### Navigation Flow
```tsx
// Route definitions
const routes = {
  splash: '/',              // Initial load
  onboarding: '/onboarding', // Feature intro
  signin: '/auth/signin',    // Authentication
  dashboard: '/dashboard'    // Main app
};

// Navigation logic
useEffect(() => {
  // Check authentication state
  if (isAuthenticated) {
    router.push('/dashboard');
  } else {
    router.push('/onboarding');
  }
}, []);
```

---

## Testing Checklist

### Functional Testing
- [ ] Splash screen displays for correct duration
- [ ] Automatic navigation to onboarding works
- [ ] All feature icons render properly
- [ ] Get Started button navigates correctly
- [ ] Disclaimer text is complete and readable
- [ ] Scroll behavior works on various screen sizes

### Visual Testing
- [ ] Logo scales properly on different devices
- [ ] CurvedHeader renders correctly
- [ ] Feature cards align properly
- [ ] Button shadow and styling appear correctly
- [ ] Color contrast meets accessibility standards

### Performance Testing
- [ ] Smooth transitions between screens
- [ ] No memory leaks from timers
- [ ] Animations perform well on lower-end devices
- [ ] Image loading doesn't cause jank

### Accessibility Testing
- [ ] Screen reader announces all content
- [ ] Touch targets are appropriately sized
- [ ] Focus management works correctly
- [ ] Supports system font scaling

---

## Localization Considerations

### Text Content
All user-facing text should be externalized for multi-language support:

```tsx
// Example i18n structure
const strings = {
  en: {
    onboarding: {
      title: "Your trusted healthcare companion for rural Alberta communities",
      features: {
        ai_triage: {
          title: "AI-Powered Triage",
          description: "Get instant guidance for your health concerns"
        }
      },
      cta: "Get Started",
      disclaimer: "By continuing, you acknowledge..."
    }
  },
  fr: {
    // French translations
  }
};
```

### Cultural Considerations
- **Rural Focus**: Messaging specifically targets rural Alberta
- **Healthcare Context**: Emphasizes trusted, professional medical support
- **Privacy Concerns**: Addresses data security for sensitive health information

This onboarding flow establishes user trust and clearly communicates the app's value proposition before requesting authentication, following mobile UX best practices for healthcare applications.