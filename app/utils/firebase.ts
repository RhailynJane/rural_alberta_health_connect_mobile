/**
 * Firebase Cloud Messaging (FCM) Configuration
 * 
 * IMPORTANT: Firebase web SDK does not work with React Native/Expo bundling.
 * 
 * For mobile (iOS/Android): Use @react-native-firebase instead
 * For web: Firebase SDK can be used with proper configuration
 * 
 * This module is disabled for mobile and provides stub functions only.
 */


// Firebase is not bundled into the React Native app
// Use @react-native-firebase for mobile platforms

export async function initializeFirebase(): Promise<any | null> {
  console.log(
    "ℹ️ Firebase initialization disabled for React Native. Use @react-native-firebase for mobile."
  );
  return null;
}

export async function getFirebaseMessaging(): Promise<any | null> {
  console.log(
    "ℹ️ Firebase Messaging not available. Use @react-native-firebase/messaging for mobile."
  );
  return null;
}

export async function registerForFirebaseMessaging(
  userId: string,
  onTokenReceived?: (token: string) => void
): Promise<string | null> {
  console.log(
    "ℹ️ Firebase registration disabled for React Native. Use @react-native-firebase for mobile."
  );
  console.log("   Install: npm install @react-native-firebase/app @react-native-firebase/messaging");
  return null;
}

export async function setupFirebaseMessageListener(
  onMessageHandler?: (payload: any) => void
): Promise<(() => void) | null> {
  console.log(
    "ℹ️ Firebase message listener only works on web. Use @react-native-firebase for mobile."
  );
  return null;
}

export async function isFirebaseMessagingAvailable(): Promise<boolean> {
  return false;
}

export async function getFirebaseApp(): Promise<any | null> {
  return null;
}
