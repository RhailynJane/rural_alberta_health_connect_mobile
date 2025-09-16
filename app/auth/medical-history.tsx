import { useRouter } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";

export default function MedicalHistory() {
  const router = useRouter();
  const [medicalConditions, setMedicalConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState(false);
  const [allergies, setAllergies] = useState(false);

  const handleCompleteSetup = () => {
    // Handle form submission logic here
    console.log("Medical history form submitted");
    // Navigate to dashboard
    router.push("/dashboard");
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
                <View style={[styles.progressFill, { width: "100%" }]} />
              </View>
              <Text
                style={[
                  styles.progressText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Step 3 of 3
              </Text>
            </View>

            <View style={styles.contentSection}>
              <Text
                style={[
                  styles.sectionTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Medical History
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Optional but helps provide better guidance
              </Text>

              <View style={styles.formContainer}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Medical Conditions (Optional)
                </Text>
                <View style={styles.textAreaContainer}>
                  <Text
                    style={[
                      styles.placeholderText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    List any medical conditions you have
                  </Text>
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
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2A7DE1",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
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
    marginBottom: 12,
  },
  textAreaContainer: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 16,
    height: 100,
    marginBottom: 20,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  placeholderText: {
    fontSize: 15,
    color: "#999",
  },
});
