# Push Notification Setup - Summary

## ✅ What's Been Done

### Client Side (Expo App)
1. **app.json** - Added `googleServicesFile` to Android config
2. **Notification permissions** - App requests on first launch
3. **Token registration** - Tokens auto-register with Convex backend on login
4. **Notification handling** - In-app listeners set up for foreground/background notifications

### Git & Build
1. **google-services.json** - Committed to git for EAS Build access
2. **.gitignore** - Updated to allow google-services.json while ignoring android build files
3. **Config plugins** - withGoogleServices.js validates file exists before prebuild

### Backend Setup (Ready)
- Firebase Admin SDK key stored (never commit this!)
- Convex notifications.ts has FCM sending functions ready
- Push token table tracks registered devices

---

## 🚀 Next Steps

### 1. Wait for EAS Build to Complete
Check the build status at: https://expo.dev/accounts/rahcapp/projects/rahc-app/builds

### 2. Install APK on Device
- Download the APK from EAS
- Install on a **physical Android device** with Google Play Services
- Note: Expo Go won't work—you need a built APK

### 3. Test Token Registration
1. Open app and sign in
2. Go to your Convex dashboard
3. Check `pushTokens` table
4. Verify a token row was created for your user

### 4. Send Test Push Notification
Add this to your backend or Convex dashboard code:

```typescript
// Example: Send test push
const result = await sendPushNotificationFCM({
  userId: 'your_user_id',
  title: 'Test Notification',
  body: 'If you see this, push notifications work! 🎉',
  data: { type: 'test' },
});
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `app.json` | Expo config with Firebase googleServicesFile |
| `android/app/google-services.json` | Firebase Android client config |
| `app/_layout.tsx` | OneSignalRegistration component (auto-registers tokens) |
| `app/utils/onesignal.ts` | getOneSignalSubscriptionId() - gets Expo push token |
| `convex/notifications.ts` | registerFirebaseFCMToken() mutation + FCM sending |
| `docs/FIREBASE_PUSH_SETUP.md` | Full backend setup guide |

---

## 🔑 Firebase Admin SDK Key

You have: `rahc-push-firebase-adminsdk-fbsvc-2123cef0af.json`

**DO NOT commit this file to git.**

Store it as an environment variable in your deployment:
```bash
# In Convex env variables
FIREBASE_ADMIN_SDK_KEY='{"type":"service_account","project_id":"rahc-push",...}'
```

---

## ✨ How It Works

1. **App starts** → asks for notification permission
2. **User signs in** → OneSignalRegistration runs
3. **Gets Expo token** → `getOneSignalSubscriptionId()`
4. **Registers with backend** → `registerFirebaseFCMToken()`
5. **Token stored** → in Convex pushTokens table
6. **Backend sends push** → via Firebase Cloud Messaging
7. **Device receives** → notification appears in Android notification center

---

## 🐛 Troubleshooting

**No notification received?**
- Verify token exists in Convex DB
- Check device has Google Play Services installed
- Ensure notification permission was granted
- Check Android channel settings (reminders-high)

**Build fails with google-services.json error?**
- Verify file is committed: `git ls-files | Select-String google-services`
- Check .gitignore rules: `git check-ignore -v android/app/google-services.json`
- Re-add if needed: `git add -f android/app/google-services.json`

**Token not registering?**
- Check app logs for permission errors
- Verify Convex mutation is being called
- Check Convex DB shows token rows

---

## 📞 Support

For detailed backend setup: See [docs/FIREBASE_PUSH_SETUP.md](./FIREBASE_PUSH_SETUP.md)
