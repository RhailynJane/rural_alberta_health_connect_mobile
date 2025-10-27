/**
 * Push notification registration and handling
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Configure notification handler for foreground notifications
 */
export function configureForegroundNotifications() {
  // Ensure foreground notifications show a banner/alert
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // iOS presentation options (SDK 54+)
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Ensure Android has a high-importance default channel for heads-up banners
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: 'default',
    }).catch(() => {});
  }
}

/**
 * Request notification permissions and get push token
 * Returns null if Firebase is not configured or if permissions denied
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Only run on physical devices (not web)
  if (Platform.OS === "web") {
    console.log("ℹ️ Push notifications not supported on web");
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("⚠️ Push notification permission denied");
      console.log("ℹ️ In-app notifications will still work when app is open");
      return null;
    }

    // Get the push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "15cddcd7-b6e3-4d41-910e-2f0f3fe3dbd6", // EAS project ID from app.json -> extra.eas.projectId
    });
    token = tokenData.data;

    // Configure Android channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return token;
  } catch (error: any) {
    // Check if this is the Firebase error
    if (error?.message?.includes("FirebaseApp is not initialized")) {
      console.log("⚠️ Firebase not configured - Push notifications disabled");
      console.log("ℹ️ To enable push notifications:");
      console.log("   1. Set up Firebase project at https://console.firebase.google.com/");
      console.log("   2. Download google-services.json");
      console.log("   3. Place it at: android/app/google-services.json");
      console.log("   4. Rebuild the app");
      console.log("ℹ️ See setup-fcm.md for detailed instructions");
      console.log("ℹ️ In-app notifications will still work when app is open");
      return null;
    }
    
    console.error("❌ Error registering for push notifications:", error);
    return null;
  }
}

/**
 * Get platform string for push token registration
 */
export function getPlatform(): string {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
) {
  // Listener for notifications received while app is foregrounded
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Notification received in foreground:", notification);
      onNotificationReceived?.(notification);
    }
  );

  // Listener for when user taps on notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log("Notification tapped:", response);
      onNotificationTapped?.(response);
    }
  );

  // Return cleanup function
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Schedule an immediate local test notification to validate banners
 */
export async function sendLocalTestNotification(): Promise<void> {
  // Ensure handler/channel configured
  configureForegroundNotifications();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    }).catch(() => {});
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test notification',
      body: 'If you see this, banners are working ✅',
      sound: 'default',
      priority: 'max',
      data: { type: 'test', timestamp: Date.now() },
    },
    // null trigger shows immediately
    trigger: null,
  });
}
