# Firebase Admin SDK Setup for Push Notifications

## Files You Have

1. **google-services.json** - Android client configuration (already committed to git)
2. **rahc-push-firebase-adminsdk-fbsvc-2123cef0af.json** - Firebase Admin SDK service account key

## Backend Setup (Convex)

### 1. Save the Admin SDK Key Securely

Add the Firebase Admin SDK JSON as an environment variable in your Convex deployment:

```bash
# Create an EAS secret or store in your backend environment
FIREBASE_ADMIN_SDK_KEY='{"type":"service_account",...}'
```

Or create a `.env.local` file in the `convex/` directory (never commit this):

```
FIREBASE_ADMIN_SDK_KEY={"type":"service_account","project_id":"rahc-push",...}
```

### 2. Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### 3. Update convex/notifications.ts

Add Firebase Admin initialization and send function:

```typescript
import admin from 'firebase-admin';
import { v } from 'convex/values';
import { mutation } from './_generated/server';

// Initialize Firebase Admin SDK
const adminSDKKey = process.env.FIREBASE_ADMIN_SDK_KEY;
if (adminSDKKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(adminSDKKey))
    });
  } catch (e) {
    console.warn('Firebase Admin SDK already initialized or key not available');
  }
}

/**
 * Send push notification via Firebase Cloud Messaging (FCM)
 */
export const sendPushNotificationFCM = mutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    try {
      // Get user's push tokens
      const tokens = await ctx.db
        .query('pushTokens')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .collect();

      if (tokens.length === 0) {
        console.log(`No push tokens found for user ${args.userId}`);
        return { success: false, message: 'No tokens found' };
      }

      // Send via FCM
      const message = {
        notification: {
          title: args.title,
          body: args.body,
        },
        data: args.data || {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'reminders-high', // Match your channel ID
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
      };

      // Send to all tokens
      const results = await Promise.allSettled(
        tokens.map(token => 
          admin.messaging().send({
            ...message,
            token: token.token,
          })
        )
      );

      console.log(`✅ Sent FCM notifications to ${tokens.length} device(s)`);
      return { success: true, tokenCount: tokens.length };
    } catch (error) {
      console.error('❌ Error sending FCM notification:', error);
      return { success: false, error: error.message };
    }
  },
});
```

### 4. Test Sending a Push

From your Convex dashboard or app:

```typescript
// In your app component or mutation caller
const sendTestPush = useMutation(api.notifications.sendPushNotificationFCM);

await sendTestPush({
  userId: 'user_id_here',
  title: 'Test Notification',
  body: 'If you see this, push notifications work! 🎉',
  data: { type: 'test' },
});
```

## App Flow (Already Implemented)

1. User signs in → `OneSignalRegistration` component runs
2. Calls `getOneSignalSubscriptionId()` → gets Expo push token
3. Registers token with Convex backend via `registerFirebaseFCMToken()`
4. Token stored in `pushTokens` table
5. Backend can now send push via FCM to that token

## Important Notes

- **google-services.json** is now tracked in git and committed
- **Firebase Admin SDK key** should be stored as a secure environment variable, never committed
- The app uses Expo notifications + Firebase FCM backend
- Android requires Google Play Services installed
- Use a physical device or emulator with Play Services for testing

## Testing Locally

1. Install the APK from `eas build` output
2. Sign in to the app
3. Check Convex dashboard → Notifications table → verify token is registered
4. Send a test push from backend
5. Verify notification appears on device

## Troubleshooting

- No token registered: Check app logs for permission errors
- Push doesn't arrive: Verify token exists in Convex DB, check FCM response
- Wrong package name: Ensure `com.rahc.app` matches Firebase project config
