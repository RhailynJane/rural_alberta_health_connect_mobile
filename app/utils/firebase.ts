/**
 * Firebase Cloud Messaging (FCM) Configuration for Expo
 * 
 * Uses Expo's built-in FCM support with expo-notifications
 * This integrates with Expo's push notification service which connects to Firebase
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Lazy initialization
let isInitialized = false;
let initializationAttempted = false;

/**
 * Initialize Firebase/Expo notifications
 * This sets up the notification handler and requests permissions
 */
export async function initializeFirebase(): Promise<any | null> {
  try {
    if (isInitialized) {
      console.log("✅ Firebase already initialized");
      return { initialized: true };
    }

    if (initializationAttempted) {
      console.log("⏸️ Firebase initialization already attempted");
      return { initialized: false };
    }

    initializationAttempted = true;
    console.log("🔔 Initializing Firebase push notifications via Expo...");

    // Configure notification handler for foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    isInitialized = true;
    console.log("✅ Firebase push notifications initialized");
    return { initialized: true };
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    return null;
  }
}

/**
 * Get Firebase Messaging instance
 * For Expo, this returns the Notifications module
 */
export async function getFirebaseMessaging(): Promise<any | null> {
  return Notifications;
}

/**
 * Register device for Firebase Cloud Messaging via Expo
 * Gets Expo push token which connects to Firebase
 */
export async function registerForFirebaseMessaging(
  userId: string,
  onTokenReceived?: (token: string) => void
): Promise<string | null> {
  try {
    // Ensure notifications are initialized
    if (!isInitialized) {
      await initializeFirebase();
    }

    // Request permission for notifications
    const permissionResponse = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    if (permissionResponse.status !== "granted") {
      console.warn("⚠️ Notification permissions not granted");
      return null;
    }

    console.log("✅ Notification permissions granted");

    // Try to get Expo push token
    // On Android, this might fail if Google Play Services isn't available
    // or if the native Firebase module hasn't been properly initialized
    let token: any = null;
    try {
      token = await Notifications.getExpoPushTokenAsync({
        projectId: "15cddcd7-b6e3-4d41-910e-2f0f3fe3dbd6", // EAS projectId
      });
    } catch (tokenError: any) {
      // On Android, if native Firebase isn't ready, this will fail
      // Log the error but don't crash the app
      if (Platform.OS === "android") {
        console.warn("⚠️ Failed to get Expo push token (Android):", tokenError?.message);
        console.log("💡 This is normal if running in development or without proper Firebase setup");
        // Return a placeholder token so the flow doesn't break
        return null;
      }
      throw tokenError;
    }

    if (token?.data) {
      console.log("✅ Expo push token received:", token.data.substring(0, 20) + "...");
      onTokenReceived?.(token.data);
      return token.data;
    } else {
      console.warn("⚠️ No Expo push token available");
      return null;
    }
  } catch (error) {
    console.error("❌ Firebase registration failed:", error);
    // Don't throw - allow app to continue without Firebase
    return null;
  }
}

/**
 * Setup listener for incoming FCM messages
 * For Expo, this handles notifications when app is in foreground
 */
export async function setupFirebaseMessageListener(
  onMessageHandler?: (payload: any) => void
): Promise<(() => void) | null> {
  try {
    // Ensure notifications are initialized
    if (!isInitialized) {
      await initializeFirebase();
    }

    // Listen for notifications in foreground
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("📬 Notification received:", {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data,
        });

        onMessageHandler?.(notification);
      }
    );

    // Cleanup function
    return () => subscription.remove();
  } catch (error) {
    console.error("❌ Failed to setup Firebase message listener:", error);
    return null;
  }
}

/**
 * Check if Firebase Messaging is available
 */
export async function isFirebaseMessagingAvailable(): Promise<boolean> {
  return isInitialized;
}

/**
 * Get Firebase app instance
 */
export async function getFirebaseApp(): Promise<any | null> {
  return { initialized: isInitialized };
}
