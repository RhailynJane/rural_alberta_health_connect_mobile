import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "expo-router";
import { Formik } from 'formik';
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
import * as Yup from 'yup';
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";

// Validation schema
const SignUpSchema = Yup.object().shape({
  firstName: Yup.string()
    .required('First name is required'),
  lastName: Yup.string()
    .required('Last name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
  agreeToTerms: Yup.boolean()
    .oneOf([true], 'You must agree to the terms and conditions')
});

interface SignUpFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export default function SignUp() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSignUp = async (values: SignUpFormValues) => {
    // Handle sign up logic here
    console.log("Sign up attempted with:", values);
    setSubmitError(null);
    try {
      await signIn("password", {
        email: values.email,
        password: values.password,
        flow: "signUp"
      });
      router.push("/auth/personal-info");
    } catch (error) {
      console.error("❌ Sign up failed:", error);
      console.error("📊 Error details:", JSON.stringify(error, null, 2));

      const errorMessage = error instanceof Error
        ? error.message
        : "Signup failed. Please try again.";
      setSubmitError(errorMessage);
    }
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
                Create Your Account
              </Text>
              <Text style={[styles.subtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Join Alberta Health Connect today
              </Text>

              <Formik
                initialValues={{
                  firstName: '',
                  lastName: '',
                  email: '',
                  password: '',
                  confirmPassword: '',
                  agreeToTerms: false
                }}
                validationSchema={SignUpSchema}
                onSubmit={handleSignUp}
              >
                {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => (
                  <View style={styles.formContainer}>
                    <View style={styles.nameRow}>
                      <View style={styles.nameInputContainer}>
                        <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          First Name
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                            errors.firstName && touched.firstName && styles.inputError
                          ]}
                          placeholder="Enter your first name"
                          placeholderTextColor="#999"
                          value={values.firstName}
                          onChangeText={handleChange('firstName')}
                          onBlur={handleBlur('firstName')}
                          autoCapitalize="words"
                        />
                        {errors.firstName && touched.firstName && (
                          <Text style={styles.errorText}>{errors.firstName}</Text>
                        )}
                      </View>

                      <View style={styles.nameInputContainer}>
                        <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          Last Name
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                            errors.lastName && touched.lastName && styles.inputError
                          ]}
                          placeholder="Enter your last name"
                          placeholderTextColor="#999"
                          value={values.lastName}
                          onChangeText={handleChange('lastName')}
                          onBlur={handleBlur('lastName')}
                          autoCapitalize="words"
                        />
                        {errors.lastName && touched.lastName && (
                          <Text style={styles.errorText}>{errors.lastName}</Text>
                        )}
                      </View>
                    </View>

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
                    <TextInput
                      style={[
                        styles.input,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                        errors.password && touched.password && styles.inputError
                      ]}
                      placeholder="Enter your password"
                      placeholderTextColor="#999"
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      secureTextEntry
                    />
                    {errors.password && touched.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}

                    <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Confirm Password
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                        errors.confirmPassword && touched.confirmPassword && styles.inputError
                      ]}
                      placeholder="Confirm your password"
                      placeholderTextColor="#999"
                      value={values.confirmPassword}
                      onChangeText={handleChange('confirmPassword')}
                      onBlur={handleBlur('confirmPassword')}
                      secureTextEntry
                    />
                    {errors.confirmPassword && touched.confirmPassword && (
                      <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                    )}

                    <View style={styles.checkboxContainer}>
                      <TouchableOpacity
                        style={[
                          styles.customCheckbox,
                          values.agreeToTerms && styles.customCheckboxChecked
                        ]}
                        onPress={() => setFieldValue('agreeToTerms', !values.agreeToTerms)}
                        activeOpacity={0.7}
                      >
                        {values.agreeToTerms && <Text style={styles.checkboxCheck}>✓</Text>}
                      </TouchableOpacity>
                      <Text style={[styles.checkboxLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        I agree to the Terms of Service and Privacy Policy. I understand this app provides health information only and does not replace professional medical care
                      </Text>
                    </View>
                    {errors.agreeToTerms && (
                      <Text style={styles.errorText}>{errors.agreeToTerms}</Text>
                    )}

                    <TouchableOpacity
                      style={styles.signUpButton}
                      onPress={() => handleSubmit()}
                    >
                      <Text style={[styles.signUpButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        Sign Up
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.signInContainer}>
                      <Text style={[styles.signInText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        Already have an account?{" "}
                      </Text>
                      <TouchableOpacity onPress={() => router.push("/auth/signin")}>
                        <Text style={[styles.signInLink, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          Sign In
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
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  nameInputContainer: {
    width: "48%",
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
  inputError: {
    borderColor: "#ff3b30", // Red border for errors
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 14,
    marginBottom: 12,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    marginBottom: 8,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  customCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#2A7DE1",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  customCheckboxChecked: {
    backgroundColor: "#2A7DE1",
  },
  checkboxCheck: {
    color: "white",
    fontSize: 16,
    lineHeight: 18,
  },
  signUpButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  signUpButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signInText: {
    fontSize: 14,
    color: "#666",
  },
  signInLink: {
    fontSize: 14,
    color: "#2A7DE1",
    fontWeight: "600",
  },
});