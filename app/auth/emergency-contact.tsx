import AsyncStorage from "@react-native-async-storage/async-storage";
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
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";

export default function EmergencyContact() {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  const updateEmergencyContact = useMutation(api.emergencyContactOnboarding.update.withNameAndPhone);

  // Format phone number as (XXX) XXX-XXXX
  const formatPhoneNumber = (input: string) => {
    // Remove all non-digit characters
    const cleaned = input.replace(/\D/g, "");
    
    // Don't format if empty
    if (cleaned.length === 0) return "";
    
    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);
    
    const match = limited.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return input;
    
    let formatted = "";
    
    // First 3 digits
    if (match[1]) {
      if (match[1].length === 3 && (match[2] || match[3])) {
        formatted += `(${match[1]}) `;
      } else {
        formatted += match[1];
      }
    }
    
    // Next 3 digits
    if (match[2]) {
      formatted += match[2];
      if (match[2].length === 3 && match[3]) {
        formatted += "-";
      }
    }
    
    // Last 4 digits
    if (match[3]) {
      formatted += match[3];
    }
    
    return formatted;
  };

  // Validation logic
  const validateField = (field: string, raw: string): boolean => {
    const value = (raw || '').trim();
    let error = '';
    switch (field) {
      case 'contactName': {
        if (value.length === 0) {
          error = 'Emergency contact name is required';
        } else if (value.length < 2) {
          error = 'Name must be at least 2 characters';
        }
        break;
      }
      case 'contactPhone': {
        if (value.length === 0) {
          error = 'Emergency contact phone is required';
          break;
        }
        const digits = value.replace(/\D/g, '');
        if (digits.length < 10) {
          error = 'Phone number must be at least 10 digits';
        } else if (digits.length > 10) {
          error = 'Phone number must be exactly 10 digits';
        }
        break;
      }
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const validateAll = (): boolean => {
    const results = [
      validateField('contactName', contactName),
      validateField('contactPhone', contactPhone),
    ];
    return results.every(Boolean);
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'contactName') {
      setContactName(value);
      validateField(field, value);
    } else if (field === 'contactPhone') {
      // Check BEFORE formatting if input exceeds 10 digits
      const inputDigits = value.replace(/\D/g, '');
      const exceeded = inputDigits.length > 10;
      
      // Format (this will slice to 10 digits)
      const formatted = formatPhoneNumber(value);
      setContactPhone(formatted);
      
      // If user tried to type more than 10 digits, show error immediately
      if (exceeded) {
        setErrors((prev) => ({ ...prev, [field]: 'Phone number must be exactly 10 digits' }));
      } else {
        // Otherwise validate normally
        validateField(field, formatted);
      }
    }
  };

  const handleContinue = async () => {
    // Validate all fields
    if (!validateAll()) {
      setErrorModalMessage("Please fix the errors highlighted in red before continuing.");
      setErrorModalVisible(true);
      return;
    }

    if (!currentUser?._id) {
      setErrorModalMessage("Please sign in to continue.");
      setErrorModalVisible(true);
      return;
    }

    console.log("🔄 Emergency Contact - Starting submission");
    setIsSubmitting(true);

    try {
      // Save to AsyncStorage for offline support (WMDB disabled due to schema errors)
      try {
        const uid = currentUser?._id;
        if (uid) {
          const raw = await AsyncStorage.getItem(`${uid}:profile_cache_v1`);
          const cached = raw ? JSON.parse(raw) : {};
          const merged = {
            ...cached,
            emergencyContactName: contactName || '',
            emergencyContactPhone: contactPhone || '',
          };
          await AsyncStorage.setItem(`${uid}:profile_cache_v1`, JSON.stringify(merged));
          await AsyncStorage.setItem(`${uid}:profile_emergency_needs_sync`, '1');
          console.log("✅ Emergency Contact - Saved to AsyncStorage cache");
        }
      } catch (cacheError) {
        console.warn("⚠️ Emergency Contact - Failed to save to cache:", cacheError);
      }

      console.log("✅ Emergency Contact - Saved to local storage");

      // Then sync with Convex (online)
      try {
        await updateEmergencyContact({
          emergencyContactName: contactName,
          emergencyContactPhone: contactPhone
        });
        console.log("✅ Emergency Contact - Synced with Convex");
      } catch (syncError) {
        console.log(
          "⚠️ Emergency Contact - Saved locally, will sync when online:",
          syncError
        );
      }

      console.log("➡️ Navigating to medical history");
      router.replace("/auth/medical-history");
    } catch (error) {
      console.error("❌ Emergency Contact - Error:", error);
      setErrorModalMessage("Failed to save emergency contact information. Please try again.");
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
              showMenuButton={false}
            />

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '66%' }]} />
                </View>
                <Text style={[styles.progressText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Step 2 of 3
                </Text>
              </View>

              <View style={styles.contentSection}>
              <Text style={[styles.sectionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Emergency Contact
              </Text>
              <Text style={[styles.sectionSubtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Important for your safety
              </Text>

              <View style={styles.formContainer}>
                <Text style={[styles.fieldLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Emergency Contact Name *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    errors.contactName ? styles.inputError : null,
                  ]}
                  placeholder="Enter emergency contact name"
                  placeholderTextColor="#999"
                  value={contactName}
                  onChangeText={(val) => handleInputChange('contactName', val)}
                />
                {errors.contactName ? <Text style={styles.errorText}>{errors.contactName}</Text> : null}

                <Text style={[styles.fieldLabel, { fontFamily: FONTS.BarlowSemiCondensed, marginTop: 16 }]}>
                  Emergency Contact Phone *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    errors.contactPhone ? styles.inputError : null,
                  ]}
                  placeholder="(403) 555-0123"
                  placeholderTextColor="#999"
                  value={contactPhone}
                  onChangeText={(val) => handleInputChange('contactPhone', val)}
                  keyboardType="phone-pad"
                />
                {errors.contactPhone ? <Text style={styles.errorText}>{errors.contactPhone}</Text> : null}
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
                    styles.continueButton,
                    isSubmitting && styles.continueButtonDisabled
                  ]}
                  onPress={handleContinue}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={[styles.continueButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Continue
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
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 16,
    fontSize: 15,
    color: "#1A1A1A",
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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
  continueButton: {
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
  continueButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  inputError: {
    backgroundColor: "white",
    borderColor: "red",
    borderWidth: 1.5,
    color: "#1A1A1A",
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