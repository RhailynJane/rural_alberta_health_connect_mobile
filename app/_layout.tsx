import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AuthWrapper from "./components/AuthWrapper";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

const secureStorage = {
  getItem: async (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: any) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

export default function RootLayout() {
  return (
    <ConvexAuthProvider client={convex} storage={secureStorage}>
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
  );
}