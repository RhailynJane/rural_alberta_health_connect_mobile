import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { COLORS, FONTS } from "../../constants/constants";

export default function Profile() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();

  const updatePersonalInfo = useMutation(
    api.profile.personalInformation.updatePersonalInfo
  );
  // Skip queries if not authenticated
  const userProfile = useQuery(
    api.profile.personalInformation.getProfile,
    isAuthenticated && !isLoading ? {} : "skip"
  );

  // Get location services status
   const locationStatus = useQuery(
    api.locationServices.getLocationServicesStatus,
    isAuthenticated && !isLoading ? {} : "skip"
  );
  const toggleLocationServices = useMutation(
    api.locationServices.toggleLocationServices
  );

  // Track if we have a pending toggle to prevent query overwrites
  const [isPendingLocationToggle, setIsPendingLocationToggle] = useState(false);

  useEffect(() => {
    // Only update from query if there's no pending toggle
    if (locationStatus !== undefined && !isPendingLocationToggle) {
      setUserData((prev) => ({
        ...prev,
        locationServices: locationStatus.locationServicesEnabled || false,
      }));
    }
  }, [locationStatus, isPendingLocationToggle]);

  // Handler for location services toggle
  const handleLocationServicesToggle = async (enabled: boolean) => {
    // Mark as pending to prevent query from overwriting optimistic update
    setIsPendingLocationToggle(true);

    // Optimistically update the local state immediately for responsive UI
    setUserData((prev) => ({
      ...prev,
      locationServices: enabled,
    }));

    try {
      await toggleLocationServices({ enabled });
      console.log(`📍 Location services ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error toggling location services:", error);
      Alert.alert("Error", "Failed to update location services settings");
      // Revert the local state on error
      setUserData((prev) => ({
        ...prev,
        locationServices: !enabled,
      }));
    } finally {
      // Clear pending flag after mutation completes (success or error)
      setIsPendingLocationToggle(false);
    }
  };

  // State for user data
  const [userData, setUserData] = useState({
    ageRange: "",
    allergies: "",
    currentMedications: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    location: "",
    medicalConditions: "",
    symptomReminder: true,
    dataEncryption: true,
    locationServices: true,
  });

  // Update state when userProfile loads
  useEffect(() => {
    if (userProfile) {
      console.log("📥 Loading user profile data:", userProfile);
      setUserData((prev) => ({
        ...prev,
        ageRange: userProfile.ageRange || "",
        allergies: userProfile.allergies || "",
        currentMedications: userProfile.currentMedications || "",
        emergencyContactName: userProfile.emergencyContactName || "",
        emergencyContactPhone: userProfile.emergencyContactPhone || "",
        location: userProfile.location || "",
        medicalConditions: userProfile.medicalConditions || "",
      }));
    }
  }, [userProfile]);

  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState({
    personalInfo: false,
    emergencyContacts: false,
    medicalInfo: false,
    appSettings: false,
  });

  const handleUpdatePersonalInfo = async () => {
    try {
      await updatePersonalInfo({
        ageRange: userData.ageRange,
        location: userData.location,
      });
      Alert.alert("Success", "Personal information updated successfully");
    } catch (error) {
      let errorMessage;
      if (error instanceof ConvexError) {
        errorMessage =
          typeof error.data === "string"
            ? error.data
            : error.data?.message || "An error occurred";
      } else {
        errorMessage = "Unexpected error occurred";
      }
      Alert.alert("Error", errorMessage);
    }
  };

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    if (expandedSections[section]) {
      // If we're closing the section and it's personal info, save the data
      if (section === "personalInfo") {
        handleUpdatePersonalInfo();
      }
    }
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Handle input changes
  const handleInputChange = (
    field: keyof typeof userData,
    value: string | boolean
  ) => {
    setUserData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle sign out
  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        onPress: async () => {
          try {
            console.log("🔄 Signing out...");
            
            // Simple sign out without refreshSession
            await signOut();
            console.log("✅ Signed out successfully");
            
            // Navigate to signin
            router.replace("/auth/signin");
            
          } catch (error) {
            console.error("❌ Sign out failed:", error);
            // Still navigate to signin even if signOut fails
            router.replace("/auth/signin");
          }
        },
        style: "destructive",
      },
    ]);
  };


  // Show loading while auth is loading
  if (isLoading) {
    return (
      <CurvedBackground>
        <CurvedHeader title="Profile" height={120} showLogo={true} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </CurvedBackground>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    // This should trigger automatically due to your AuthGuard, but as a safeguard:
    return (
      <CurvedBackground>
        <CurvedHeader title="Profile" height={120} showLogo={true} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Redirecting...</Text>
        </View>
      </CurvedBackground>
    );
  }

  // Show loading while profile data is loading
  // Note: userProfile will be null if the query returns null (unauthenticated)
  // but since we're checking isAuthenticated above, it should load data
  if (userProfile === undefined) {
    return (
      <CurvedBackground>
        <CurvedHeader title="Profile" height={120} showLogo={true} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </CurvedBackground>
    );
  }

  // Handle case where profile is null (shouldn't happen due to auth check above)
  if (userProfile === null) {
    return (
      <CurvedBackground>
        <CurvedHeader title="Profile" height={120} showLogo={true} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Profile not found...</Text>
        </View>
      </CurvedBackground>
    );
  }

  return (
    <CurvedBackground>
      <CurvedHeader title="Profile" height={120} showLogo={true} />
      <ScrollView style={styles.container}>
        {/* Privacy Notice */}
        <View style={styles.card}>
          <View style={styles.privacyHeader}>
            <View style={styles.privacyIcon}>
              <Text style={styles.privacyIconText}>✓</Text>
            </View>
            <Text style={styles.cardTitle}>Privacy Protected</Text>
          </View>
          <Text style={styles.privacyText}>
            Your personal information is encrypted and stored locally. No data
            is shared without your consent.
          </Text>
        </View>

        {/* Personal Information Card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => toggleSection("personalInfo")}
            activeOpacity={0.7}
          >
            <Text style={styles.cardTitle}>Personal Information</Text>
            <Text style={styles.editButton}>
              {expandedSections.personalInfo ? "Done" : "Edit"}
            </Text>
          </TouchableOpacity>

          {expandedSections.personalInfo ? (
            <>
              <Text style={styles.sectionTitle}>Age Range</Text>
              <TextInput
                style={styles.input}
                value={userData.ageRange}
                onChangeText={(text) => handleInputChange("ageRange", text)}
                placeholder="e.g., 25-34"
                placeholderTextColor={COLORS.lightGray}
              />

              <Text style={styles.sectionTitle}>Location</Text>
              <TextInput
                style={styles.input}
                value={userData.location}
                onChangeText={(text) => handleInputChange("location", text)}
                placeholder="Enter your location"
                placeholderTextColor={COLORS.lightGray}
              />
            </>
          ) : (
            <>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Age Range:</Text>{" "}
                {userData.ageRange || "Not set"}
              </Text>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Location:</Text>{" "}
                {userData.location || "Not set"}
              </Text>
            </>
          )}
        </View>

        {/* Emergency Contacts Card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => toggleSection("emergencyContacts")}
            activeOpacity={0.7}
          >
            <Text style={styles.cardTitle}>Emergency Contact</Text>
            <Text style={styles.editButton}>
              {expandedSections.emergencyContacts ? "Done" : "Edit"}
            </Text>
          </TouchableOpacity>

          {expandedSections.emergencyContacts ? (
            <>
              <Text style={styles.sectionTitle}>Contact Name</Text>
              <TextInput
                style={styles.input}
                value={userData.emergencyContactName}
                onChangeText={(text) =>
                  handleInputChange("emergencyContactName", text)
                }
                placeholder="Emergency contact name"
                placeholderTextColor={COLORS.lightGray}
              />

              <Text style={styles.sectionTitle}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={userData.emergencyContactPhone}
                onChangeText={(text) =>
                  handleInputChange("emergencyContactPhone", text)
                }
                placeholder="Emergency contact phone"
                placeholderTextColor={COLORS.lightGray}
                keyboardType="phone-pad"
              />
            </>
          ) : (
            <>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Name:</Text>{" "}
                {userData.emergencyContactName || "Not set"}
              </Text>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Phone:</Text>{" "}
                {userData.emergencyContactPhone || "Not set"}
              </Text>
            </>
          )}
        </View>

        {/* Medical Information Card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => toggleSection("medicalInfo")}
            activeOpacity={0.7}
          >
            <Text style={styles.cardTitle}>Medical Information</Text>
            <Text style={styles.editButton}>
              {expandedSections.medicalInfo ? "Done" : "Edit"}
            </Text>
          </TouchableOpacity>

          {expandedSections.medicalInfo ? (
            <>
              <Text style={styles.sectionTitle}>Allergies</Text>
              <TextInput
                style={styles.input}
                value={userData.allergies}
                onChangeText={(text) => handleInputChange("allergies", text)}
                placeholder="List any allergies"
                placeholderTextColor={COLORS.lightGray}
                multiline
              />

              <Text style={styles.sectionTitle}>Current Medications</Text>
              <TextInput
                style={styles.input}
                value={userData.currentMedications}
                onChangeText={(text) =>
                  handleInputChange("currentMedications", text)
                }
                placeholder="List current medications"
                placeholderTextColor={COLORS.lightGray}
                multiline
              />

              <Text style={styles.sectionTitle}>Medical Conditions</Text>
              <TextInput
                style={styles.input}
                value={userData.medicalConditions}
                onChangeText={(text) =>
                  handleInputChange("medicalConditions", text)
                }
                placeholder="List medical conditions"
                placeholderTextColor={COLORS.lightGray}
                multiline
              />
            </>
          ) : (
            <>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Allergies:</Text>{" "}
                {userData.allergies || "Not set"}
              </Text>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Medications:</Text>{" "}
                {userData.currentMedications || "Not set"}
              </Text>
              <Text style={styles.text}>
                <Text style={{ fontWeight: "bold" }}>Conditions:</Text>{" "}
                {userData.medicalConditions || "Not set"}
              </Text>
            </>
          )}
        </View>

        {/* App Settings Card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => toggleSection("appSettings")}
            activeOpacity={0.7}
          >
            <Text style={styles.cardTitle}>App Settings</Text>
          </TouchableOpacity>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>Symptom Assessment Reminder</Text>
            <Switch
              value={userData.symptomReminder}
              onValueChange={(value) =>
                handleInputChange("symptomReminder", value)
              }
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>Data Encryption</Text>
            <Switch
              value={userData.dataEncryption}
              onValueChange={(value) =>
                handleInputChange("dataEncryption", value)
              }
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>Location Services</Text>
            <Switch
              value={userData.locationServices}
              onValueChange={handleLocationServicesToggle}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Icon
            name="exit-to-app"
            size={20}
            color={COLORS.white}
            style={styles.signOutIcon}
          />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNavigation />
    </CurvedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: COLORS.darkGray,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  debugCard: {
    backgroundColor: "#fff3cd",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderColor: "#ffeaa7",
    borderWidth: 1,
  },
  debugTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: "#856404",
    marginBottom: 8,
  },
  debugText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: "#856404",
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 18,
    color: COLORS.darkText,
  },
  sectionTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    marginBottom: 8,
    color: COLORS.darkGray,
    marginTop: 12,
  },
  text: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    color: COLORS.darkText,
    backgroundColor: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  toggleText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
    flex: 1,
  },
  editButton: {
    color: COLORS.primary,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
  },
  privacyText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 8,
    fontStyle: "italic",
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  privacyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  privacyIconText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  signOutButton: {
    backgroundColor: COLORS.error,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
    marginTop: 8,
  },
  signOutText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    marginLeft: 8,
  },
  signOutIcon: {
    marginRight: 8,
  },
});
