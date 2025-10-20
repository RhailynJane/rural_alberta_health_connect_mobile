import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../../../convex/_generated/api";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function History() {
  const currentUser = useQuery(api.users.getCurrentUser);

  // Set dates without time components for proper filtering
  const getDateWithoutTime = (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  };

  const getEndOfDay = (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  };

  const [startDate, setStartDate] = useState(
    getDateWithoutTime(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  );
  const [endDate, setEndDate] = useState(getEndOfDay(new Date()));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedRange, setSelectedRange] = useState("7d");

  // Get all user entries
  const allEntries = useQuery(
    api.healthEntries.getAllUserEntries,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  const handleViewEntryDetails = (entryId: string) => {
    router.push({
      pathname: "/tracker/log-details",
      params: { entryId },
    });
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${formattedMinutes} ${ampm}`;
  };

  const handleRangeSelection = (range: "today" | "7d" | "30d" | "custom") => {
    setSelectedRange(range);
    const today = new Date();

    switch (range) {
      case "today":
        setStartDate(getDateWithoutTime(today));
        setEndDate(getEndOfDay(today));
        break;
      case "7d":
        setStartDate(
          getDateWithoutTime(
            new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          )
        );
        setEndDate(getEndOfDay(today));
        break;
      case "30d":
        setStartDate(
          getDateWithoutTime(
            new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          )
        );
        setEndDate(getEndOfDay(today));
        break;
      case "custom":
        // Keep current dates for custom selection
        break;
    }
  };

  const onStartDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const dateWithoutTime = getDateWithoutTime(selectedDate);
      // Validate that start date is not after end date
      if (dateWithoutTime > endDate) {
        Alert.alert("Invalid Date", "Start date must be before end date");
        return;
      }
      setStartDate(dateWithoutTime);
      setSelectedRange("custom");
    }
  };

  const onEndDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      const endOfDay = getEndOfDay(selectedDate);
      // Validate that end date is not before start date
      if (endOfDay < startDate) {
        Alert.alert("Invalid Date", "End date must be after start date");
        return;
      }
      setEndDate(endOfDay);
      setSelectedRange("custom");
    }
  };

  // Filter entries based on selected date range
  const filteredEntries =
    allEntries?.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    }) || [];

  // Calculate health score
  const healthScore =
    filteredEntries.length > 0
      ? (
          filteredEntries.reduce(
            (sum, entry) => sum + (10 - entry.severity),
            0
          ) / filteredEntries.length
        ).toFixed(1)
      : "0.0";

  // Debug logging
  console.log("Filtering entries:", {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalEntries: allEntries?.length,
    filteredEntries: filteredEntries.length,
    selectedRange,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Fixed Header (not scrollable) */}
        <CurvedHeader
          title="History"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
        />

        {/* Scrollable content area below header */}
        <View style={styles.contentArea}>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
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

              {/* Date Range Selection */}
              <View style={styles.dateRangeContainer}>
                <View style={styles.dateRangeHeader}>
                  <Ionicons
                    name="calendar"
                    size={20}
                    color="#2A7DE1"
                    style={styles.icon}
                  />
                  <Text
                    style={[
                      styles.dateRangeText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Select Date Range
                  </Text>
                </View>

                {/* Quick Selection Buttons */}
                <View style={styles.quickSelectContainer}>
                  <TouchableOpacity
                    style={[
                      styles.quickSelectButton,
                      selectedRange === "today" &&
                        styles.quickSelectButtonActive,
                    ]}
                    onPress={() => handleRangeSelection("today")}
                  >
                    <Text
                      style={[
                        styles.quickSelectText,
                        selectedRange === "today" &&
                          styles.quickSelectTextActive,
                      ]}
                    >
                      Today
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.quickSelectButton,
                      selectedRange === "7d" && styles.quickSelectButtonActive,
                    ]}
                    onPress={() => handleRangeSelection("7d")}
                  >
                    <Text
                      style={[
                        styles.quickSelectText,
                        selectedRange === "7d" && styles.quickSelectTextActive,
                      ]}
                    >
                      7 Days
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.quickSelectButton,
                      selectedRange === "30d" && styles.quickSelectButtonActive,
                    ]}
                    onPress={() => handleRangeSelection("30d")}
                  >
                    <Text
                      style={[
                        styles.quickSelectText,
                        selectedRange === "30d" && styles.quickSelectTextActive,
                      ]}
                    >
                      30 Days
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Custom Date Selection */}
                <View style={styles.customDateContainer}>
                  <View style={styles.dateField}>
                    <Text style={styles.dateFieldLabel}>From</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Text style={styles.dateInputText}>
                        {formatDate(startDate)}
                      </Text>
                      <Ionicons name="calendar" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateField}>
                    <Text style={styles.dateFieldLabel}>To</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Text style={styles.dateInputText}>
                        {formatDate(endDate)}
                      </Text>
                      <Ionicons name="calendar" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Health Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Ionicons
                    name="stats-chart"
                    size={24}
                    color="#2A7DE1"
                    style={styles.statIcon}
                  />
                  <Text
                    style={[
                      styles.statValue,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    {filteredEntries.length > 0 ? `${healthScore}/10` : "N/A"}
                  </Text>
                  <Text
                    style={[
                      styles.statLabel,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Health Score
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons
                    name="document-text"
                    size={24}
                    color="#2A7DE1"
                    style={styles.statIcon}
                  />
                  <Text
                    style={[
                      styles.statValue,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    {filteredEntries.length}
                  </Text>
                  <Text
                    style={[
                      styles.statLabel,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Total Entries
                  </Text>
                </View>
              </View>

              {/* Entries List */}
              <View style={styles.entriesList}>
                <Text style={styles.entriesTitle}>
                  Recent Entries ({filteredEntries.length})
                </Text>

                {filteredEntries.length > 0 ? (
                  filteredEntries.map((entry) => (
                    <TouchableOpacity
                      key={entry._id}
                      style={styles.entryItem}
                      onPress={() => handleViewEntryDetails(entry._id)}
                    >
                      <Ionicons
                        name={
                          entry.type === "ai_assessment"
                            ? "hardware-chip-outline"
                            : "document-text"
                        }
                        size={20}
                        color="#2A7DE1"
                        style={styles.entryIcon}
                      />
                      <View style={styles.entryContent}>
                        <View style={styles.entryHeader}>
                          <Text
                            style={[
                              styles.entryDate,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                            ]}
                          >
                            {formatDate(new Date(entry.timestamp))}{" "}
                            {formatTime(new Date(entry.timestamp))}
                          </Text>
                          <View
                            style={[
                              styles.severityBadge,
                              entry.severity <= 3 && {
                                backgroundColor: "#E8F5E8",
                              },
                              entry.severity > 3 &&
                                entry.severity <= 7 && {
                                  backgroundColor: "#FFF3CD",
                                },
                              entry.severity > 7 && {
                                backgroundColor: "#F8D7DA",
                              },
                            ]}
                          >
                            <Ionicons
                              name="alert-circle"
                              size={14}
                              color={
                                entry.severity <= 3
                                  ? "#28A745"
                                  : entry.severity <= 7
                                    ? "#FFC107"
                                    : "#DC3545"
                              }
                            />
                            <Text
                              style={[
                                styles.entrySeverity,
                                { fontFamily: FONTS.BarlowSemiCondensed },
                                entry.severity <= 3 && { color: "#28A745" },
                                entry.severity > 3 &&
                                  entry.severity <= 7 && {
                                    color: "#856404",
                                  },
                                entry.severity > 7 && {
                                  color: "#721C24",
                                },
                              ]}
                            >
                              {entry.severity <= 3
                                ? "Mild"
                                : entry.severity <= 7
                                  ? "Moderate"
                                  : "Severe"}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.entryDescription,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          {entry.symptoms}
                        </Text>
                        <View style={styles.entryFooter}>
                          <Text
                            style={[
                              styles.entryType,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                            ]}
                          >
                            {entry.type === "ai_assessment"
                              ? "AI Assessment"
                              : "Manual Entry"}{" "}
                            • {entry.createdBy}
                          </Text>
                        </View>
                        {/* View Details Indicator */}
                        <View style={styles.viewDetailsIndicator}>
                          <Text style={styles.viewDetailsText}>
                            Tap to view details
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color="#666"
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noEntries}>
                    <Ionicons name="document" size={40} color="#CCC" />
                    <Text style={styles.noEntriesText}>
                      No entries found for selected date range
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onStartDateChange}
            maximumDate={endDate}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onEndDateChange}
            minimumDate={startDate}
            maximumDate={new Date()}
          />
        )}
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
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 80,
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
  dateRangeContainer: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: 16,
  },
  dateRangeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  icon: {
    marginRight: 8,
  },
  dateRangeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  quickSelectContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  quickSelectButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#E9ECEF",
  },
  quickSelectButtonActive: {
    backgroundColor: "#2A7DE1",
  },
  quickSelectText: {
    fontSize: 14,
    color: "#666",
  },
  quickSelectTextActive: {
    color: "white",
    fontWeight: "600",
  },
  customDateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateField: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateFieldLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  dateInputText: {
    fontSize: 14,
    color: "#1A1A1A",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statItem: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    flex: 1,
    marginHorizontal: 8,
    alignItems: "center",
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2A7DE1",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  entriesList: {
    gap: 12,
  },
  entriesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  entryItem: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  entryIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 14,
    color: "#666",
  },
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  entrySeverity: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  entryDescription: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 20,
  },
  entryFooter: {
    marginTop: 8,
  },
  entryType: {
    fontSize: 12,
    color: "#666",
  },
  viewDetailsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  viewDetailsText: {
    fontSize: 12,
    color: "#666",
    marginRight: 4,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  noEntries: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  noEntriesText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
});
