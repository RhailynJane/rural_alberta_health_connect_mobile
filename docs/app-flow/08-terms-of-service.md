# Alberta Health Connect - Terms of Service & Privacy Policy Documentation

## Overview

This documentation covers the implementation of legal compliance pages for the Alberta Health Connect mobile application. The project now includes two new pages: **Terms of Service** and **Privacy Policy**, which are essential for user consent and regulatory compliance.

## File Structure

```
/app/auth/
├── sign-up.tsx (updated)
├── terms-of-service.tsx (new)
└── privacy-policy.tsx (new)
```

## 1. Terms of Service Page (`terms-of-service.tsx`)

### Purpose
- Provides legal framework for app usage
- Sets clear expectations about app limitations
- Mitigates liability risks
- Complies with Alberta healthcare regulations

### Key Sections

#### 1.1 Critical Disclaimer
```typescript
// Emphasizes the app's supportive role only
"The Alberta Health Connect App is a supportive information and guidance tool only."
"Always seek the advice of your physician or other qualified health provider..."
```

#### 1.2 User Responsibilities
- Accurate information provision
- Non-emergency use only
- Account security maintenance
- Professional medical consultation requirement

#### 1.3 Project Status Disclosure
```typescript
// Important for educational project context
"You acknowledge that this version... is part of an educational project."
"It is a prototype and not a commercially deployed medical product."
```

### Legal Compliance Features
- **Alberta Law Governance**: Explicitly states compliance with Alberta provincial laws
- **Liability Limitation**: Clear boundaries on project team responsibility
- **Intellectual Property Protection**: Defines usage rights and restrictions

## 2. Privacy Policy Page (`privacy-policy.tsx`)

### Purpose
- Transparent data handling practices
- HIA and PIPEDA compliance
- User rights education
- Data security assurance

### Key Compliance Areas

#### 2.1 Regulatory Alignment
```typescript
// Direct reference to governing laws
"We are committed to complying with Alberta's Health Information Act (HIA) 
and the federal Personal Information Protection and Electronic Documents Act (PIPEDA)."
```

#### 2.2 Data Classification
- **Personal Information**: Name, email, account details
- **Personal Health Information (PHI)**: Symptoms, health data, images
- **Data Minimization Principle**: Only necessary data collection

#### 2.3 Security Measures
- End-to-end encryption
- Strict access controls
- Canadian data sovereignty
- Regular security assessments

#### 2.4 User Rights
- Access to personal data
- Correction rights
- Consent withdrawal
- Data deletion requests

## 3. Sign-Up Form Integration

### Updated Checkbox Component
```typescript
// Enhanced with clickable legal links
<I agree to the Terms of Service and Privacy Policy. 
 I understand this app provides health information only 
 and does not replace professional medical care.>
```

### Implementation Features
- **Inline Links**: Terms and Privacy Policy are clickable within the text
- **Consistent Styling**: Uses app's color scheme (`#2A7DE1`)
- **Smooth Navigation**: Direct routing to legal pages
- **Validation Maintenance**: Form validation remains intact

## 4. Design System Integration

### Typography Consistency
- Uses `FONTS.BarlowSemiCondensed` throughout
- Maintains header hierarchy and spacing
- Responsive text sizing for readability

### Color Scheme
```typescript
const styles = {
  linkText: {
    color: "#2A7DE1",        // Primary brand blue
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  // ... other styles matching existing design system
}
```

### Layout Components
- Reuses `CurvedBackground` and `CurvedHeader` components
- Consistent padding and margins (`24px`)
- Scrollable content areas for long text

## 5. Navigation Flow

### User Journey
1. **Sign-up Screen**: User sees updated consent text with links
2. **Link Click**: Direct navigation to respective legal page
3. **Back Navigation**: Native back button returns to sign-up
4. **Form Completion**: Consent validation before account creation

### Routing Configuration
```typescript
// Simple Expo Router implementation
router.push("/auth/terms-of-service")
router.push("/auth/privacy-policy")
```

## 6. Ethical and Legal Considerations

### Medical Disclaimer Prominence
- **Multiple Reinforcements**: Disclaimer appears in both Terms and sign-up flow
- **Clear Language**: Avoids medical jargon for user understanding
- **Emergency Guidance**: Explicit 911/emergency instructions

### Consent Management
- **Explicit Consent**: Checkbox required for progression
- **Informed Consent**: Links provide immediate access to full policies
- **Withdrawal Mechanism**: Privacy Policy explains consent revocation process

### Accessibility Features
- **Screen Reader Compatible**: Proper text structure and semantics
- **High Contrast**: Maintains accessibility standards
- **Tap Targets**: Adequate sizing for interactive elements

## 7. Technical Implementation Details

### Component Architecture
```typescript
// Shared layout structure
<SafeAreaView>
  <CurvedBackground>
    <ScrollView>
      <CurvedHeader />
      <ContentSection>
        // Page-specific content
      </ContentSection>
    </ScrollView>
  </CurvedBackground>
</SafeAreaView>
```

### Performance Considerations
- **Lazy Loading**: Legal pages load on-demand only
- **Optimized Scrolling**: `ScrollView` for variable content length
- **Memory Efficiency**: No heavy assets or complex animations

### Maintenance Requirements
- **Date Updates**: Effective dates need periodic review
- **Legal Review**: Professional legal assessment for deployment
- **Regulatory Updates**: Monitor changes in HIA/PIPEDA requirements


## Conclusion

This implementation provides a robust legal foundation for the Rural Alberta Health Connect application while maintaining user experience quality. The solution balances regulatory requirements with practical usability, ensuring users can make informed decisions about their data and app usage.

The modular design allows for easy updates as legal requirements evolve, and the consistent integration with the existing design system maintains brand coherence across the application.