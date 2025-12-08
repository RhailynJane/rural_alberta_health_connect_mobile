# Firebase Cloud Messaging (FCM) Setup Guide

This guide explains how to set up Firebase Cloud Messaging for Rural Alberta Health Connect mobile app.

## Overview

Firebase Cloud Messaging (FCM) provides a more robust and reliable way to send push notifications compared to Expo Push Service. This implementation:

- ✅ Works alongside existing Expo notifications
- ✅ Supports iOS, Android, and Web platforms
- ✅ Integrates with Convex backend
- ✅ Stores tokens securely in `expo-secure-store`
- ✅ Handles token refresh automatically
- ✅ Supports data and notification payloads

## Architecture

```
Client (React Native)
  ├─ Firebase Cloud Messaging (FCM)
  │  └─ expo-secure-store (token storage)
  ├─ Expo Notifications (fallback/supplementary)
  │  └─ Local notification channels
  └─ Convex Backend
     ├─ pushTokens table (stores both Expo & Firebase tokens)
     └─ notifications.ts (sends notifications)

Server (Convex)
  ├─ registerFirebaseFCMToken mutation (stores token)
  ├─ getUserPushTokens query (retrieves tokens)
  ├─ sendFirebaseNotification function (sends via Firebase Admin SDK)
  └─ Existing Expo push integration (fallback)
```

## Prerequisites

1. **Firebase Project**: https://console.firebase.google.com/
2. **Google Cloud Project** (for FCM)
3. **EAS Build** (for native builds)
4. **Android & iOS signing credentials**

## Step 1: Create Firebase Project

### 1.1 Create a new Firebase project
- Go to https://console.firebase.google.com/
- Click "Create Project"
- Name: `Rural Alberta Health Connect` (or similar)
- Enable Google Analytics (optional)
- Create project

### 1.2 Register your apps

#### Register Android app:
1. In Firebase Console, click "Add app" → "Android"
2. Package name: `com.rahc.app`
3. App nickname: `RAHC Android`
4. SHA-1 fingerprint: Get from your signing certificate
   ```bash
   # If using EAS:
   eas credentials -p android
   ```
5. Download `google-services.json`
6. Save to: `android/app/google-services.json`

#### Register iOS app:
1. Click "Add app" → "iOS"
2. Bundle ID: `com.rahc.app`
3. App nickname: `RAHC iOS`
4. Download `GoogleService-Info.plist`
5. Add to Xcode project (or use EAS autolinking)

#### Register Web app (optional):
1. Click "Add app" → "Web"
2. Register and copy config

## Step 2: Get Firebase Configuration

### 2.1 Firebase Console Settings

1. Go to **Project Settings** (gear icon)
2. Copy the Web SDK configuration:
   ```json
   {
     "apiKey": "YOUR_API_KEY",
     "authDomain": "YOUR_PROJECT.firebaseapp.com",
     "projectId": "YOUR_PROJECT_ID",
     "storageBucket": "YOUR_PROJECT.appspot.com",
     "messagingSenderId": "YOUR_SENDER_ID",
     "appId": "YOUR_APP_ID"
   }
   ```

### 2.2 Get VAPID Key (for Web)

1. Go to **Cloud Messaging** in Firebase Console
2. Under "Web Push certificates", click "Generate Key Pair"
3. Copy the public key (VAPID key)

## Step 3: Configure Environment Variables

Create `.env.local` or `.env.production` files:

```bash
# Firebase Web Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
EXPO_PUBLIC_FIREBASE_VAPID_KEY=YOUR_VAPID_KEY
```

**IMPORTANT**: Never commit these to git. They're already in `.gitignore`.

## Step 4: Install Dependencies

```bash
# Firebase for web
npm install firebase

# React Native Firebase (for native platforms)
npm install @react-native-firebase/app @react-native-firebase/messaging

# Already installed
# expo-secure-store (for token storage)
# expo-notifications (for foreground notifications)
```

## Step 5: Configure EAS Build

Update `eas.json` to include Google Services files:

```json
{
  "build": {
    "production": {
      "android": {
        "buildProfile": "production",
        "env": {
          "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "YOUR_PROJECT_ID"
        }
      },
      "ios": {
        "buildProfile": "production",
        "env": {
          "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "YOUR_PROJECT_ID"
        }
      }
    }
  }
}
```

## Step 6: Update app.json

The `app.json` already has notification permissions configured:

```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.POST_NOTIFICATIONS"
      ]
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#0B6EFE",
          "mode": "default"
        }
      ]
    ]
  }
}
```

## Step 7: Initialize Firebase in Your App

### 7.1 In your root layout (`app/_layout.tsx` or `app/index.tsx`):

```typescript
import { useEffect } from "react";
import { initializeFirebase } from "./utils/firebase";
import { initializeFirebaseNotifications } from "./utils/firebaseNotifications";
import { useConvexAuth } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function RootLayout() {
  const { isAuthenticated, user } = useConvexAuth();
  const registerFCMToken = useMutation(api.notifications.registerFirebaseFCMToken);

  useEffect(() => {
    // Initialize Firebase
    initializeFirebase();
  }, []);

  useEffect(() => {
    // Register for Firebase notifications after login
    if (isAuthenticated && user?._id) {
      initializeFirebaseNotifications(user._id, async (tokenData) => {
        try {
          await registerFCMToken({
            fcmToken: tokenData.fcmToken,
            platform: tokenData.platform,
            deviceName: tokenData.deviceName,
          });
        } catch (error) {
          console.error("Failed to register FCM token:", error);
        }
      });
    }
  }, [isAuthenticated, user?._id]);

  // ... rest of your layout
}
```

### 7.2 In your notification handler (e.g., dashboard or home screen):

```typescript
import { useEffect } from "react";
import { setupFirebaseNotificationHandler } from "@/app/utils/firebaseNotifications";

export default function Dashboard() {
  useEffect(() => {
    // Set up handler for foreground notifications
    const unsubscribe = setupFirebaseNotificationHandler((notification) => {
      console.log("Notification received:", notification);
      // Handle notification (show toast, update UI, etc.)
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  // ... rest of your component
}
```

## Step 8: Server-Side Setup (Convex)

### 8.1 Install Firebase Admin SDK on Convex

In your Convex deployment environment, add Firebase Admin SDK dependencies.

### 8.2 Create a mutation to send notifications

```typescript
// convex/notifications.ts
export const sendNotificationViaFirebase = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.object()),
  },
  handler: async (ctx, args) => {
    // Get user's Firebase tokens
    const tokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const fcmTokens = tokens.filter(t => t.platform.includes("firebase"));

    if (fcmTokens.length === 0) {
      console.log("No Firebase tokens found");
      return;
    }

    // Use Firebase Admin SDK to send
    // const admin = require("firebase-admin");
    // await admin.messaging().sendMulticast({
    //   tokens: fcmTokens.map(t => t.token),
    //   notification: { title: args.title, body: args.body },
    //   data: args.data || {},
    // });
  },
});
```

## Step 9: Test Notifications

### Test from Firebase Console:

1. Go to **Cloud Messaging** in Firebase Console
2. Click "Send test message"
3. Add title and body
4. Select "Add platform" → "Android" or "iOS"
5. Enter FCM token (from `expo-secure-store`)
6. Click "Send test message"

### Test from your app:

```typescript
// Add to a test button
const testNotification = async () => {
  const token = await getStoredFirebaseToken();
  console.log("Your FCM token:", token);
  // Send test via Firebase Console using this token
};
```

## Troubleshooting

### "Firebase is not initialized"
- Check that all `EXPO_PUBLIC_FIREBASE_*` env vars are set
- Ensure `.env` file is not committed to git
- Verify env vars are loaded in Expo

### "FirebaseApp is not initialized" error on native
- Android: Ensure `google-services.json` is in `android/app/`
- iOS: Ensure `GoogleService-Info.plist` is added to Xcode project
- Run: `npm run prebuild` to regenerate native code

### Tokens not being stored
- Check that `expo-secure-store` permissions are granted
- Verify user is authenticated before registering token
- Check Convex mutation logs

### Notifications not received
- Verify FCM token is stored in Convex (check `pushTokens` table)
- Ensure app has notification permissions granted
- Check Firebase project has Cloud Messaging enabled
- For iOS: Ensure push certificates are configured correctly

### Web platform issues
- VAPID key must be configured in Firebase Console
- Browser must support Service Workers
- Test URL must be HTTPS (or localhost)

## Production Checklist

- [ ] Firebase project created and configured
- [ ] Environment variables set in `.env.production`
- [ ] `google-services.json` added for Android
- [ ] `GoogleService-Info.plist` added for iOS
- [ ] EAS build profiles updated with Firebase config
- [ ] Firebase Admin SDK configured on backend
- [ ] Token refresh logic tested
- [ ] Foreground notification handling implemented
- [ ] Background notification handling tested
- [ ] Push certificate renewal scheduled (annual)
- [ ] Notification error logging implemented

## Security Considerations

1. **Never commit API keys**: Use `.env` files, ignored by git
2. **Use Firebase Security Rules**: Restrict FCM token access
3. **Validate tokens on backend**: Only accept valid Convex auth users
4. **Rotate keys periodically**: Especially after any suspected exposure
5. **Monitor Firebase usage**: Watch for unusual activity
6. **Rate limit notifications**: Prevent notification spam attacks

## References

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase](https://rnfirebase.io/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

## Next Steps

1. Create Firebase project
2. Download service files (google-services.json, GoogleService-Info.plist)
3. Set environment variables
4. Test token registration
5. Deploy to production with EAS Build
