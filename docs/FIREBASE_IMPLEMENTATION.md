# Firebase Push Notifications - Implementation Guide

## ✅ Current Status

Your Firebase project **rahc-push** is now integrated with your RAHC app:

```
Project ID: rahc-push
Sender ID: 616249844516
Package: com.rahc.app
```

## 📋 Completed Setup

- ✅ Firebase project created and configured
- ✅ `google-services.json` placed in `android/app/`
- ✅ Firebase credentials in `.env.development`
- ✅ Convex backend mutations for token registration
- ✅ Firebase utilities created (`app/utils/firebase.ts`, `app/utils/firebaseNotifications.ts`)

## 🔧 Next Steps

### Step 1: Install Firebase Packages

```bash
npm install firebase
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### Step 2: Get VAPID Key (for Web Push)

The VAPID key is needed for web platform notification delivery.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select **rahc-push** project
3. Go to **Cloud Messaging** (in left menu)
4. Under "Web Push certificates", click **Generate Key Pair**
5. Copy the **public key** (this is your VAPID key)
6. Update `.env.development`:

```bash
EXPO_PUBLIC_FIREBASE_VAPID_KEY=YOUR_GENERATED_VAPID_KEY
```

### Step 3: Configure iOS (GoogleService-Info.plist)

If building for iOS:

1. Go to Firebase Console > Project Settings > Your apps > iOS
2. Download `GoogleService-Info.plist`
3. Place it in your project (EAS will auto-link it, or add to Xcode manually)

### Step 4: Integrate into Your App

In your root layout component (`app/_layout.tsx`):

```typescript
import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { initializeFirebase } from "@/app/utils/firebase";
import { 
  initializeFirebaseNotifications,
  setupFirebaseNotificationHandler 
} from "@/app/utils/firebaseNotifications";

export default function RootLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const registerFCMToken = useMutation(api.notifications.registerFirebaseFCMToken);

  // Initialize Firebase on app load
  useEffect(() => {
    initializeFirebase();
  }, []);

  // Register for notifications after user logs in
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const setupNotifications = async () => {
      try {
        // Get current user ID from your auth
        const userId = "current_user_id"; // Replace with actual user ID
        
        await initializeFirebaseNotifications(
          userId,
          async (tokenData) => {
            // Register token with Convex backend
            await registerFCMToken({
              fcmToken: tokenData.fcmToken,
              platform: "mobile",
            });
            console.log("✅ FCM Token registered:", tokenData.fcmToken.substring(0, 20) + "...");
          }
        );

        // Set up handler for foreground notifications
        setupFirebaseNotificationHandler((notification) => {
          console.log("📬 Notification received:", notification);
          // Show toast, update UI, etc.
        });
      } catch (error) {
        console.error("❌ Firebase setup failed:", error);
      }
    };

    setupNotifications();
  }, [isAuthenticated, registerFCMToken]);

  // ... rest of your layout
}
```

### Step 5: Test Notifications

#### From Firebase Console:

1. Get your FCM token:
   - In development, check console logs for: `"✅ FCM Token registered: ..."`
   - Or add a debug screen to display it

2. Send test message:
   - Firebase Console > Cloud Messaging
   - Click "Send test message"
   - Select platform (Android/iOS/Web)
   - Paste your FCM token
   - Click "Send test message"

3. Check your device for notification

#### From Your App:

```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function TestNotificationButton() {
  const createNotification = useMutation(
    api.notifications.createAndPushNotification
  );

  const sendTest = async () => {
    try {
      await createNotification({
        userId: currentUserId,
        title: "Test Notification",
        body: "This is a test from your app!",
        type: "test",
        sendPush: true,
      });
      console.log("✅ Test notification sent");
    } catch (error) {
      console.error("❌ Failed to send test:", error);
    }
  };

  return (
    <TouchableOpacity onPress={sendTest}>
      <Text>Send Test Notification</Text>
    </TouchableOpacity>
  );
}
```

## 🏗️ Architecture

Your notification system now uses a **hybrid approach**:

```
┌─────────────────────────────────────┐
│     User Device (iOS/Android)       │
│  ┌──────────────────────────────┐   │
│  │ Firebase Cloud Messaging     │   │
│  │ (FCM Token Management)       │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ expo-notifications           │   │
│  │ (Local channels, handlers)   │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ expo-secure-store            │   │
│  │ (Token storage)              │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
           ▲            ▲
           │            │
           │            └─────────┐
           │                      │
    Firebase      Expo Push Service
    Admin SDK     (Legacy/Fallback)
           │                      │
           └──────────┬───────────┘
                      │
         ┌────────────▼────────────┐
         │  Convex Backend         │
         │ (notifications.ts)      │
         │ - registerFCMToken      │
         │ - sendFirebaseNotif     │
         │ - sendPushToUser        │
         │ - createNotification    │
         └────────────┬────────────┘
                      │
         ┌────────────▼────────────┐
         │  Health Entries Events  │
         │ - Assessment Complete   │
         │ - Reminder Triggered    │
         │ - Health Status Alert   │
         └────────────────────────┘
```

## 📊 Notification Types

Your app now supports:

### 1. **Assessment Reminders**
- Scheduled reminders for health assessments
- Uses both Expo and Firebase for reliability

### 2. **AI Assessment Results**
- Sent when Gemini AI assessment completes
- Includes summary data

### 3. **Health Status Alerts**
- Critical health condition notifications
- High priority delivery

### 4. **Emergency Notifications**
- Emergency contact responses
- Clinic availability updates

## 🔐 Security Best Practices

✅ **Implemented:**
- API keys in `.env` files (git-ignored)
- Tokens stored securely in `expo-secure-store`
- Backend validation on all token operations
- User authentication required for registration

⚠️ **Still To Do:**
- Enable Firebase Security Rules in console
- Set up server-side token validation
- Implement notification rate limiting
- Monitor Firebase usage dashboard

## 🚀 Production Deployment

### Before Building:

```bash
# 1. Set production environment variables
cp .env.development .env.production

# Update with production Firebase credentials if different:
# EXPO_PUBLIC_FIREBASE_API_KEY=YOUR_PROD_KEY
# etc.

# 2. Ensure google-services.json is in android/app/
# (Already there ✅)

# 3. Build with EAS
eas build -p android --profile production
eas build -p ios --profile production
```

### After Deployment:

1. Test notifications with production build
2. Monitor Firebase console for token registration
3. Check error logs in Cloud Messaging dashboard
4. Set up Firebase Performance Monitoring (optional)

## 📱 Platform-Specific Notes

### Android
- `google-services.json` required in `android/app/` ✅
- Notification channels auto-configured by `expo-notifications`
- High priority delivery supported
- Works with app backgrounded/killed

### iOS
- `GoogleService-Info.plist` required
- Push certificates must be configured in Apple Developer Portal
- **Important:** Push certificates expire annually - set renewal reminder
- Works with app backgrounded, requires user's OS permission

### Web
- VAPID key required for push delivery
- Only works with HTTPS (or localhost for dev)
- Service Workers must be enabled

## 🐛 Troubleshooting

### "Firebase not initialized"
```bash
# Check environment variables
echo $EXPO_PUBLIC_FIREBASE_PROJECT_ID

# Verify .env.development is loaded
npm start
```

### "FCM Token not received"
- Check notification permissions are granted
- Verify `registerFirebaseFCMToken` mutation completed successfully
- Check Convex logs in dashboard

### "Notifications not received"
- Verify FCM token stored in Convex `pushTokens` table
- Check Firebase console for delivery errors
- Test with Firebase Console "Send test message"
- Ensure app has POST_NOTIFICATIONS permission (Android 13+)

### "android.permission.POST_NOTIFICATIONS not granted"
- Already in `app.json` ✅
- User must grant at runtime with permission prompt
- Won't work if user denies permission

## 📚 Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Native Firebase](https://rnfirebase.io/)
- [Convex Documentation](https://docs.convex.dev/)

## ✨ What's Included

### Client-Side Files:
- `app/utils/firebase.ts` - Firebase initialization and setup
- `app/utils/firebaseNotifications.ts` - Token management and listeners
- `android/app/google-services.json` - Android Firebase config ✅

### Backend Files:
- `convex/notifications.ts` - Enhanced with Firebase mutations
  - `registerFirebaseFCMToken()` - Register FCM token
  - `getUserPushTokens()` - Retrieve registered tokens
  - `sendFirebaseNotification()` - Send via Firebase Admin SDK

### Configuration Files:
- `.env.development` - Firebase credentials for dev
- `.env.example` - Template for environment variables
- `docs/firebase-setup.md` - Detailed setup guide

## 🎯 Next Immediate Actions

1. **Get VAPID Key**: Firebase Console > Cloud Messaging > Web Push certificates
2. **Update `.env.development`** with VAPID key
3. **Install packages**: `npm install firebase @react-native-firebase/app @react-native-firebase/messaging`
4. **Integrate into `app/_layout.tsx`** using the example above
5. **Test**: Build and deploy test notification via Firebase Console

---

**Status**: 🟢 **Ready for Integration**

All infrastructure is in place. Next step is integrating the hook into your root component and testing with your Firebase credentials.
