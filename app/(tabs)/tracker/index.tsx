import { useConvexAuth, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [entriesByDate, setEntriesByDate] = useState<{ [key: string]: any[] }>({});

  // Get reminder settings
  const reminderSettings = useQuery(
    (api as any)["profile/reminders"].getReminderSettings,
    isAuthenticated && !isLoading ? ({} as any) : "skip"
  );

  // Current user (for userId)
  const currentUser = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");

              const handleAddLogEntry = () => {
                router.push("/tracker/add-health-entry");
              };

              const navigateToHistory = () => {
                router.push("/tracker/history");
              };

              // Date helpers
              const formatDate = (date: Date) => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, "0");
                const d = String(date.getDate()).padStart(2, "0");
                return `${y}-${m}-${d}`;
              };

              // Fetch entries online
              const allEntriesOnline = useQuery(
                api.healthEntries.getAllUserEntries,
                currentUser? { userId: (currentUser as any)._id } : "skip"
              );
              const allEntries = useMemo(() => Array.isArray(allEntriesOnline) ? allEntriesOnline : [], [allEntriesOnline]);

              // Group by local date
              useEffect(() => {
                const grouped: { [key: string]: any[] } = {};
                allEntries.forEach((entry: any) => {
                  const dt = new Date(entry.timestamp);
                  const key = formatDate(dt);
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(entry);
                });
                setEntriesByDate(grouped);
              }, [allEntries]);

              // Entries to display based on selection/month
              const displayEntries = useMemo(() => {
                if (selectedDate) {
                  return entriesByDate[selectedDate] || [];
                }
                return allEntries.filter((entry: any) => {
                  const dt = new Date(entry.timestamp);
                  return (
                    dt.getFullYear() === currentMonth.getFullYear() &&
                    dt.getMonth() === currentMonth.getMonth()
                  );
                });
              }, [selectedDate, entriesByDate, allEntries, currentMonth]);

              return (
                <SafeAreaView style={styles.safeArea} edges={isOnline ? ["top", "bottom"] : ["bottom"]}>
                  <CurvedBackground>
                    <DueReminderBanner topOffset={120} />
                    <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
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
                        {/* Calendar View */}
                        <View style={styles.calendarContainer}>
                          {/* View Mode Toggle */}
                          <View style={styles.viewModeToggle}>
                            <TouchableOpacity
                              style={[styles.viewModeButton, viewMode === "month" && styles.viewModeButtonActive]}
                              onPress={() => { setViewMode("month"); setSelectedDate(null); }}
                            >
                              <Text style={[styles.viewModeButtonText, viewMode === "month" && styles.viewModeButtonTextActive, { fontFamily: FONTS.BarlowSemiCondensed }]}>Month</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.viewModeButton, viewMode === "week" && styles.viewModeButtonActive]}
                              onPress={() => { setViewMode("week"); setSelectedDate(null); }}
                            >
                              <Text style={[styles.viewModeButtonText, viewMode === "week" && styles.viewModeButtonTextActive, { fontFamily: FONTS.BarlowSemiCondensed }]}>Week</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Month Navigation */}
                          <View style={styles.monthHeader}>
                            <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                              <Text style={{ color: "#2A7DE1", fontSize: 16 }}>{"<"}</Text>
                            </TouchableOpacity>
                            <Text style={[styles.monthTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                              {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                            </Text>
                            <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                              <Text style={{ color: "#2A7DE1", fontSize: 16 }}>{">"}</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Calendar Grid */}
                          <View style={styles.calendarGrid}>
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                              <Text key={`header-${day}`} style={[styles.dayHeader, { fontFamily: FONTS.BarlowSemiCondensed }]}>{day}</Text>
                            ))}

                            {Array.from({ length: 42 }).map((_, index) => {
                              const dayNumber = index - (new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()) + 1;
                              const inMonth = dayNumber > 0 && dayNumber <= (new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate());
                              if (!inMonth) return <View key={`empty-${index}`} style={styles.dayCell} />;
                              const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber);
                              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                              const dayEntries = entriesByDate[key] || [];
                              const hasEntries = dayEntries.length > 0;
                              const isSelected = selectedDate === key;
                              return (
                                <TouchableOpacity
                                  key={`day-${key}`}
                                  style={[styles.dayCell, hasEntries && styles.dayCellWithEntries, isSelected && styles.dayCellSelected]}
                                  onPress={() => { if (hasEntries) setSelectedDate(isSelected ? null : key); }}
                                  disabled={!hasEntries}
                                >
                                  <Text style={[styles.dayNumber, hasEntries && styles.dayNumberWithEntries, isSelected && { color: "#FFF" }, { fontFamily: FONTS.BarlowSemiCondensed }]}>{dayNumber}</Text>
                                  {hasEntries && (
                                    <Text style={[styles.entryIndicator, isSelected && { color: "#FFF" }]}>{dayEntries.length > 1 ? `${dayEntries.length} entries` : "1 entry"}</Text>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>

                        {/* Entries List */}
                        <View style={styles.entriesList}>
                          <Text style={[styles.entriesTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}> 
                            {selectedDate
                              ? `${new Date(selectedDate + "T00:00:00").toLocaleString("default", { month: "long", day: "numeric" })} (${displayEntries.length})`
                              : `${currentMonth.toLocaleString("default", { month: "long", year: "numeric" })} (${displayEntries.length})`}
                          </Text>

                          {displayEntries.length > 0 ? (
                            displayEntries.map((entry: any) => (
                              <TouchableOpacity key={entry._id} style={styles.entryItem} onPress={() => router.push({ pathname: "/tracker/log-details", params: { entryId: entry._id, convexId: entry?.convexId || "" } })}>
                                <View style={styles.entryContent}>
                                  <View style={styles.entryHeader}>
                                    <Text style={[styles.entryDate, { fontFamily: FONTS.BarlowSemiCondensed }]}>{new Date(entry.timestamp).toLocaleString()}</Text>
                                    <View style={styles.severityBadge}><Text style={styles.entrySeverity}>Severity</Text></View>
                                  </View>
                                  <Text style={[styles.entryDescription, { fontFamily: FONTS.BarlowSemiCondensed }]}>{entry.symptoms || entry.description || "(no description)"}</Text>
                                  <View style={styles.viewDetailsIndicator}><Text style={styles.viewDetailsText}>Tap to view details</Text></View>
                                </View>
                              </TouchableOpacity>
                            ))
                          ) : (
                            <View style={styles.emptyState}><Text style={[styles.emptyStateText, { fontFamily: FONTS.BarlowSemiCondensed }]}>No entries</Text></View>
                          )}
                        </View>

                        {/* Navigation card */}
                        <View style={styles.navigationContainer}>
                          <TouchableOpacity style={styles.navCard} onPress={navigateToHistory}>
                            <Text style={[styles.navCardTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>History</Text>
                            <Text style={[styles.navCardText, { fontFamily: FONTS.BarlowSemiCondensed }]}>View past entries and health trends</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </ScrollView>

                    {/* Add Log Entry Button */}
                    <View style={styles.addButtonContainer}>
                      <TouchableOpacity style={styles.addEntryButton} onPress={handleAddLogEntry}>
                        <Text style={[styles.addEntryButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>Add Log Entry</Text>
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
  calendarContainer: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: 24,
  },
  viewModeToggle: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#E9ECEF",
    borderRadius: 8,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  viewModeButtonActive: {
    backgroundColor: "#2A7DE1",
  },
  viewModeButtonText: {
    fontSize: 14,
    color: "#666",
  },
  viewModeButtonTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2A7DE1",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayHeader: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 8,
  },
  dayCellWithEntries: {
    backgroundColor: "#E3F2FD",
    borderWidth: 2,
    borderColor: "#2A7DE1",
  },
  dayCellSelected: {
    backgroundColor: "#2A7DE1",
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  dayNumberWithEntries: {
    color: "#2A7DE1",
    fontWeight: "700",
  },
  entryIndicator: {
    fontSize: 10,
    color: "#2A7DE1",
  },
  entriesList: {
    marginTop: 8,
  },
  entriesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  entryItem: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: 12,
  },
  entryContent: {
    gap: 8,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entryDate: {
    fontSize: 14,
    color: "#333",
  },
  severityBadge: {
    backgroundColor: "#E3F2FD",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  entrySeverity: {
    fontSize: 12,
    color: "#2A7DE1",
    fontWeight: "600",
  },
  entryDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  viewDetailsIndicator: {
    marginTop: 8,
    alignItems: "flex-end",
  },
  viewDetailsText: {
    fontSize: 12,
    color: "#2A7DE1",
    fontWeight: "600",
  },
  emptyState: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#666",
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
    backgroundColor: "#2A7DE1",
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
