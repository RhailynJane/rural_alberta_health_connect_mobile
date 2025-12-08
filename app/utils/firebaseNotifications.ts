/**
 * Firebase Notification Integration with Convex Backend
 * 
 * Handles:
 * - FCM token registration and persistence
 * - Token refresh and update
 * - Notification permission management
 * - Cross-platform (Expo + Firebase) notification delivery
 */

import * as SecureStore from "expo-secure-store";
import {
    registerForFirebaseMessaging,
    setupFirebaseMessageListener,
} from "./firebase";
// Type-only import for MessagePayload - optional, Firebase may not be installed yet
// import type { MessagePayload } from "firebase/messaging";

const FIREBASE_TOKEN_KEY = "firebase_fcm_token";
const FIREBASE_TOKEN_EXPIRY_KEY = "firebase_fcm_token_expiry";

/**
 * Store Firebase FCM token securely
 */
export async function storeFirebaseToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(FIREBASE_TOKEN_KEY, token);
    // Token expires in 30 days by default, but let's store expiry anyway
    const expiryTime = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await SecureStore.setItemAsync(
      FIREBASE_TOKEN_EXPIRY_KEY,
      expiryTime.toString()
    );
    console.log("✅ Firebase token stored securely");
  } catch (error) {
    console.error("❌ Failed to store Firebase token:", error);
  }
}

/**
 * Retrieve stored Firebase FCM token
 */
export async function getStoredFirebaseToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(FIREBASE_TOKEN_KEY);
    if (!token) return null;

    // Check if token has expired
    const expiryStr = await SecureStore.getItemAsync(FIREBASE_TOKEN_EXPIRY_KEY);
    if (expiryStr && Date.now() > parseInt(expiryStr)) {
      // Token expired, delete it
      await SecureStore.deleteItemAsync(FIREBASE_TOKEN_KEY);
      await SecureStore.deleteItemAsync(FIREBASE_TOKEN_EXPIRY_KEY);
      return null;
    }

    return token;
  } catch (error) {
    console.error("❌ Failed to retrieve Firebase token:", error);
    return null;
  }
}

/**
 * Clear stored Firebase token
 */
export async function clearFirebaseToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(FIREBASE_TOKEN_KEY);
    await SecureStore.deleteItemAsync(FIREBASE_TOKEN_EXPIRY_KEY);
    console.log("✅ Firebase token cleared");
  } catch (error) {
    console.error("❌ Failed to clear Firebase token:", error);
  }
}

/**
 * Register user for Firebase notifications
 * This should be called during app initialization and on login
 */
export async function initializeFirebaseNotifications(
  userId: string,
  registerFCMToken: (args: {
    userId: string;
    fcmToken: string;
    platform: string;
    deviceName?: string;
  }) => Promise<void>
): Promise<void> {
  try {
    // Check for existing valid token
    const storedToken = await getStoredFirebaseToken();
    if (storedToken) {
      console.log("✅ Using stored Firebase token");
      // Still register with backend in case it was lost
      await registerFCMToken({
        userId,
        fcmToken: storedToken,
        platform: "firebase",
      });
      return;
    }

    // Request and register new token
    const token = await registerForFirebaseMessaging(userId, async (newToken) => {
      await storeFirebaseToken(newToken);
      // Register with Convex backend
      await registerFCMToken({
        userId,
        fcmToken: newToken,
        platform: "firebase",
      });
    });

    if (token) {
      await storeFirebaseToken(token);
    }
  } catch (error) {
    console.error("❌ Firebase notifications initialization failed:", error);
  }
}

/**
 * Setup Firebase message handler
 * This receives notifications when app is in foreground
 */
export function setupFirebaseNotificationHandler(
  onNotification?: (notification: {
    title?: string;
    body?: string;
    data?: Record<string, string>;
  }) => void
): (() => void) | null {
  return setupFirebaseMessageListener((payload: any) => {
    const notification = {
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data,
    };

    console.log("📬 Notification received:", notification);

    onNotification?.(notification);
  });
}

/**
 * Types for Firebase token registration
 */
export type FirebaseTokenPayload = {
  userId: string;
  fcmToken: string;
  platform: "firebase" | "expo";
  deviceName?: string;
  timestamp?: number;
};

export type FirebaseNotificationPayload = {
  notification: {
    title?: string;
    body?: string;
  };
  data?: Record<string, string>;
  android?: {
    priority?: "high" | "normal";
    ttl?: number;
  };
  apns?: {
    headers?: Record<string, string>;
  };
};
