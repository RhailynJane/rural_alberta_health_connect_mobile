import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState, createContext, useContext } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AuthWrapper from "./components/AuthWrapper";

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

  const refreshSession = () => {
    console.log('🔄 Refreshing session via provider remount...');
    setProviderKey(k => k + 1);
  };

  return (
    <SessionRefreshContext.Provider value={{ refreshSession }}>
      <ConvexAuthProvider key={providerKey} client={convex} storage={secureStorage}>
        <SafeAreaProvider>
          <AuthWrapper>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="auth/signin" />
              <Stack.Screen name="auth/signup" />
              <Stack.Screen name="auth/personal-info" />
              <Stack.Screen name="auth/emergency-contact" />
              <Stack.Screen name="auth/medical-history" />
            </Stack>
          </AuthWrapper>
        </SafeAreaProvider>
      </ConvexAuthProvider>
    </SessionRefreshContext.Provider>
  );
}