import HealthEntry from "@/watermelon/models/HealthEntry";
import { Q } from "@nozbe/watermelondb";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useConvexAuth, useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../../../convex/_generated/api";
import { useWatermelonDatabase } from "../../../watermelon/hooks/useDatabase";
import { analyzeDuplicates, dedupeHealthEntries } from "../../../watermelon/utils/dedupeHealthEntries";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import { COLORS, FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

export default function History() {
  const database = useWatermelonDatabase();
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");
  const [searchQuery, setSearchQuery] = useState("");
  const [offlineEntries, setOfflineEntries] = useState<any[]>([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalButtons, setModalButtons] = useState<
    {
      label: string;
      onPress: () => void;
      variant?: "primary" | "secondary" | "destructive";
    }[]
  >([]);

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

  // Initialize with last 7 days (6 days ago + today = 7 days total, matching Dashboard)
  const getInitialStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 6); // 6 days back + today = 7 days
    return getDateWithoutTime(date);
  };

  const [startDate, setStartDate] = useState(getInitialStartDate());
  const [endDate, setEndDate] = useState(getEndOfDay(new Date()));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedRange, setSelectedRange] = useState("7d");

  // Get all user entries (online)
  const allEntriesOnline = useQuery(
    api.healthEntries.getAllUserEntries,
    currentUser && isOnline ? { userId: currentUser._id } : "skip"
  );

  // Get offline entries from WatermelonDB
  useEffect(() => {
    const fetchOfflineEntries = async () => {
      try {
        // ALWAYS load from WatermelonDB first for instant display
        // Then online data will replace it when loaded

        // Determine user id
        let uid: string | undefined = currentUser?._id as any;
        if (!uid) {
          try {
            const raw = await AsyncStorage.getItem("@profile_user");
            if (raw) {
              const parsed = JSON.parse(raw);
              uid = parsed?._id || parsed?.id || uid;
            }
          } catch { }
        }
        if (!uid) {
          // Try Watermelon users table
          try {
            const usersCol = database.get('users');
            const allUsers = await usersCol.query().fetch();
            const first = (allUsers as any[])[0];
            if (first) {
              const r = (first as any)._raw || {};
              uid = (first as any).convexUserId || r.convex_user_id || (first as any).id || r.id;
            }
          } catch { }
        }
        if (!uid) {
          console.log('⚠️ [OFFLINE HISTORY] No user id available');
          setOfflineEntries([]);
          return;
        }

        const collection = database.get<HealthEntry>("health_entries");
        const entries = await collection
          .query(
            Q.where('userId', uid),
            Q.sortBy("timestamp", Q.desc)
          )
          .fetch();

        console.log(`🔍 [LOCAL HISTORY] Fetched ${entries.length} entries from WatermelonDB for user ${uid}`);

        // Map WatermelonDB entries to match Convex format
        const mapped = entries.map((entry: any) => {
          return {
            _id: entry.id,
            symptoms: entry.symptoms || "",
            severity: entry.severity || 0,
            category: entry.category || "",
            notes: entry.notes || "",
            timestamp: entry.timestamp || Date.now(),
            createdBy: entry.createdBy || "User",
            type: entry.type || "manual_entry",
            convexId: entry.convexId, // For de-duplication
          };
        });

        console.log(`✅ [LOCAL HISTORY] Loaded ${mapped.length} entries instantly from local cache`);
        setOfflineEntries(mapped);
      } catch (error) {
        console.error("Error fetching offline entries:", error);
        setOfflineEntries([]);
      }
    };
    // Fetch immediately on mount for instant display
    fetchOfflineEntries();
  }, [database, currentUser?._id]); // Removed isOnline dependency - always load local cache

  // Use online or offline data with de-duplication (by convexId if present, else timestamp+type)
  const allEntries = useMemo(() => {
    // Prefer online if available; otherwise offline.
    const base = (isOnline && allEntriesOnline) ? allEntriesOnline : offlineEntries;
    if (!Array.isArray(base)) return base;
    // Apply more robust dedupe that chooses best candidate among duplicates instead of first-seen.
    const deduped = dedupeHealthEntries(base as any);
    if (deduped.length !== base.length) {
      console.log(`🧹 [HISTORY DEDUPE] Reduced entries ${base.length} -> ${deduped.length}`);
      const dups = analyzeDuplicates(base as any);
      if (dups.length) {
        console.log(`🧪 [HISTORY DUP GROUPS] ${dups.length} groups`, dups.map(g => ({ picked: g.pickedId, candidates: g.candidates.map(c => c._id) })));
      }
    }
    return deduped;
  }, [isOnline, allEntriesOnline, offlineEntries]);

  // Status log to verify mode and counts
  useEffect(() => {
    const onlineCount = Array.isArray(allEntriesOnline) ? allEntriesOnline.length : (allEntriesOnline === undefined ? 'undefined' : '0');
    console.log(
      "📈 [HISTORY STATUS] isOnline=",
      isOnline,
      " userId=",
      currentUser?._id,
      " onlineLen=",
      onlineCount,
      " offlineLen=",
      offlineEntries.length
    );
  }, [isOnline, currentUser?._id, allEntriesOnline, offlineEntries]);

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
        // Last 7 days: 6 days ago + today = 7 days (matching Dashboard)
        const sevenDaysStart = new Date(today);
        sevenDaysStart.setDate(today.getDate() - 6);
        setStartDate(getDateWithoutTime(sevenDaysStart));
        setEndDate(getEndOfDay(today));
        break;
      case "30d":
        // Last 30 days: 29 days ago + today = 30 days
        const thirtyDaysStart = new Date(today);
        thirtyDaysStart.setDate(today.getDate() - 29);
        setStartDate(getDateWithoutTime(thirtyDaysStart));
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
        setModalTitle("Invalid Date");
        setModalMessage("Start date must be before end date");
        setModalButtons([
          {
            label: "OK",
            onPress: () => setModalVisible(false),
            variant: "primary",
          },
        ]);
        setModalVisible(true);
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
        setModalTitle("Invalid Date");
        setModalMessage("End date must be after start date");
        setModalButtons([
          {
            label: "OK",
            onPress: () => setModalVisible(false),
            variant: "primary",
          },
        ]);
        setModalVisible(true);
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

  // Apply search filter (case-insensitive)
  const searchFilteredEntries = filteredEntries.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.symptoms.toLowerCase().includes(query) ||
      entry.category?.toLowerCase().includes(query) ||
      entry.notes?.toLowerCase().includes(query) ||
      entry.createdBy.toLowerCase().includes(query)
    );
  });

  // Calculate health score
  const healthScore =
    searchFilteredEntries.length > 0
      ? (
        searchFilteredEntries.reduce(
          (sum, entry) => sum + (10 - entry.severity),
          0
        ) / searchFilteredEntries.length
      ).toFixed(1)
      : "0.0";

  // Debug logging
  console.log("Filtering entries:", {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalEntries: allEntries?.length,
    filteredEntries: filteredEntries.length,
    searchFilteredEntries: searchFilteredEntries.length,
    selectedRange,
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
      <CurvedBackground style={{ flex: 1 }}>
        <DueReminderBanner topOffset={120} />
        {/* Fixed Header (not scrollable) */}
        <CurvedHeader
          title="History"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
        />

        {/* Fixed Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search-outline" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search history..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery("")}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

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
                    {Array.isArray(allEntries) ? allEntries.length : 0}
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
                  Recent Entries ({searchFilteredEntries.length})
                </Text>

                {searchFilteredEntries.length > 0 ? (
                  searchFilteredEntries.map((entry) => (
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
                      {searchQuery.trim()
                        ? "No entries match your search"
                        : "No entries found for selected date range"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Date Pickers - iOS Modal with backdrop dismissal */}
        {showStartDatePicker && Platform.OS === "ios" && (
          <Modal
            visible={showStartDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowStartDatePicker(false)}
          >
            <TouchableOpacity
              style={styles.datePickerModalOverlay}
              activeOpacity={1}
              onPress={() => setShowStartDatePicker(false)}
            >
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                    <Text style={styles.datePickerDoneButton}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="spinner"
                  onChange={onStartDateChange}
                  maximumDate={endDate}
                  themeVariant="light"
                  style={styles.dateTimePicker}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {showStartDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={onStartDateChange}
            maximumDate={endDate}
          />
        )}

        {showEndDatePicker && Platform.OS === "ios" && (
          <Modal
            visible={showEndDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowEndDatePicker(false)}
          >
            <TouchableOpacity
              style={styles.datePickerModalOverlay}
              activeOpacity={1}
              onPress={() => setShowEndDatePicker(false)}
            >
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                    <Text style={styles.datePickerDoneButton}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="spinner"
                  onChange={onEndDateChange}
                  minimumDate={startDate}
                  maximumDate={new Date()}
                  themeVariant="light"
                  style={styles.dateTimePicker}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {showEndDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={onEndDateChange}
            minimumDate={startDate}
            maximumDate={new Date()}
          />
        )}
      </CurvedBackground>
      <BottomNavigation />

      {/* Custom Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <View style={styles.modalButtons}>
              {modalButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalButton,
                    button.variant === "destructive" && styles.destructiveButton,
                    button.variant === "secondary" && styles.secondaryButton,
                  ]}
                  onPress={button.onPress}
                >
                  <Text
                    style={[
                      styles.modalButtonText,
                      button.variant === "secondary" && styles.secondaryButtonText,
                    ]}
                  >
                    {button.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  searchContainer: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 16,
    color: "#1A1A1A",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  clearButton: {
    padding: 4,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 12,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  modalMessage: {
    fontSize: 16,
    color: "#333",
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 100,
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  destructiveButton: {
    backgroundColor: "#DC3545",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  secondaryButtonText: {
    color: COLORS.primary,
  },
  // Date Picker Modal Styles
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  datePickerDoneButton: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  dateTimePicker: {
    backgroundColor: "white",
    height: 200,
  },
});
