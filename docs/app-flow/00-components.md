# Component Documentation

## Overview
This document provides comprehensive documentation for the core UI components used in the React Native application. These components handle navigation, visual design, and user interface elements across the app.

## Components

### 1. BottomNavigation

#### Purpose
Main navigation component providing tab-based navigation across the application's primary screens.

#### Frontend Implementation
```tsx
import BottomNavigation from '../components/BottomNavigation';

// Usage - typically placed at the bottom of main layout
<BottomNavigation />
```

#### Features
- **5 Primary Tabs**: Home, AI Assess, Tracker, Emergency, Profile
- **Dynamic Icons**: Different icons for focused/unfocused states
- **Route Management**: Integrates with expo-router for navigation
- **Accessibility**: Full accessibility support with proper roles and states
- **Visual Feedback**: Focused state styling with color changes and top border

#### Tab Configuration
| Tab | Route | Icons | Purpose |
|-----|-------|-------|---------|
| Home | `/dashboard` | `home-outline`/`home` | Main dashboard |
| AI Assess | `/ai-assess` | `medical-outline`/`medical` | AI health assessment |
| Tracker | `/tracker` | `stats-chart-outline`/`stats-chart` | Health tracking |
| Emergency | `/emergency` | `alert-circle-outline`/`alert-circle` | Emergency services |
| Profile | `/profile` | `person-outline`/`person` | User profile |

#### Backend Considerations
- Route structure should match the defined paths
- Emergency tab may require real-time notifications
- Profile tab will need user authentication state
- Tracker tab requires health data endpoints

---

### 2. CurvedBackground

#### Purpose
Animated background component creating organic, breathing visual effects using multiple animated oval shapes with radial gradients.

#### Frontend Implementation
```tsx
import CurvedBackground from '../components/CurvedBackground';

// Usage as a wrapper component
<CurvedBackground style={customStyles}>
  <YourContent />
</CurvedBackground>
```

#### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Content to render over background |
| `style` | `object` | - | Additional styles for container |

#### Features
- **8 Animated Ovals**: Each with independent movement patterns
- **Smooth Animations**: 11-20 second loop cycles for organic movement
- **Breathing Effect**: Scale animations for depth perception
- **Performance Optimized**: Uses native driver where possible
- **Responsive Design**: Adapts to screen dimensions

#### Animation Details
- **Movement Range**: 10-15% of screen dimensions
- **Scale Range**: 0.9x to 1.1x for breathing effects
- **Gradient Types**: 3 different radial gradients for visual variety
- **Opacity Layers**: Multiple opacity levels (0.1 to 1.0) for depth

#### Backend Considerations
- No backend integration required
- Consider performance impact on lower-end devices
- May affect battery usage due to continuous animations

---

### 3. CurvedHeader

#### Purpose
Flexible header component with curved bottom design, supporting different layouts for various screen types.

#### Frontend Implementation
```tsx
import CurvedHeader from '../components/CurvedHeader';

// Basic usage
<CurvedHeader 
  title="Welcome" 
  subtitle="Get started with your health journey"
  showLogo={true}
  screenType="onboarding"
/>

// Custom content
<CurvedHeader height={150}>
  <CustomHeaderContent />
</CurvedHeader>
```

#### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Main header title |
| `subtitle` | `string` | - | Secondary text |
| `backgroundColor` | `string` | `"#D6E3F0"` | Header background color |
| `textColor` | `string` | `"#2c3e50"` | Text color |
| `height` | `number` | `100` | Total header height |
| `children` | `React.ReactNode` | - | Custom content override |
| `showLogo` | `boolean` | `false` | Display app logo |
| `screenType` | `'onboarding' \| 'signin'` | `'onboarding'` | Layout type |

#### Screen Types

**Onboarding Layout**
- Multi-line title support
- Centered text alignment
- Logo positioned to the left with spacing
- Optimized for welcome/intro screens

**Signin Layout**
- Single-line title (with auto-fit)
- Left-aligned text
- Compact logo spacing
- Optimized for authentication screens

#### Visual Design
- **Curved Bottom**: SVG path creates smooth curve transition
- **Responsive**: Adapts to screen width automatically
- **Typography**: Uses Barlow SemiBold font family
- **Layered Structure**: Background + curve + content layers

#### Backend Considerations
- Logo asset path: `../../assets/images/logo.png`
- Font loading may require network requests
- Consider implementing loading states for font rendering

---

### 4. HealthStatusTag

#### Purpose
Visual indicator component for displaying health status with appropriate color coding.

#### Frontend Implementation
```tsx
import HealthStatusTag from '../components/HealthStatusTag';

// Usage
<HealthStatusTag status="good" />
<HealthStatusTag status="fair" />
<HealthStatusTag status="poor" />
<HealthStatusTag status="excellent" />
```

#### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `string` | Yes | Health status value |

#### Status Color Mapping
| Status | Color | Hex Code | Use Case |
|--------|-------|----------|----------|
| `excellent` | Teal | `#17A2B8` | Outstanding health metrics |
| `good` | Green | `#28A745` | Healthy range values |
| `fair` | Yellow/Amber | `#FFC107` | Warning/attention needed |
| `poor` | Red | `#DC3545` | Critical/concerning values |
| `unknown` | Gray | `#6C757D` | Default/undefined status |

#### Features
- **Case Insensitive**: Accepts any case input
- **Auto Capitalization**: Displays status with proper capitalization
- **Consistent Styling**: Rounded corners, consistent padding
- **High Contrast**: White text on colored background for accessibility

#### Backend Integration
Health status values should be standardized across the API:

```json
{
  "healthMetrics": {
    "overallStatus": "good",
    "bloodPressure": "excellent", 
    "heartRate": "fair",
    "temperature": "poor"
  }
}
```

**Recommended Backend Implementation:**
- Use enum values for status types
- Implement status calculation logic based on medical thresholds
- Return consistent status strings in API responses
- Consider localization for international deployments

---

## Common Dependencies

### Required Packages
```json
{
  "@expo/vector-icons": "^13.0.0",
  "expo-router": "~3.0.0",
  "react-native-svg": "13.4.0",
  "@expo-google-fonts/barlow": "^0.2.3"
}
```

### Shared Constants
```tsx
// constants/constants.ts
export const FONTS = {
  BarlowSemiCondensed: 'Barlow_600SemiBold'
};
```

## Design System Integration

### Color Palette
- **Primary Blue**: `#2A7DE1` (navigation active state)
- **Background**: `#d4cdcdff` (main background)
- **Header**: `#D6E3F0` (default header background)
- **Text**: `#2c3e50` (primary text)
- **Gray Scale**: `#666`, `#E0E0E0` (secondary elements)

### Typography
- **Primary Font**: Barlow Semi Condensed 600
- **Sizes**: 12px (nav), 14px (tags), 18-22px (headers)

### Spacing
- **Standard Padding**: 8px, 12px, 20px
- **Component Heights**: 70px (navigation), 100px+ (headers)
- **Border Radius**: 16px (tags), curved paths (headers)

## Performance Considerations

### Optimization Tips
1. **Animations**: Use `useNativeDriver: false` only when necessary
2. **SVG Rendering**: Cache complex paths where possible  
3. **Font Loading**: Implement proper loading states
4. **Memory Management**: Clean up animations on unmount

### Testing Recommendations
- Test on various screen sizes and densities
- Verify animations perform well on lower-end devices
- Test accessibility features with screen readers
- Validate color contrast ratios meet WCAG guidelines

---

## API Integration Notes

### Health Status Standardization
Backend should implement consistent health status calculation:

```typescript
// Recommended backend types
type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor';

interface HealthMetric {
  value: number;
  unit: string;
  status: HealthStatus;
  timestamp: string;
  normalRange: {
    min: number;
    max: number;
  };
}
```

This documentation serves as a reference for both frontend developers implementing these components and backend developers who need to understand the data structures and integration points required to support the user interface.