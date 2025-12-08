/**
 * Firebase Cloud Messaging (FCM) Configuration
 * 
 * Provides Firebase initialization for web platform only.
 * On mobile (iOS/Android), use @react-native-firebase instead.
 * 
 * This module gracefully handles the Firebase SDK which is web-focused.
 */

import { Platform } from "react-native";

/**
 * Firebase configuration from environment variables
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Lazy-loaded Firebase instances
let firebaseApp: any = null;
let messaging: any = null;
let firebaseLoaded = false;

/**
 * Dynamically load Firebase modules (web only)
 */
async function loadFirebaseModules() {
  if (firebaseLoaded || Platform.OS !== "web") {
    return null;
  }

  try {
    const firebaseModule = await import("firebase/app");
    const messagingModule = await import("firebase/messaging");
    firebaseLoaded = true;
    return { firebaseModule, messagingModule };
  } catch (error) {
    console.warn("Firebase modules not available for this platform");
    return null;
  }
}

/**
 * Initialize Firebase if not already initialized
 * @returns Firebase App instance or null if initialization fails
 */
export async function initializeFirebase(): Promise<any | null> {
  try {
    if (Platform.OS !== "web") {
      console.log(
        "ℹ️ Firebase web SDK only works on web. Use @react-native-firebase on mobile."
      );
      return null;
    }

    if (firebaseApp) {
      console.log("✅ Firebase already initialized");
      return firebaseApp;
    }

    const modules = await loadFirebaseModules();
    if (!modules) {
      console.warn("⚠️ Firebase modules could not be loaded");
      return null;
    }

    const { firebaseModule } = modules;

    // Validate configuration
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.warn(
        "⚠️ Firebase config incomplete. Set EXPO_PUBLIC_FIREBASE_* environment variables"
      );
      return null;
    }

    // Initialize Firebase
    const apps = firebaseModule.getApps();
    if (apps.length > 0) {
      firebaseApp = apps[0];
    } else {
      firebaseApp = firebaseModule.initializeApp(firebaseConfig);
    }

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
export async function getFirebaseMessaging(): Promise<any | null> {
  try {
    if (Platform.OS !== "web") {
      return null;
    }

    if (messaging) {
      return messaging;
    }

    const app = await initializeFirebase();
    if (!app) {
      return null;
    }

    const modules = await loadFirebaseModules();
    if (modules) {
      const { messagingModule } = modules;
      messaging = messagingModule.getMessaging(app);
    }

    return messaging;
  } catch (error) {
    console.error("❌ Failed to get Firebase Messaging:", error);
    return null;
  }
}

/**
 * Register device for Firebase Cloud Messaging
 * 
 * On web: Uses Firebase Cloud Messaging SDK
 * On mobile: Not supported (use @react-native-firebase instead)
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
    if (Platform.OS === "web") {
      const msg = await getFirebaseMessaging();
      if (!msg) {
        console.log("ℹ️ Firebase Messaging not configured");
        return null;
      }

      // Request notification permission on web
      const permission = (await Notification.requestPermission?.()) ?? "denied";
      if (permission !== "granted") {
        console.log("⚠️ Notification permission denied");
        return null;
      }

      // Dynamically import getToken
      const { getToken } = await import("firebase/messaging");

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
      console.log(
        "ℹ️ Firebase Messaging on native platforms requires @react-native-firebase/messaging"
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
export async function setupFirebaseMessageListener(
  onMessageHandler?: (payload: any) => void
): Promise<(() => void) | null> {
  try {
    if (Platform.OS !== "web") {
      console.log("ℹ️ setupFirebaseMessageListener only works on web platform");
      return null;
    }

    const msg = await getFirebaseMessaging();
    if (!msg) {
      console.warn("⚠️ Firebase Messaging not initialized");
      return null;
    }

    // Dynamically import onMessage
    const { onMessage } = await import("firebase/messaging");

    // Listen for messages when app is in foreground
    const unsubscribe = onMessage(msg, (payload: any) => {
      console.log("📬 FCM message received in foreground:", {
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: payload.data,
      });

      onMessageHandler?.(payload);
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
export async function isFirebaseMessagingAvailable(): Promise<boolean> {
  if (Platform.OS !== "web") {
    return false;
  }

  const msg = await getFirebaseMessaging();
  return msg !== null;
}

/**
 * Get Firebase app instance
 */
export async function getFirebaseApp(): Promise<any | null> {
  if (!firebaseApp) {
    firebaseApp = await initializeFirebase();
  }
  return firebaseApp;
}
