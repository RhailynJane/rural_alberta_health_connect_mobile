import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { database } from '../watermelon/database';
import { SignUpFormProvider } from "./auth/_context/SignUpFormContext";

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

  return (
    <DatabaseProvider database={database}>
      <SessionRefreshContext.Provider value={{ refreshSession, isRefreshing }}>
        <ConvexAuthProvider key={providerKey} client={convex} storage={secureStorage}>
          <SignUpFormProvider>
            <SafeAreaProvider>
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