import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Image, StyleSheet, View } from "react-native";
import { api } from "../convex/_generated/api";
import { useSessionRefresh } from "./_layout";

export default function Index() {
  console.log("📍 index.tsx MOUNTED");

  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { isRefreshing } = useSessionRefresh();
  const hasNavigated = useRef(false);

  // Only fetch user data if authenticated
  const user = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");

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

    const timer = setTimeout(() => {
      if (isLoading) {
        return;
      }

      // Mark that we've navigated
      hasNavigated.current = true;

      if (isAuthenticated && user) {
        // User is authenticated and exists - go to dashboard
        console.log("🔄 Initial route: navigating to dashboard");
        router.replace('/(tabs)/dashboard');
      } else {
        // No authenticated user - show onboarding flow
        console.log("🔄 Initial route: navigating to onboarding");
        router.replace('/onboarding');
      }
    }, 5000); // 5000ms = 5 seconds

    // Cleanup timer if component unmounts
    return () => clearTimeout(timer);
  }, [router, isAuthenticated, isLoading, user, isRefreshing]);
  
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
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
});
