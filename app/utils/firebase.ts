/**
 * Firebase Cloud Messaging (FCM) Configuration
 * 
 * Uses @react-native-firebase for Android/iOS push notifications
 * Integrates with expo-notifications for unified notification handling
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Lazy-load React Native Firebase to avoid bundling issues
let firebaseApp: any = null;
let firebaseMessaging: any = null;
let isInitialized = false;

/**
 * Dynamically import React Native Firebase modules
 */
async function loadFirebaseModules() {
  if (isInitialized) return { app: firebaseApp, messaging: firebaseMessaging };

  try {
    if (Platform.OS !== "web") {
      const firebase = await import("@react-native-firebase/app").then((m) => m.default);
      const messaging = await import("@react-native-firebase/messaging").then((m) => m.default);

      firebaseApp = firebase;
      firebaseMessaging = messaging;
      isInitialized = true;

      return { app: firebase, messaging };
    }
  } catch (error) {
    console.warn("❌ React Native Firebase modules not available:", error);
  }

  return { app: null, messaging: null };
}

/**
 * Initialize Firebase for push notifications
 */
export async function initializeFirebase(): Promise<any | null> {
  try {
    const { app } = await loadFirebaseModules();

    if (!app) {
      console.log("ℹ️ React Native Firebase not available on this platform");
      return null;
    }

    console.log("✅ Firebase initialized for push notifications");
    return app;
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    return null;
  }
}

/**
 * Get Firebase Messaging instance
 */
export async function getFirebaseMessaging(): Promise<any | null> {
  const { messaging } = await loadFirebaseModules();
  return messaging;
}

/**
 * Register device for Firebase Cloud Messaging
 * Gets FCM token and stores it for later use
 */
export async function registerForFirebaseMessaging(
  userId: string,
  onTokenReceived?: (token: string) => void
): Promise<string | null> {
  try {
    const { messaging } = await loadFirebaseModules();

    if (!messaging) {
      console.log("ℹ️ Firebase Messaging not available");
      return null;
    }

    // Get FCM token
    const token = await messaging.getToken();

    if (token) {
      console.log("✅ FCM token received:", token.substring(0, 20) + "...");
      onTokenReceived?.(token);
      return token;
    } else {
      console.warn("⚠️ No FCM token available");
      return null;
    }
  } catch (error) {
    console.error("❌ Firebase registration failed:", error);
    return null;
  }
}

/**
 * Setup listener for incoming FCM messages
 * Handles both foreground and background messages
 */
export async function setupFirebaseMessageListener(
  onMessageHandler?: (payload: any) => void
): Promise<(() => void) | null> {
  try {
    const { messaging } = await loadFirebaseModules();

    if (!messaging) {
      console.log("ℹ️ Firebase Messaging not available");
      return null;
    }

    // Handle messages in foreground
    const unsubscribeForeground = messaging.onMessage(async (remoteMessage: any) => {
      console.log("📬 FCM message received in foreground:", {
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        data: remoteMessage.data,
      });

      // Display notification using expo-notifications
      if (remoteMessage.notification) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification.title || "Notification",
            body: remoteMessage.notification.body || "",
            data: remoteMessage.data || {},
          },
          trigger: null, // immediate
        });
      }

      onMessageHandler?.(remoteMessage);
    });

    // Handle background/quit state messages
    const unsubscribeBackground = messaging.onNotificationOpenedApp((remoteMessage: any) => {
      console.log("📬 FCM message opened app:", remoteMessage);
      onMessageHandler?.(remoteMessage);
    });

    return () => {
      unsubscribeForeground();
      unsubscribeBackground();
    };
  } catch (error) {
    console.error("❌ Failed to setup Firebase message listener:", error);
    return null;
  }
}

/**
 * Check if Firebase Messaging is available
 */
export async function isFirebaseMessagingAvailable(): Promise<boolean> {
  const { messaging } = await loadFirebaseModules();
  return messaging !== null;
}

/**
 * Get Firebase app instance
 */
export async function getFirebaseApp(): Promise<any | null> {
  const { app } = await loadFirebaseModules();
  return app;
}
