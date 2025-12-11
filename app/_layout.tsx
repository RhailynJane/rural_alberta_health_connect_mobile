import { api } from "@/convex/_generated/api";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { FloatingDevTools } from "@react-buoy/core";
import { ConvexReactClient, useConvexAuth, useMutation, useQuery } from "convex/react";
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
import {
    getOneSignalSubscriptionId,
    initializeOneSignal,
    setOneSignalUserProperties
} from "./utils/onesignal";
import {
    configureForegroundNotifications,
    setupNotificationListeners,
} from "./utils/pushNotifications";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

// Suppress the GO_BACK warning since we're using replace() which clears history
LogBox.ignoreLogs(["The action 'GO_BACK' was not handled by any navigator"]);

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
/**
 * Component to handle OneSignal registration and user sync
 * Must be inside ConvexAuthProvider to access useConvexAuth
 */
function OneSignalRegistration() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");
  const registerPushToken = useMutation(api.notifications.registerFirebaseFCMToken);
  const [hasRegistered, setHasRegistered] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user || isLoading || hasRegistered) return;

    const registerWithOneSignal = async () => {
      try {
        // Initialize OneSignal (safe to call multiple times)
        await initializeOneSignal();
        
        // Set user properties in OneSignal
        await setOneSignalUserProperties(user._id, {
          email: user.email || '',
          name: user.name || '',
        });

        // Get OneSignal subscription ID
        const subscriptionId = await getOneSignalSubscriptionId();
        
        if (subscriptionId) {
          try {
            // Register with Convex backend
            await registerPushToken({
              fcmToken: subscriptionId, // Use OneSignal subscription ID
              platform: "oneSignal",
              deviceName: "mobile",
            });
            console.log("✅ OneSignal subscription registered with backend");
            setHasRegistered(true);
          } catch (backendError) {
            console.warn("⚠️ Failed to register push token with backend:", backendError);
            setHasRegistered(true);
          }
        } else {
          console.log("ℹ️ OneSignal subscription ID not available");
          setHasRegistered(true);
        }
      } catch (error) {
        console.warn("⚠️ OneSignal registration error:", error);
        setHasRegistered(true);
      }
    };

    registerWithOneSignal();
  }, [isAuthenticated, user, isLoading, hasRegistered, registerPushToken]);

  return null;
}

/**
 * Component to handle conditional routing based on authentication state
 * Must be inside ConvexAuthProvider to access useConvexAuth
 */
function RootLayoutContent({
  notificationBanner,
  setNotificationBanner,
  isRefreshing,
}: {
  notificationBanner: { title: string; body: string } | null;
  setNotificationBanner: (banner: { title: string; body: string } | null) => void;
  isRefreshing: boolean;
}) {
  const { isOnline } = useNetworkStatus();
  const pathname = usePathname();
  const suppressGlobalOfflineOnPersonalInfo = pathname === "/auth/personal-info";
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
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
        
        {/* Conditional rendering: Show auth stack if not authenticated, otherwise show app stack */}
        {!isAuthenticated && !isLoading ? (
          <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
            <Stack.Screen name="index" options={{ gestureEnabled: false }} />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
            <Stack.Screen name="auth/signin" options={{ gestureEnabled: false }} />
            <Stack.Screen name="auth/signup" options={{ gestureEnabled: false }} />
            <Stack.Screen name="auth/personal-info" options={{ gestureEnabled: false }} />
            <Stack.Screen name="auth/emergency-contact" options={{ gestureEnabled: false }} />
            <Stack.Screen name="auth/medical-history" options={{ gestureEnabled: false }} />
          </Stack>
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        )}
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
  );
}

export default function RootLayout() {
  const [providerKey, setProviderKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState<{
    title: string;
    body: string;
  } | null>(null);

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

    // Initialize OneSignal for push notifications
    initializeOneSignal().catch((error) => {
      console.warn("OneSignal initialization warning:", error);
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
          <OneSignalRegistration />
          <SyncProvider>
            <NotificationProvider>
              <SignUpFormProvider>
                <RootLayoutContent
                  notificationBanner={notificationBanner}
                  setNotificationBanner={setNotificationBanner}
                  isRefreshing={isRefreshing}
                />
              </SignUpFormProvider>
            </NotificationProvider>
          </SyncProvider>
        </ConvexAuthProvider>
      </SessionRefreshContext.Provider>
    </DatabaseProvider>
  );
}
