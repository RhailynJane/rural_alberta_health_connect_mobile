import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Formik } from "formik";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Yup from "yup";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";
import { useSignUpForm } from "./SignUpFormContext";

// Validation schema
const SignUpSchema = Yup.object().shape({
  firstName: Yup.string().required("First name is required"),
  lastName: Yup.string().required("Last name is required"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm password is required"),
  agreeToTerms: Yup.boolean().oneOf(
    [true],
    "You must agree to the terms and conditions"
  ),
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [pendingAgreement, setPendingAgreement] = useState(false);
  const [pendingSetFieldValue, setPendingSetFieldValue] = useState<
    ((field: string, value: any) => void) | null
  >(null);
  const { values: persistedValues, setValues: setPersistedValues } =
    useSignUpForm();

  const handleSignUp = async (values: SignUpFormValues) => {
    console.log("Sign up attempted with:", values);
    setSubmitError(null);
    try {
      await signIn("password", {
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        hasCompletedOnboarding: false,
        flow: "signUp",
      });
      router.push("/auth/personal-info");
    } catch (error) {
      console.error("❌ Sign up failed:", error);
      console.error("📊 Error details:", JSON.stringify(error, null, 2));

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Signup failed. Please try again.";
      setSubmitError(errorMessage);
    }
  };

  const handleCheckboxPress = (setFieldValue: any, currentValue: boolean) => {
    // Store the setFieldValue function for later use
    setPendingSetFieldValue(() => setFieldValue);
    setPendingAgreement(!currentValue);
    setShowAgreementModal(true);
  };

  const confirmAgreement = () => {
    if (pendingSetFieldValue) {
      pendingSetFieldValue("agreeToTerms", pendingAgreement);
    }
    setShowAgreementModal(false);
    setPendingSetFieldValue(null);
  };

  const cancelAgreement = () => {
    setPendingAgreement(false);
    setShowAgreementModal(false);
    setPendingSetFieldValue(null);
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
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentSection}>
              {submitError && (
                <Text
                  style={[
                    {
                      color: "#ff3b30",
                      textAlign: "center",
                      marginBottom: 8,
                      fontFamily: FONTS.BarlowSemiCondensed,
                    },
                  ]}
                >
                  {submitError}
                </Text>
              )}
              <Text
                style={[
                  styles.welcomeText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Create Your Account
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Join Alberta Health Connect today
              </Text>

              <Formik
                initialValues={persistedValues}
                validationSchema={SignUpSchema}
                onSubmit={handleSignUp}
                enableReinitialize={true}
              >
                {({
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  setFieldValue,
                  values,
                  errors,
                  touched,
                }) => {
                  // Persist values on every change
                  const persistField = (field: string, value: any) => {
                    setFieldValue(field, value);
                    setPersistedValues({ ...values, [field]: value });
                  };

                  return (
                    <View style={styles.formContainer}>
                      <View style={styles.nameRow}>
                        <View style={styles.nameInputContainer}>
                          <Text
                            style={[
                              styles.label,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                            ]}
                          >
                            First Name
                          </Text>
                          <TextInput
                            style={[
                              styles.input,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                              errors.firstName &&
                                touched.firstName &&
                                styles.inputError,
                            ]}
                            placeholder="Enter your first name"
                            placeholderTextColor="#999"
                            value={values.firstName}
                            onChangeText={(text) =>
                              persistField("firstName", text)
                            }
                            onBlur={handleBlur("firstName")}
                            autoCapitalize="words"
                          />
                          {errors.firstName && touched.firstName && (
                            <Text style={styles.errorText}>
                              {errors.firstName}
                            </Text>
                          )}
                        </View>

                        <View style={styles.nameInputContainer}>
                          <Text
                            style={[
                              styles.label,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                            ]}
                          >
                            Last Name
                          </Text>
                          <TextInput
                            style={[
                              styles.input,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                              errors.lastName &&
                                touched.lastName &&
                                styles.inputError,
                            ]}
                            placeholder="Enter your last name"
                            placeholderTextColor="#999"
                            value={values.lastName}
                            onChangeText={(text) =>
                              persistField("lastName", text)
                            }
                            onBlur={handleBlur("lastName")}
                            autoCapitalize="words"
                          />
                          {errors.lastName && touched.lastName && (
                            <Text style={styles.errorText}>
                              {errors.lastName}
                            </Text>
                          )}
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.label,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        Email
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                          errors.email && touched.email && styles.inputError,
                        ]}
                        placeholder="Enter your email"
                        placeholderTextColor="#999"
                        value={values.email}
                        onChangeText={(text) => persistField("email", text)}
                        onBlur={handleBlur("email")}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      {errors.email && touched.email && (
                        <Text style={styles.errorText}>{errors.email}</Text>
                      )}

                      <Text
                        style={[
                          styles.label,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        Password
                      </Text>
                      <View style={styles.passwordContainer}>
                        <TextInput
                          style={[
                            styles.passwordInput,
                            {
                              fontFamily: FONTS.BarlowSemiCondensed,
                              color: "#1A1A1A",
                            },
                            errors.password &&
                              touched.password &&
                              styles.inputError,
                          ]}
                          placeholder="Enter your password"
                          placeholderTextColor="#999"
                          value={values.password}
                          onChangeText={(text) =>
                            persistField("password", text)
                          }
                          onBlur={handleBlur("password")}
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

                      <Text
                        style={[
                          styles.label,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        Confirm Password
                      </Text>
                      <View style={styles.passwordContainer}>
                        <TextInput
                          style={[
                            styles.passwordInput,
                            {
                              fontFamily: FONTS.BarlowSemiCondensed,
                              color: "#1A1A1A",
                            },
                            errors.confirmPassword &&
                              touched.confirmPassword &&
                              styles.inputError,
                          ]}
                          placeholder="Confirm your password"
                          placeholderTextColor="#999"
                          value={values.confirmPassword}
                          onChangeText={(text) =>
                            persistField("confirmPassword", text)
                          }
                          onBlur={handleBlur("confirmPassword")}
                          secureTextEntry={!showConfirmPassword}
                        />
                        <TouchableOpacity
                          style={styles.eyeIcon}
                          onPress={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          <Ionicons
                            name={showConfirmPassword ? "eye-off" : "eye"}
                            size={24}
                            color="#999"
                          />
                        </TouchableOpacity>
                      </View>
                      {errors.confirmPassword && touched.confirmPassword && (
                        <Text style={styles.errorText}>
                          {errors.confirmPassword}
                        </Text>
                      )}

                      <View style={styles.checkboxContainer}>
                        <TouchableOpacity
                          style={[
                            styles.customCheckbox,
                            values.agreeToTerms && styles.customCheckboxChecked,
                          ]}
                          onPress={() =>
                            handleCheckboxPress((field: string, value: any) => {
                              setFieldValue(field, value);
                              setPersistedValues({ ...values, [field]: value });
                            }, values.agreeToTerms)
                          }
                          activeOpacity={0.7}
                        >
                          {values.agreeToTerms && (
                            <Text style={styles.checkboxCheck}>✓</Text>
                          )}
                        </TouchableOpacity>
                        <Text
                          style={[
                            styles.checkboxLabel,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          I agree to the{" "}
                          <Text
                            style={styles.linkText}
                            onPress={() =>
                              router.push("/auth/terms-of-service")
                            }
                          >
                            Terms of Service
                          </Text>{" "}
                          and{" "}
                          <Text
                            style={styles.linkText}
                            onPress={() => router.push("/auth/privacy-policy")}
                          >
                            Privacy Policy
                          </Text>
                          . I understand this app provides health information
                          only and does not replace professional medical care.
                        </Text>
                      </View>
                      {errors.agreeToTerms && (
                        <Text style={styles.errorText}>
                          {errors.agreeToTerms}
                        </Text>
                      )}

                      <TouchableOpacity
                        style={styles.signUpButton}
                        onPress={() => handleSubmit()}
                      >
                        <Text
                          style={[
                            styles.signUpButtonText,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          Sign Up
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.signInContainer}>
                        <Text
                          style={[
                            styles.signInText,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          Already have an account?{" "}
                        </Text>
                        <TouchableOpacity
                          onPress={() => router.push("/auth/signin")}
                        >
                          <Text
                            style={[
                              styles.signInLink,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                            ]}
                          >
                            Sign In
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              </Formik>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </CurvedBackground>
      {/* Agreement Confirmation Modal */}
      <Modal
        visible={showAgreementModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="document-text" size={32} color="#2A7DE1" />
              <Text
                style={[
                  styles.modalTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Agreement Required
              </Text>
            </View>

            <Text
              style={[
                styles.modalMessage,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              Do you agree to our Terms of Service and Privacy Policy?
            </Text>

            <Text
              style={[
                styles.modalSubtext,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              By agreeing, you acknowledge that you have read and understood
              both documents.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelAgreement}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmAgreement}
              >
                <Text
                  style={[
                    styles.confirmButtonText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  I Agree
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.readDocumentsButton}
              onPress={() => {
                setShowAgreementModal(false);
                setPendingSetFieldValue(null);
              }}
            >
              <Text
                style={[
                  styles.readDocumentsText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                I need to read the documents first
              </Text>
            </TouchableOpacity>
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
  contentSection: {
    padding: 24,
    paddingTop: 5,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 4,
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
    borderColor: "#ff3b30",
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
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 15,
    paddingRight: 50,
  },
  eyeIcon: {
    padding: 10,
  },
  linkText: {
    color: "#2A7DE1",
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },
  modalSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  cancelButtonText: {
    color: "#495057",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#2A7DE1",
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 8,
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  readDocumentsButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  readDocumentsText: {
    color: "#2A7DE1",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
