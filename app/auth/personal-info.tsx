import { Picker } from "@react-native-picker/picker";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../convex/_generated/api";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";


export default function PersonalInfo() {
  console.log("🟢 PersonalInfo component mounted");

  const router = useRouter();
  const [ageRange, setAgeRange] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updatePersonalInfo = useMutation(api.personalInfoOnboarding.update.withAgeRangeAndLocation);

  console.log("🟢 PersonalInfo rendered - ageRange:", ageRange, "location:", location);

  // Age range options
  const ageRangeOptions = [
    { label: "Under 18", value: "under18" },
    { label: "18-24", value: "18-24" },
    { label: "25-34", value: "25-34" },
    { label: "35-44", value: "35-44" },
    { label: "45-54", value: "45-54" },
    { label: "55-64", value: "55-64" },
    { label: "65+", value: "65plus" },
  ];

  // Location options
  const locationOptions = [
    { label: "Northern Alberta", value: "northern" },
    { label: "Central Alberta", value: "central" },
    { label: "Edmonton Area", value: "edmonton" },
    { label: "Calgary Area", value: "calgary" },
    { label: "Southern Alberta", value: "southern" },
  ];

  const showAgeRangePicker = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", ...ageRangeOptions.map((o) => o.label)],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const selectedOption = ageRangeOptions[buttonIndex - 1];
            console.log("🟢 Age range changed to:", selectedOption.value);
            setAgeRange(selectedOption.value);
          }
        }
      );
    }
  };

  const showLocationPicker = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", ...locationOptions.map((o) => o.label)],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const selectedOption = locationOptions[buttonIndex - 1];
            console.log("🟢 Location changed to:", selectedOption.value);
            setLocation(selectedOption.value);
          }
        }
      );
    }
  };

  const getAgeRangeLabel = () => {
    const option = ageRangeOptions.find((o) => o.value === ageRange);
    return option ? option.label : "Select your age range";
  };

  const getLocationLabel = () => {
    const option = locationOptions.find((o) => o.value === location);
    return option ? option.label : "Select your location";
  };

  const handleContinue = async () => {
    if (!ageRange || !location) {
      Alert.alert("Required Fields", "Please select both age range and location to continue.");
      return;
    }

    console.log("🔄 Personal Info - Starting submission");
    setIsSubmitting(true);
    
    try {
      await updatePersonalInfo({ ageRange, location });
      console.log("✅ Personal Info - Saved successfully");
      
      console.log("➡️ Navigating to emergency contact");
      router.push("/auth/emergency-contact");
      
    } catch (error) {
      console.error("❌ Personal Info - Error:", error);
      Alert.alert("Error", "Failed to save personal information. Please try again.");
    } finally {
      setIsSubmitting(false);
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
            {/* Header with logo */}
            <CurvedHeader
              title="Alberta Health Connect"
              height={120}
              showLogo={true}
            />

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <Text
                style={[
                  styles.progressText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Step 1 of 3
              </Text>
            </View>

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
                {Platform.OS === "ios" ? (
                  <TouchableOpacity
                    style={styles.pickerContainer}
                    onPress={showAgeRangePicker}
                  >
                    <View style={styles.iosPickerButton}>
                      <Text
                        style={[
                          styles.iosPickerText,
                          !ageRange && styles.iosPickerPlaceholder,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        {getAgeRangeLabel()}
                      </Text>
                      <Text style={styles.iosPickerArrow}>▼</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.pickerContainer}>
                    <Picker
                      style={styles.picker}
                      dropdownIconColor="#2A7DE1"
                      selectedValue={ageRange}
                      onValueChange={(value) => {
                        console.log("🟢 Age range changed to:", value);
                        setAgeRange(value);
                      }}
                    >
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
                )}

                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Location
                </Text>
                {Platform.OS === "ios" ? (
                  <TouchableOpacity
                    style={styles.pickerContainer}
                    onPress={showLocationPicker}
                  >
                    <View style={styles.iosPickerButton}>
                      <Text
                        style={[
                          styles.iosPickerText,
                          !location && styles.iosPickerPlaceholder,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        {getLocationLabel()}
                      </Text>
                      <Text style={styles.iosPickerArrow}>▼</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.pickerContainer}>
                    <Picker
                      style={styles.picker}
                      dropdownIconColor="#2A7DE1"
                      selectedValue={location}
                      onValueChange={(value) => {
                        console.log("🟢 Location changed to:", value);
                        setLocation(value);
                      }}
                    >
                      <Picker.Item label="Select your location" value="" />
                      <Picker.Item label="Northern Alberta" value="northern" />
                      <Picker.Item label="Central Alberta" value="central" />
                      <Picker.Item label="Edmonton Area" value="edmonton" />
                      <Picker.Item label="Calgary Area" value="calgary" />
                      <Picker.Item label="Southern Alberta" value="southern" />
                    </Picker>
                  </View>
                )}

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
                style={[
                  styles.continueButton,
                  (isSubmitting || !ageRange || !location) && styles.continueButtonDisabled
                ]}
                onPress={() => {
                  console.log("🟢 Continue button pressed");
                  handleContinue();
                }}
                disabled={isSubmitting || !ageRange || !location}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text
                    style={[
                      styles.continueButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Continue
                  </Text>
                )}
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
    width: "33%", // 1 out of 3 steps completed
    backgroundColor: "#2A7DE1",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
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
  iosPickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 16,
    height: 50,
  },
  iosPickerText: {
    fontSize: 16,
    color: "#1A1A1A",
    flex: 1,
  },
  iosPickerPlaceholder: {
    color: "#999",
  },
  iosPickerArrow: {
    fontSize: 12,
    color: "#2A7DE1",
    marginLeft: 8,
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
  continueButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});