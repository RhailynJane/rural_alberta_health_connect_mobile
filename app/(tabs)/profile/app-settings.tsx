import { api } from "@/convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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
    getReminders,
    ReminderItem,
    scheduleAllReminderItems,
    setConvexSyncCallback,
    setReminderUserKey,
    updateReminder,
} from "../../_utils/notifications";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import TimePickerModal from "../../components/TimePickerModal";
import { COLORS, FONTS } from "../../constants/constants";

export default function AppSettings() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated && !isLoading ? {} : "skip"
  );

  const reminderSettings = useQuery(
    (api as any)["profile/reminders"].getReminderSettings,
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

  // Load location services status
  useEffect(() => {
    if (locationStatus !== undefined) {
      setLocationServicesEnabled(locationStatus.locationServicesEnabled || false);
    }
  }, [locationStatus]);

  // Load reminders
  useEffect(() => {
    if (!currentUser?._id) return;
    const uid = String(currentUser._id);
    setReminderUserKey(uid);

    setConvexSyncCallback(async (items: ReminderItem[]) => {
      try {
        await saveAllReminders({ items });
      } catch (err) {
        console.error("⚠️ Convex sync failed:", err);
      }
    });

    (async () => {
      const stored = await getReminders();
      setReminders(stored);
      await scheduleAllReminderItems(stored);
    })();
  }, [currentUser?._id, saveAllReminders]);

  // Sync reminders from Convex on settings load
  useEffect(() => {
    if (!reminderSettings || !currentUser?._id) return;

    const serverItems: ReminderItem[] = (reminderSettings.reminders || []).map(
      (r: any) => ({
        id: r.id,
        time: r.timeString,
        enabled: r.enabled,
        frequency: r.frequency || "daily",
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
        dayOfWeek: r.dayOfWeek,
      })
    );

    (async () => {
      const localItems = await getReminders();
      const needUpdate =
        JSON.stringify(serverItems) !== JSON.stringify(localItems);
      if (needUpdate) {
        setReminders(serverItems);
        await scheduleAllReminderItems(serverItems);
      }
    })();
  }, [reminderSettings, currentUser?._id]);

  const handleToggleReminder = async (value: boolean) => {
    if (!value && reminders.length > 0) {
      // Disable all reminders
      const updated = reminders.map((r) => ({ ...r, enabled: false }));
      setReminders(updated);
      await scheduleAllReminderItems(updated);
    } else if (value && reminders.length === 0) {
      // Enable with default reminder
      await addReminder({
        enabled: true,
        frequency: "daily",
        time: "09:00",
      });
      const updated = await getReminders();
      setReminders(updated);
    } else if (value) {
      // Enable existing reminders
      const updated = reminders.map((r) => ({ ...r, enabled: true }));
      setReminders(updated);
      await scheduleAllReminderItems(updated);
    }
  };

  const handleAddReminder = () => {
    setSelectedReminderIndex(null);
    setSelectedTime("09:00");
    setTimePickerVisible(true);
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
  };

  const handleConfirmTime = async (time: string) => {
    if (selectedReminderIndex !== null) {
      // Update existing
      const item = reminders[selectedReminderIndex];
      await updateReminder(item.id, { time });
    } else {
      // Add new
      await addReminder({
        enabled: true,
        frequency: "daily",
        time,
      });
    }
    const updated = await getReminders();
    setReminders(updated);
    setTimePickerVisible(false);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <CurvedHeader
          title="App Settings"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
        />
        <ScrollView style={styles.container}>
          {/* Symptom Assessment Reminder */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Symptom Assessment Reminder</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.text}>Enable Reminder</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            {reminderEnabled && (
              <>
                <Text style={styles.text}>Reminder Times:</Text>
                {reminders.filter((r) => r.enabled).map((reminder, i) => (
                  <View key={reminder.id} style={styles.reminderItem}>
                    <TouchableOpacity
                      style={styles.reminderTimeButton}
                      onPress={() => handleEditReminder(reminders.indexOf(reminder))}
                    >
                      <Icon name="schedule" size={20} color={COLORS.primary} />
                      <Text style={styles.reminderTimeText}>{reminder.time || "09:00"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteReminder(reminders.indexOf(reminder))}>
                      <Icon name="delete" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addReminderButton}
                  onPress={handleAddReminder}
                >
                  <Icon name="add-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.addReminderText}>Add Another Reminder</Text>
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
            <Icon name="arrow-back" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.backButtonText}>Back to Profile</Text>
          </TouchableOpacity>
        </ScrollView>

        <TimePickerModal
          visible={isTimePickerVisible}
          value={selectedTime}
          onSelect={handleConfirmTime}
          onCancel={() => setTimePickerVisible(false)}
        />
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
    fontSize: 18,
    color: COLORS.darkText,
    marginBottom: 12,
  },
  text: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
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
    fontSize: 16,
    color: COLORS.darkText,
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
