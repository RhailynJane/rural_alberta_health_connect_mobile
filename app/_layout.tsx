import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { ConvexReactClient } from "convex/react";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { database } from '../watermelon/database';
import { SignUpFormProvider } from "./auth/_context/SignUpFormContext";
import { NotificationBanner } from "./components/NotificationBanner";
import {
    configureForegroundNotifications,
    getPlatform,
    registerForPushNotificationsAsync,
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

export default function RootLayout() {
  const [providerKey, setProviderKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const convexClientRef = useRef<ConvexReactClient | null>(null);

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
    // Configure foreground notification behavior
    configureForegroundNotifications();

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

  useEffect(() => {
    // Register for push notifications after convex client is ready
    const registerPush = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token && convexClientRef.current) {
          // Register token with backend
          const platform = getPlatform();
          // @ts-ignore - mutation call through client
          await convexClientRef.current.mutation(api.notifications.registerPushToken, {
            token,
            platform,
          });
          console.log("Push token registered:", token);
        }
      } catch (error) {
        console.error("Failed to register push token:", error);
      }
    };

    // Small delay to ensure convex client is initialized
    const timer = setTimeout(registerPush, 2000);
    return () => clearTimeout(timer);
  }, [providerKey]); // Re-register when provider remounts

  return (
    <DatabaseProvider database={database}>
      <SessionRefreshContext.Provider value={{ refreshSession, isRefreshing }}>
        <ConvexAuthProvider key={providerKey} client={convex} storage={secureStorage}>
          {/* Store convex client reference */}
          {(() => {
            convexClientRef.current = convex;
            return null;
          })()}
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
            </SafeAreaProvider>
          </SignUpFormProvider>
        </ConvexAuthProvider>
      </SessionRefreshContext.Provider>
    </DatabaseProvider>
  );
}