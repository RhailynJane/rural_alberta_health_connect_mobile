# Authentication Flow Documentation

## Overview

This document describes the complete authentication flow for the Alberta Health Connect mobile application, covering user sign-up, sign-in, password recovery, and onboarding processes.

## Frontend Components

### 1. Sign In Screen (`signin.tsx`)

**Purpose**: Authenticate existing users

**Features**:
- Email and password authentication
- Password visibility toggle
- Forgot password functionality
- Error handling with modal notifications
- Navigation to sign up screen

**Validation Rules**:
- Email must be valid format
- Password must be at least 6 characters

**API Integration**:
- Uses `useAuthActions().signIn` from Convex Auth
- Redirects to dashboard on successful authentication

### 2. Sign Up Screen (`signup.tsx`)

**Purpose**: Register new users

**Features**:
- Collects first name, last name, email, and password
- Password confirmation field
- Terms of service agreement
- Password visibility toggle
- Navigation to personal info screen on success

**Validation Rules**:
- All fields required
- Email must be valid format
- Password must be at least 6 characters
- Passwords must match
- Terms of service must be accepted

**API Integration**:
- Uses `useAuthActions().signIn` with `flow: "signUp"`
- Passes additional user data (firstName, lastName)

### 3. Forgot Password Screen (`forgot-password.tsx`)

**Purpose**: Handle password recovery

**Features**:
- Email verification code request
- Code verification and new password setup
- Two-step process (request code → reset password)

**Validation Rules**:
- Email required for code request
- Code and new password required for reset

### 4. Onboarding Screens

#### Personal Information Screen (`personal-info.tsx`)
- Collects age range and location
- Progress indicator (Step 1 of 3)
- Uses Picker component for selection

#### Emergency Contact Screen (`emergency-contact.tsx`)
- Collects emergency contact name and phone
- Progress indicator (Step 2 of 3)

#### Medical History Screen (`medical-history.tsx`)
- Collects optional medical information
- Progress indicator (Step 3 of 3)
- Marks onboarding as complete

## Backend Requirements

### Database Schema

**Users Collection**:
```javascript
{
  _id: Id("users"),
  email: string,
  firstName: string,
  lastName: string,
  ageRange: string, // "under18", "18-24", etc.
  location: string, // "northern", "central", etc.
  emergencyContactName: string,
  emergencyContactPhone: string,
  medicalConditions: string, // optional
  currentMedications: string, // optional
  allergies: string, // optional
  onboardingComplete: boolean,
  createdAt: number,
  updatedAt: number
}
```

### API Endpoints

#### Authentication Endpoints (Convex Auth)
- `signIn("password", {email, password, flow: "signIn"})`
- `signIn("password", {email, password, firstName, lastName, flow: "signUp"})`

#### Custom Mutation Endpoints

**Personal Information**:
```javascript
// convex/personalInfo.js
export const update = mutation({
  args: {
    ageRange: v.string(),
    location: v.string(),
  },
  handler: async (ctx, args) => {
    // Update user record with personal info
  }
});
```

**Emergency Contact**:
```javascript
// convex/emergencyContact.js
export const update = mutation({
  args: {
    emergencyContactName: v.string(),
    emergencyContactPhone: v.string(),
  },
  handler: async (ctx, args) => {
    // Update user record with emergency contact
  }
});
```

**Medical History**:
```javascript
// convex/medicalHistory.js
export const update = mutation({
  args: {
    medicalConditions: v.optional(v.string()),
    currentMedications: v.optional(v.string()),
    allergies: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Update user record with medical history
  }
});

export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx, args) => {
    // Mark user onboarding as complete
  }
});
```

## Flow Sequence

1. **Sign Up Flow**:
   - User completes sign up form
   - Account created via Convex Auth
   - Redirect to Personal Information screen
   - Progress through Emergency Contact screen
   - Complete with Medical History screen
   - Mark onboarding complete
   - Redirect to dashboard

2. **Sign In Flow**:
   - User enters credentials
   - Authentication via Convex Auth
   - Check if onboarding complete
   - Redirect to appropriate screen (dashboard or continue onboarding)

3. **Password Recovery Flow**:
   - User requests verification code
   - System sends code to email (implementation needed)
   - User enters code and new password
   - Password updated in auth system

## Error Handling

**Authentication Errors**:
- Invalid email format
- User not found
- Incorrect password
- Network errors

**Validation Errors**:
- Field-specific validation messages
- Required field indicators
- Input formatting guides

**UI Feedback**:
- Loading states during API calls
- Error modals with specific messages
- Disabled buttons during submission

## Security Considerations

1. Passwords are handled by Convex Auth (not stored in custom tables)
2. Validation occurs on both client and server
3. Sensitive information (medical data) is optional
4. Authentication state is managed by Convex

## Implementation Notes

1. **Font Consistency**: All text uses `FONTS.BarlowSemiCondensed`
2. **Styling**: Consistent use of design system with blue primary color (#2A7DE1)
3. **Navigation**: Uses Expo Router for screen transitions
4. **State Management**: Form state managed by Formik, application state by Convex
5. **Progress Tracking**: Visual progress indicators during onboarding

## Required Backend Functions

1. Email service for password reset codes
2. User profile update functions
3. Onboarding status tracking
4. Authentication integration with Convex Auth

## Testing Considerations

1. Test all validation scenarios
2. Verify email/password authentication
3. Test onboarding flow completion
4. Verify error handling for network issues
5. Test navigation between auth screens

This authentication system provides a complete user management solution with proper onboarding flows and security measures.