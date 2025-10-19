import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { Formik } from 'formik';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Yup from 'yup';
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";

// Validation schema
const SignInSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [showPassword, setShowPassword] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (values: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      await signIn("password", { email: values.email, password: values.password, flow: "signIn" });
      // AuthWrapper will handle navigation based on auth state and onboarding status
      // not for now
      router.push("/(tabs)/dashboard");
    } catch (error) {
      console.error("Sign in failed:", error);
      
      // Determine the specific error message
      let message = "Sign in failed. Please try again.";
      if (error instanceof Error) {
        if (error.message?.includes("invalid email") || error.message?.includes("user not found")) {
          message = "Invalid email address. Please check and try again.";
        } else if (error.message?.includes("password") || error.message?.includes("credentials")) {
          message = "Incorrect password. Please try again.";
        }
      }
      
      setErrorMessage(message);
      setErrorModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push("/auth/forgot-password");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        {/* Fixed Header */}
        <CurvedHeader
          title="Alberta Health Connect"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >

            <View style={styles.contentSection}>
              <Text style={[styles.welcomeText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Welcome Back
              </Text>
              <Text style={[styles.subtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Sign in to access your health dashboard
              </Text>

              <Formik
                initialValues={{ email: '', password: '' }}
                validationSchema={SignInSchema}
                onSubmit={handleSignIn}
              >
                {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                  <View style={styles.formContainer}>
                    <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Email
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                        errors.email && touched.email && styles.inputError
                      ]}
                      placeholder="Enter your email"
                      placeholderTextColor="#999"
                      value={values.email}
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {errors.email && touched.email && (
                      <Text style={styles.errorText}>{errors.email}</Text>
                    )}

                    <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Password
                    </Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[
                          styles.passwordInput,
                          { fontFamily: FONTS.BarlowSemiCondensed, color: "#1A1A1A" },
                          errors.password && touched.password && styles.inputError
                        ]}
                        placeholder="Enter your password"
                        placeholderTextColor="#999"
                        value={values.password}
                        onChangeText={handleChange('password')}
                        onBlur={handleBlur('password')}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity 
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons 
                          name={showPassword ? "eye-off" : "eye"} 
                          size={24} 
                          color="#999" 
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.password && touched.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}

                    <TouchableOpacity
                      style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
                      onPress={() => handleSubmit()}
                      disabled={isLoading}
                    >
                      <Text style={[styles.signInButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        {isLoading ? "Signing In..." : "Sign In"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.forgotPassword}
                      onPress={handleForgotPassword}
                    >
                      <Text style={[styles.forgotPasswordText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        Forgot Password?
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
                )}
              </Formik>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </CurvedBackground>

      {/* Error Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={errorModalVisible}
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Sign In Error
            </Text>
            <Text style={[styles.modalMessage, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              {errorMessage}
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
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
    fontSize: 15,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  passwordInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 16,
    paddingRight: 50,
    fontSize: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  inputError: {
    borderColor: "#ff3b30",
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 14,
    marginBottom: 12,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  signInButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 90,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  signInButtonDisabled: {
    backgroundColor: "#9ec5f0",
  },
  signInButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  forgotPassword: {
    alignItems: 'center',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#2A7DE1",
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1A1A1A',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#666',
  },
  modalButton: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 40,
    backgroundColor: "#2A7DE1",
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});