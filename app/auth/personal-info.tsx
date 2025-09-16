import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";

export default function PersonalInfo() {
  const router = useRouter();

  const handleContinue = () => {
    // Handle form submission logic here
    console.log("Personal info form submitted");
    // Navigate to next screen
    router.push("/auth/emergency-contact");
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
            />

            <View style={styles.contentSection}>
              <Text
                style={[
                  styles.sectionTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Personal Information
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Help us personalize your experience
              </Text>

              <View style={styles.formContainer}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Age Range
                </Text>
                <View style={styles.pickerContainer}>
                  <Picker style={styles.picker} dropdownIconColor="#2A7DE1">
                    <Picker.Item label="Select your age range" value="" />
                    <Picker.Item label="Under 18" value="under18" />
                    <Picker.Item label="18-24" value="18-24" />
                    <Picker.Item label="25-34" value="25-34" />
                    <Picker.Item label="35-44" value="35-44" />
                    <Picker.Item label="45-54" value="45-54" />
                    <Picker.Item label="55-64" value="55-64" />
                    <Picker.Item label="65+" value="65plus" />
                  </Picker>
                </View>

                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Location
                </Text>
                <View style={styles.pickerContainer}>
                  <Picker style={styles.picker} dropdownIconColor="#2A7DE1">
                    <Picker.Item label="Select your location" value="" />
                    <Picker.Item label="Northern Alberta" value="northern" />
                    <Picker.Item label="Central Alberta" value="central" />
                    <Picker.Item label="Edmonton Area" value="edmonton" />
                    <Picker.Item label="Calgary Area" value="calgary" />
                    <Picker.Item label="Southern Alberta" value="southern" />
                  </Picker>
                </View>

                <Text
                  style={[
                    styles.helperText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  This helps us provide location-specific health resources
                </Text>
              </View>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
              >
                <Text
                  style={[
                    styles.continueButtonText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Continue
                </Text>
              </TouchableOpacity>
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
    marginBottom: 40,
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
    marginTop: 16,
  },
  pickerContainer: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  picker: {
    width: "100%",
    height: 50,
  },
  helperText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  continueButton: {
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
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
