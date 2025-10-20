/* eslint-disable @typescript-eslint/no-unused-vars */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../../convex/_generated/api";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

const styles = StyleSheet.create({
  contentArea: {
    flex: 1,
    paddingBottom: 60,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  contentSection: {
    padding: 15,
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
    textAlign: "center" as const,
    lineHeight: 24,
  },
  entriesList: {
    // gap is not supported in RN, use marginBottom on children if needed
  },
  entryItem: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  entryTime: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    // gap is not supported in RN
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
    fontWeight: "600" as const,
  },
  symptomsText: {
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 8,
    lineHeight: 20,
  },
  categoryContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: "#2A7DE1",
  },
  createdByContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  createdByText: {
    fontSize: 11,
    color: "#666",
  },
  viewDetailsButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  viewDetailsText: {
    fontSize: 14,
    color: "#2A7DE1",
    fontWeight: "600" as const,
    marginRight: 4,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  addButtonContainer: {
    position: "absolute" as const,
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
    alignItems: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addEntryButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600" as const,
  },
  disclaimerTitle: {
    fontSize: 20,
    color: "#333",
    textAlign: "center" as const,
  },
});

export default function DailyLog() {
  const insets = useSafeAreaInsets();
  const currentUser = useQuery(api.users.getCurrentUser);
  const todaysEntries = useQuery(
    api.healthEntries.getTodaysEntries,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  const handleAddLogEntry = () => {
    router.push("/tracker/add-health-entry");
  };

  const handleViewEntryDetails = (entryId: string) => {
    router.push({ pathname: "/tracker/log-details", params: { entryId } });
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
      <CurvedBackground style={{ flex: 1 }}>
        {/* Fixed Header */}
        <CurvedHeader
          title="Tracker - Daily Log"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
        />
        <View style={styles.contentArea}>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentSection}>
              <View style={{ marginBottom: 10, marginTop: -20, alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  <Text
                    style={{
                      fontSize: 24,
                      lineHeight: 28,
                      fontWeight: "600",
                      color: "#1A1A1A",
                      fontFamily: FONTS.BarlowSemiCondensed,
                    }}
                  >
                    Daily Log
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 10 }}>
                    <Ionicons name="calendar-outline" size={22} color="#2A7DE1" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 24, lineHeight: 28, fontWeight: "600", color: "#2A7DE1", fontFamily: FONTS.BarlowSemiCondensed }}>
                      {new Date().toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 16, lineHeight: 20, color: "#666", fontFamily: FONTS.BarlowSemiCondensed, textAlign: "center" }}>
                  Your daily health entries for today
                </Text>
              </View>
            </View>
            <View style={styles.contentSection}>
              <View style={styles.entriesContainer}>
                {todaysEntries === undefined ? (
                  <Text style={[styles.entriesText, { fontFamily: FONTS.BarlowSemiCondensed }]}>Loading...</Text>
                ) : todaysEntries && todaysEntries.length > 0 ? (
                  <View>
                    {todaysEntries.map((entry) => (
                      <TouchableOpacity
                        key={entry._id}
                        style={styles.entryItem}
                        onPress={() => handleViewEntryDetails(entry._id)}
                      >
                        <View style={styles.entryHeader}>
                          <View style={styles.entryTime}>
                            <Ionicons name="time-outline" size={16} color="#666" />
                            <Text style={[styles.timeText, { fontFamily: FONTS.BarlowSemiCondensed }]}> {formatTime(entry.timestamp)} </Text>
                          </View>
                          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(entry.severity) }]}> 
                            <Text style={[styles.severityText, { fontFamily: FONTS.BarlowSemiCondensed }]}> {getSeverityText(entry.severity)} ({entry.severity}/10) </Text>
                          </View>
                        </View>
                        <Text style={[styles.symptomsText, { fontFamily: FONTS.BarlowSemiCondensed }]}> {entry.symptoms} </Text>
                        {entry.category ? (
                          <View style={styles.categoryContainer}>
                            <Ionicons name="pricetag-outline" size={14} color="#2A7DE1" />
                            <Text style={[styles.categoryText, { fontFamily: FONTS.BarlowSemiCondensed }]}> {entry.category} </Text>
                          </View>
                        ) : null}
                        <View style={styles.createdByContainer}>
                          <Ionicons name={entry.type === "ai_assessment" ? "hardware-chip-outline" : "person-outline"} size={12} color="#666" />
                          <Text style={[styles.createdByText, { fontFamily: FONTS.BarlowSemiCondensed }]}> {entry.createdBy} </Text>
                        </View>
                        {/* View Details Button */}
                        <TouchableOpacity style={styles.viewDetailsButton} onPress={() => handleViewEntryDetails(entry._id)}>
                          <Text style={styles.viewDetailsText}>View Details</Text>
                          <Ionicons name="chevron-forward" size={16} color="#2A7DE1" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.entriesText, { fontFamily: FONTS.BarlowSemiCondensed }]}>No entries for today</Text>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </CurvedBackground>
              <BottomNavigation />

    </SafeAreaView>
  );
}

