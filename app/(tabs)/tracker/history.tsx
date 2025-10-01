import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function History() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ); // 7 days ago
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedRange, setSelectedRange] = useState("7d"); // Default to 7 days

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
        setStartDate(today);
        setEndDate(today);
        break;
      case "7d":
        setStartDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
        setEndDate(today);
        break;
      case "30d":
        setStartDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
        setEndDate(today);
        break;
      case "custom":
        // Keep current dates for custom selection
        break;
    }
  };

  const onStartDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      // Validate that start date is not after end date
      if (selectedDate > endDate) {
        Alert.alert("Invalid Date", "Start date must be before end date");
        return;
      }
      setStartDate(selectedDate);
      setSelectedRange("custom");
    }
  };

  const onEndDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      // Validate that end date is not before start date
      if (selectedDate < startDate) {
        Alert.alert("Invalid Date", "End date must be after start date");
        return;
      }
      setEndDate(selectedDate);
      setSelectedRange("custom");
    }
  };

  const showMedicalDisclaimer = () => {
    Alert.alert(
      "Medical Disclaimer",
      "This tracker is for personal monitoring only.\nSeek immediate medical attention for severe symptoms or emergencies.",
      [{ text: "OK", onPress: () => console.log("Disclaimer acknowledged") }]
    );
  };

  // Sample data - in a real app this would come from your data source
  const sampleEntries = [
    {
      id: 1,
      date: new Date(2025, 8, 13, 14, 30), // Month is 0-indexed
      severity: "Mild",
      description: "Mild headache after working outside in cold",
    },
    {
      id: 2,
      date: new Date(2025, 8, 12, 14, 30),
      severity: "Moderate",
      description: "Knee pain after shoveling snow",
    },
    {
      id: 3,
      date: new Date(2025, 8, 10, 9, 15),
      severity: "Severe",
      description: "Migraine with sensitivity to light",
    },
  ];

  // Filter entries based on selected date range
  const filteredEntries = sampleEntries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= startDate && entryDate <= endDate;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <CurvedHeader title="History" height={120} showLogo={true} />

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
                    selectedRange === "today" && styles.quickSelectButtonActive,
                  ]}
                  onPress={() => handleRangeSelection("today")}
                >
                  <Text
                    style={[
                      styles.quickSelectText,
                      selectedRange === "today" && styles.quickSelectTextActive,
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
                  8.5/10
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

            {/* Health Trends */}
            <View style={styles.trendsContainer}>
              <Ionicons
                name="trending-up"
                size={20}
                color="#2E7D32"
                style={styles.icon}
              />
              <View style={styles.trendsContent}>
                <Text
                  style={[
                    styles.trendsTitle,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Health Trends
                </Text>
                <Text
                  style={[
                    styles.trendsSubtitle,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Symptom Frequency
                </Text>
                <Text
                  style={[
                    styles.trendsText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Decreased by 30%
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
                  <View key={entry.id} style={styles.entryItem}>
                    <Ionicons
                      name="document"
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
                          {formatDate(entry.date)} {formatTime(entry.date)}
                        </Text>
                        <View
                          style={[
                            styles.severityBadge,
                            entry.severity === "Mild" && {
                              backgroundColor: "#E8F5E8",
                            },
                            entry.severity === "Moderate" && {
                              backgroundColor: "#FFF3CD",
                            },
                            entry.severity === "Severe" && {
                              backgroundColor: "#F8D7DA",
                            },
                          ]}
                        >
                          <Ionicons
                            name="alert-circle"
                            size={14}
                            color={
                              entry.severity === "Mild"
                                ? "#28A745"
                                : entry.severity === "Moderate"
                                  ? "#FFC107"
                                  : "#DC3545"
                            }
                          />
                          <Text
                            style={[
                              styles.entrySeverity,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                              entry.severity === "Mild" && { color: "#28A745" },
                              entry.severity === "Moderate" && {
                                color: "#856404",
                              },
                              entry.severity === "Severe" && {
                                color: "#721C24",
                              },
                            ]}
                          >
                            {entry.severity}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.entryDescription,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        {entry.description}
                      </Text>
                    </View>
                  </View>
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
    paddingBottom: 80,
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
  disclaimerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8D7DA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F5C6CB",
  },
  disclaimerButtonText: {
    marginLeft: 8,
    color: "#721C24",
    fontSize: 14,
    fontFamily: FONTS.BarlowSemiCondensed,
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
  trendsContainer: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  backgroundColor: "#E8F5E8",
  padding: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#C8E6C9",
  marginBottom: 16,
},
trendsContent: {
  flex: 1,
  marginLeft: 8,
},
trendsTitle: {
  fontSize: 16,
  fontWeight: "600",
  color: "#2E7D32",
  marginBottom: 4,
},
trendsSubtitle: {
  fontSize: 14,
  fontWeight: "500",
  color: "#2E7D32",
  marginBottom: 2,
},
trendsText: {
  fontSize: 14,
  color: "#2E7D32",
},
});
