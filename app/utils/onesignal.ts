/**
 * Push Notifications using Expo Push Tokens
 * 
 * This uses Expo's built-in push notification system
 * Much simpler and more reliable than OneSignal for Expo apps
 */

import * as Notifications from 'expo-notifications';

// EAS Project ID from app.json
const EAS_PROJECT_ID = '15cddcd7-b6e3-4d41-910e-2f0f3fe3dbd6';

let isInitialized = false;

/**
 * Initialize push notifications (no-op, keeping for compatibility)
 */
export async function initializeOneSignal(): Promise<void> {
  try {
    if (isInitialized) {
      console.log("✅ Push notifications already initialized");
      return;
    }

    console.log("🔔 Initializing Expo push notifications...");
    
    // Request permission
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      console.log("✅ Notification permission granted");
    } else {
      console.warn("⚠️ Notification permission denied");
    }

    isInitialized = true;
  } catch (error) {
    console.warn("⚠️ Push notification init error:", error);
    isInitialized = true; // Mark as attempted
  }
}

/**
 * Get the Expo push token (replaces OneSignal subscription ID)
 */
export async function getOneSignalSubscriptionId(): Promise<string | null> {
  try {
    if (!isInitialized) {
      await initializeOneSignal();
    }

    // Get Expo push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });
    
    if (token?.data) {
      console.log("✅ Expo push token:", token.data.substring(0, 30) + "...");
      return token.data;
    }
    
    console.warn("⚠️ Expo push token not available");
    return null;
  } catch (error) {
    console.warn("⚠️ Push token error:", error);
    return null;
  }
}

/**
 * Set user properties (no-op for Expo, keeping for compatibility)
 */
export async function setOneSignalUserProperties(
  userId: string,
  properties?: Record<string, any>
): Promise<void> {
  try {
    console.log("ℹ️ User properties stored locally (userId:", userId, ")");
    // With Expo push notifications, user management happens on your backend
    // Store userId for later use when sending notifications
  } catch (error) {
    console.warn("⚠️ User property setup:", error);
  }
}

/**
 * Setup notification listeners (Expo native)
 */
export function setupOneSignalNotificationListener(
  onNotificationReceived?: (notification: any) => void,
  onNotificationOpened?: (result: any) => void
): (() => void) | null {
  try {
    // Listener for notifications received while app is in foreground
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log("📬 Notification received:", notification);
      onNotificationReceived?.(notification);
    });

    // Listener for when user taps on notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("👆 Notification tapped:", response);
      onNotificationOpened?.(response);
    });

    // Return cleanup function
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  } catch (error) {
    console.warn("⚠️ Notification listeners error:", error);
    return null;
  }
}

/**
 * Send test notification locally
 */
export async function sendTestNotification(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null, // Show immediately
    });
    console.log("📤 Test notification sent");
  } catch (error) {
    console.warn("⚠️ Test notification error:", error);
  }
}


