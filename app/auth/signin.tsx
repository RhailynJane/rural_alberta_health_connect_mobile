import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet
} from "react-native";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = () => {
    // Handle sign in logic here
    console.log("Sign in attempted with:", email, password);
    // For now, navigate to dashboard
    router.push("/dashboard");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo and Header Container */}
              <CurvedHeader
                title="Alberta Health Connect"
                height={120}
                showLogo={true}
                screenType="signin"
              />
            </ScrollView>
        </KeyboardAvoidingView>
      </CurvedBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  headerWithLogo: {
    alignItems: "flex-start",
    justifyContent: "center",
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
});