/* eslint-disable @typescript-eslint/no-unused-vars */
// app/dashboard.tsx
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

  // Get entries for the last 7 days to calculate health score
  const getLast7DaysDateRange = () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  };

  const dateRange = getLast7DaysDateRange();
  const weeklyEntries = useQuery(
    api.healthEntries.getEntriesByDateRange,
    user?._id
      ? {
          userId: user._id,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }
      : "skip"
  );

  // Calculate weekly health score
  const calculateWeeklyHealthScore = () => {
    if (!weeklyEntries || weeklyEntries.length === 0) return "0.0";

    const totalScore = weeklyEntries.reduce(
      (sum, entry) => sum + (10 - entry.severity),
      0
    );
    const averageScore = totalScore / weeklyEntries.length;
    return averageScore.toFixed(1);
  };

  const weeklyHealthScore = calculateWeeklyHealthScore();

  // Determine health status based on weekly health score
  useEffect(() => {
    if (!weeklyEntries || weeklyEntries.length === 0) {
      setHealthStatus("Unknown");
      return;
    }

    const score = parseFloat(weeklyHealthScore);
    if (score >= 8.0) {
      setHealthStatus("Excellent");
    } else if (score >= 6.0) {
      setHealthStatus("Good");
    } else if (score >= 4.0) {
      setHealthStatus("Fair");
    } else {
      setHealthStatus("Poor");
    }
  }, [weeklyHealthScore, weeklyEntries]);

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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2A7DE1" />
          <Text
            style={[
              styles.loadingText,
              { fontFamily: FONTS.BarlowSemiCondensed },
            ]}
          >
            Loading your dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Use currentUser data instead of userWithProfile for now
  const userName = user.firstName || "User";
  const userEmail = user.email;

  const handleSymptomAssessment = (): void => {
    // Navigate to symptom assessment screen using Expo Router
    router.push("/(tabs)/ai-assess");
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

  const navigateToHistory = (): void => {
    router.push("/tracker/history");
  };

  const navigateToDailyLog = (): void => {
    router.push("/tracker/daily-log");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Fixed Header */}
        <CurvedHeader
          title="Alberta Health Connect"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
        />

        {/* Content Area - Takes all available space minus header and bottom nav */}
        <View style={styles.contentArea}>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentSection}>
              {/* Welcome Section */}
              <View style={styles.welcomeContainer}>
                <Text
                  style={[
                    styles.welcomeText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Welcome, {userName}!
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

              {/* Weekly Health Score Card */}
              <View style={styles.healthScoreCard}>
                <View style={styles.healthScoreHeader}>
                  <Text
                    style={[
                      styles.healthScoreTitle,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Weekly Health Score
                  </Text>
                  <TouchableOpacity onPress={navigateToHistory}>
                    <Text
                      style={[
                        styles.viewDetailsText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      View Details
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.healthScoreContent}></View>
                <Text
                  style={[
                    styles.healthScoreValue,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  {weeklyEntries && weeklyEntries.length > 0
                    ? `${weeklyHealthScore}/10`
                    : "N/A"}
                </Text>
                <Text
                  style={[
                    styles.healthScoreSubtitle,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  {weeklyEntries && weeklyEntries.length > 0
                    ? `Based on ${weeklyEntries.length} entries this week`
                    : "No entries this week"}
                </Text>

                {/* Health Score Progress Bar - only show if there are entries */}
                {weeklyEntries && weeklyEntries.length > 0 && (
                  <>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${parseFloat(weeklyHealthScore) * 10}%` },
                        ]}
                      />
                    </View>

                    <View style={styles.scoreInterpretation}>
                      <Text
                        style={[
                          styles.interpretationText,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        {parseFloat(weeklyHealthScore) >= 8.0
                          ? "🎉 Excellent! Keep up the good work!"
                          : parseFloat(weeklyHealthScore) >= 6.0
                            ? "👍 Good overall health status"
                            : parseFloat(weeklyHealthScore) >= 4.0
                              ? "⚠️ Fair - monitor your symptoms"
                              : "🚨 Poor - consider seeking medical advice"}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActionsContainer}>
                <Text
                  style={[
                    styles.quickActionsTitle,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Quick Actions
                </Text>

                <View style={styles.quickActionsRow}>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={handleSymptomAssessment}
                  >
                    <View style={styles.quickActionIcon}>
                      <Text style={styles.quickActionEmoji}>🤖</Text>
                    </View>
                    <Text
                      style={[
                        styles.quickActionText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      AI Assessment
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={navigateToDailyLog}
                  >
                    <View style={styles.quickActionIcon}>
                      <Text style={styles.quickActionEmoji}>📝</Text>
                    </View>
                    <Text
                      style={[
                        styles.quickActionText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Daily Log
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

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
        </View>
      </CurvedBackground>
      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentArea: {
    flex: 1, 
    paddingBottom: 60, 
  },
  contentContainer: {
    flexGrow: 1,
  },
  contentSection: {
    padding: 24,
  },
  welcomeContainer: {
    marginBottom: 10,
    marginTop: -20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 10,
  },
  healthStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: 10,
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
  // Health Score Card Styles
  healthScoreCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  healthScoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  healthScoreTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  viewDetailsText: {
    fontSize: 14,
    color: "#2A7DE1",
    fontWeight: "600",
  },
  healthScoreContent: {
    alignItems: "center",
  },
  healthScoreValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#2A7DE1",
    marginBottom: 8,
  },
  healthScoreSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    textAlign: "center",
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
    marginBottom: 10,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#28A745",
    borderRadius: 4,
  },
  scoreInterpretation: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    width: "100%",
  },
  interpretationText: {
    fontSize: 14,
    color: "#1A1A1A",
    textAlign: "center",
  },
  // Quick Actions Styles
  quickActionsContainer: {
    marginBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickActionButton: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    alignItems: "center",
    flex: 1,
    marginHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2A7DE1",
    textAlign: "center",
  },
  assessmentButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  assessmentButtonText: {
    color: "white",
    fontSize: 16,
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
    marginBottom: 10,
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
