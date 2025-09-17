import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Formik } from 'formik';
import React from 'react';
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
import { api } from "../../convex/_generated/api";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";

const ProfileSchema = Yup.object().shape({
  ageRange: Yup.string(),
  location: Yup.string(),
  emergencyContactName: Yup.string(),
  emergencyContactPhone: Yup.string(),
  medicalConditions: Yup.string(),
  currentMedications: Yup.string(),
  allergies: Yup.string(),
});

interface ProfileFormValues {
  ageRange: string;
  location: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalConditions: string;
  currentMedications: string;
  allergies: string;
}

export default function ProfileComplete() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(
    api.dashboard.user.getUserWithProfile,
    isAuthenticated ? {} : "skip"
  );
  const updateProfile = useMutation(api.userProfile.updateUserProfile);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  // Handle redirect when not authenticated
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  // Determine if we're ready to show the form
  const isAuthReady = isAuthenticated && !isLoading && user;

  const handleSaveProfile = async (values: ProfileFormValues) => {
    console.log("💾 Saving profile data...");
    console.log("📋 Profile values:", values);

    setSubmitError(null);

    try {
      await updateProfile({
        ageRange: values.ageRange || undefined,
        location: values.location || undefined,
        emergencyContactName: values.emergencyContactName || undefined,
        emergencyContactPhone: values.emergencyContactPhone || undefined,
        medicalConditions: values.medicalConditions || undefined,
        currentMedications: values.currentMedications || undefined,
        allergies: values.allergies || undefined,
      });
      console.log("✅ Profile saved successfully! Redirecting to dashboard...");
      setIsRedirecting(true);
      router.push("/(tabs)/dashboard");
    } catch (error) {
      console.error("❌ Profile save failed:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to save profile. Please try again.";
      setSubmitError(errorMessage);
    }
  };

  const handleSkip = () => {
    console.log("⏭️ User skipped profile completion");
    setIsRedirecting(true);
    router.push("/(tabs)/dashboard");
  };

  // Show loading state while auth is establishing or redirect is happening
  if (!isAuthReady) {
    const loadingText = !isAuthenticated ? "Redirecting..." : "Setting up account...";
    const loadingSubtext = !isAuthenticated ? "" : "Please wait while we prepare your profile";

    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <View style={styles.container}>
            <CurvedHeader
              title="Alberta Health Connect"
              height={120}
              showLogo={true}
              screenType="signin"
            />
            <View style={styles.contentSection}>
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {loadingText}
                </Text>
                {loadingSubtext && (
                  <Text style={[styles.loadingSubtext, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    {loadingSubtext}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </CurvedBackground>
      </SafeAreaView>
    );
  }

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
            <CurvedHeader
              title="Alberta Health Connect"
              height={120}
              showLogo={true}
              screenType="signin"
            />

            <View style={styles.contentSection}>
              <Text style={[styles.welcomeText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Complete Your Profile
              </Text>
              <Text style={[styles.subtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Help us personalize your healthcare experience
              </Text>

              <Formik
                initialValues={{
                  ageRange: '',
                  location: '',
                  emergencyContactName: '',
                  emergencyContactPhone: '',
                  medicalConditions: '',
                  currentMedications: '',
                  allergies: '',
                }}
                validationSchema={ProfileSchema}
                onSubmit={handleSaveProfile}
              >
                {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
                  <View style={styles.formContainer}>
                    <Text style={[styles.sectionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Health Information (Optional)
                    </Text>

                    <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Age Range
                    </Text>
                    <TextInput
                      style={[styles.input, { fontFamily: FONTS.BarlowSemiCondensed }]}
                      placeholder="e.g., 25-34, 65+"
                      placeholderTextColor="#999"
                      value={values.ageRange}
                      onChangeText={handleChange('ageRange')}
                      onBlur={handleBlur('ageRange')}
                    />

                    <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Location
                    </Text>
                    <TextInput
                      style={[styles.input, { fontFamily: FONTS.BarlowSemiCondensed }]}
                      placeholder="Your rural Alberta community"
                      placeholderTextColor="#999"
                      value={values.location}
                      onChangeText={handleChange('location')}
                      onBlur={handleBlur('location')}
                    />

                    <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Emergency Contact Name
                    </Text>
                    <TextInput
                      style={[styles.input, { fontFamily: FONTS.BarlowSemiCondensed }]}
                      placeholder="Full name"
                      placeholderTextColor="#999"
                      value={values.emergencyContactName}
                      onChangeText={handleChange('emergencyContactName')}
                      onBlur={handleBlur('emergencyContactName')}
                    />

                    <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Emergency Contact Phone
                    </Text>
                    <TextInput
                      style={[styles.input, { fontFamily: FONTS.BarlowSemiCondensed }]}
                      placeholder="Phone number"
                      placeholderTextColor="#999"
                      value={values.emergencyContactPhone}
                      onChangeText={handleChange('emergencyContactPhone')}
                      onBlur={handleBlur('emergencyContactPhone')}
                      keyboardType="phone-pad"
                    />

                    <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Medical Conditions
                    </Text>
                    <TextInput
                      style={[styles.input, styles.textArea, { fontFamily: FONTS.BarlowSemiCondensed }]}
                      placeholder="List any relevant medical conditions"
                      placeholderTextColor="#999"
                      value={values.medicalConditions}
                      onChangeText={handleChange('medicalConditions')}
                      onBlur={handleBlur('medicalConditions')}
                      multiline
                      numberOfLines={3}
                    />

                    <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Current Medications
                    </Text>
                    <TextInput
                      style={[styles.input, styles.textArea, { fontFamily: FONTS.BarlowSemiCondensed }]}
                      placeholder="List your current medications"
                      placeholderTextColor="#999"
                      value={values.currentMedications}
                      onChangeText={handleChange('currentMedications')}
                      onBlur={handleBlur('currentMedications')}
                      multiline
                      numberOfLines={3}
                    />

                    <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Allergies
                    </Text>
                    <TextInput
                      style={[styles.input, styles.textArea, { fontFamily: FONTS.BarlowSemiCondensed }]}
                      placeholder="List any allergies"
                      placeholderTextColor="#999"
                      value={values.allergies}
                      onChangeText={handleChange('allergies')}
                      onBlur={handleBlur('allergies')}
                      multiline
                      numberOfLines={3}
                    />

                    {submitError && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.submitErrorText}>
                          ❌ {submitError}
                        </Text>
                      </View>
                    )}

                    {isRedirecting ? (
                      <View style={styles.redirectingContainer}>
                        <Text style={[styles.redirectingText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          ✅ Taking you to your dashboard...
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.buttonContainer}>
                        <TouchableOpacity
                          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
                          onPress={() => handleSubmit()}
                          disabled={isSubmitting}
                        >
                          <Text style={[styles.saveButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                            {isSubmitting ? "Saving..." : "Save Profile"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.skipButton}
                          onPress={handleSkip}
                          disabled={isSubmitting}
                        >
                          <Text style={[styles.skipButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                            Skip for now
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
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
    backgroundColor: "#f8f9fa",
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
    marginBottom: 32,
  },
  formContainer: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 20,
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
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ff3b30",
  },
  submitErrorText: {
    color: "#d32f2f",
    fontSize: 14,
    fontFamily: FONTS.BarlowSemiCondensed,
    textAlign: "center",
  },
  buttonContainer: {
    marginTop: 32,
    gap: 16,
  },
  saveButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonDisabled: {
    backgroundColor: "#A0A0A0",
    opacity: 0.7,
  },
  skipButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  redirectingContainer: {
    marginTop: 32,
    padding: 24,
    backgroundColor: "#e8f5e8",
    borderRadius: 12,
    alignItems: "center",
  },
  redirectingText: {
    fontSize: 16,
    color: "#2e7d32",
    textAlign: "center",
  },
  loadingContainer: {
    marginTop: 60,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 12,
  },
  loadingSubtext: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
});