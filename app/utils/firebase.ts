/**
 * Firebase Cloud Messaging (FCM) Configuration
 * 
 * Provides Firebase initialization, token management, and notification handling
 * Works alongside Expo notifications for comprehensive push notification support
 * 
 * Setup required:
 * 1. Create Firebase project at https://console.firebase.google.com/
 * 2. Enable Cloud Messaging
 * 3. Download google-services.json for Android
 * 4. Download GoogleService-Info.plist for iOS
 */

import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
    getMessaging,
    getToken,
    MessagePayload,
    Messaging,
    onMessage,
} from "firebase/messaging";
import { Platform } from "react-native";

/**
 * Firebase configuration object
 * IMPORTANT: These values should be stored in environment variables or Convex secrets
 * Never commit actual API keys to the repository
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Singleton Firebase App instance
 */
let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase if not already initialized
 * @returns Firebase App instance or null if initialization fails
 */
export function initializeFirebase(): FirebaseApp | null {
  try {
    // Check if already initialized
    const apps = getApps();
    if (apps.length > 0) {
      firebaseApp = apps[0];
      messaging = getMessaging(firebaseApp);
      console.log("✅ Firebase already initialized");
      return firebaseApp;
    }

    // Validate configuration
    if (
      !firebaseConfig.apiKey ||
      !firebaseConfig.projectId ||
      !firebaseConfig.messagingSenderId
    ) {
      console.warn(
        "⚠️ Firebase config incomplete. Set EXPO_PUBLIC_FIREBASE_* environment variables"
      );
      return null;
    }

    // Initialize Firebase
    firebaseApp = initializeApp(firebaseConfig);
    messaging = getMessaging(firebaseApp);

    console.log("✅ Firebase initialized successfully");
    return firebaseApp;
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    return null;
  }
}

/**
 * Get Firebase Messaging instance
 * @returns Messaging instance or null if not initialized
 */
export function getFirebaseMessaging(): Messaging | null {
  if (!messaging) {
    const app = initializeFirebase();
    if (app) {
      messaging = getMessaging(app);
    }
  }
  return messaging;
}

/**
 * Register device for Firebase Cloud Messaging
 * 
 * @param userId - User ID to associate with the FCM token
 * @param onTokenReceived - Callback when token is successfully retrieved
 * @returns FCM token or null if registration fails
 */
export async function registerForFirebaseMessaging(
  userId: string,
  onTokenReceived?: (token: string) => void
): Promise<string | null> {
  try {
    // Web only - React Native requires native setup
    if (Platform.OS === "web") {
      const msg = getFirebaseMessaging();
      if (!msg) {
        console.log("ℹ️ Firebase Messaging not configured");
        return null;
      }

      // Request notification permission on web
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("⚠️ Notification permission denied");
        return null;
      }

      // Get FCM token
      const token = await getToken(msg, {
        vapidKey: process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (token) {
        console.log("✅ FCM token received:", token.substring(0, 20) + "...");
        onTokenReceived?.(token);
        return token;
      }
    } else {
      // For native platforms (iOS/Android)
      // Token retrieval requires native Firebase SDKs
      // This is handled by react-native-firebase package
      console.log(
        "ℹ️ Firebase Messaging on native platforms requires react-native-firebase"
      );
      console.log("   Install: npm install @react-native-firebase/app @react-native-firebase/messaging");
      return null;
    }

    return null;
  } catch (error) {
    console.error("❌ Firebase registration failed:", error);
    return null;
  }
}

/**
 * Setup listener for incoming FCM messages (web only)
 * 
 * For native platforms, use react-native-firebase's onMessage handler
 * 
 * @param onMessageHandler - Callback when message is received
 * @returns Cleanup function to remove listener
 */
export function setupFirebaseMessageListener(
  onMessageHandler?: (payload: MessagePayload) => void
): (() => void) | null {
  try {
    if (Platform.OS !== "web") {
      console.log("ℹ️ setupFirebaseMessageListener only works on web platform");
      return null;
    }

    const msg = getFirebaseMessaging();
    if (!msg) {
      console.warn("⚠️ Firebase Messaging not initialized");
      return null;
    }

    // Listen for messages when app is in foreground
    const unsubscribe = onMessage(msg, (payload: MessagePayload) => {
      console.log("📬 FCM message received in foreground:", {
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: payload.data,
      });

      onMessageHandler?.(payload);

      // Optionally show a local notification
      if (payload.notification) {
        // Can integrate with Expo notifications here
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error("❌ Failed to setup Firebase message listener:", error);
    return null;
  }
}

/**
 * Check Firebase Messaging availability
 */
export function isFirebaseMessagingAvailable(): boolean {
  return getFirebaseMessaging() !== null;
}

/**
 * Get Firebase app instance
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseApp) {
    firebaseApp = initializeFirebase();
  }
  return firebaseApp;
}
