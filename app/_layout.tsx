import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export default function RootLayout() {
  return (
    <ConvexAuthProvider client={convex}>

      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/signin" />
          <Stack.Screen name="auth/signup" />
          <Stack.Screen name="personal-info" />
          <Stack.Screen name="emergency-contact" />
          <Stack.Screen name="medical-history" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="ai-assess" />
          <Stack.Screen name="tracker" />
          <Stack.Screen name="emergency" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="symptom-assessment" />
        </Stack>
      </SafeAreaProvider>
    </ConvexAuthProvider>
  );
}

