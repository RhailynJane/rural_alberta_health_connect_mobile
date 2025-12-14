import { useConvexAuth, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [entriesByDate, setEntriesByDate] = useState<{ [key: string]: any[] }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [clickedDate, setClickedDate] = useState<string | null>(null);

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

              // Entries to display based on selection/month/week/filters
              const displayEntries = useMemo(() => {
                let filtered = [];
                if (selectedDate) {
                  filtered = entriesByDate[selectedDate] || [];
                } else if (viewMode === "week") {
                  // Filter by current week
                  const start = new Date(anchorDate);
                  start.setHours(0, 0, 0, 0);
                  start.setDate(anchorDate.getDate() - anchorDate.getDay()); // Sunday start
                  
                  const end = new Date(start);
                  end.setDate(start.getDate() + 6);
                  end.setHours(23, 59, 59, 999);
                  
                  filtered = allEntries.filter((entry: any) => {
                    const dt = new Date(entry.timestamp);
                    return dt >= start && dt <= end;
                  });
                } else {
                  // Filter by current month
                  filtered = allEntries.filter((entry: any) => {
                    const dt = new Date(entry.timestamp);
                    return (
                      dt.getFullYear() === currentMonth.getFullYear() &&
                      dt.getMonth() === currentMonth.getMonth()
                    );
                  });
                }
                
                // Apply search
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  filtered = filtered.filter((e: any) => 
                    (e.symptoms || "").toLowerCase().includes(q) ||
                    (e.description || "").toLowerCase().includes(q) ||
                    (e.notes || "").toLowerCase().includes(q)
                  );
                }
                
                // Apply severity filter
                if (severityFilter) {
                  filtered = filtered.filter((e: any) => e.severity === severityFilter);
                }
                
                // Apply category filter
                if (categoryFilter) {
                  filtered = filtered.filter((e: any) => {
                    // Check both 'type' and 'category' fields
                    // Also check for matching display names from ai-assess categories
                    const entryType = e.type || e.category || '';
                    const normalizedType = entryType.toLowerCase().replace(/\s+/g, '_').replace(/&/g, '').replace(/_+/g, '_');
                    const normalizedFilter = categoryFilter.toLowerCase();
                    
                    // Direct match or normalized match
                    return entryType === categoryFilter || 
                           normalizedType === normalizedFilter ||
                           entryType === normalizedFilter ||
                           // Match ai-assess categories to tracker categories
                           (categoryFilter === 'burns_heat' && (entryType === 'Burns & Heat Injuries' || entryType === 'burns_heat')) ||
                           (categoryFilter === 'trauma_injuries' && (entryType === 'Trauma & Injuries' || entryType === 'trauma_injuries')) ||
                           (categoryFilter === 'infections' && (entryType === 'Infections' || entryType === 'infections')) ||
                           (categoryFilter === 'skin_rash' && (entryType === 'Rash & Skin Conditions' || entryType === 'skin_rash')) ||
                           (categoryFilter === 'cold_frostbite' && (entryType === 'Cold Weather Injuries' || entryType === 'cold_frostbite')) ||
                           (categoryFilter === 'others' && (entryType === 'Custom' || entryType === 'others'));
                  });
                }
                
                return filtered;
              }, [selectedDate, entriesByDate, allEntries, currentMonth, anchorDate, viewMode, searchQuery, severityFilter, categoryFilter]);

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
                        {/* Compact Toolbar */}
                        <View style={styles.toolbar}>
                          <TouchableOpacity style={styles.addButton} onPress={handleAddLogEntry}>
                            <Text style={styles.addButtonIcon}>+</Text>
                          </TouchableOpacity>
                          <TextInput
                            style={[styles.searchBar, { fontFamily: FONTS.BarlowSemiCondensed }]}
                            placeholder="Search entries..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                          />
                          <TouchableOpacity 
                            style={[styles.filterButton, (severityFilter || categoryFilter) && styles.filterButtonActive]} 
                            onPress={() => setShowFilterModal(true)}
                          >
                            <Text style={styles.filterIcon}>⚙</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Filter Modal */}
                        <Modal
                          visible={showFilterModal}
                          transparent={true}
                          animationType="fade"
                          onRequestClose={() => setShowFilterModal(false)}
                        >
                          <TouchableOpacity 
                            style={styles.modalOverlay} 
                            activeOpacity={1} 
                            onPress={() => setShowFilterModal(false)}
                          >
                            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                              <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>Advanced Filters</Text>
                                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                  <Text style={styles.modalClose}>✕</Text>
                                </TouchableOpacity>
                              </View>

                              <ScrollView style={styles.modalScroll}>
                                {/* Severity Filter */}
                                <Text style={[styles.filterSectionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>Severity</Text>
                                <View style={styles.filterOptions}>
                                  {["mild", "moderate", "severe"].map((sev) => (
                                    <TouchableOpacity
                                      key={sev}
                                      style={[styles.filterOption, severityFilter === sev && styles.filterOptionActive]}
                                      onPress={() => setSeverityFilter(severityFilter === sev ? null : sev)}
                                    >
                                      <Text style={[styles.filterOptionText, severityFilter === sev && styles.filterOptionTextActive, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                        {sev.charAt(0).toUpperCase() + sev.slice(1)}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>

                                {/* Category Filter */}
                                <Text style={[styles.filterSectionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>Category</Text>
                                <View style={styles.filterOptions}>
                                  {[
                                    { value: "burns_heat", label: "Burns & Heat" },
                                    { value: "trauma_injuries", label: "Trauma & Injuries" },
                                    { value: "infections", label: "Infections" },
                                    { value: "skin_rash", label: "Skin and Rash" },
                                    { value: "cold_frostbite", label: "Cold & Frostbite" },
                                    { value: "others", label: "Others" }
                                  ].map((cat) => (
                                    <TouchableOpacity
                                      key={cat.value}
                                      style={[styles.filterOption, categoryFilter === cat.value && styles.filterOptionActive]}
                                      onPress={() => setCategoryFilter(categoryFilter === cat.value ? null : cat.value)}
                                    >
                                      <Text style={[styles.filterOptionText, categoryFilter === cat.value && styles.filterOptionTextActive, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                        {cat.label}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>

                                {/* Clear Filters Button */}
                                <TouchableOpacity 
                                  style={styles.clearFiltersButton}
                                  onPress={() => {
                                    setSeverityFilter(null);
                                    setCategoryFilter(null);
                                  }}
                                >
                                  <Text style={[styles.clearFiltersText, { fontFamily: FONTS.BarlowSemiCondensed }]}>Clear All Filters</Text>
                                </TouchableOpacity>
                              </ScrollView>
                            </View>
                          </TouchableOpacity>
                        </Modal>

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

                          {/* Navigation Header */}
                          <View style={styles.monthHeader}>
                            {viewMode === "month" ? (
                              <>
                                <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                                  <Text style={{ color: "#2A7DE1", fontSize: 16 }}>{"<"}</Text>
                                </TouchableOpacity>
                                <Text style={[styles.monthTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                  {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                                </Text>
                                <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                                  <Text style={{ color: "#2A7DE1", fontSize: 16 }}>{">"}</Text>
                                </TouchableOpacity>
                              </>
                            ) : (
                              <>
                                <TouchableOpacity onPress={() => setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() - 7))}>
                                  <Text style={{ color: "#2A7DE1", fontSize: 16 }}>{"<"}</Text>
                                </TouchableOpacity>
                                <Text style={[styles.monthTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                  {`Week of ${anchorDate.toLocaleString("default", { month: "long", day: "numeric", year: "numeric" })}`}
                                </Text>
                                <TouchableOpacity onPress={() => setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() + 7))}>
                                  <Text style={{ color: "#2A7DE1", fontSize: 16 }}>{">"}</Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>

                          {/* Calendar Grid */}
                          <View style={styles.calendarGrid}>
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                              <Text key={`header-${day}`} style={[styles.dayHeader, { fontFamily: FONTS.BarlowSemiCondensed }]}>{day}</Text>
                            ))}

                            {viewMode === "month" ? (
                              Array.from({ length: 42 }).map((_, index) => {
                                const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
                                const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
                                const dayNumber = index - firstDay + 1;
                                const inMonth = dayNumber > 0 && dayNumber <= daysInMonth;
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
                                    onPress={() => {
                                      setClickedDate(key);
                                      setSelectedDate(key);
                                    }}
                                  >
                                    <Text style={[styles.dayNumber, hasEntries && styles.dayNumberWithEntries, isSelected && { color: "#FFF" }, { fontFamily: FONTS.BarlowSemiCondensed }]}>{dayNumber}</Text>
                                    {hasEntries && (
                                      <Text style={[styles.entryIndicator, isSelected && { color: "#FFF" }]}>{dayEntries.length > 1 ? `${dayEntries.length} entries` : "1 entry"}</Text>
                                    )}
                                  </TouchableOpacity>
                                );
                              })
                            ) : (
                              (() => {
                                const start = new Date(anchorDate);
                                start.setHours(0,0,0,0);
                                start.setDate(anchorDate.getDate() - anchorDate.getDay()); // Sunday start
                                return Array.from({ length: 7 }).map((_, i) => {
                                  const d = new Date(start);
                                  d.setDate(start.getDate() + i);
                                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                                  const dayEntries = entriesByDate[key] || [];
                                  const hasEntries = dayEntries.length > 0;
                                  const isSelected = selectedDate === key;
                                  return (
                                    <TouchableOpacity
                                      key={`day-${key}`}
                                      style={[styles.dayCell, hasEntries && styles.dayCellWithEntries, isSelected && styles.dayCellSelected]}
                                      onPress={() => {
                                        setClickedDate(key);
                                        setSelectedDate(key);
                                      }}
                                    >
                                      <Text style={[styles.dayNumber, hasEntries && styles.dayNumberWithEntries, isSelected && { color: "#FFF" }, { fontFamily: FONTS.BarlowSemiCondensed }]}>{d.getDate()}</Text>
                                      {hasEntries && (
                                        <Text style={[styles.entryIndicator, isSelected && { color: "#FFF" }]}>{dayEntries.length > 1 ? `${dayEntries.length} entries` : "1 entry"}</Text>
                                      )}
                                    </TouchableOpacity>
                                  );
                                });
                              })()
                            )}
                          </View>
                        </View>

                        {/* Entry Details Section */}
                        {clickedDate && (
                          <View style={styles.entryDetailsSection}>
                            <View style={styles.entryDetailsHeader}>
                              <Text style={[styles.entryDetailsDate, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                {new Date(clickedDate + 'T00:00:00').toLocaleString('default', { 
                                  month: 'long', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </Text>
                              <TouchableOpacity onPress={() => { setClickedDate(null); setSelectedDate(null); }}>
                                <Text style={styles.closeDetailsText}>✕</Text>
                              </TouchableOpacity>
                            </View>

                            {entriesByDate[clickedDate] && entriesByDate[clickedDate].length > 0 ? (
                              entriesByDate[clickedDate].map((entry: any, index: number) => (
                                <View key={entry._id} style={[styles.entryDetailCard, index > 0 && styles.entryCardSpacing]}>
                                  {/* Symptom/Description */}
                                  <View style={styles.entryDetailField}>
                                    <Text style={[styles.entryDetailLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>WHAT HAPPENED</Text>
                                    <Text style={[styles.entryDetailValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                      {entry.symptoms || entry.description || '(no description)'}
                                    </Text>
                                  </View>

                                  {/* Category and Severity Pills */}
                                  <View style={styles.categoryPillsContainer}>
                                    {entry.type && (
                                      <View style={styles.categoryPill}>
                                        <Text style={[styles.categoryPillText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                          {entry.type === 'burns_heat' ? 'Burns & Heat' :
                                           entry.type === 'trauma_injuries' ? 'Trauma & Injuries' :
                                           entry.type === 'infections' ? 'Infections' :
                                           entry.type === 'skin_rash' ? 'Skin and Rash' :
                                           entry.type === 'cold_frostbite' ? 'Cold & Frostbite' :
                                           entry.type === 'others' ? 'Others' : entry.type}
                                        </Text>
                                      </View>
                                    )}
                                    {entry.severity && typeof entry.severity === 'string' && (
                                      <View style={[
                                        styles.categoryPill,
                                        entry.severity === 'severe' && styles.severePill,
                                        entry.severity === 'moderate' && styles.moderatePill,
                                        entry.severity === 'mild' && styles.mildPill
                                      ]}>
                                        <Text style={[styles.categoryPillText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                          {entry.severity.charAt(0).toUpperCase() + entry.severity.slice(1)}
                                        </Text>
                                      </View>
                                    )}
                                  </View>

                                  {/* View More Details Button */}
                                  <TouchableOpacity 
                                    style={styles.viewMoreButton}
                                    onPress={() => router.push({ 
                                      pathname: "/tracker/log-details", 
                                      params: { entryId: entry._id, convexId: entry?.convexId || "" } 
                                    })}
                                  >
                                    <Text style={[styles.viewMoreText, { fontFamily: FONTS.BarlowSemiCondensed }]}>View more details →</Text>
                                  </TouchableOpacity>
                                </View>
                              ))
                            ) : (
                              /* No entries state */
                              <View style={styles.noEntriesCard}>
                                <Text style={[styles.noEntriesText, { fontFamily: FONTS.BarlowSemiCondensed }]}>No entries on this day</Text>
                                <TouchableOpacity 
                                  style={styles.addLogButton}
                                  onPress={handleAddLogEntry}
                                >
                                  <Text style={[styles.addLogButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>+ Add Log Entry</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        )}

                        {/* All Entries for Month/Week Section */}
                        {!clickedDate && (
                          <View style={styles.allEntriesSection}>
                            <Text style={[styles.allEntriesTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                              {viewMode === "month" 
                                ? `${currentMonth.toLocaleString("default", { month: "long", year: "numeric" })} (${displayEntries.length})`
                                : `Week of ${anchorDate.toLocaleString("default", { month: "long", day: "numeric" })} (${displayEntries.length})`
                              }
                            </Text>

                            {displayEntries.length > 0 ? (
                              displayEntries.map((entry: any, index: number) => (
                                <View key={entry._id} style={[styles.entryDetailCard, styles.lightCard, index > 0 && styles.entryCardSpacing]}>
                                  {/* Date/Time */}
                                  <Text style={[styles.entryTimestamp, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                    {new Date(entry.timestamp).toLocaleString('default', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    })}
                                  </Text>

                                  {/* Symptom/Description */}
                                  <View style={styles.entryDetailField}>
                                    <Text style={[styles.entryDetailLabel, styles.lightLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>WHAT HAPPENED</Text>
                                    <Text style={[styles.entryDetailValue, styles.lightValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                      {entry.symptoms || entry.description || '(no description)'}
                                    </Text>
                                  </View>

                                  {/* Category and Severity Pills */}
                                  <View style={styles.categoryPillsContainer}>
                                    {entry.type && (
                                      <View style={styles.categoryPill}>
                                        <Text style={[styles.categoryPillText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                          {entry.type === 'burns_heat' ? 'Burns & Heat' :
                                           entry.type === 'trauma_injuries' ? 'Trauma & Injuries' :
                                           entry.type === 'infections' ? 'Infections' :
                                           entry.type === 'skin_rash' ? 'Skin and Rash' :
                                           entry.type === 'cold_frostbite' ? 'Cold & Frostbite' :
                                           entry.type === 'others' ? 'Others' : entry.type}
                                        </Text>
                                      </View>
                                    )}
                                    {entry.severity && typeof entry.severity === 'string' && (
                                      <View style={[
                                        styles.categoryPill,
                                        entry.severity === 'severe' && styles.severePill,
                                        entry.severity === 'moderate' && styles.moderatePill,
                                        entry.severity === 'mild' && styles.mildPill
                                      ]}>
                                        <Text style={[styles.categoryPillText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                          {entry.severity.charAt(0).toUpperCase() + entry.severity.slice(1)}
                                        </Text>
                                      </View>
                                    )}
                                  </View>

                                  {/* View More Details Button */}
                                  <TouchableOpacity 
                                    style={styles.viewMoreButton}
                                    onPress={() => router.push({ 
                                      pathname: "/tracker/log-details", 
                                      params: { entryId: entry._id, convexId: entry?.convexId || "" } 
                                    })}
                                  >
                                    <Text style={[styles.viewMoreText, { fontFamily: FONTS.BarlowSemiCondensed }]}>View more details →</Text>
                                  </TouchableOpacity>
                                </View>
                              ))
                            ) : (
                              <View style={styles.emptyState}>
                                <Text style={[styles.emptyStateText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                  No entries for this {viewMode === "month" ? "month" : "week"}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </ScrollView>


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
    paddingBottom: 120,
  },
  contentSection: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2A7DE1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonIcon: {
    fontSize: 28,
    color: "#FFF",
    fontWeight: "bold",
  },
  searchBar: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    justifyContent: "center",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#2A7DE1",
    borderColor: "#2A7DE1",
  },
  filterIcon: {
    fontSize: 20,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    maxHeight: "70%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  modalClose: {
    fontSize: 24,
    color: "#666",
  },
  modalScroll: {
    maxHeight: 400,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterOption: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: "#2A7DE1",
    borderColor: "#2A7DE1",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#666",
  },
  filterOptionTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  clearFiltersButton: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 20,
  },
  clearFiltersText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  calendarContainer: {
    backgroundColor: "#F8F9FA",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: 10,
  },
  viewModeToggle: {
    flexDirection: "row",
    marginBottom: 10,
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
    marginBottom: 8,
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
    marginBottom: 6,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 4,
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
  // Entry Details Section Styles (inline below calendar)
  entryDetailsSection: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  entryDetailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  entryDetailsDate: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  closeDetailsText: {
    fontSize: 24,
    color: "#9CA3AF",
    fontWeight: "300",
  },
  entryDetailCard: {
    backgroundColor: "#374151",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#4B5563",
  },
  entryCardSpacing: {
    marginTop: 8,
  },
  entryDetailField: {
    marginBottom: 8,
  },
  entryDetailLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  entryDetailValue: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 18,
  },
  categoryPillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  viewMoreButton: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  viewMoreText: {
    fontSize: 13,
    color: "#60A5FA",
    fontWeight: "500",
  },
  // All Entries Section
  allEntriesSection: {
    marginTop: 16,
  },
  allEntriesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  lightCard: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  lightLabel: {
    color: "#6B7280",
  },
  lightValue: {
    color: "#1F2937",
  },
  entryTimestamp: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "500",
  },
  categoryPill: {
    backgroundColor: "#4B5563",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  categoryPillText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  severePill: {
    backgroundColor: "#DC2626",
  },
  moderatePill: {
    backgroundColor: "#F59E0B",
  },
  mildPill: {
    backgroundColor: "#10B981",
  },
  noEntriesCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noEntriesText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 24,
    textAlign: "center",
  },
  addLogButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  addLogButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
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
