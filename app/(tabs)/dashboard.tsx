/* eslint-disable @typescript-eslint/no-unused-vars */
// app/dashboard.tsx
import { Q } from "@nozbe/watermelondb";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useConvexAuth, useQuery } from "convex/react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Polyline, Stop, LinearGradient as SvgLinearGradient } from "react-native-svg";
// PNG icons from assets
// If filenames differ, update the require() paths below accordingly.

import { api } from "../../convex/_generated/api";
import { useWatermelonDatabase } from "../../watermelon/hooks/useDatabase";
import { analyzeDuplicates, dedupeHealthEntries } from "../../watermelon/utils/dedupeHealthEntries";
import { filterActiveHealthEntries } from "../../watermelon/utils/filterActiveHealthEntries";
import { listTombstones } from "../../watermelon/utils/tombstones";
import BottomNavigation from "../components/bottomNavigation";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import DueReminderBanner from "../components/DueReminderBanner";
import { useSideMenu } from "../components/SideMenuProvider";
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
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6);
  const [chartSize, setChartSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [pillTooltip, setPillTooltip] = useState<null | "Mild" | "Moderate" | "Severe" | "No data">(null);
  const [healthTooltipOpen, setHealthTooltipOpen] = useState<boolean>(false);
  const queryArgs = isAuthenticated && !isLoading ? {} : "skip";
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalMessage, setModalMessage] = useState<string>("");
  const [modalButtons, setModalButtons] = useState<{ label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'destructive' }[]>([]);
  
  const sideMenu = useSideMenu();

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
            convexId: entry.convexId,
            symptoms: entry.symptoms || "",
            severity: entry.severity || 0,
            timestamp: entry.timestamp || Date.now(),
            type: entry.type || "",
            isDeleted: entry.isDeleted ?? false,
            lastEditedAt: entry.lastEditedAt ?? entry.timestamp ?? Date.now(),
            editCount: entry.editCount ?? 0,
          }));
          console.log(`📊 [DASHBOARD OFFLINE] Loaded ${mapped.length} raw local entries (including deleted) for last 7 days (user=${uid})`);
          const filtered = mapped.filter(e => !e.isDeleted);
          if (filtered.length !== mapped.length) {
            console.log(`🗑️ [DASHBOARD OFFLINE FILTER] Removed ${mapped.length - filtered.length} deleted entries -> ${filtered.length} remaining`);
          }
          setCachedWeeklyEntries(filtered);
          setLocalWeeklyEntries(filtered);
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
            isDeleted: entry.isDeleted ?? false,
            lastEditedAt: entry.lastEditedAt ?? entry.timestamp ?? Date.now(),
            editCount: entry.editCount ?? 0,
        }));
        const filtered = mapped.filter(e => !e.isDeleted);
        console.log(`📊 [DASHBOARD LOCAL RESULT] Found ${mapped.length} local entries (raw) -> ${filtered.length} after filtering deleted`);
        setLocalWeeklyEntries(filtered);
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
  const [tombstones, setTombstones] = useState<Set<string>>(new Set());
  useEffect(() => { (async () => { setTombstones(await listTombstones()); })(); }, [isOnline]);
  const displayedWeeklyEntries = useMemo(() => {
    const onlineRaw = Array.isArray(weeklyEntriesOnline) ? weeklyEntriesOnline : [];
    // Ensure online entries carry deletion metadata (fallbacks if missing)
    const onlineArr = onlineRaw.map((e: any) => ({
      ...e,
      isDeleted: e.isDeleted ?? false,
      lastEditedAt: e.lastEditedAt ?? e.timestamp ?? Date.now(),
      editCount: e.editCount ?? 0,
    }));
    const localSource = Array.isArray(localWeeklyEntries) && localWeeklyEntries.length > 0
      ? localWeeklyEntries
      : cachedWeeklyEntries;
    const localArr = localSource.map((e: any) => ({
      ...e,
      isDeleted: e.isDeleted ?? false,
      lastEditedAt: e.lastEditedAt ?? e.timestamp ?? Date.now(),
      editCount: e.editCount ?? 0,
    }));

    // Filter out deleted entries before dedupe/merge for consistent counts
  const filteredOnline = filterActiveHealthEntries(onlineArr as any, tombstones);
  const filteredLocal = filterActiveHealthEntries(localArr as any, tombstones);

    console.log(`📊 [DASHBOARD MERGE] Online(raw): ${onlineArr.length} -> ${filteredOnline.length} active, Local(raw): ${localArr.length} -> ${filteredLocal.length} active, Cached(raw): ${cachedWeeklyEntries.length}`);
    
    // When online: prefer whichever has MORE entries (more up-to-date)
    // This handles the case where sync completes but Convex query hasn't refetched yet
    if (isOnline && filteredOnline.length > 0 && filteredLocal.length > 0) {
      if (filteredLocal.length > filteredOnline.length) {
        console.log(`📊 [DASHBOARD MERGE RESULT] Using local entries (newer, active): ${filteredLocal.length} > ${filteredOnline.length}`);
        const deduped = dedupeHealthEntries(filteredLocal as any);
        if (deduped.length !== filteredLocal.length) {
          console.log(`🧹 [DASHBOARD DEDUPE] Local active entries reduced ${filteredLocal.length} -> ${deduped.length}`);
          const dups = analyzeDuplicates(filteredLocal as any);
          if (dups.length) {
            console.log(`🧪 [DASHBOARD DUP GROUPS] ${dups.length} groups`, dups.map(g => ({ picked: g.pickedId, candidates: g.candidates.map(c => c._id) })));
          }
        }
        return deduped;
      }
      console.log(`📊 [DASHBOARD MERGE RESULT] Using online active entries: ${filteredOnline.length}`);
      const dedupedOnline = dedupeHealthEntries(filteredOnline as any);
      if (dedupedOnline.length !== filteredOnline.length) {
        console.log(`🧹 [DASHBOARD DEDUPE] Online active entries reduced ${filteredOnline.length} -> ${dedupedOnline.length}`);
        const dups = analyzeDuplicates(filteredOnline as any);
        if (dups.length) {
          console.log(`🧪 [DASHBOARD DUP GROUPS] ${dups.length} groups`, dups.map(g => ({ picked: g.pickedId, candidates: g.candidates.map(c => c._id) })));
        }
      }
      return dedupedOnline;
    }
    
    // Fallback: prefer online if available, else local
    if (filteredOnline.length > 0) {
      console.log(`📊 [DASHBOARD MERGE RESULT] Using online active entries (no local): ${filteredOnline.length}`);
      const dedupedOnline = dedupeHealthEntries(filteredOnline as any);
      if (dedupedOnline.length !== filteredOnline.length) {
        console.log(`🧹 [DASHBOARD DEDUPE] Online active entries reduced ${filteredOnline.length} -> ${dedupedOnline.length}`);
      }
      return dedupedOnline;
    }
    
    // Offline mode: use local entries
    console.log(`📊 [DASHBOARD MERGE RESULT] Using local active entries (offline): ${filteredLocal.length}`);
    const dedupedLocal = dedupeHealthEntries(filteredLocal as any);
    if (dedupedLocal.length !== filteredLocal.length) {
      console.log(`🧹 [DASHBOARD DEDUPE] Local active entries reduced ${filteredLocal.length} -> ${dedupedLocal.length}`);
    }
    return dedupedLocal;
  }, [isOnline, weeklyEntriesOnline, localWeeklyEntries, cachedWeeklyEntries, tombstones]);



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

  // Build 7-day chart data for health logs
  const weeklyLog = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - (6 - idx));
      const next = new Date(date);
      next.setDate(date.getDate() + 1);
      const dayEntries = (displayedWeeklyEntries || []).filter((entry: any) => {
        const ts = new Date(entry.timestamp);
        return ts >= date && ts < next && !entry.isDeleted;
      });
      const count = dayEntries.length;
      const avgSeverity = count
        ? dayEntries.reduce((sum: number, e: any) => sum + (e.severity ?? 0), 0) / count
        : 0;
      const status = count === 0
        ? "No data"
        : avgSeverity <= 3
          ? "Mild"
          : avgSeverity <= 6
            ? "Moderate"
            : "Severe";

      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        dateLabel: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count,
        avgSeverity,
        status,
      };
    });

    const maxCount = Math.max(1, ...days.map((d) => d.count));
    const total = days.reduce((sum, d) => sum + d.count, 0);
    const trend = days[6]?.count - days[5]?.count;

    return { days, maxCount, total, trend };
  }, [displayedWeeklyEntries]);

  const statusBuckets = useMemo(() => {
    return (displayedWeeklyEntries || []).reduce(
      (acc, entry: any) => {
        const severity = entry.severity ?? 0;
        if (severity <= 3) acc.mild += 1;
        else if (severity <= 6) acc.moderate += 1;
        else acc.severe += 1;
        return acc;
      },
      { mild: 0, moderate: 0, severe: 0 }
    );
  }, [displayedWeeklyEntries]);

  const statusCopy: Record<string, string> = {
    Mild: "Severity 0-3. Mild or no symptoms logged.",
    Moderate: "Severity 4-6. Monitor symptoms and follow care plan.",
    Severe: "Severity 7-10. Consider contacting care or 811/911 as needed.",
    "No data": "No logs for this day. Add a health entry to stay on track.",
  };

  const statusPalette = useMemo((): { gradient: [string, string]; text: string } => {
    switch (healthStatus) {
      case "Excellent":
        return { gradient: ["#38d39f", "#2fa87b"], text: "#ffffff" };
      case "Good":
        return { gradient: ["#4fa3ff", "#2f80ed"], text: "#ffffff" };
      case "Fair":
        return { gradient: ["#ffb347", "#ff8f39"], text: "#1a1a1a" };
      case "Poor":
        return { gradient: ["#ff6b6b", "#e63946"], text: "#ffffff" };
      default:
        return { gradient: ["#9baec8", "#7a8aa1"], text: "#ffffff" };
    }
  }, [healthStatus]);

  const selectedDay = weeklyLog.days[selectedDayIndex] ?? weeklyLog.days[weeklyLog.days.length - 1];

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



  const navigateToHistory = (): void => {
    router.push("/tracker");
  };

  const navigateToDailyLog = (): void => {
    router.push("/tracker");
  };

  const navigateToFindCare = (): void => {
    router.push("/find-care");
  };

  const handleSignOut = (): void => {
    setModalTitle("Sign Out");
    setModalMessage("Are you sure you want to sign out?");
    setModalButtons([
      {
        label: "Cancel",
        onPress: () => setModalVisible(false),
        variant: 'secondary',
      },
      {
        label: "Sign Out",
        onPress: () => {
          setModalVisible(false);
          router.replace("/auth/signin");
        },
        variant: 'destructive',
      },
    ]);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Due reminder banner (offline-capable) */}
        <DueReminderBanner topOffset={70} />
        
        {/* Header */}
        <CurvedHeader
          showLogo={true}
          showNotificationBell={true}
          reminderEnabled={reminderSettings?.enabled || false}
          reminderSettings={reminderSettings || null}
          showMenuButton={true}
          onMenuPress={sideMenu.open}
        />

        {/* Content Area - Takes all available space minus header and bottom nav */}
        <View style={styles.contentArea}>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentSection}>
              {/* Health Status Card */}
              <View>
                <LinearGradient
                  colors={statusPalette.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.healthStatusContainer}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.healthStatusHeaderRow}>
                      <Text
                        style={[
                          styles.healthStatusLabel,
                          { fontFamily: FONTS.BarlowSemiCondensed, color: statusPalette.text },
                        ]}
                      >
                        Health Status
                      </Text>
                      <Text
                        style={[
                          styles.healthStatusBadge,
                          { fontFamily: FONTS.BarlowSemiCondensed, color: statusPalette.text },
                        ]}
                      >
                        {healthStatus}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setHealthTooltipOpen((prev) => !prev)}>
                      <Text style={[styles.healthStatusInfo, { fontFamily: FONTS.BarlowSemiCondensed, color: statusPalette.text }]}>How is this decided?</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
                {healthTooltipOpen && (
                  <View style={styles.tooltipCard}>
                    <Text style={[styles.tooltipText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Based on the average weekly score (10 - severity) across your last 7 days of logs: Excellent ≥ 8, Good ≥ 6, Fair ≥ 4, Poor otherwise. Needs at least one log.
                    </Text>
                  </View>
                )}
              </View>

              {/* Weekly Health Log Chart */}
              <View style={styles.weeklyCard}>
                <LinearGradient
                  colors={["#e9f0ff", "#ffffff"] as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.weeklyCardGradient}
                >
                  <View style={styles.weeklyHeaderRow}>
                    <View>
                      <Text style={[styles.weeklyTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>Last 7 days</Text>
                      <Text style={[styles.weeklySubtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        {weeklyLog.total} {weeklyLog.total === 1 ? "log" : "logs"} captured
                      </Text>
                    </View>
                    <TouchableOpacity onPress={navigateToHistory}>
                      <Text style={[styles.viewDetailsText, { fontFamily: FONTS.BarlowSemiCondensed }]}>History</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.statusPillsRow}>
                    <TouchableOpacity style={styles.statusPill} onPress={() => setPillTooltip((prev) => prev === "Mild" ? null : "Mild")}>
                      <View style={[styles.dot, { backgroundColor: "#34c759" }]} />
                      <Text style={[styles.pillText, { fontFamily: FONTS.BarlowSemiCondensed }]}>Mild {statusBuckets.mild}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.statusPill} onPress={() => setPillTooltip((prev) => prev === "Moderate" ? null : "Moderate")}>
                      <View style={[styles.dot, { backgroundColor: "#f5a524" }]} />
                      <Text style={[styles.pillText, { fontFamily: FONTS.BarlowSemiCondensed }]}>Moderate {statusBuckets.moderate}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.statusPill} onPress={() => setPillTooltip((prev) => prev === "Severe" ? null : "Severe")}>
                      <View style={[styles.dot, { backgroundColor: "#ff3b30" }]} />
                      <Text style={[styles.pillText, { fontFamily: FONTS.BarlowSemiCondensed }]}>Severe {statusBuckets.severe}</Text>
                    </TouchableOpacity>
                  </View>
                  {pillTooltip && (
                    <View style={styles.tooltipCard}>
                      <Text style={[styles.tooltipTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>{pillTooltip}</Text>
                      <Text style={[styles.tooltipText, { fontFamily: FONTS.BarlowSemiCondensed }]}>{statusCopy[pillTooltip]}</Text>
                    </View>
                  )}

                  <View style={styles.dayTabsRow}>
                    {weeklyLog.days.map((day, idx) => (
                      <TouchableOpacity
                        key={day.label + day.dateLabel}
                        style={[
                          styles.dayTab,
                          idx === selectedDayIndex && styles.dayTabActive,
                        ]}
                        onPress={() => setSelectedDayIndex(idx)}
                      >
                        <Text style={[styles.dayTabLabel, idx === selectedDayIndex && styles.dayTabLabelActive, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          {day.label}
                        </Text>
                        <Text style={[styles.dayTabDate, idx === selectedDayIndex && styles.dayTabDateActive, { fontFamily: FONTS.BarlowSemiCondensed }]}>{day.dateLabel}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View
                    style={styles.chartSurface}
                    onLayout={({ nativeEvent }) => {
                      const { width, height } = nativeEvent.layout;
                      if (width !== chartSize.width || height !== chartSize.height) {
                        setChartSize({ width, height });
                      }
                    }}
                  >
                    {chartSize.width > 0 && chartSize.height > 0 && (
                      <Svg width={chartSize.width} height={chartSize.height}>
                        <Defs>
                          <SvgLinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0" stopColor="#2f80ed" stopOpacity="0.25" />
                            <Stop offset="1" stopColor="#2f80ed" stopOpacity="0.95" />
                          </SvgLinearGradient>
                        </Defs>
                        <Polyline
                          points={weeklyLog.days
                            .map((day, idx) => {
                              const x = (idx / 6) * (chartSize.width - 24) + 12;
                              const normalized = day.count / weeklyLog.maxCount;
                              const y = (1 - normalized) * (chartSize.height - 24) + 12;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                          fill="none"
                          stroke="url(#lineGradient)"
                          strokeWidth={3}
                          strokeLinecap="round"
                        />
                        {weeklyLog.days.map((day, idx) => {
                          const x = (idx / 6) * (chartSize.width - 24) + 12;
                          const normalized = day.count / weeklyLog.maxCount;
                          const y = (1 - normalized) * (chartSize.height - 24) + 12;
                          const isActive = idx === selectedDayIndex;
                          return (
                            <Circle
                              key={day.label + idx}
                              cx={x}
                              cy={y}
                              r={isActive ? 6 : 4}
                              fill={isActive ? "#2f80ed" : "#9bb9ff"}
                            />
                          );
                        })}
                      </Svg>
                    )}
                  </View>

                  <View style={styles.dayDetailRow}>
                    <View>
                      <Text style={[styles.dayDetailLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>Selected</Text>
                      <Text style={[styles.dayDetailDate, { fontFamily: FONTS.BarlowSemiCondensed }]}>{selectedDay?.label} • {selectedDay?.dateLabel}</Text>
                    </View>
                    <View style={styles.badgeGroup}>
                      <View style={[styles.badge, selectedDay?.status === "Mild" && styles.badgeStable, selectedDay?.status === "Moderate" && styles.badgeCautious, selectedDay?.status === "Severe" && styles.badgeCritical]}>
                        <Text style={[styles.badgeText, { fontFamily: FONTS.BarlowSemiCondensed }]}>{selectedDay?.status}</Text>
                      </View>
                      <Text style={[styles.dayCountText, { fontFamily: FONTS.BarlowSemiCondensed }]}>{selectedDay?.count ?? 0} logged</Text>
                    </View>
                  </View>
                </LinearGradient>
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
                    <LinearGradient
                      colors={["#E8F4FF", "#D0E9FF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.quickActionIconGradient}
                    >
                      <Image
                        source={require("../../assets/images/assess-icon.png")}
                        style={styles.quickActionIcon}
                        resizeMode="contain"
                      />
                    </LinearGradient>
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
                    <LinearGradient
                      colors={["#E8F4FF", "#D0E9FF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.quickActionIconGradient}
                    >
                      <Image
                        source={require("../../assets/images/tracker-icon.png")}
                        style={styles.quickActionIcon}
                        resizeMode="contain"
                      />
                    </LinearGradient>
                    <Text
                      style={[
                        styles.quickActionText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Health Tracker
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={navigateToFindCare}
                  >
                    <LinearGradient
                      colors={["#E8F4FF", "#D0E9FF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.quickActionIconGradient}
                    >
                      <Image
                        source={require("../../assets/images/location-icon.png")}
                        style={styles.quickActionIcon}
                        resizeMode="contain"
                      />
                    </LinearGradient>
                    <Text
                      style={[
                        styles.quickActionText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Find Care
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Get Help Button - Emergency Access */}
                <TouchableOpacity
                  style={styles.getHelpButton}
                  onPress={() => router.push('/(tabs)/emergency')}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={["#FF6B6B", "#FF4757"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.getHelpGradient}
                  >
                    <View style={styles.getHelpContent}>
                      <View style={styles.getHelpIconContainer}>
                        <Image
                          source={require("../../assets/images/emergency-icon.png")}
                          style={styles.getHelpIcon}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.getHelpTextContainer}>
                        <Text style={[styles.getHelpTitle, { fontFamily: FONTS.BarlowSemiCondensedBold }]}>
                          Get Help Now
                        </Text>
                        <Text style={[styles.getHelpSubtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          Access emergency services
                        </Text>
                      </View>
                      <View style={styles.getHelpArrow}>
                        <Text style={styles.getHelpArrowText}>→</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Medical Disclaimer */}
              <View style={styles.disclaimerContainer}>
                <View style={styles.disclaimerIconBubble}>
                  <Text style={[styles.disclaimerIcon, { fontFamily: FONTS.BarlowSemiCondensed }]}>ℹ️</Text>
                </View>
                <View style={styles.disclaimerContent}>
                  <Text
                    style={[
                      styles.disclaimerTitle,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Important
                  </Text>
                  <Text
                    style={[
                      styles.disclaimerText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    This app offers guidance and reminders but does not replace professional medical advice.
                  </Text>
                  <Text
                    style={[
                      styles.disclaimerText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Always consult a licensed healthcare provider for diagnosis or treatment decisions.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </CurvedBackground>
      <BottomNavigation floating={true} />

      {/* Side Menu rendered globally via SideMenuProvider */}

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
  healthStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: "#2f80ed",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  healthStatusLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  healthStatusHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  healthStatusBadge: {
    fontSize: 18,
    fontWeight: "800",
  },
  healthStatusInfo: {
    fontSize: 12,
    textDecorationLine: "underline",
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
    minWidth: 60,
    paddingHorizontal: 4,
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
  weeklyCard: {
    backgroundColor: "transparent",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#e6ecff",
  },
  weeklyCardGradient: {
    padding: 18,
  },
  weeklyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  weeklyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  weeklySubtitle: {
    fontSize: 14,
    color: "#4f5d75",
  },
  statusPillsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    columnGap: 8,
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  pillText: {
    fontSize: 13,
    color: "#1f2a44",
  },
  tooltipCard: {
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dbe4ff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  tooltipText: {
    fontSize: 13,
    color: "#4f5d75",
    lineHeight: 18,
  },
  dayTabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dayTab: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#edf2ff",
    borderWidth: 1,
    borderColor: "#dbe4ff",
    alignItems: "center",
  },
  dayTabActive: {
    backgroundColor: "#2f80ed",
    borderColor: "#1f6fdd",
    shadowColor: "#2f80ed",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  dayTabLabel: {
    color: "#1f2a44",
    fontSize: 13,
    fontWeight: "700",
  },
  dayTabLabelActive: {
    color: "#ffffff",
  },
  dayTabDate: {
    color: "#5b6478",
    fontSize: 11,
    marginTop: 2,
  },
  dayTabDateActive: {
    color: "#ffffff",
  },
  chartSurface: {
    height: 170,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e6ecff",
    marginBottom: 12,
  },
  dayDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dayDetailLabel: {
    fontSize: 13,
    color: "#6c7080",
    marginBottom: 2,
  },
  dayDetailDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dbe4ff",
    backgroundColor: "#eef2ff",
    marginRight: 8,
  },
  badgeStable: {
    backgroundColor: "#e7f7ed",
    borderColor: "#b7e4c7",
  },
  badgeCautious: {
    backgroundColor: "#fff4e5",
    borderColor: "#ffd19a",
  },
  badgeCritical: {
    backgroundColor: "#ffe8e6",
    borderColor: "#ffc2c2",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1f2a44",
  },
  dayCountText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  // Quick Actions Styles
  quickActionsContainer: {
    marginBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  quickActionButton: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    flex: 1,
    shadowColor: "#2A7DE1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
  },
  // Get Help Button Styles
  getHelpButton: {
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#FF4757",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  getHelpGradient: {
    borderRadius: 16,
  },
  getHelpContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingVertical: 18,
  },
  getHelpIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  getHelpIcon: {
    width: 32,
    height: 32,
    tintColor: "#FFFFFF",
  },
  getHelpTextContainer: {
    flex: 1,
  },
  getHelpTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  getHelpSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  getHelpArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  getHelpArrowText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "600",
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
    flexDirection: "row",
    backgroundColor: "#E8F1FF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#B8D4F1",
    marginBottom: 120,
    alignItems: "flex-start",
  },
  disclaimerIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1F73D2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  disclaimerIcon: {
    fontSize: 20,
    color: "white",
  },
  disclaimerContent: {
    flex: 1,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F73D2",
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: "#1F73D2",
    marginBottom: 4,
    lineHeight: 20,
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
