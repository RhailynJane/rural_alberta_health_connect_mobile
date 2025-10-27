import { api } from "@/convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
    addReminder,
    deleteReminder,
    dismissAllNotifications,
    forceRescheduleAllReminders,
    getReminders,
    ReminderItem,
    requestNotificationPermissions,
    scheduleAllReminderItems,
    setConvexSyncCallback,
    setReminderUserKey,
    updateReminder,
} from "../../_utils/notifications";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import StatusModal from "../../components/StatusModal";
import TimePickerModal from "../../components/TimePickerModal";
import { COLORS, FONTS } from "../../constants/constants";

export default function AppSettings() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated && !isLoading ? {} : "skip"
  );

  // Fetch server-stored list of reminders (array form)
  const serverReminders = useQuery(
    (api as any)["profile/reminders"].getAllReminders,
    isAuthenticated && !isLoading ? {} : "skip"
  );

  const saveAllReminders = useMutation(
    (api as any)["profile/reminders"].saveAllReminders
  );

  // Get location services status
  const locationStatus = useQuery(
    api.locationServices.getLocationServicesStatus,
    isAuthenticated && !isLoading ? {} : "skip"
  );
  const toggleLocationServices = useMutation(
    api.locationServices.toggleLocationServices
  );

  const [locationServicesEnabled, setLocationServicesEnabled] = useState(false);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [selectedReminderIndex, setSelectedReminderIndex] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  // When user toggles ON with no reminders, keep switch visually ON while prompting for time
  const [pendingEnable, setPendingEnable] = useState(false);
  // Choose frequency for new reminders
  const [frequencyPickerVisible, setFrequencyPickerVisible] = useState(false);
  const [nextFrequency, setNextFrequency] = useState<"hourly" | "daily" | "weekly" | null>(null);
  // Weekly custom scheduler
  const [weeklyModalVisible, setWeeklyModalVisible] = useState(false);
  const daysOfWeek: ("Sun"|"Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat")[] = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const [weeklyTimes, setWeeklyTimes] = useState<Record<string, string | null>>({ Sun:null, Mon:null, Tue:null, Wed:null, Thu:null, Fri:null, Sat:null });
  const [weeklyEditingDay, setWeeklyEditingDay] = useState<null | (typeof daysOfWeek)[number]>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Load location services status
  useEffect(() => {
    if (locationStatus !== undefined) {
      setLocationServicesEnabled(locationStatus.locationServicesEnabled || false);
    }
  }, [locationStatus]);

  // Memoize the sync callback to prevent infinite loops
  const syncCallback = useCallback(async (items: ReminderItem[]) => {
    try {
      await saveAllReminders({ reminders: JSON.stringify(items) });
    } catch (err) {
      console.error("⚠️ Convex sync failed:", err);
    }
  }, [saveAllReminders]);

  // Load reminders
  useEffect(() => {
    if (!currentUser?._id) return;
    const uid = String(currentUser._id);
    setReminderUserKey(uid);
    setConvexSyncCallback(syncCallback);

    (async () => {
      const stored = await getReminders();
      setReminders(stored);
      // Don't schedule on page load - reminders are already scheduled from when they were created
      // await scheduleAllReminderItems(stored);
    })();
  }, [currentUser?._id, syncCallback]);

  // Sync reminders from Convex (array) -> local AsyncStorage/state, without thrashing
  useEffect(() => {
    if (!serverReminders || !currentUser?._id) return;

    (async () => {
      try {
        const localItems = await getReminders();
        // Only update if different to avoid flicker
        const needUpdate = JSON.stringify(serverReminders) !== JSON.stringify(localItems);
        if (needUpdate) {
          setReminders(serverReminders as ReminderItem[]);
          // Don't schedule on sync - reminders are already scheduled from when they were created
          // await scheduleAllReminderItems(serverReminders as ReminderItem[]);
        }
      } catch {
        // no-op
      }
    })();
  }, [serverReminders, currentUser?._id]);

  const handleToggleReminder = async (value: boolean) => {
    // Prevent multiple simultaneous requests
    if (isRequestingPermission) return;

    if (value) {
      // Request permission first
      setIsRequestingPermission(true);
      try {
        console.log("🔔 Requesting notification permissions...");
        const granted = await requestNotificationPermissions();
        console.log("🔔 Permission result:", granted);
        
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Please enable notifications in your device settings to receive symptom assessment reminders.",
            [{ text: "OK" }]
          );
          return;
        }
      } catch (error) {
        console.error("❌ Permission request error:", error);
        Alert.alert(
          "Error",
          "Failed to request notification permissions. Please try again.",
          [{ text: "OK" }]
        );
        return;
      } finally {
        setIsRequestingPermission(false);
      }

      // If enabling and there are no reminders, just show the section with an Add Reminder button
      if (reminders.length === 0) {
        setPendingEnable(true);
        return;
      }
    }

    if (!value && reminders.length > 0) {
      // Disable all reminders and clear notifications
      const updated = reminders.map((r) => ({ ...r, enabled: false }));
      setReminders(updated);
      await scheduleAllReminderItems(updated); // This will cancel all scheduled notifications
      await dismissAllNotifications(); // Also dismiss any visible notifications
    } else if (value) {
      // Enable existing reminders
      const updated = reminders.map((r) => ({ ...r, enabled: true }));
      setReminders(updated);
      await scheduleAllReminderItems(updated);
    } else if (!value) {
      // Toggling OFF with no reminders - just dismiss any visible notifications
      setPendingEnable(false);
      await dismissAllNotifications();
    }
  };

  const handleAddReminder = () => {
    // Open frequency chooser first
    setSelectedReminderIndex(null);
    setNextFrequency(null);
    setFrequencyPickerVisible(true);
  };

  const handleEditReminder = (index: number) => {
    setSelectedReminderIndex(index);
    setSelectedTime(reminders[index].time || "09:00");
    setTimePickerVisible(true);
  };

  const handleDeleteReminder = async (index: number) => {
    const item = reminders[index];
    await deleteReminder(item.id);
    const updated = await getReminders();
    setReminders(updated);
    // Re-schedule all remaining reminders
    await scheduleAllReminderItems(updated);
  };

  const handleConfirmTime = async (time: string) => {
    if (weeklyEditingDay) {
      // In weekly custom mode, assign time to the editing day
      setWeeklyTimes((prev) => ({ ...prev, [weeklyEditingDay]: time }));
      setWeeklyEditingDay(null);
      setTimePickerVisible(false);
      return;
    }

    if (selectedReminderIndex !== null) {
      // Update existing
      const item = reminders[selectedReminderIndex];
      await updateReminder(item.id, { time });
    } else {
      // Add new reminder with the selected frequency
      // nextFrequency is set when user picks "Hourly" or "Daily" from frequency chooser
      // (Custom weekly reminders are created directly in Save button handler)
      const freq = nextFrequency === "hourly" ? "hourly" : "daily";
      await addReminder({
        enabled: true,
        frequency: freq as any,
        time: freq === "daily" ? time : undefined,
      });
    }
    const updated = await getReminders();
    setReminders(updated);
    setPendingEnable(false);
    setTimePickerVisible(false);
    setNextFrequency(null);
    await scheduleAllReminderItems(updated);
  };

  const handleToggleLocationServices = async (value: boolean) => {
    setLocationServicesEnabled(value);
    try {
      await toggleLocationServices({ enabled: value });
    } catch (error) {
      console.error("Failed to update location services:", error);
    }
  };

  const reminderEnabled = reminders.some((r) => r.enabled);

  // Create reminder settings object for notification bell
  // Use first daily or weekly reminder (skip hourly for the bell settings)
  const firstNonHourly = reminders.find((r) => r.enabled && r.frequency !== "hourly");
  const reminderSettings = firstNonHourly ? {
    enabled: true,
    time: firstNonHourly.time || "09:00",
    frequency: firstNonHourly.frequency as "daily" | "weekly",
    dayOfWeek: firstNonHourly.dayOfWeek,
  } : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <CurvedHeader
          title="App Settings"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
          reminderEnabled={reminderEnabled}
          reminderSettings={reminderSettings}
        />
        <ScrollView style={styles.container}>
          {/* Symptom Assessment Reminder */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Symptom Assessment Reminder</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.text}>Enable Reminder</Text>
              <Switch
                value={pendingEnable || reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            {(pendingEnable || reminderEnabled) && (
              <>
                <Text style={styles.text}>Reminder Times:</Text>
                {reminders.filter((r) => r.enabled).length === 0 && (
                  <Text style={[styles.text, { color: COLORS.darkGray, marginTop: 8 }]}>No reminders yet. Tap &quot;Add Reminder&quot; to create one.</Text>
                )}
                {reminders
                  .filter((r) => r.enabled)
                  .map((reminder) => (
                    <View key={reminder.id} style={styles.reminderItem}>
                      <TouchableOpacity
                        style={styles.reminderTimeButton}
                        onPress={() => handleEditReminder(reminders.indexOf(reminder))}
                      >
                        <Icon name="schedule" size={20} color={COLORS.primary} />
                        <View>
                          <Text style={styles.reminderTimeText}>
                            {reminder.frequency === "hourly"
                              ? "Every hour"
                              : reminder.time || "09:00"}
                          </Text>
                          {reminder.frequency === "daily" && (
                            <Text style={[styles.reminderFrequencyText]}>Daily reminder</Text>
                          )}
                          {reminder.frequency === "weekly" && reminder.dayOfWeek && (
                            <Text style={[styles.reminderFrequencyText]}>Weekly on {reminder.dayOfWeek}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          handleDeleteReminder(reminders.indexOf(reminder))
                        }
                      >
                        <Icon name="delete" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  ))}

                <TouchableOpacity
                  style={styles.addReminderButton}
                  onPress={handleAddReminder}
                >
                  <Icon name="add-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.addReminderText}>Add Reminder</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.addReminderButton, { marginTop: 8, backgroundColor: '#eef6ff' }]}
                  onPress={async () => {
                    if (isRescheduling) return;
                    try {
                      setIsRescheduling(true);
                      const count = await forceRescheduleAllReminders();
                      Alert.alert(
                        'Reminders rescheduled',
                        `Re-applied ${count} reminder(s) to the high-importance channel.`
                      );
                    } catch {
                      Alert.alert('Error', 'Failed to reschedule reminders.');
                    } finally {
                      setIsRescheduling(false);
                    }
                  }}
                >
                  <Icon name="refresh" size={20} color={COLORS.primary} />
                  <Text style={styles.addReminderText}>
                    {isRescheduling ? 'Rescheduling…' : 'Force re-schedule reminders'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Location Services */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Location Services</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.text}>Enable Location Services</Text>
              <Switch
                value={locationServicesEnabled}
                onValueChange={handleToggleLocationServices}
                trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Icon
              name="arrow-back"
              size={20}
              color={COLORS.white}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.backButtonText}>Back to Profile</Text>
          </TouchableOpacity>
        </ScrollView>

        <TimePickerModal
          visible={isTimePickerVisible}
          value={selectedTime}
          onSelect={handleConfirmTime}
          onCancel={() => {
            setPendingEnable(false);
            setTimePickerVisible(false);
            setWeeklyEditingDay(null);
          }}
        />

        {/* Frequency chooser */}
        <StatusModal
          visible={frequencyPickerVisible}
          type="info"
          title="Choose reminder type"
          message="How often should we remind you?"
          onClose={() => setFrequencyPickerVisible(false)}
          buttons={[
            {
              label: "Daily",
              variant: "primary",
              onPress: () => {
                setFrequencyPickerVisible(false);
                setNextFrequency("daily");
                setSelectedReminderIndex(null);
                setSelectedTime("09:00");
                setTimePickerVisible(true);
              },
            },
            {
              label: "Custom",
              variant: "secondary",
              onPress: () => {
                setFrequencyPickerVisible(false);
                setWeeklyTimes({
                  Sun: null,
                  Mon: null,
                  Tue: null,
                  Wed: null,
                  Thu: null,
                  Fri: null,
                  Sat: null,
                });
                setWeeklyModalVisible(true);
              },
            },
          ]}
        />

        {/* Weekly custom modal */}
        {weeklyModalVisible && (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              top: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
              zIndex: 9998,
              elevation: 9998,
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 24,
                padding: 24,
                width: "90%",
                maxWidth: 500,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              <Text
                style={{
                  fontFamily: FONTS.BarlowSemiCondensedBold,
                  fontSize: 20,
                  marginBottom: 16,
                  color: COLORS.darkText,
                  textAlign: "center",
                }}
              >
                Custom schedule
              </Text>
              {daysOfWeek.map((d) => (
                <View
                  key={d}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONTS.BarlowSemiCondensed,
                      fontSize: 18,
                      color: COLORS.darkText,
                      fontWeight: '600',
                    }}
                  >
                    {d}
                  </Text>
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.BarlowSemiCondensed,
                        fontSize: 16,
                        color: COLORS.darkGray,
                      }}
                    >
                      {weeklyTimes[d] || "Not set"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setWeeklyEditingDay(d);
                        setSelectedTime(weeklyTimes[d] || "09:00");
                        setTimePickerVisible(true);
                      }}
                    >
                      <Text
                        style={{
                          color: COLORS.primary,
                          fontFamily: FONTS.BarlowSemiCondensedBold,
                        }}
                      >
                        Set
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <View
                style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20, gap: 12 }}
              >
                <TouchableOpacity
                  onPress={() =>
                    setWeeklyTimes({
                      Sun: null,
                      Mon: null,
                      Tue: null,
                      Wed: null,
                      Thu: null,
                      Fri: null,
                      Sat: null,
                    })
                  }
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    backgroundColor: COLORS.error + '20',
                    borderWidth: 1,
                    borderColor: COLORS.error,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.error,
                      fontFamily: FONTS.BarlowSemiCondensedBold,
                      fontSize: 15,
                    }}
                  >
                    Clear all
                  </Text>
                </TouchableOpacity>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setWeeklyModalVisible(false);
                      setPendingEnable(false);
                    }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      backgroundColor: COLORS.lightGray,
                      borderWidth: 1,
                      borderColor: COLORS.darkGray,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.darkText,
                        fontFamily: FONTS.BarlowSemiCondensedBold,
                        fontSize: 15,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const entries = Object.entries(weeklyTimes).filter(([, t]) => !!t) as [string, string][];
                      for (const [day, t] of entries) {
                        await addReminder({
                          enabled: true,
                          frequency: "weekly" as any,
                          time: t,
                          dayOfWeek: day,
                        });
                      }
                      const updated = await getReminders();
                      setReminders(updated);
                      setPendingEnable(false);
                      setWeeklyModalVisible(false);
                      await scheduleAllReminderItems(updated);
                    }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      backgroundColor: COLORS.primary,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.white,
                        fontFamily: FONTS.BarlowSemiCondensedBold,
                        fontSize: 15,
                      }}
                    >
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </CurvedBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
    backgroundColor: "transparent",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 20,
    color: COLORS.darkText,
    marginBottom: 12,
  },
  text: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: COLORS.darkText,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reminderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginTop: 8,
  },
  reminderTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reminderTimeText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 18,
    color: COLORS.darkText,
  },
  reminderFrequencyText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  addReminderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
  },
  addReminderText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 100,
    marginTop: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
  },
});
