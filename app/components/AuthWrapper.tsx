import { useConvexAuth, useQuery } from "convex/react";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { FONTS } from "../constants/constants";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const segments = useSegments();
  
  // Only fetch user data if authenticated
  const user = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");

  useEffect(() => {
    console.log("🚀 AuthWrapper useEffect triggered");
    console.log("📊 Auth state:", { isAuthenticated, isLoading, userLoaded: user !== undefined });
    console.log("📍 Current segments:", segments);
    
    // Wait for auth state to be determined
    if (isLoading) {
      console.log("⏳ Auth still loading, waiting...");
      return;
    }
    
    // If authenticated, wait for user data to load
    if (isAuthenticated && user === undefined) {
      console.log("⏳ User authenticated but user data still loading...");
      return;
    }

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';
    const isOnboarding = segments.length === 1 && segments[0] === 'onboarding';
    
    console.log("🔍 Route analysis:", { inAuthGroup, inTabsGroup, isOnboarding });

    if (isAuthenticated) {
      // Check if user has completed onboarding (default to false for backward compatibility)
      const hasCompletedOnboarding = user?.hasCompletedOnboarding ?? false;
      console.log("✅ User authenticated, onboarding completed:", hasCompletedOnboarding);
      
      if (!hasCompletedOnboarding) {
        // User needs to complete onboarding, but allow access to auth screens (for sign out)
        if (inTabsGroup) {
          console.log("🔄 Redirecting authenticated user without onboarding away from protected routes");
          router.replace('/onboarding');
        }
        // Allow access to onboarding and auth screens
      } else {
        // User has completed onboarding - redirect away from auth screens and onboarding
        if (inAuthGroup || isOnboarding) {
          console.log("🔄 Redirecting completed user to dashboard");
          router.replace('/(tabs)/dashboard');
        }
      }
    } else {
      console.log("❌ User not authenticated");
      // User is not authenticated - redirect away from protected routes
      if (inTabsGroup || isOnboarding) {
        console.log("🔄 Redirecting unauthenticated user to sign-in");
        router.replace('/auth/signin');
      } else {
        console.log("✅ User on public route, allowing access");
      }
    }
  }, [isAuthenticated, isLoading, user, segments, router]);

  // Show loading while auth state or user data is loading
  if (isLoading || (isAuthenticated && user === undefined)) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#2A7DE1" />
          <Text style={[styles.loadingText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
});