import { useConvexAuth, useQuery } from "convex/react";
import { router } from "expo-router";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../../convex/_generated/api";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import { FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

export default function Tracker() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { isOnline } = useNetworkStatus();
  
  // Get reminder settings
  const reminderSettings = useQuery(
    (api as any)["profile/reminders"].getReminderSettings,
    isAuthenticated && !isLoading ? {} : "skip"
  );
  const handleAddLogEntry = () => {
    router.push("/tracker/add-health-entry");
  };

  const navigateToDailyLog = () => {
    router.push("/tracker/daily-log");
  };

  const navigateToHistory = () => {
    router.push("/tracker/history");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
      <CurvedBackground>
        {/* Due reminder banner (offline-capable) */}
        <DueReminderBanner topOffset={120} />
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <CurvedHeader
            title="Health Tracker"
            height={150}
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
            showNotificationBell={true}
            reminderEnabled={reminderSettings?.enabled || false}
            reminderSettings={reminderSettings || null}
          />

          <View style={styles.contentSection}>
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
                This tracker is for personal monitoring only.
              </Text>
              <Text
                style={[
                  styles.disclaimerText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Seek immediate medical attention for severe symptoms or
                emergencies.
              </Text>
            </View>

            {/* Navigation Cards */}
            <View style={styles.navigationContainer}>
              <TouchableOpacity
                style={styles.navCard}
                onPress={navigateToDailyLog}
              >
                <Text
                  style={[
                    styles.navCardTitle,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Daily Log
                </Text>
                <Text
                  style={[
                    styles.navCardText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  View and manage todays health entries
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navCard}
                onPress={navigateToHistory}
              >
                <Text
                  style={[
                    styles.navCardTitle,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  History
                </Text>
                <Text
                  style={[
                    styles.navCardText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  View past entries and health trends
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Add Log Entry Button */}
        <View style={styles.addButtonContainer}>
          <TouchableOpacity
            style={styles.addEntryButton}
            onPress={handleAddLogEntry}
          >
            <Text
              style={[
                styles.addEntryButtonText,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              Add Log Entry
            </Text>
          </TouchableOpacity>
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
  contentContainer: {
    flexGrow: 1,
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
  disclaimerContainer: {
    backgroundColor: "#FFF3CD",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFEAA7",
    marginBottom: 24,
    marginTop: -30,
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
  navigationContainer: {
    gap: 16,
  },
  navCard: {
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  navCardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2A7DE1",
    marginBottom: 8,
  },
  navCardText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  addButtonContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    backgroundColor: "transparent",
  },
  addEntryButton: {
    backgroundColor: "#28A745",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addEntryButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
