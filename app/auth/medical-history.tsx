import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { api } from "../../convex/_generated/api";
import { useSessionRefresh } from "../_layout";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";

export default function MedicalHistory() {
  const router = useRouter();
  const [medicalConditions, setMedicalConditions] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { refreshSession } = useSessionRefresh();
  const updateMedicalHistory = useMutation(api.medicalHistoryOnboarding.update.withAllConditions);
  const updateCompleteUserOnboarding = useMutation(api.medicalHistoryOnboarding.update.completeUserOnboarding);

  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    try {
      await updateMedicalHistory({
        medicalConditions: medicalConditions || undefined,
        currentMedications: currentMedications || undefined,
        allergies: allergies || undefined,
      });
      console.log("Medical history saved successfully, onboarding completed!");

      // Complete onboarding
      await updateCompleteUserOnboarding();
      console.log("✅ Onboarding completed!");

      // Force session refresh using provider remount pattern
      console.log("🔄 Refreshing session to prevent stale data...");
      refreshSession();

      // Longer delay to ensure backend state propagates before provider remount
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Navigate to dashboard with fresh session
      console.log("🚀 Navigating to dashboard with refreshed session");
      router.push("/(tabs)/dashboard");

    } catch (error) {
      console.error("Error completing onboarding:", error);
      Alert.alert(
        "Error",
        "Failed to complete setup. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    // Navigate back to previous screen
    router.back();
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
            {/* Header with logo */}
            <CurvedHeader
              title="Alberta Health Connect"
              height={120}
              showLogo={true}
              screenType="signin"
            />

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '100%' }]} />
              </View>
              <Text style={[styles.progressText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Step 3 of 3
              </Text>
            </View>

            <View style={styles.contentSection}>
              <Text style={[styles.sectionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Medical History
              </Text>
              <Text style={[styles.sectionSubtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Optional but helps provide better guidance
              </Text>

              <View style={styles.formContainer}>
                <Text style={[styles.fieldLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Medical Conditions (Optional)
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    { fontFamily: FONTS.BarlowSemiCondensed }
                  ]}
                  placeholder="List any medical conditions you have"
                  placeholderTextColor="#999"
                  value={medicalConditions}
                  onChangeText={setMedicalConditions}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <Text style={[styles.fieldLabel, { fontFamily: FONTS.BarlowSemiCondensed, marginTop: 16 }]}>
                  Current Medications (Optional)
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    { fontFamily: FONTS.BarlowSemiCondensed }
                  ]}
                  placeholder="List any current medications"
                  placeholderTextColor="#999"
                  value={currentMedications}
                  onChangeText={setCurrentMedications}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <Text style={[styles.fieldLabel, { fontFamily: FONTS.BarlowSemiCondensed, marginTop: 16 }]}>
                  Allergies (Optional)
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    { fontFamily: FONTS.BarlowSemiCondensed }
                  ]}
                  placeholder="List any allergies you have"
                  placeholderTextColor="#999"
                  value={allergies}
                  onChangeText={setAllergies}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                >
                  <Text style={[styles.backButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.completeButton,
                    isSubmitting && styles.completeButtonDisabled
                  ]}
                  onPress={handleCompleteSetup}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={[styles.completeButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Complete Setup
                    </Text>
                  )}
                </TouchableOpacity>
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
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2A7DE1',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  contentSection: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  formContainer: {
    width: "100%",
    marginBottom: 40,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  backButton: {
    backgroundColor: "#F0F0F0",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: "center",
    flex: 1,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  backButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  completeButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: "center",
    flex: 1,
    marginLeft: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  completeButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  completeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});