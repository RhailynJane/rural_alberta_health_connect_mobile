# Firebase FCM Quick Start

## Your Firebase Project
```
Project ID:     rahc-push
Sender ID:      616249844516
Package:        com.rahc.app
Region:         North America
```

## Files Created/Updated

| File | Purpose | Status |
|------|---------|--------|
| `app/utils/firebase.ts` | Firebase initialization | ✅ Ready |
| `app/utils/firebaseNotifications.ts` | Token & notification management | ✅ Ready |
| `convex/notifications.ts` | Backend FCM mutations | ✅ Ready |
| `android/app/google-services.json` | Android FCM config | ✅ Ready |
| `.env.development` | Firebase credentials | ✅ Ready |
| `docs/FIREBASE_IMPLEMENTATION.md` | Full implementation guide | ✅ Ready |

## 🚀 3-Step Integration

### Step 1: Install Packages
```bash
npm install firebase @react-native-firebase/app @react-native-firebase/messaging
```

### Step 2: Get VAPID Key
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select **rahc-push** project
3. Cloud Messaging > Web Push certificates > **Generate Key Pair**
4. Copy public key and update `.env.development`:
```bash
EXPO_PUBLIC_FIREBASE_VAPID_KEY=YOUR_KEY_HERE
```

### Step 3: Add to `app/_layout.tsx`
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

  useEffect(() => {
    initializeFirebase();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const setup = async () => {
      const userId = "current_user_id"; // Get from auth
      
      await initializeFirebaseNotifications(userId, async (tokenData) => {
        await registerFCMToken({
          fcmToken: tokenData.fcmToken,
          platform: "mobile",
        });
      });

      setupFirebaseNotificationHandler((notification) => {
        console.log("📬 Notification:", notification);
      });
    };

    setup();
  }, [isAuthenticated, registerFCMToken]);

  // ... rest of layout
}
```

## 🧪 Test It

### Get Your FCM Token
```typescript
import { getStoredFirebaseToken } from "@/app/utils/firebaseNotifications";

const token = await getStoredFirebaseToken();
console.log("FCM Token:", token);
```

### Send Test from Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. **rahc-push** project > **Cloud Messaging**
3. Click **Send test message**
4. Platform: Android or iOS
5. Paste your FCM token
6. Click **Send test message**
7. Check device for notification ✅

## ✅ Verification Checklist

- [ ] npm packages installed
- [ ] VAPID key generated and added to `.env.development`
- [ ] Firebase initialization in `app/_layout.tsx`
- [ ] Token registration integrated
- [ ] Test notification sent and received
- [ ] Notification tap handling implemented
- [ ] iOS push certificates configured (if building for iOS)
- [ ] Ready for production build

## 📞 Common Issues

| Issue | Solution |
|-------|----------|
| "Firebase not initialized" | Check `.env.development` has all `EXPO_PUBLIC_FIREBASE_*` vars |
| "No FCM token received" | Check notification permissions, verify mutations in Convex |
| "Notifications not arriving" | Test with Firebase Console "Send test message", check pushTokens table |
| "android.permission.POST_NOTIFICATIONS" | Already in `app.json`, user must grant at runtime |

## 🔗 Important Links

- 📱 [Firebase Console](https://console.firebase.google.com/) - rahc-push project
- 📚 [Full Implementation Guide](./FIREBASE_IMPLEMENTATION.md)
- 🎯 [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- ⚙️ [Convex API Reference](https://docs.convex.dev/)

## 🎯 Production Checklist

Before deploying to production:

1. **Environment Variables**
   - [ ] Production Firebase credentials in `.env.production`
   - [ ] All `EXPO_PUBLIC_FIREBASE_*` vars set
   - [ ] VAPID key configured

2. **Security**
   - [ ] Enable Firebase Security Rules
   - [ ] Test authentication on token endpoints
   - [ ] Verify API key restrictions (if using)

3. **Apple Setup** (if building for iOS)
   - [ ] Download `GoogleService-Info.plist`
   - [ ] Configure push certificates in Apple Developer
   - [ ] Annual certificate renewal reminder set

4. **Testing**
   - [ ] Test notification delivery to 3+ devices
   - [ ] Test background notification handling
   - [ ] Test notification tap behavior
   - [ ] Monitor Firebase console for errors

5. **Monitoring**
   - [ ] Set up error logging
   - [ ] Monitor token registration rates
   - [ ] Watch Firebase Cloud Messaging usage
   - [ ] Track notification delivery rates

---

**Status**: 🟢 Ready to integrate into your app!
