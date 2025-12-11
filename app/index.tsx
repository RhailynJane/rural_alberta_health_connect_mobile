import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { api } from "../convex/_generated/api";
import { useSessionRefresh } from "./_layout";
import { useNetworkStatus } from "./hooks/useNetworkStatus";

export default function Index() {
  console.log("index.tsx MOUNTED");

  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { isRefreshing } = useSessionRefresh();
  const { isOnline, isChecking: isCheckingNetwork } = useNetworkStatus();
  const hasNavigated = useRef(false);
  const [offlineTimeout, setOfflineTimeout] = useState(false);
  const [hasOfflineToken, setHasOfflineToken] = useState(false);

  // Fetch user data if authenticated (allow offline access via cache)
  const user = useQuery(
    api.users.getCurrentUser, 
    isAuthenticated ? {} : "skip"
  );

  // Check for cached auth token on mount
  useEffect(() => {
    const checkOfflineAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("convex_token");
        if (token) {
          console.log("🔐 Found cached auth token - allowing offline access");
          setHasOfflineToken(true);
        }
      } catch (error) {
        console.error("Failed to check offline auth:", error);
      }
    };
    checkOfflineAuth();
  }, []);

  // Set timeout for offline mode
  useEffect(() => {
    if (!isOnline && !isCheckingNetwork) {
      const timer = setTimeout(() => {
        setOfflineTimeout(true);
      }, 2000); // Wait 2 seconds before assuming offline
      return () => clearTimeout(timer);
    } else {
      setOfflineTimeout(false);
    }
  }, [isOnline, isCheckingNetwork]);

  useEffect(() => {
    // Don't route during session refresh - the app is already on the correct route
    if (isRefreshing) {
      console.log("⏸️  Skipping index.tsx routing during session refresh");
      return;
    }

    // Only route ONCE on initial app launch - never route again after that
    if (hasNavigated.current) {
      console.log("⏸️  index.tsx has already routed once, skipping");
      return;
    }

    // Wait for network check to complete
    if (isCheckingNetwork) {
      console.log("⏸️  Checking network status...");
      return;
    }

    // Wait for auth to finish loading (but only if online)
    if (isOnline && isLoading) {
      console.log("⏸️  Loading auth state...");
      return;
    }

    // If offline for too long, navigate to dashboard (offline mode)
    if (offlineTimeout || (!isOnline && hasOfflineToken)) {
      console.log("📴 Offline mode: navigating to dashboard");
      hasNavigated.current = true;
      router.replace('/(tabs)/dashboard');
      return;
    }

    // If authenticated and online, wait for user data to load before routing
    if (isAuthenticated && isOnline && user === undefined) {
      console.log("⏸️  Waiting for user data to load...");
      return;
    }

    // Mark that we've navigated
    hasNavigated.current = true;

    if (isAuthenticated && user) {
      // Authenticated - go to dashboard regardless of onboarding status
      console.log("🔄 Initial route: navigating to dashboard");
      router.replace('/(tabs)/dashboard');
    } else if (isAuthenticated && !isOnline) {
      // Authenticated but offline - go to dashboard
      console.log("🔄 Offline mode: navigating to dashboard");
      router.replace('/(tabs)/dashboard');
    } else {
      // Not authenticated - show onboarding flow
      console.log("🔄 Initial route: navigating to onboarding");
      router.replace('/onboarding');
    }
  }, [router, isAuthenticated, isLoading, user, isRefreshing, isOnline, isCheckingNetwork, offlineTimeout, hasOfflineToken]);
  
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      {!isOnline && !isCheckingNetwork && (
        <Text style={styles.offlineText}>📴 Offline Mode</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  logo: {
    width: 300,
    height: 300,
    maxWidth: "80%",
  },
  offlineText: {
    marginTop: 20,
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
});
