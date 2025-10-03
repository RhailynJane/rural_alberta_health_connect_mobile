import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../../convex/_generated/api";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function DailyLog() {
  // Get current user directly from your existing query
  const currentUser = useQuery(api.users.getCurrentUser);
  const todaysEntries = useQuery(
    api.healthEntries.getTodaysEntries,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  const handleAddLogEntry = () => {
    router.push("/tracker/add-health-entry");
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 9) return "#DC3545";
    if (severity >= 7) return "#FF6B35";
    if (severity >= 4) return "#FFC107";
    return "#28A745";
  };

  const getSeverityText = (severity: number) => {
    if (severity >= 9) return "Critical";
    if (severity >= 7) return "Severe";
    if (severity >= 4) return "Moderate";
    return "Mild";
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <CurvedHeader title="Health Tracker" height={120} showLogo={true} />

          <View>
            <View style={styles.contentSection}>
              <Text
                style={[
                  styles.disclaimerTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Daily Log - {new Date().toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.contentSection}>
              <View style={styles.entriesContainer}>
                {todaysEntries === undefined ? (
                  <Text
                    style={[
                      styles.entriesText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Loading...
                  </Text>
                ) : todaysEntries && todaysEntries.length > 0 ? (
                  <View style={styles.entriesList}>
                    {todaysEntries.map((entry) => (
                      <View key={entry._id} style={styles.entryItem}>
                        <View style={styles.entryHeader}>
                          <View style={styles.entryTime}>
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color="#666"
                            />
                            <Text
                              style={[
                                styles.timeText,
                                { fontFamily: FONTS.BarlowSemiCondensed },
                              ]}
                            >
                              {formatTime(entry.timestamp)}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.severityBadge,
                              {
                                backgroundColor: getSeverityColor(
                                  entry.severity
                                ),
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.severityText,
                                { fontFamily: FONTS.BarlowSemiCondensed },
                              ]}
                            >
                              {getSeverityText(entry.severity)} (
                              {entry.severity}/10)
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.symptomsText,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          {entry.symptoms}
                        </Text>

                        {entry.category && (
                          <View style={styles.categoryContainer}>
                            <Ionicons
                              name="pricetag-outline"
                              size={14}
                              color="#2A7DE1"
                            />
                            <Text
                              style={[
                                styles.categoryText,
                                { fontFamily: FONTS.BarlowSemiCondensed },
                              ]}
                            >
                              {entry.category}
                            </Text>
                          </View>
                        )}

                        <View style={styles.createdByContainer}>
                          <Ionicons
                            name={
                              entry.type === "ai_assessment"
                                ? "hardware-chip-outline"
                                : "person-outline"
                            }
                            size={12}
                            color="#666"
                          />
                          <Text
                            style={[
                              styles.createdByText,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                            ]}
                          >
                            {entry.createdBy}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.entriesText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    No entries for today
                  </Text>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

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
    paddingBottom: 100,
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
  entriesContainer: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    minHeight: 300,
  },
  entriesText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  entriesList: {
    gap: 12,
  },
  entryItem: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  entryTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    color: "#666",
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    color: "white",
    fontWeight: "600",
  },
  symptomsText: {
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 8,
    lineHeight: 20,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: "#2A7DE1",
  },
  createdByContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  createdByText: {
    fontSize: 11,
    color: "#666",
  },
  addButtonContainer: {
    position: "absolute",
    bottom: 120,
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
  disclaimerTitle: {
    fontSize: 20,
    color: "#333",
    textAlign: "center",
  },
});
