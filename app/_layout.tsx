import { api } from "@/convex/_generated/api";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { FloatingDevTools } from "@react-buoy/core";
import { ConvexReactClient, useConvexAuth, useMutation } from "convex/react";
import * as Notifications from "expo-notifications";
import { Stack, usePathname } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { database } from '../watermelon/database';
import { initializeNotificationsOnce, requestNotificationPermissions } from "./_utils/notifications";
import { SignUpFormProvider } from "./auth/_context/SignUpFormContext";
import { NotificationBanner } from "./components/NotificationBanner";
import { NotificationProvider } from "./components/NotificationContext";
import { OfflineBanner } from "./components/OfflineBanner";
import { SyncProvider } from "./components/SyncProvider";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { initializeFirebase, registerForFirebaseMessaging } from "./utils/firebase";
import { storeFirebaseToken } from "./utils/firebaseNotifications";
import {
    configureForegroundNotifications,
    setupNotificationListeners,
} from "./utils/pushNotifications";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

const secureStorage = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error("SecureStore getItem Error:", error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error("SecureStore setItem Error:", error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error("SecureStore removeItem Error:", error);
    }
  },
};

// Create context for session refresh functionality
interface SessionRefreshContextType {
  refreshSession: () => void;
  isRefreshing: boolean;
}

const SessionRefreshContext = createContext<SessionRefreshContextType | null>(null);

export const useSessionRefresh = () => {
  const context = useContext(SessionRefreshContext);
  if (!context) {
    throw new Error('useSessionRefresh must be used within SessionRefreshProvider');
  }
  return context;
};

/**
 * Component to handle Firebase FCM token registration when user logs in
 * Must be inside ConvexAuthProvider to access useConvexAuth
 */
function FirebaseTokenRegistration() {
  const { isLoading, isAuthenticated, user } = useConvexAuth();
  const registerFCMToken = useMutation(api.notifications.registerFirebaseFCMToken);
  const [hasRegistered, setHasRegistered] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user || isLoading || hasRegistered) return;

    const registerToken = async () => {
      try {
        const token = await registerForFirebaseMessaging(user._id);
        if (token) {
          await storeFirebaseToken(token);
          // Register with Convex backend
          await registerFCMToken({
            fcmToken: token,
            platform: "android",
            deviceName: "mobile",
          });
          console.log("✅ FCM token registered with backend");
          setHasRegistered(true);
        }
      } catch (error) {
        console.error("❌ Failed to register FCM token:", error);
      }
    };

    registerToken();
  }, [isAuthenticated, user, isLoading, hasRegistered, registerFCMToken]);

  return null; // This component doesn't render anything
}

export default function RootLayout() {
  const [providerKey, setProviderKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const { isOnline } = useNetworkStatus();
  const pathname = usePathname();
  const suppressGlobalOfflineOnPersonalInfo = pathname === "/auth/personal-info";

  const refreshSession = () => {
    console.log('🔄 Refreshing session via provider remount...');
    console.log('🚦 isRefreshing: false → true');
    setIsRefreshing(true);
    setProviderKey(k => k + 1);
    // Reset isRefreshing after remount completes
    setTimeout(() => {
      console.log('🚦 isRefreshing: true → false');
      setIsRefreshing(false);
    }, 500);
  };

  useEffect(() => {
    // Ensure local notifications are initialized (channels, handlers, migration)
    initializeNotificationsOnce().catch(() => {});
    // Proactively request OS notification permission on first launch
    requestNotificationPermissions().catch(() => {});
    // Configure foreground notification behavior
    configureForegroundNotifications();

    // Initialize Firebase for push notifications
    initializeFirebase().catch((error) => {
      console.warn("Firebase initialization skipped or failed:", error);
    });

    // Setup notification listeners
    const cleanup = setupNotificationListeners(
      // On notification received in foreground
      (notification: Notifications.Notification) => {
        const { title, body } = notification.request.content;
        setNotificationBanner({
          title: title || "Notification",
          body: body || "",
        });
      },
      // On notification tapped
      (response: Notifications.NotificationResponse) => {
        console.log("Notification tapped:", response);
        // Handle navigation based on notification data if needed
      }
    );

    return cleanup;
  }, []);

  return (
    <DatabaseProvider database={database}>
      <SessionRefreshContext.Provider value={{ refreshSession, isRefreshing }}>
        <ConvexAuthProvider key={providerKey} client={convex} storage={secureStorage}>
          <FirebaseTokenRegistration />
          <SyncProvider>
            <NotificationProvider>
              <SignUpFormProvider>
                <SafeAreaProvider>
                  {/* In-app notification banner */}
                  {notificationBanner && (
                    <NotificationBanner
                      title={notificationBanner.title}
                      body={notificationBanner.body}
                      onDismiss={() => setNotificationBanner(null)}
                      onPress={() => {
                        setNotificationBanner(null);
                        // Handle navigation based on notification type
                      }}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    {/* Global offline banner at the very top - no SafeAreaView to avoid double padding */}
                    {!isOnline && !suppressGlobalOfflineOnPersonalInfo && <OfflineBanner />}
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="index" />
                      <Stack.Screen name="onboarding" />
                      <Stack.Screen name="auth/signin" />
                      <Stack.Screen name="auth/signup" />
                      <Stack.Screen name="auth/personal-info" />
                      <Stack.Screen name="auth/emergency-contact" />
                      <Stack.Screen name="auth/medical-history" />
                      <Stack.Screen name="(tabs)" />
                    </Stack>
                  </View>
                  {/* React Buoy DevTools - only in development */}
                  {__DEV__ && (
                    <FloatingDevTools
                      environment="local"
                      userRole="admin"
                      disableHints
                    />
                  )}
                </SafeAreaProvider>
              </SignUpFormProvider>
            </NotificationProvider>
          </SyncProvider>
        </ConvexAuthProvider>
      </SessionRefreshContext.Provider>
    </DatabaseProvider>
  );
}