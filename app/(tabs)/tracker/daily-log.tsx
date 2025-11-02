 
import { Q } from "@nozbe/watermelondb";
import { useConvexAuth, useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../../../convex/_generated/api";
import { useWatermelonDatabase } from "../../../watermelon/hooks/useDatabase";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import { FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

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
  searchContainer: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  searchInputWrapper: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "transparent",
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
});

export default function DailyLog() {
  const database = useWatermelonDatabase();
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");
  const [searchQuery, setSearchQuery] = useState("");
  const [offlineEntries, setOfflineEntries] = useState<any[]>([]);

  // Get today's date in local timezone - computed fresh on each render
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayLocalDate = `${year}-${month}-${day}`;

  // Online query
  const todaysEntriesOnline = useQuery(
    api.healthEntries.getTodaysEntries,
    currentUser?._id && isOnline
      ? {
          userId: currentUser._id,
          localDate: todayLocalDate,
        }
      : "skip"
  );

  // Offline query from WatermelonDB
  useEffect(() => {
    const userId = currentUser?._id;
    
    if (!isOnline && userId) {
      const fetchOfflineEntries = async () => {
        try {
          const collection = database.get("health_entries");
          const entries = await collection
            .query(
              Q.where('userId', userId),
              Q.where("date", todayLocalDate),
              Q.sortBy("timestamp", Q.desc)
            )
            .fetch();

          console.log(`🔍 [OFFLINE DAILY LOG] Fetched ${entries.length} entries for date ${todayLocalDate}`);
          
          // Map WatermelonDB entries to match Convex format
          const mapped = entries.map((entry: any) => {
            console.log(`📝 [OFFLINE ENTRY] id: ${entry.id}, type: ${entry.type}, symptoms: ${entry.symptoms?.substring(0, 30)}`);
            return {
              _id: entry.id,
              symptoms: entry.symptoms || "",
              severity: entry.severity || 0,
              category: entry.category || "",
              notes: entry.notes || "",
              timestamp: entry.timestamp || Date.now(),
              createdBy: entry.createdBy || "User",
              type: entry.type || "manual_entry",
            };
          });
          
          console.log(`✅ [OFFLINE DAILY LOG] Mapped entries:`, mapped.map(e => ({ id: e._id, type: e.type })));
          setOfflineEntries(mapped);
        } catch (error) {
          console.error("Error fetching offline entries:", error);
          setOfflineEntries([]);
        }
      };
      fetchOfflineEntries();
    } else if (!isOnline && !userId) {
      // If offline but no user ID, show empty
      setOfflineEntries([]);
    }
  }, [isOnline, todayLocalDate, database, currentUser?._id]);

  // Use online or offline data with de-duplication (by convexId if present, else timestamp+type)
  const todaysEntries = useMemo(() => {
    const base = isOnline ? todaysEntriesOnline : offlineEntries;
    if (!Array.isArray(base)) return base;
    const seen = new Set<string>();
    const out: any[] = [];
    for (const eRaw of base as any[]) {
      const e = eRaw || {};
      const key = (e as any).convexId || `${(e as any).timestamp || '0'}_${(e as any).type || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
    return out;
  }, [isOnline, todaysEntriesOnline, offlineEntries]);

  // Status log to ensure we can see state regardless of offline branch
  useEffect(() => {
    console.log(
      "📈 [DAILY LOG STATUS] isOnline=",
      isOnline,
      " userId=",
      currentUser?._id,
      " onlineLen=",
      Array.isArray(todaysEntriesOnline) ? todaysEntriesOnline.length : (todaysEntriesOnline === undefined ? 'undefined' : '0'),
      " offlineLen=",
      offlineEntries.length,
      " date=",
      todayLocalDate
    );
  }, [isOnline, currentUser?._id, todayLocalDate, todaysEntriesOnline, offlineEntries]);

  // Hydrate WatermelonDB with online entries so they are available offline later
  useEffect(() => {
    const userId = currentUser?._id;
    if (!isOnline || !userId || !Array.isArray(todaysEntriesOnline)) return;
    const hydrate = async () => {
      try {
        const collection = database.get('health_entries');
        for (const eRaw of todaysEntriesOnline as any[]) {
          const e = eRaw as any;
          if (!e || !e._id) {
            console.warn('⚠️ [HYDRATE] Skipping invalid entry:', e);
            continue;
          }
          try {
            // Skip if already present by convexId
            const existing = await collection.query(Q.where('convexId', e._id)).fetch();
            if (existing.length > 0) continue;
            // Try to match existing offline record by exact timestamp/user/date
            const candidates = await collection
              .query(
                Q.where('userId', userId),
                Q.where('date', todayLocalDate),
                Q.where('timestamp', (e as any)?.timestamp || 0)
              )
              .fetch();
            if (candidates.length > 0) {
              // Update the first candidate to attach convexId and refresh fields
              const match = candidates[0] as any;
              await database.write(async () => {
                await match.update((entry: any) => {
                  entry.convexId = e._id;
                  entry.isSynced = true;
                  entry.type = (e as any)?.type || entry.type || 'manual_entry';
                  entry.category = (e as any)?.category || entry.category || '';
                  entry.notes = (e as any)?.notes || entry.notes || '';
                  entry.createdBy = (e as any)?.createdBy || entry.createdBy || 'User';
                  if ((e as any)?.aiContext) entry.aiContext = (e as any).aiContext;
                  if ((e as any)?.photos) entry.photos = JSON.stringify((e as any).photos);
                });
              });
              console.log('🔗 [HYDRATE] Linked existing offline entry to server id:', e._id, (e as any)?.type);
              continue;
            }
            await database.write(async () => {
              await collection.create((entry: any) => {
                entry.userId = userId;
                entry.convexId = e._id;
                entry.date = todayLocalDate;
                entry.timestamp = (e as any)?.timestamp || Date.now();
                entry.symptoms = (e as any)?.symptoms || '';
                entry.severity = (e as any)?.severity ?? 0;
                entry.category = (e as any)?.category || '';
                entry.notes = (e as any)?.notes || '';
                entry.createdBy = (e as any)?.createdBy || 'User';
                entry.type = (e as any)?.type || 'manual_entry';
                // photos and aiContext if available
                if ((e as any)?.aiContext) entry.aiContext = (e as any).aiContext;
                if ((e as any)?.photos) entry.photos = JSON.stringify((e as any).photos);
                entry.isSynced = true; // mirrors server state
              });
            });
            console.log('💾 [HYDRATE] Mirrored online entry into WatermelonDB:', e._id, (e as any)?.type);
          } catch (err) {
            console.warn('⚠️ [HYDRATE] Failed to mirror entry', e?._id, err);
          }
        }
      } catch (err) {
        console.warn('⚠️ [HYDRATE] Could not hydrate local DB:', err);
      }
    };
    hydrate();
  }, [isOnline, currentUser?._id, todayLocalDate, todaysEntriesOnline, database]);

  // Filter entries based on search query (case-insensitive)
  const filteredEntries = todaysEntries?.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.symptoms.toLowerCase().includes(query) ||
      entry.category?.toLowerCase().includes(query) ||
      entry.notes?.toLowerCase().includes(query) ||
      entry.createdBy.toLowerCase().includes(query)
    );
  });

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
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Fixed Header */}
        <CurvedHeader
          title="Tracker - Daily Log"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
        />
        <DueReminderBanner topOffset={120} />

        <View style={styles.contentSection}>
          <View
            style={{ marginBottom: 10, marginTop: -20, alignItems: "center" }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 8,
              }}
            >
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginLeft: 10,
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={22}
                  color="#2A7DE1"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    fontSize: 24,
                    lineHeight: 28,
                    fontWeight: "600",
                    color: "#2A7DE1",
                    fontFamily: FONTS.BarlowSemiCondensed,
                  }}
                >
                  {new Date().toLocaleDateString()}
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: 16,
                lineHeight: 20,
                color: "#666",
                fontFamily: FONTS.BarlowSemiCondensed,
                textAlign: "center",
              }}
            >
              Your daily health entries for today
            </Text>
          </View>
        </View>

        {/* Fixed Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search-outline" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search entries..."
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

        <View style={styles.contentArea}>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
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
                ) : filteredEntries && filteredEntries.length > 0 ? (
                  <View>
                    {filteredEntries.map((entry) => (
                      <TouchableOpacity
                        key={entry._id}
                        style={styles.entryItem}
                        onPress={() => handleViewEntryDetails(entry._id)}
                      >
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
                              {" "}
                              {formatTime(entry.timestamp)}{" "}
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
                              {" "}
                              {getSeverityText(entry.severity)} (
                              {entry.severity}/10){" "}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.symptomsText,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          {" "}
                          {entry.symptoms}{" "}
                        </Text>
                        {entry.category ? (
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
                              {" "}
                              {entry.category}{" "}
                            </Text>
                          </View>
                        ) : null}
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
                            {" "}
                            {entry.createdBy}{" "}
                          </Text>
                        </View>
                        {/* View Details Button */}
                        <TouchableOpacity
                          style={styles.viewDetailsButton}
                          onPress={() => handleViewEntryDetails(entry._id)}
                        >
                          <Text style={styles.viewDetailsText}>
                            View Details
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color="#2A7DE1"
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.entriesText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    {searchQuery.trim()
                      ? "No entries match your search"
                      : "No entries for today"}
                  </Text>
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
