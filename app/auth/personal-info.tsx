import { useDatabase } from "@nozbe/watermelondb/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { api } from "../../convex/_generated/api";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";
const LOCATION_OPTIONS = [
  { label: 'Calgary and Area', value: 'calgary' },
  { label: 'Edmonton and Area', value: 'edmonton' },
  { label: 'Red Deer and Central Alberta', value: 'central' },
  { label: 'Lethbridge and Southern Alberta', value: 'southern' },
  { label: 'Medicine Hat and Southeast', value: 'southeast' },
  { label: 'Grande Prairie and Northwest', value: 'northwest' },
  { label: 'Fort McMurray and Northeast', value: 'northeast' },
  { label: 'Peace Country Region', value: 'peace' },
  { label: 'Alberta Rockies Region', value: 'rockies' },
  { label: 'Rural Northern Alberta', value: 'northern_rural' },
  { label: 'Rural Central Alberta', value: 'central_rural' },
  { label: 'Rural Southern Alberta', value: 'southern_rural' },
];

const LOCATION_LABELS = Object.fromEntries(LOCATION_OPTIONS.map(opt => [opt.value, opt.label]));

export default function PersonalInfo() {
  const router = useRouter();
  const database = useDatabase();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updatePersonalInfo = useMutation(
    api.personalInfoOnboarding.update.withAgeRangeAndLocation
  );

  const handleContinue = async () => {
    if (!age || !location) {
      Alert.alert(
        "Required Fields",
        "Please enter both age and location to continue."
      );
      return;
    }

    if (!currentUser?._id) {
      Alert.alert("Authentication Error", "Please sign in to continue.");
      return;
    }

    // Validate age
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      Alert.alert("Invalid Age", "Please enter a valid age between 1 and 120.");
      return;
    }

    console.log("🔄 Personal Info - Starting submission");
    setIsSubmitting(true);

    try {
      // Convert age to age range for your existing schema
      const ageRange = getAgeRange(ageNum);

      // Save to WatermelonDB first (offline)
      await database.write(async () => {
        const userProfilesCollection = database.get("user_profiles");

        // Check if profile already exists for this user
        const existingProfiles = await userProfilesCollection.query().fetch();

        const existingProfile = existingProfiles.find(
          (p: any) => p.userId === currentUser._id
        );

        if (existingProfile) {
          // Update existing profile
          await existingProfile.update((profile: any) => {
            profile.ageRange = ageRange;
            profile.location = location;
            profile.updatedAt = Date.now();
          });
          console.log("✅ Personal Info - Updated existing local profile");
        } else {
          // Create new profile
          await userProfilesCollection.create((profile: any) => {
            profile.userId = currentUser._id;
            profile.ageRange = ageRange;
            profile.location = location;
            profile.onboardingCompleted = false;
            profile.createdAt = Date.now();
            profile.updatedAt = Date.now();
          });
          console.log("✅ Personal Info - Created new local profile");
        }
      });

      console.log("✅ Personal Info - Saved to local database");

      // Then sync with Convex (online) - this will work when there's internet
      try {
        await updatePersonalInfo({ ageRange, location });
        console.log("✅ Personal Info - Synced with Convex");
      } catch (syncError) {
        console.log(
          "⚠️ Personal Info - Saved locally, will sync when online:",
          syncError
        );
        // Don't show error to user - data is saved locally
      }

      console.log("➡️ Navigating to emergency contact");
      router.push("/auth/emergency-contact");
    } catch (error) {
      console.error("❌ Personal Info - Error:", error);
      Alert.alert(
        "Error",
        "Failed to save personal information. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAgeRange = (age: number): string => {
    if (age < 18) return "under18";
    if (age <= 24) return "18-24";
    if (age <= 34) return "25-34";
    if (age <= 44) return "35-44";
    if (age <= 54) return "45-54";
    if (age <= 64) return "55-64";
    return "65plus";
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
                  Age
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                  placeholder="Enter your age"
                  placeholderTextColor="#999"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  maxLength={3}
                />

                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    styles.locationLabel,
                  ]}
                >
                  Location
                </Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={styles.customPickerButton}
                    onPress={() => setLocationModalVisible(true)}
                  >
                    <Text
                      style={[
                        styles.customPickerText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                        !location && { color: "#999" },
                      ]}
                    >
                      {location ? LOCATION_LABELS[location] : "Enter your location"}
                    </Text>
                  </TouchableOpacity>
                  <Modal
                    visible={locationModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setLocationModalVisible(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <Text
                          style={[
                            styles.modalTitle,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          Select Location
                        </Text>
                        <View style={{ maxHeight: 320 }}>
                          <FlatList
                            data={LOCATION_OPTIONS}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item, index }) => (
                              <TouchableOpacity
                                style={[
                                  styles.modalItem,
                                  index === 0 && { borderTopWidth: 0 },
                                ]}
                                onPress={() => {
                                  setLocation(item.value);
                                  setLocationModalVisible(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.modalItemText,
                                    { fontFamily: FONTS.BarlowSemiCondensed },
                                  ]}
                                >
                                  {item.label}
                                </Text>
                              </TouchableOpacity>
                            )}
                          />
                        </View>
                        <TouchableOpacity
                          style={styles.modalCancel}
                          onPress={() => setLocationModalVisible(false)}
                        >
                          <Text
                            style={[
                              styles.modalCancelText,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                            ]}
                          >
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
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
                style={[
                  styles.continueButton,
                  (isSubmitting || !age || !location) &&
                    styles.continueButtonDisabled,
                ]}
                onPress={handleContinue}
                disabled={isSubmitting || !age || !location}
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
    width: "33%",
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
  },
  locationLabel: {
    marginTop: 16,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  customPickerButton: {
    width: "100%",
    minHeight: 50,
    justifyContent: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  customPickerText: {
    fontSize: 15,
    color: "#1A1A1A",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "80%",
    maxWidth: 350,
    alignItems: "stretch",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
    textAlign: "center",
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalItemText: {
    fontSize: 16,
    color: "#1A1A1A",
    textAlign: "center",
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
  },
  modalCancelText: {
    color: "#2A7DE1",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
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
