import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";

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

              <View style={styles.contentSection}>
              <Text style={[styles.welcomeText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Welcome Back
              </Text>
              <Text style={[styles.subtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Sign in to access your health dashboard
              </Text>

              <View style={styles.formContainer}>
                <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Email
                </Text>
                <TextInput
                  style={[styles.input, { fontFamily: FONTS.BarlowSemiCondensed }]}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Password
                </Text>
                <TextInput
                  style={[styles.input, { fontFamily: FONTS.BarlowSemiCondensed }]}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
                  <Text style={[styles.signInButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>

                <View style={styles.signUpContainer}>
                  <Text style={[styles.signUpText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Don&apos;t have an account?{" "}
                  </Text>
                  <TouchableOpacity onPress={() => router.push("/auth/signup")}>
                    <Text style={[styles.signUpLink, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Create Account
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

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
   headerTextContainer: {
    flex: 1,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
  },
  appSubtitle: {
    fontSize: 14,
    color: "white",
    opacity: 0.9,
    marginTop: 4,
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  formContainer: {
    width: "100%",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 16,
    fontSize: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  signInButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 90,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  signInButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    fontSize: 14,
    color: "#666",
  },
  signUpLink: {
    fontSize: 14,
    color: "#2A7DE1",
    fontWeight: "600",
  },

});