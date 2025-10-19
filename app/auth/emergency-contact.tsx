import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateEmergencyContact = useMutation(api.emergencyContactOnboarding.update.withNameAndPhone);

  const handleContinue = async () => {
    if (!contactName || !contactPhone) {
      Alert.alert("Required Fields", "Please enter both emergency contact name and phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateEmergencyContact({
        emergencyContactName: contactName,
        emergencyContactPhone: contactPhone
      });
      console.log("Emergency contact saved successfully");
      router.push("/auth/medical-history");
    } catch (error) {
      console.error("Error saving emergency contact:", error);
      Alert.alert(
        "Error",
        "Failed to save emergency contact information. Please try again."
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
              height={150}
              showLogo={true}
              screenType="signin"
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
                  Emergency Contact Name
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontFamily: FONTS.BarlowSemiCondensed }
                  ]}
                  placeholder="Enter emergency contact name"
                  placeholderTextColor="#999"
                  value={contactName}
                  onChangeText={setContactName}
                />

                <Text style={[styles.fieldLabel, { fontFamily: FONTS.BarlowSemiCondensed, marginTop: 16 }]}>
                  Emergency Contact Phone
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontFamily: FONTS.BarlowSemiCondensed }
                  ]}
                  placeholder="Enter emergency contact phone"
                  placeholderTextColor="#999"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
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
                    styles.continueButton,
                    (isSubmitting || !contactName || !contactPhone) && styles.continueButtonDisabled
                  ]}
                  onPress={handleContinue}
                  disabled={isSubmitting || !contactName || !contactPhone}
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
});