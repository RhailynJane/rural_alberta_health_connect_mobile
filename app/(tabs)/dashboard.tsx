// app/dashboard.tsx
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../convex/_generated/api";
import BottomNavigation from "../components/bottomNavigation";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import HealthStatusTag from "../components/HealthStatusTag";
import { FONTS } from "../constants/constants";

export default function Dashboard() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [healthStatus, setHealthStatus] = useState<string>("Good");
  const queryArgs = isAuthenticated ? {} : "skip";
  
  // Get current user data
  const user = useQuery(api.users.getCurrentUser, queryArgs);
  
  // Keep userWithProfile query for future use (currently returns undefined)
  const userWithProfile = useQuery(
    api.dashboard.user.getUserWithProfile,
    queryArgs
  );

  if (isLoading || (!isAuthenticated && user === undefined)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text
            style={[
              styles.loadingText,
              { fontFamily: FONTS.BarlowSemiCondensed },
            ]}
          >
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || user === null || user === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text
            style={[
              styles.errorText,
              { fontFamily: FONTS.BarlowSemiCondensed },
            ]}
          >
            Please sign in to view your dashboard
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Use currentUser data instead of userWithProfile for now
  const userName = user.firstName || user.name || "User";
  const userEmail = user.email;
  const handleSymptomAssessment = (): void => {
    // Navigate to symptom assessment screen using Expo Router
    router.push("../ai-assess");
  };

  const handleEmergencyCall = (): void => {
    Alert.alert(
      "Emergency Call",
      "For life-threatening emergencies, call 911 immediately.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Call 911",
          onPress: () => {
            Linking.openURL("tel:911").catch((err) => {
              console.error("Error calling 911:", err);
              Alert.alert(
                "Error",
                "Could not make the call. Please check your device."
              );
            });
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  const callHealthLink = (): void => {
    Alert.alert(
      "Health Link Alberta",
      "Call 811 for non-emergency health advice?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Call 811",
          onPress: () => {
            Linking.openURL("tel:811").catch((err) => {
              console.error("Error calling 811:", err);
              Alert.alert(
                "Error",
                "Could not make the call. Please check your device."
              );
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with logo */}
          <CurvedHeader
            title="Alberta Health Connect"
            height={120}
            showLogo={true}
          />

          <View style={styles.contentSection}>
            {/* Welcome Section */}
            <View style={styles.welcomeContainer}>
              <Text
                style={[
                  styles.welcomeText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Welcome, {userName} {userEmail}!!
              </Text>
              <View style={styles.healthStatusContainer}>
                <Text
                  style={[
                    styles.healthStatusLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Health Status
                </Text>
                <HealthStatusTag status={healthStatus} />
              </View>
            </View>

            {/* Symptom Assessment Button */}
            <TouchableOpacity
              style={styles.assessmentButton}
              onPress={handleSymptomAssessment}
            >
              <Text
                style={[
                  styles.assessmentButtonText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Start Symptom Assessment
              </Text>
            </TouchableOpacity>

            {/* Medical Disclaimer */}
            <View style={styles.disclaimerContainer}>
              <Text
                style={[
                  styles.disclaimerTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Medical Disclaimer
              </Text>
              <Text
                style={[
                  styles.disclaimerText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                This app provides health guidance only. It does not replace
                professional medical advice.
              </Text>
              <Text
                style={[
                  styles.disclaimerText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Always consult healthcare professionals for medical concerns.
              </Text>
            </View>

            {/* Emergency Notice */}
            <View style={styles.emergencyContainer}>
              <Text
                style={[
                  styles.emergencyTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Emergency Notice
              </Text>
              <Text
                style={[
                  styles.emergencyText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                For life-threatening emergencies, call 911 immediately. For
                urgent health concerns, contact Health Link Alberta at 811.
              </Text>

              <View style={styles.emergencyButtonsContainer}>
                <TouchableOpacity
                  style={styles.emergencyButton}
                  onPress={handleEmergencyCall}
                >
                  <Text
                    style={[
                      styles.emergencyButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Call 911
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.healthLinkButton}
                  onPress={callHealthLink}
                >
                  <Text
                    style={[
                      styles.healthLinkButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Call Health Link
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomNavigation />
      </CurvedBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 60, // Add padding to account for bottom navigation
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
  welcomeContainer: {
    marginBottom: 25,
    marginTop: -20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  healthStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: -10,
  },
  healthStatusLabel: {
    fontSize: 16,
    color: "#666",
    marginRight: 150,
  },
  healthStatusValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#28A745",
  },
  assessmentButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  assessmentButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  disclaimerContainer: {
    backgroundColor: "#FFF3CD",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFEAA7",
    marginBottom: 24,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#856404",
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: "#856404",
    marginBottom: 4,
    lineHeight: 20,
  },
  emergencyContainer: {
    backgroundColor: "#F8D7DA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5C6CB",
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#721C24",
    marginBottom: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: "#721C24",
    marginBottom: 16,
    lineHeight: 20,
  },
  emergencyButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  emergencyButton: {
    backgroundColor: "#DC3545",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  emergencyButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  healthLinkButton: {
    backgroundColor: "#6C757D",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: "center",
  },
  healthLinkButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ff3b30",
    textAlign: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#1A1A1A",
  },
  noProfileCard: {
    backgroundColor: "#fff3cd",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  noProfileText: {
    fontSize: 16,
    color: "#856404",
    textAlign: "center",
  },
});
