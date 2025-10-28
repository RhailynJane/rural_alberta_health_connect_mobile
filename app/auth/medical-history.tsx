import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { useSessionRefresh } from "../_layout";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

const MAX_CHARS = 500;

export default function MedicalHistory() {
  const router = useRouter();
  const database = useDatabase();
  const { isOnline } = useNetworkStatus();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { refreshSession } = useSessionRefresh(); 
  
  const [medicalConditions, setMedicalConditions] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  const updateMedicalHistory = useMutation(api.medicalHistoryOnboarding.update.withAllConditions);
  const updateCompleteUserOnboarding = useMutation(api.medicalHistoryOnboarding.update.completeUserOnboarding);

  // Validation logic
  const validateField = (field: string, value: string): boolean => {
    let error = '';
    if (value.length > MAX_CHARS) {
      error = `Maximum ${MAX_CHARS} characters allowed`;
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const validateAll = (): boolean => {
    const results = [
      validateField('medicalConditions', medicalConditions),
      validateField('currentMedications', currentMedications),
      validateField('allergies', allergies),
    ];
    return results.every(Boolean);
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'medicalConditions') setMedicalConditions(value);
    else if (field === 'currentMedications') setCurrentMedications(value);
    else if (field === 'allergies') setAllergies(value);
    validateField(field, value);
  };

  const handleCompleteSetup = async () => {
    // Validate all fields
    if (!validateAll()) {
      setErrorModalMessage("Please fix the errors highlighted in red. Each field has a maximum of 500 characters.");
      setErrorModalVisible(true);
      return;
    }

    if (!currentUser?._id) {
      setErrorModalMessage("Please sign in to continue.");
      setErrorModalVisible(true);
      return;
    }

    console.log("🔄 Medical History - Starting submission");
    setIsSubmitting(true);
    
    try {
      // Save to WatermelonDB first (offline-first), best-effort per field
      await database.write(async () => {
        const userProfilesCollection = database.get("user_profiles");
        const existingProfiles = await userProfilesCollection.query().fetch();
        const existingProfile = existingProfiles.find(
          (p: any) => p.userId === currentUser._id
        );

        if (existingProfile) {
          try { await existingProfile.update((p: any) => { p.medicalConditions = medicalConditions || ''; }); } catch (e) { console.warn('⚠️ Could not set medicalConditions locally:', e); }
          try { await existingProfile.update((p: any) => { p.currentMedications = currentMedications || ''; }); } catch (e) { console.warn('⚠️ Could not set currentMedications locally:', e); }
          try { await existingProfile.update((p: any) => { p.allergies = allergies || ''; }); } catch (e) { console.warn('⚠️ Could not set allergies locally:', e); }
          try { await existingProfile.update((p: any) => { p.onboardingCompleted = true; }); } catch (e) { console.warn('⚠️ Could not set onboardingCompleted locally:', e); }
          console.log("✅ Medical History - Updated existing local profile (best-effort)");
        } else {
          // Create minimal record first
          let created: any = null;
          try {
            created = await userProfilesCollection.create((p: any) => {
              p.userId = String(currentUser._id);
            });
          } catch (createErr) {
            console.warn('⚠️ Could not create local profile record for medical history:', createErr);
          }
          if (created) {
            try { await created.update((p: any) => { p.medicalConditions = medicalConditions || ''; }); } catch (e) { console.warn('⚠️ Could not set medicalConditions on new record:', e); }
            try { await created.update((p: any) => { p.currentMedications = currentMedications || ''; }); } catch (e) { console.warn('⚠️ Could not set currentMedications on new record:', e); }
            try { await created.update((p: any) => { p.allergies = allergies || ''; }); } catch (e) { console.warn('⚠️ Could not set allergies on new record:', e); }
            try { await created.update((p: any) => { p.onboardingCompleted = true; }); } catch (e) { console.warn('⚠️ Could not set onboardingCompleted on new record:', e); }
            console.log("✅ Medical History - Created/updated new local profile (best-effort)");
          }
        }
      });

      console.log("✅ Medical History - Saved to local database");

      // Then sync with Convex (online)
      if (isOnline) {
        try {
          await updateMedicalHistory({
            medicalConditions: medicalConditions || undefined,
            currentMedications: currentMedications || undefined,
            allergies: allergies || undefined,
          });
          console.log("✅ Medical History - Synced with Convex");

          // Complete onboarding
          await updateCompleteUserOnboarding();
          console.log("✅ Onboarding marked as completed in Convex");
        } catch (syncError) {
          console.log(
            "⚠️ Medical History - Failed to sync, marking for later:",
            syncError
          );
          // Mark for sync when online
          if (currentUser?._id) {
            await AsyncStorage.setItem(`${currentUser._id}:profile_needs_sync`, 'true');
            console.log("✅ Marked profile for sync when online");
          }
        }
      } else {
        // Offline - mark for sync when online
        console.log("📴 Offline - marking for sync when online");
        if (currentUser?._id) {
          await AsyncStorage.setItem(`${currentUser._id}:profile_needs_sync`, 'true');
          console.log("✅ Marked profile for sync when online");
        }
      }

      // Refresh session to update auth state with new onboarding status
      console.log("🔄 Refreshing session via custom method...");
      refreshSession();
      
      // Navigate to dashboard with fresh session data
      console.log("🚀 Navigating to dashboard");
      router.replace("/(tabs)/dashboard");

    } catch (error) {
      console.error("❌ Medical History - Error:", error);
      setErrorModalMessage("Failed to complete setup. Please try again.");
      setErrorModalVisible(true);
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
              height={150}
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
                <View style={styles.fieldHeader}>
                  <Text style={[styles.fieldLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Medical Conditions (Optional)
                  </Text>
                  <Text style={[
                    styles.charCounter,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    medicalConditions.length > 450 ? styles.charCounterWarning : null
                  ]}>
                    {medicalConditions.length}/{MAX_CHARS}
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.textArea,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    errors.medicalConditions ? styles.inputError : null,
                  ]}
                  placeholder="List any medical conditions you have"
                  placeholderTextColor="#999"
                  value={medicalConditions}
                  onChangeText={(val) => handleInputChange('medicalConditions', val)}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={MAX_CHARS}
                />
                {errors.medicalConditions ? <Text style={styles.errorText}>{errors.medicalConditions}</Text> : null}

                <View style={[styles.fieldHeader, { marginTop: 16 }]}>
                  <Text style={[styles.fieldLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Current Medications (Optional)
                  </Text>
                  <Text style={[
                    styles.charCounter,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    currentMedications.length > 450 ? styles.charCounterWarning : null
                  ]}>
                    {currentMedications.length}/{MAX_CHARS}
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.textArea,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    errors.currentMedications ? styles.inputError : null,
                  ]}
                  placeholder="List any current medications"
                  placeholderTextColor="#999"
                  value={currentMedications}
                  onChangeText={(val) => handleInputChange('currentMedications', val)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={MAX_CHARS}
                />
                {errors.currentMedications ? <Text style={styles.errorText}>{errors.currentMedications}</Text> : null}

                <View style={[styles.fieldHeader, { marginTop: 16 }]}>
                  <Text style={[styles.fieldLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Allergies (Optional)
                  </Text>
                  <Text style={[
                    styles.charCounter,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    allergies.length > 450 ? styles.charCounterWarning : null
                  ]}>
                    {allergies.length}/{MAX_CHARS}
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.textArea,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    errors.allergies ? styles.inputError : null,
                  ]}
                  placeholder="List any allergies you have"
                  placeholderTextColor="#999"
                  value={allergies}
                  onChangeText={(val) => handleInputChange('allergies', val)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={MAX_CHARS}
                />
                {errors.allergies ? <Text style={styles.errorText}>{errors.allergies}</Text> : null}
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

      {/* Error Modal */}
      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalContent}>
            <Text style={[styles.errorModalTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Validation Error
            </Text>
            <Text style={[styles.errorModalMessage, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              {errorModalMessage}
            </Text>
            <TouchableOpacity
              style={styles.errorModalButton}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={[styles.errorModalButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                OK
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
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCounter: {
    fontSize: 12,
    color: '#666',
  },
  charCounterWarning: {
    color: '#FF9800',
    fontWeight: '600',
  },
  inputError: {
    borderColor: "red",
    borderWidth: 1.5,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorModalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    textAlign: "center",
  },
  errorModalMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  errorModalButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  errorModalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});