import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
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
  );
}

