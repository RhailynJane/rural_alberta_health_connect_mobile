# Android Push Notifications Setup - Complete ✅

## Overview

Android push notifications are now fully implemented using **React Native Firebase** with automatic token registration and Convex backend integration.

## What's Implemented

### 1. **Dependencies Installed** ✅
- `@react-native-firebase/app` - Core Firebase module for React Native
- `@react-native-firebase/messaging` - FCM messaging for Android/iOS
- `@tanstack/react-query` - Dependency resolution

### 2. **Configuration Files** ✅
- `android/app/google-services.json` - Firebase project configuration
- `.env.development` - Firebase credentials and settings
- `app.json` - Android permissions configured:
  - `android.permission.POST_NOTIFICATIONS` - Required for push notifications
  - `android.permission.CAMERA` - Existing
  - `android.permission.RECORD_AUDIO` - Existing
  - `android.permission.ACCESS_FINE_LOCATION` - Existing

### 3. **Client Implementation** ✅

#### `app/utils/firebase.ts` (170 lines)
- **Purpose**: React Native Firebase initialization and token management
- **Key Functions**:
  - `initializeFirebase()` - Initialize Firebase on app startup
  - `registerForFirebaseMessaging()` - Get FCM token for device
  - `setupFirebaseMessageListener()` - Listen for incoming messages
  - `getFirebaseMessaging()` - Get messaging instance
  - `isFirebaseMessagingAvailable()` - Check availability

- **Design**: Dynamic imports to avoid bundling issues with React Native

```typescript
// Dynamically load Firebase to avoid bundling errors
const firebase = await import("@react-native-firebase/app").then((m) => m.default);
const messaging = await import("@react-native-firebase/messaging").then((m) => m.default);
```

#### `app/utils/firebaseNotifications.ts` (172 lines)
- **Purpose**: Token storage and notification handlers
- **Key Functions**:
  - `storeFirebaseToken()` - Store token securely using expo-secure-store
  - `getStoredFirebaseToken()` - Retrieve stored token
  - `initializeFirebaseNotifications()` - Setup notifications for user
  - `setupFirebaseNotificationHandler()` - Handle incoming notifications

#### `app/_layout.tsx` - Firebase Integration
- **On App Load**: `initializeFirebase()` called in useEffect
- **On User Login**: `FirebaseTokenRegistration` component registers FCM token
- **Token Storage**: Secure storage using expo-secure-store
- **Backend Sync**: Token registered with Convex via `registerFirebaseFCMToken` mutation

### 4. **Backend Integration** ✅

#### `convex/notifications.ts` - Mutations
- `registerFirebaseFCMToken()` - Register FCM token with backend
- `getUserPushTokens()` - Query user's registered tokens
- `sendFirebaseNotification()` - Send notifications via Firebase Admin SDK

**Schema**: `pushTokens` table stores:
- `userId` - User identifier
- `token` - FCM token
- `platform` - Device platform (e.g., "android-firebase")
- `createdAt` - Registration timestamp
- `updatedAt` - Last update timestamp

### 5. **Automatic Token Registration Flow**

```
App Starts
    ↓
initializeFirebase() called
    ↓
User logs in
    ↓
FirebaseTokenRegistration component
    ↓
registerForFirebaseMessaging() gets FCM token
    ↓
storeFirebaseToken() stores securely
    ↓
registerFirebaseFCMToken() mutation called
    ↓
Token stored in Convex backend
```

## How It Works

### Getting FCM Token
```typescript
// In FirebaseTokenRegistration component
const token = await registerForFirebaseMessaging(user._id);
```

The token is obtained from React Native Firebase, which handles:
- Android device registration with Google FCM servers
- Token persistence and refresh
- Platform-specific error handling

### Storing Token Securely
```typescript
// Uses expo-secure-store
await storeFirebaseToken(token);
```

Token stored with 30-day expiry tracking.

### Backend Registration
```typescript
// Register token with Convex
await registerFCMToken({
  fcmToken: token,
  platform: "android",
  deviceName: "mobile",
});
```

Token synced to backend for:
- Push notification targeting
- Device management
- Analytics

### Message Handling
When FCM message arrives:
1. **Foreground**: Displayed via `expo-notifications`
2. **Background**: Android system handles display
3. **Opened**: App launched with notification data

## Testing

### Check Token Registration
1. After login, check console logs for: `✅ FCM token registered with backend`
2. Verify in Convex dashboard:
   ```sql
   SELECT * FROM pushTokens WHERE platform LIKE '%firebase%'
   ```

### Send Test Notification
1. Firebase Console → Cloud Messaging → Send a message
2. Select your app and registered device
3. Send test message
4. Verify notification appears on device

### Verify Permissions
- Device Settings → App Permissions → Notifications
- Should show RAHC app with notification permission enabled

## Troubleshooting

### Token Not Registering
1. Check Firebase initialization: `initializeFirebase()`
2. Verify user is authenticated: Check `isAuthenticated` in console
3. Check secure storage: `getStoredFirebaseToken()`
4. Check backend mutation: `registerFCMToken` in Convex logs

### Notifications Not Arriving
1. Verify token is registered in backend: `pushTokens` table
2. Check notification platform matches: Should be "android-firebase"
3. Verify Firebase project credentials: `EXPO_PUBLIC_FIREBASE_*` env vars
4. Check Android permissions: `POST_NOTIFICATIONS` in app.json

### Build Issues
1. Clear Metro cache: `npm start -- --clear`
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Rebuild EAS build: `eas build --platform android`

## File Structure

```
app/
├── _layout.tsx (Firebase init + token registration)
├── utils/
│   ├── firebase.ts (React Native Firebase setup)
│   └── firebaseNotifications.ts (Token + notification handlers)
├── components/
│   └── NotificationBanner.tsx (Show notifications)

android/
└── app/
    └── google-services.json (Firebase config)

convex/
└── notifications.ts (Backend mutations)

.env.development
├── EXPO_PUBLIC_FIREBASE_API_KEY
├── EXPO_PUBLIC_FIREBASE_PROJECT_ID
├── EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
└── ... (other Firebase credentials)
```

## Environment Variables Required

```env
EXPO_PUBLIC_FIREBASE_API_KEY=<your-api-key>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-auth-domain>
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-storage-bucket>
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=616249844516
EXPO_PUBLIC_FIREBASE_APP_ID=<your-app-id>
```

## Next Steps

1. **Build for Android**: `eas build --platform android`
2. **Test on Device**: Install on physical Android device
3. **Verify Token Registration**: Check Convex dashboard after login
4. **Send Test Notifications**: Use Firebase Console
5. **Monitor in Production**: Track notification delivery in analytics

## Related Documentation

- `FIREBASE_IMPLEMENTATION_STATUS.md` - Overall Firebase setup status
- `FIREBASE_QUICKSTART.md` - Quick start guide
- `docs/FIREBASE_IMPLEMENTATION.md` - Complete implementation details
