import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import { api } from "../convex/_generated/api";

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  
  // Only fetch user data if authenticated
  const user = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("🕐 Splash screen timer fired - checking auth state");
      console.log("📊 Auth state:", { isAuthenticated, isLoading, user });
      
      if (isLoading) {
        console.log("⏳ Auth still loading, staying on splash");
        return;
      }
      
      if (isAuthenticated && user) {
        // User is authenticated and exists - go to dashboard
        console.log("✅ Authenticated user exists, navigating to dashboard");
        router.push('/(tabs)/dashboard');
      } else {
        // No authenticated user - show onboarding flow
        console.log("❌ No authenticated user, showing onboarding");
        router.push('/onboarding');
      }
    }, 5000); // 5000ms = 5 seconds

    // Cleanup timer if component unmounts
    return () => clearTimeout(timer);
  }, [router, isAuthenticated, isLoading, user]);
  
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
