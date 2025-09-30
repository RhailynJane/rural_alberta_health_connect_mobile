import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

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

// Auth Guard Component
// Auth Guard Component
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) {
      return; // Still loading auth state
    }

    console.log("🔐 Auth Guard - Auth state:", { isAuthenticated, segments });

    if (!isAuthenticated) {
      // User not authenticated - redirect to signin if not already there
      if (segments[0] !== "auth" || segments.length < 2 || (segments[1] as string) === "index") {
        console.log("🚫 Not authenticated, redirecting to signin");
        router.replace("/auth/signin");
      }
    } else {
      // User is authenticated
      const inAuthGroup = segments[0] === "auth";
      const currentRoute = segments[1];
      
      // Allow access to onboarding flow even when authenticated
      
      // If user is on signin page but authenticated, redirect appropriately
      if (inAuthGroup && currentRoute === "signin") {
        console.log("✅ Authenticated, redirecting from signin");
        
        // Instead of always going to dashboard, we should check onboarding status
        // For now, let the individual screens handle onboarding status
        // We'll redirect to a safe route - the tabs layout will handle the rest
        router.replace("/(tabs)/dashboard");
      }
      
      // If user is on signup page but authenticated, redirect to dashboard
      if (inAuthGroup && currentRoute === "signup") {
        console.log("✅ Authenticated, redirecting from signup to dashboard");
        router.replace("/(tabs)/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2A7DE1" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

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
          <AuthGuard>
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
          </AuthGuard>
        </SafeAreaProvider>
      </ConvexAuthProvider>
    </SessionRefreshContext.Provider>
  );
}