/* eslint-disable @typescript-eslint/no-unused-vars */
// app/dashboard.tsx
import { Q } from "@nozbe/watermelondb";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { useWatermelonDatabase } from "../../watermelon/hooks/useDatabase";
import { analyzeDuplicates, dedupeHealthEntries } from "../../watermelon/utils/dedupeHealthEntries";
import BottomNavigation from "../components/bottomNavigation";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import DueReminderBanner from "../components/DueReminderBanner";
import HealthStatusTag from "../components/HealthStatusTag";
import StatusModal from "../components/StatusModal";
import { FONTS } from "../constants/constants";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

export default function Dashboard() {
  const database = useWatermelonDatabase();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { isOnline } = useNetworkStatus();
  const [healthStatus, setHealthStatus] = useState<string>("Good");
  const [cachedUser, setCachedUser] = useState<any>(null);
  const [cachedWeeklyEntries, setCachedWeeklyEntries] = useState<any[]>([]);
  const [localWeeklyEntries, setLocalWeeklyEntries] = useState<any[]>([]);
  const queryArgs = isAuthenticated && !isLoading ? {} : "skip";
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalMessage, setModalMessage] = useState<string>("");
  const [modalButtons, setModalButtons] = useState<{ label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'destructive' }[]>([]);

  // Get current user data (allow offline access via cache)
  const user = useQuery(api.users.getCurrentUser, queryArgs);
  
  // Get reminder settings (allow offline access via cache)
  const reminderSettings = useQuery(
    (api as any)["profile/reminders"].getReminderSettings,
    isAuthenticated && !isLoading ? {} : "skip"
  );

  // Get entries for the last 7 days to calculate health score
  const getLast7DaysDateRange = () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6); // Changed from -7 to -6 to include today (7 days total)
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    
    console.log(`📊 [DASHBOARD DATE RANGE] Start: ${startStr}, End: ${endStr}, 7 days from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

    return {
      startDate: startStr,
      endDate: endStr,
    };
  };

  const dateRange = getLast7DaysDateRange();
  const weeklyEntriesOnline = useQuery(
    api.healthEntries.getEntriesByDateRange,
    user?._id && isOnline
      ? {
          userId: user._id,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }
      : "skip"
  );

  // Cache user data when online
  useEffect(() => {
    if (isOnline && user) {
      AsyncStorage.setItem("@dashboard_user", JSON.stringify(user)).catch((err) =>
        console.error("Failed to cache user data:", err)
      );
      setCachedUser(user);
    }
  }, [isOnline, user]);

  // Cache weekly entries when online
  useEffect(() => {
    if (isOnline && weeklyEntriesOnline) {
      AsyncStorage.setItem(
        "@dashboard_weekly_entries",
        JSON.stringify(weeklyEntriesOnline)
      ).catch((err) => console.error("Failed to cache weekly entries:", err));
      setCachedWeeklyEntries(weeklyEntriesOnline);
    }
  }, [isOnline, weeklyEntriesOnline]);

  // Load cached data when offline (and fetch current user's last 7 days from WatermelonDB)
  useEffect(() => {
    if (!isOnline) {
      (async () => {
        try {
          // Load cached user (needed for userId filter)
          let uid: string | undefined = undefined;
          try {
            const cached = await AsyncStorage.getItem("@dashboard_user");
            if (cached) {
              const parsed = JSON.parse(cached);
              setCachedUser(parsed);
              uid = parsed?._id;
            }
          } catch (err) {
            console.error("Failed to load cached user:", err);
          }

          // Also load cached weekly entries for immediate display (may be stale by one entry)
          try {
            const cachedEntries = await AsyncStorage.getItem("@dashboard_weekly_entries");
            if (cachedEntries) {
              setCachedWeeklyEntries(JSON.parse(cachedEntries));
            }
          } catch (err) {
            console.error("Failed to load cached entries:", err);
          }

          // If we couldn't read userId from cache, there's nothing meaningful to show
          if (!uid) {
            setCachedWeeklyEntries([]);
            return;
          }

          // Load from WatermelonDB for the current user (align with online: last 7 days incl. today)
          const collection = database.get("health_entries");
          const start = new Date();
          start.setDate(start.getDate() - 6);
          start.setHours(0, 0, 0, 0);

          const end = new Date();
          end.setHours(23, 59, 59, 999);

          const entries = await collection
            .query(
              Q.where("userId", uid),
              Q.where("timestamp", Q.gte(start.getTime())),
              Q.where("timestamp", Q.lte(end.getTime())),
              Q.sortBy("timestamp", Q.desc)
            )
            .fetch();

          const mapped = entries.map((entry: any) => ({
            _id: entry.id,
            symptoms: entry.symptoms || "",
            severity: entry.severity || 0,
            timestamp: entry.timestamp || Date.now(),
          }));
          console.log(`📊 [DASHBOARD OFFLINE] Loaded ${mapped.length} entries for last 7 days (local cache, user=${uid})`);
          setCachedWeeklyEntries(mapped);
          setLocalWeeklyEntries(mapped);
        } catch (error) {
          console.error("Error fetching offline entries from WatermelonDB:", error);
        }
      })();
    }
  }, [isOnline, database]);

  // Always fetch local last 7 days for current user as a fast, stable baseline (even when online)
  useEffect(() => {
    const uid = (user as any)?._id || (cachedUser as any)?._id;
    if (!uid) return;
    (async () => {
      try {
        const collection = database.get("health_entries");
        const start = new Date();
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        console.log(`📊 [DASHBOARD LOCAL QUERY] Querying WatermelonDB from ${start.toISOString()} to ${end.toISOString()} for user ${uid}`);

        const entries = await collection
          .query(
            Q.where("userId", uid),
            Q.where("timestamp", Q.gte(start.getTime())),
            Q.where("timestamp", Q.lte(end.getTime())),
            Q.sortBy("timestamp", Q.desc)
          )
          .fetch();

        const mapped = entries.map((entry: any) => ({
          _id: entry.id,
          convexId: entry.convexId,
          symptoms: entry.symptoms || "",
          severity: entry.severity || 0,
          timestamp: entry.timestamp || Date.now(),
          type: entry.type || "",
        }));
        
        console.log(`📊 [DASHBOARD LOCAL RESULT] Found ${mapped.length} local entries for last 7 days`);
        
        setLocalWeeklyEntries(mapped);
      } catch (error) {
        console.error("Error fetching local weekly entries:", error);
      }
    })();
  }, [database, isOnline, user, cachedUser]);

  // Use online or cached data
  const displayUser = useMemo(
    () => (isOnline ? user : cachedUser),
    [isOnline, user, cachedUser]
  );
  const currentUserId = useMemo(
    () => (user as any)?._id || (cachedUser as any)?._id,
    [user, cachedUser]
  );
  // Merge local and online results to avoid temporary regressions when coming online
  const displayedWeeklyEntries = useMemo(() => {
    const onlineArr = Array.isArray(weeklyEntriesOnline) ? weeklyEntriesOnline : [];
    const localArr = Array.isArray(localWeeklyEntries) && localWeeklyEntries.length > 0
      ? localWeeklyEntries
      : cachedWeeklyEntries;
    
    console.log(`📊 [DASHBOARD MERGE] Online: ${onlineArr.length}, Local: ${localArr.length}, Cached: ${cachedWeeklyEntries.length}`);
    
    // When online: prefer whichever has MORE entries (more up-to-date)
    // This handles the case where sync completes but Convex query hasn't refetched yet
    if (isOnline && onlineArr.length > 0 && localArr.length > 0) {
      if (localArr.length > onlineArr.length) {
        console.log(`📊 [DASHBOARD MERGE RESULT] Using local entries (newer): ${localArr.length} > ${onlineArr.length}`);
        const deduped = dedupeHealthEntries(localArr as any);
        if (deduped.length !== localArr.length) {
          console.log(`🧹 [DASHBOARD DEDUPE] Local entries reduced ${localArr.length} -> ${deduped.length}`);
          const dups = analyzeDuplicates(localArr as any);
          if (dups.length) {
            console.log(`🧪 [DASHBOARD DUP GROUPS] ${dups.length} groups`, dups.map(g => ({ picked: g.pickedId, candidates: g.candidates.map(c => c._id) })));
          }
        }
        return deduped;
      }
      console.log(`📊 [DASHBOARD MERGE RESULT] Using online entries: ${onlineArr.length}`);
      const dedupedOnline = dedupeHealthEntries(onlineArr as any);
      if (dedupedOnline.length !== onlineArr.length) {
        console.log(`🧹 [DASHBOARD DEDUPE] Online entries reduced ${onlineArr.length} -> ${dedupedOnline.length}`);
        const dups = analyzeDuplicates(onlineArr as any);
        if (dups.length) {
          console.log(`🧪 [DASHBOARD DUP GROUPS] ${dups.length} groups`, dups.map(g => ({ picked: g.pickedId, candidates: g.candidates.map(c => c._id) })));
        }
      }
      return dedupedOnline;
    }
    
    // Fallback: prefer online if available, else local
    if (onlineArr.length > 0) {
      console.log(`📊 [DASHBOARD MERGE RESULT] Using online entries: ${onlineArr.length}`);
      const dedupedOnline = dedupeHealthEntries(onlineArr as any);
      if (dedupedOnline.length !== onlineArr.length) {
        console.log(`🧹 [DASHBOARD DEDUPE] Online entries reduced ${onlineArr.length} -> ${dedupedOnline.length}`);
      }
      return dedupedOnline;
    }
    
    // Offline mode: use local entries
    console.log(`📊 [DASHBOARD MERGE RESULT] Using local entries: ${localArr.length}`);
    const dedupedLocal = dedupeHealthEntries(localArr as any);
    if (dedupedLocal.length !== localArr.length) {
      console.log(`🧹 [DASHBOARD DEDUPE] Local entries reduced ${localArr.length} -> ${dedupedLocal.length}`);
    }
    return dedupedLocal;
  }, [isOnline, weeklyEntriesOnline, localWeeklyEntries, cachedWeeklyEntries]);



  const weeklyHealthScore = (() => {
    if (!displayedWeeklyEntries || displayedWeeklyEntries.length === 0) return "0.0";
    const totalScore = displayedWeeklyEntries.reduce(
      (sum, entry) => sum + (10 - entry.severity),
      0
    );
    const averageScore = totalScore / displayedWeeklyEntries.length;
    return averageScore.toFixed(1);
  })();

  // Determine health status based on weekly health score
  useEffect(() => {
    if (!displayedWeeklyEntries || displayedWeeklyEntries.length === 0) {
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
  }, [weeklyHealthScore, displayedWeeklyEntries]);

  // Use displayUser and cached data for offline support
  const userName = displayUser?.firstName || user?.firstName || "User";
  const userEmail = displayUser?.email || user?.email || "";

  // Check if loading during initial auth
  if (isLoading && !displayUser) {
    return (
      <SafeAreaView style={styles.container} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
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

  // Check if not authenticated and no cached user
  if (!isAuthenticated && !displayUser) {
    return (
      <SafeAreaView style={styles.container} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
        <View style={styles.loadingContainer}>
          <Text
            style={[
              styles.loadingText,
              { fontFamily: FONTS.BarlowSemiCondensed },
            ]}
          >
            Please log in to continue
          </Text>
        </View>
      </SafeAreaView>
    );
  }



  const handleSymptomAssessment = (): void => {
    // Navigate to symptom assessment screen using Expo Router
    router.push("/(tabs)/ai-assess");
  };

  const handleEmergencyCall = (): void => {
    setModalTitle("Emergency Call");
    setModalMessage("For life-threatening emergencies, call 911 immediately.");
    setModalButtons([
      {
        label: "Cancel",
        onPress: () => setModalVisible(false),
        variant: 'secondary',
      },
      {
        label: "Call 911",
        onPress: () => {
          setModalVisible(false);
          Linking.openURL("tel:911").catch((err) => {
            console.error("Error calling 911:", err);
            setModalTitle("Error");
            setModalMessage("Could not make the call. Please check your device.");
            setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
            setModalVisible(true);
          });
        },
        variant: 'destructive',
      },
    ]);
    setModalVisible(true);
  };

  const callHealthLink = (): void => {
    setModalTitle("Health Link Alberta");
    setModalMessage("Call 811 for non-emergency health advice?");
    setModalButtons([
      {
        label: "Cancel",
        onPress: () => setModalVisible(false),
        variant: 'secondary',
      },
      {
        label: "Call 811",
        onPress: () => {
          setModalVisible(false);
          Linking.openURL("tel:811").catch((err) => {
            console.error("Error calling 811:", err);
            setModalTitle("Error");
            setModalMessage("Could not make the call. Please check your device.");
            setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
            setModalVisible(true);
          });
        },
        variant: 'primary',
      },
    ]);
    setModalVisible(true);
  };

  const navigateToHistory = (): void => {
    router.push("/tracker/history");
  };

  const navigateToDailyLog = (): void => {
    router.push("/tracker/daily-log");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Due reminder banner (offline-capable) */}
        <DueReminderBanner topOffset={120} />
        
        {/* Fixed Header */}
        <CurvedHeader
          title="Alberta Health Connect"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
          reminderEnabled={reminderSettings?.enabled || false}
          reminderSettings={reminderSettings || null}
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
                  {displayedWeeklyEntries && displayedWeeklyEntries.length > 0
                    ? `${weeklyHealthScore}/10`
                    : "N/A"}
                </Text>
                <Text
                  style={[
                    styles.healthScoreSubtitle,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  {displayedWeeklyEntries && displayedWeeklyEntries.length > 0
                    ? `Based on ${displayedWeeklyEntries.length} ${displayedWeeklyEntries.length === 1 ? 'entry' : 'entries'} in last 7 days`
                    : "No entries in last 7 days"}
                </Text>

                {/* Health Score Progress Bar - only show if there are entries */}
                {displayedWeeklyEntries && displayedWeeklyEntries.length > 0 && (
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

      {/* StatusModal for alerts and confirmations */}
      <StatusModal
        visible={modalVisible}
        type={modalTitle === 'Success' ? 'success' : modalTitle === 'Error' ? 'error' : 'confirm'}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
        buttons={modalButtons.length > 0 ? modalButtons : undefined}
      />
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
    fontWeight: "500",
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
  offlineNotice: {
    fontSize: 14,
    color: "#FF8C00",
    textAlign: "center",
    marginTop: 8,
  },
  offlineCard: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#FFB74D",
  },
  offlineCardTitle: {
    fontSize: 18,
    color: "#E65100",
    marginBottom: 8,
  },
  offlineCardText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
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
