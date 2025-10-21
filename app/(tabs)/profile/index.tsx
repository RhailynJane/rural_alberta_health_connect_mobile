import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { MAPBOX_ACCESS_TOKEN } from "../../_config/mapbox.config";
import { ReminderItem, addReminder, deleteReminder, getReminders, scheduleAllReminderItems, setReminderUserKey, updateReminder } from "../../_utils/notifications";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { COLORS, FONTS } from "../../constants/constants";

export default function Profile() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();

  const updatePersonalInfo = useMutation(
    api.profile.personalInformation.updatePersonalInfo
  );
  const ensureProfileExists = useMutation(
    (api as any)["profile/ensureProfileExists"].ensureProfileExists
  );
  const updateReminderSettings = useMutation(
    (api as any)["profile/reminders"].updateReminderSettings
  );
  const updateEmergencyContactMutation = useMutation(
    (api as any)["emergencyContactOnboarding/update"].withNameAndPhone
  );
  const updateMedicalHistoryMutation = useMutation(
    (api as any)["medicalHistoryOnboarding/update"].withAllConditions
  );

  // Skip queries if not authenticated
  const userProfile = useQuery(
    api.profile.personalInformation.getProfile,
    isAuthenticated && !isLoading ? {} : "skip"
  );
  const reminderSettings = useQuery(
    (api as any)["profile/reminders"].getReminderSettings,
    isAuthenticated && !isLoading ? {} : "skip"
  );

  // Get location services status
  const locationStatus = useQuery(
    api.locationServices.getLocationServicesStatus,
    isAuthenticated && !isLoading ? {} : "skip"
  );
  const toggleLocationServices = useMutation(
    api.locationServices.toggleLocationServices
  );

  // Track if we have a pending toggle to prevent query overwrites
  const [isPendingLocationToggle, setIsPendingLocationToggle] = useState(false);

  useEffect(() => {
    // Only update from query if there's no pending toggle
    if (locationStatus !== undefined && !isPendingLocationToggle) {
      setUserData((prev) => ({
        ...prev,
        locationServices: locationStatus.locationServicesEnabled || false,
      }));
    }
  }, [locationStatus, isPendingLocationToggle]);

  // Handler for location services toggle with permission confirmation
  const handleLocationServicesToggle = async (enabled: boolean) => {
    // If enabling, ask for permission first (same UX as Emergency screen) via custom modal
    if (enabled) {
      setModalTitle("Enable Location Services");
      setModalMessage(
        "This app would like to access your location to provide better assistance and find nearby clinics."
      );
      setModalButtons([
        {
          label: "Cancel",
          onPress: () => {
            setModalVisible(false);
            // Ensure switch remains off if user cancels
            setUserData((prev) => ({ ...prev, locationServices: false }));
          },
          variant: 'secondary',
        },
        {
          label: "Enable",
          onPress: async () => {
            setModalVisible(false);
            setIsPendingLocationToggle(true);
            // Optimistically set to true
            setUserData((prev) => ({ ...prev, locationServices: true }));
            try {
              await toggleLocationServices({ enabled: true });
              console.log("📍 Location services enabled");
            } catch (error) {
              console.error("Error enabling location services:", error);
              setModalTitle("Error");
              setModalMessage("Failed to enable location services");
              setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
              setModalVisible(true);
              // Revert on error
              setUserData((prev) => ({ ...prev, locationServices: false }));
            } finally {
              setIsPendingLocationToggle(false);
            }
          },
          variant: 'primary',
        },
      ]);
      setModalVisible(true);
      return;
    }

    // Disabling path: no confirmation needed
    setIsPendingLocationToggle(true);
    setUserData((prev) => ({ ...prev, locationServices: false }));
    try {
      await toggleLocationServices({ enabled: false });
      console.log("📍 Location services disabled");
    } catch (error) {
      console.error("Error disabling location services:", error);
      setModalTitle("Error");
      setModalMessage("Failed to disable location services");
      setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
      // Revert on error
      setUserData((prev) => ({ ...prev, locationServices: true }));
    } finally {
      setIsPendingLocationToggle(false);
    }
  };

  // State for user data
  const [userData, setUserData] = useState({
    age: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
    location: "",
    allergies: "",
    currentMedications: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    medicalConditions: "",
    reminderEnabled: false,
    reminderFrequency: "daily" as "daily" | "weekly",
    reminderTime: "09:00 AM",
    reminderDayOfWeek: "Mon",
    dataEncryption: true,
    locationServices: true,
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Address suggestions state
  const [addressSuggestions, setAddressSuggestions] = useState<{
    id: string;
    label: string;
    address1: string;
    city?: string;
    province?: string;
    postalCode?: string;
  }[]>([]);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const latestAddressQueryTsRef = useRef<number>(0);

  // Update state when userProfile loads
  useEffect(() => {
    if (userProfile) {
      // Log fuller profile details again for debugging clarity
      console.log("📥 Loaded user profile", userProfile);
      setUserData((prev) => ({
        ...prev,
        age: userProfile.age || "",
        address1: userProfile.address1 || "",
        address2: userProfile.address2 || "",
        city: userProfile.city || "",
        province: userProfile.province || "",
        postalCode: userProfile.postalCode || "",
        location: userProfile.location || "",
        allergies: userProfile.allergies || "",
        currentMedications: userProfile.currentMedications || "",
        emergencyContactName: userProfile.emergencyContactName || "",
        emergencyContactPhone: userProfile.emergencyContactPhone || "",
        medicalConditions: userProfile.medicalConditions || "",
      }));
      // Set per-user namespace for reminders and bell state
      try { setReminderUserKey(String((userProfile as any)._id || '')); } catch {}
      // Refresh reminders for this user namespace
      refreshReminders();
    } else if (userProfile === null && isAuthenticated && !isLoading) {
      // Profile is null but user is authenticated - create profile
      console.log("⚠️ Profile not found, creating one...");
      ensureProfileExists()
        .then(() => {
          console.log("✅ Profile created successfully");
        })
        .catch((error) => {
          console.error("❌ Error creating profile:", error);
        });
    }
  }, [userProfile, isAuthenticated, isLoading, ensureProfileExists]);

  // Load reminder settings
  useEffect(() => {
    if (reminderSettings) {
      // Convert 24-hour time to 12-hour with AM/PM for display
      let displayTime = reminderSettings.time || "09:00 AM";
      if (reminderSettings.time && reminderSettings.time.includes(':') && !reminderSettings.time.includes('AM') && !reminderSettings.time.includes('PM')) {
        // Convert from 24-hour to 12-hour format
        const [hours24, minutes] = reminderSettings.time.split(':');
        const h24 = parseInt(hours24, 10);
        const isPM = h24 >= 12;
        const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
        displayTime = `${h12}:${minutes} ${isPM ? 'PM' : 'AM'}`;
      }
      setUserData((prev) => ({
        ...prev,
        reminderEnabled: !!reminderSettings.enabled,
        reminderFrequency: (reminderSettings.frequency === "weekly" ? "weekly" : "daily"),
        reminderTime: displayTime,
        reminderDayOfWeek: reminderSettings.dayOfWeek || "Mon",
      }));
    }
  }, [reminderSettings]);

  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState({
    personalInfo: false,
    emergencyContacts: false,
    medicalInfo: false,
    appSettings: false,
  });

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalMessage, setModalMessage] = useState<string>("");
  const [modalButtons, setModalButtons] = useState<{ label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'destructive' }[]>([]);
  
  // Reminders manager (local)
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [addingReminder, setAddingReminder] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [reminderForm, setReminderForm] = useState<{ frequency: 'hourly'|'daily'|'weekly'; time?: string; dayOfWeek?: string }>({ frequency: 'daily', time: '09:00' });
  const [timeHour, setTimeHour] = useState<string>("09");
  const [timeMinute, setTimeMinute] = useState<string>("00");
  const [timeAmPm, setTimeAmPm] = useState<"AM" | "PM">("AM");
  const [showTimeSelectModal, setShowTimeSelectModal] = useState(false);
  const [tempHour, setTempHour] = useState<string>("09");
  const [tempMinute, setTempMinute] = useState<string>("00");
  const [tempAmPm, setTempAmPm] = useState<"AM"|"PM">("AM");
  const hours12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const normalizeTimeInput = (s: string): string | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec((s || '').trim());
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (Number.isNaN(h) || Number.isNaN(mm) || h < 0 || h > 23 || mm < 0 || mm > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  // 24h <-> 12h helpers for the pickers
  const to12h = (time24?: string): { hour: string; minute: string; ampm: 'AM'|'PM' } => {
    const fallback = { hour: '09', minute: '00', ampm: 'AM' as const };
    if (!time24 || !/^(\d{2}):(\d{2})$/.test(time24)) return fallback;
    const [hhStr, mm] = time24.split(':');
    let hh = parseInt(hhStr, 10);
    const ampm: 'AM' | 'PM' = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12;
    if (hh === 0) hh = 12;
    return { hour: String(hh).padStart(2, '0'), minute: mm, ampm };
  };
  const from12h = (hour: string, minute: string, ampm: 'AM'|'PM'): string => {
    let h = parseInt(hour, 10);
    if (ampm === 'AM') {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h = h + 12;
    }
    return `${String(h).padStart(2, '0')}:${String(parseInt(minute, 10)).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (addingReminder && reminderForm.frequency !== 'hourly') {
      const { hour, minute, ampm } = to12h(reminderForm.time || '09:00');
      setTimeHour(hour);
      setTimeMinute(minute);
      setTimeAmPm(ampm);
    }
  }, [addingReminder, reminderForm.frequency, reminderForm.time]);

  const handleUpdatePersonalInfo = async (): Promise<boolean> => {
    try {
      // Validate only personal info fields before saving
      const valid = validatePersonalInfo();
      if (!valid) {
        setModalTitle("Fix Form Errors");
        setModalMessage("Please correct the highlighted fields in Personal Information.");
        setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
        setModalVisible(true);
        return false;
      }
      await updatePersonalInfo({
        age: userData.age,
        address1: userData.address1,
        address2: userData.address2,
        city: userData.city,
        province: userData.province,
        postalCode: userData.postalCode,
        location: userData.location,
      });
      setModalTitle("Success");
      setModalMessage("Personal information updated successfully");
      setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
      return true;
    } catch (error) {
      let errorMessage;
      if (error instanceof ConvexError) {
        errorMessage =
          typeof error.data === "string"
            ? error.data
            : error.data?.message || "An error occurred";
      } else {
        errorMessage = "Unexpected error occurred";
      }
      setModalTitle("Error");
      setModalMessage(errorMessage);
      setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
      return false;
    }
  };

  const handleUpdateEmergencyContact = async (): Promise<boolean> => {
    try {
      const valid = validateEmergencyContact();
      if (!valid) {
        setModalTitle("Fix Form Errors");
        setModalMessage("Please correct the highlighted fields in Emergency Contact.");
        setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
        setModalVisible(true);
        return false;
      }
      await updateEmergencyContactMutation({
        emergencyContactName: userData.emergencyContactName,
        emergencyContactPhone: userData.emergencyContactPhone,
      });
      setModalTitle("Success");
      setModalMessage("Emergency contact updated successfully");
      setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
      return true;
    } catch (error) {
      let errorMessage;
      if (error instanceof ConvexError) {
        errorMessage =
          typeof error.data === "string"
            ? error.data
            : error.data?.message || "An error occurred";
      } else {
        errorMessage = "Unexpected error occurred";
      }
      setModalTitle("Error");
      setModalMessage(errorMessage);
      setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
      return false;
    }
  };

  const handleUpdateMedicalInfo = async (): Promise<boolean> => {
    try {
      const valid = validateMedicalInfo();
      if (!valid) {
        setModalTitle("Fix Form Errors");
        setModalMessage("Please correct the highlighted fields in Medical Information.");
        setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
        setModalVisible(true);
        return false;
      }
      await updateMedicalHistoryMutation({
        allergies: userData.allergies,
        currentMedications: userData.currentMedications,
        medicalConditions: userData.medicalConditions,
      });
      setModalTitle("Success");
      setModalMessage("Medical information updated successfully");
      setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
      return true;
    } catch (error) {
      let errorMessage;
      if (error instanceof ConvexError) {
        errorMessage =
          typeof error.data === "string"
            ? error.data
            : error.data?.message || "An error occurred";
      } else {
        errorMessage = "Unexpected error occurred";
      }
      setModalTitle("Error");
      setModalMessage(errorMessage);
      setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
      return false;
    }
  };

  // Toggle section expansion
  const toggleSection = async (section: keyof typeof expandedSections) => {
    if (expandedSections[section]) {
      // If we're closing the section, save the data
      if (section === "personalInfo") {
        const ok = await handleUpdatePersonalInfo();
        if (!ok) {
          // Keep section open to show validation errors
          return;
        }
      } else if (section === "emergencyContacts") {
        const ok = await handleUpdateEmergencyContact();
        if (!ok) {
          return;
        }
      } else if (section === "medicalInfo") {
        const ok = await handleUpdateMedicalInfo();
        if (!ok) {
          return;
        }
      } else if (section === "appSettings") {
        // when closing app settings, persist reminder settings
        await handleSaveReminderSettings();
      }
    }
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Handle input changes
  const handleInputChange = async (
    field: keyof typeof userData,
    value: string | boolean
  ) => {
    // Special handling for phone to check BEFORE formatting
    if (field === 'emergencyContactPhone' && typeof value === 'string') {
      const inputDigits = value.replace(/\D/g, '');
      if (inputDigits.length > 10) {
        // Show error immediately but limit to 10 digits
        setErrors((prev) => ({ ...prev, [field]: 'Phone number must be exactly 10 digits' }));
        const limited = inputDigits.slice(0, 10);
        const formatted = `(${limited.slice(0,3)}) ${limited.slice(3,6)}-${limited.slice(6,10)}`;
        setUserData((prev) => ({
          ...prev,
          [field]: formatted,
        }));
        return;
      } else if (inputDigits.length === 10) {
        // Clear error when exactly 10 digits
        setErrors((prev) => ({ ...prev, [field]: '' }));
        const formatted = `(${inputDigits.slice(0,3)}) ${inputDigits.slice(3,6)}-${inputDigits.slice(6,10)}`;
        setUserData((prev) => ({
          ...prev,
          [field]: formatted,
        }));
        return;
      } else if (inputDigits.length < 10 && inputDigits.length > 0) {
        // Show "too short" error
        setErrors((prev) => ({ ...prev, [field]: 'Enter a 10-digit phone number' }));
        setUserData((prev) => ({
          ...prev,
          [field]: value,
        }));
        return;
      }
    }
    
    setUserData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Immediately persist reminder toggle to backend to avoid losing state on tab switch
    if (field === 'reminderEnabled' && typeof value === 'boolean') {
      try {
        // Prefer first non-hourly reminder if available to sync with backend time
        let time24h = userData.reminderTime;
        const firstNonHourly = reminders.find(r => r.frequency !== 'hourly');
        if (firstNonHourly?.time) {
          time24h = firstNonHourly.time; // already HH:mm 24h
        } else {
          const timeMatch = userData.reminderTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2];
            const ampm = timeMatch[3].toUpperCase();
            if (ampm === 'PM' && hours !== 12) hours += 12;
            else if (ampm === 'AM' && hours === 12) hours = 0;
            time24h = `${String(hours).padStart(2, '0')}:${minutes}`;
          }
        }
        updateReminderSettings({
          enabled: value,
          frequency: userData.reminderFrequency,
          time: time24h,
          dayOfWeek: userData.reminderFrequency === 'weekly' ? userData.reminderDayOfWeek : undefined,
        }).catch(() => {});
        if (value) {
          // best-effort schedule all current reminders when enabling
          try { scheduleAllReminderItems().catch(() => {}); } catch {}
        }
      } catch {}
    }
    // Field-level validation
    if (typeof value === 'string') {
      validateField(field as string, value);
    }
    // Trigger address suggestion fetch for address1
    if (field === 'address1' && typeof value === 'string') {
      debouncedFetchAddressSuggestions(value);
    }
    // Auto-sync profile.location to City, Province if user edits city/province directly
    if ((field === 'city' || field === 'province') && typeof value === 'string') {
      setUserData((prev) => ({
        ...prev,
        location: [
          field === 'city' ? value : prev.city,
          field === 'province' ? value : prev.province,
        ].filter(Boolean).join(', '),
      }));
    }
  };

  // Load reminders when enabled
  const refreshReminders = async () => {
    try {
      const list = await getReminders();
      setReminders(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('Failed to load reminders', e);
      setReminders([]);
    }
  };

  useEffect(() => {
    if (userData.reminderEnabled) {
      refreshReminders();
    } else {
      setReminders([]);
    }
  }, [userData.reminderEnabled]);

  const handleSaveReminderSettings = async () => {
    try {
      // Convert 12-hour time back to 24-hour format for backend storage
      const timeMatch = userData.reminderTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      let time24h = userData.reminderTime;
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2];
        const ampm = timeMatch[3].toUpperCase();
        
        if (ampm === 'PM' && hours !== 12) {
          hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0;
        }
        time24h = `${String(hours).padStart(2, '0')}:${minutes}`;
      }
      
      await updateReminderSettings({
        enabled: userData.reminderEnabled,
        frequency: userData.reminderFrequency,
        time: time24h,
        dayOfWeek: userData.reminderFrequency === 'weekly' ? userData.reminderDayOfWeek : undefined,
      });
      setModalTitle("Success");
      setModalMessage("Reminder settings saved.");
      setModalVisible(true);
    } catch (e) {
      console.error(e);
      setModalTitle("Error");
      setModalMessage("Failed to save reminder settings.");
      setModalVisible(true);
    }
  };

  const handleSaveSingleReminder = async () => {
    try {
      if (reminderForm.frequency === 'weekly' && !reminderForm.dayOfWeek) {
        setModalTitle('Missing Day');
        setModalMessage('Please choose a day of the week for the weekly reminder.');
        setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
        setModalVisible(true);
        return;
      }
      if (reminderForm.frequency !== 'hourly' && !reminderForm.time) {
        setModalTitle('Missing Time');
        setModalMessage('Please choose a time for the reminder.');
        setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
        setModalVisible(true);
        return;
      }
      // Final time normalization check for safety
      let payload = { ...reminderForm } as typeof reminderForm;
      if (reminderForm.frequency !== 'hourly' && reminderForm.time) {
        const norm = normalizeTimeInput(reminderForm.time);
        if (!norm) {
          setModalTitle('Invalid Time');
          setModalMessage('Time must be in HH:mm (00-23:00-59).');
          setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
          setModalVisible(true);
          return;
        }
        payload = { ...reminderForm, time: norm };
      }
      if (editingReminderId) {
        await updateReminder(editingReminderId, { ...payload });
      } else {
        await addReminder(payload as any);
      }
      // Sync backend basic reminder settings for daily/weekly (legacy field used elsewhere)
      try {
        if (payload.frequency !== 'hourly') {
          await updateReminderSettings({
            enabled: true,
            frequency: payload.frequency as 'daily'|'weekly',
            time: payload.time!,
            dayOfWeek: payload.frequency === 'weekly' ? payload.dayOfWeek : undefined,
          });
          // Also reflect in UI userData.reminderTime for consistency
          const { hour, minute, ampm } = to12h(payload.time!);
          setUserData((prev) => ({ ...prev, reminderTime: `${parseInt(hour,10)}:${minute} ${ampm}`, reminderFrequency: payload.frequency as any, reminderDayOfWeek: payload.dayOfWeek || prev.reminderDayOfWeek }));
        }
      } catch {}
      await refreshReminders();
      setAddingReminder(false);
      setEditingReminderId(null);
      setReminderForm({ frequency: 'daily', time: '09:00' });
      setModalTitle('Saved');
      setModalMessage('Reminder saved successfully.');
      setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
    } catch (e) {
      console.error('Failed saving reminder', e);
      setModalTitle('Error');
      setModalMessage('Failed to save reminder.');
      setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
    }
  };

  // Validation rules
  const validateField = (field: string, raw: string): boolean => {
    const value = (raw || '').trim();
    let error = '';
    switch (field) {
      case 'age': {
        if (value.length === 0) {
          error = 'Age is required';
          break;
        }
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0 || n > 120) error = 'Age must be between 0 and 120';
        break;
      }
      case 'address1': {
        if (value.length === 0) error = 'Address is required';
        break;
      }
      case 'city': {
        if (value.length === 0) error = 'City is required';
        break;
      }
      case 'province': {
        if (value.length === 0) {
          error = 'Province is required';
        } else {
          const allowed = ['AB','Alberta'];
          if (!allowed.includes(value)) {
            // Not hard failing, but warn to use Alberta context
            error = 'Use "Alberta" or "AB"';
          }
        }
        break;
      }
      case 'postalCode': {
        if (value.length === 0) { error = 'Postal code is required'; break; }
        const formatted = value.replace(/\s+/g, '').toUpperCase();
        if (!/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/.test(formatted)) {
          error = 'Enter a valid Canadian postal code (e.g., T2X 0M4)';
        } else if (value !== formatted.slice(0,3) + ' ' + formatted.slice(3)) {
          // Normalize display format A1A 1A1
          setUserData((prev) => ({ ...prev, postalCode: formatted.slice(0,3) + ' ' + formatted.slice(3) }));
        }
        break;
      }
      case 'emergencyContactPhone': {
        if (value.length === 0) {
          error = 'Phone is required';
          break;
        }
        const digits = value.replace(/\D/g, '');
        // Limit to 10 digits
        if (digits.length > 10) {
          error = 'Phone number must be exactly 10 digits';
          const limited = digits.slice(0, 10);
          const formatted = `(${limited.slice(0,3)}) ${limited.slice(3,6)}-${limited.slice(6,10)}`;
          setUserData((prev) => ({ ...prev, emergencyContactPhone: formatted }));
          break;
        }
        if (digits.length < 10) {
          error = 'Enter a 10-digit phone number';
        } else if (digits.length === 10) {
          // Only format when we have exactly 10 digits
          const formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
          if (value !== formatted) {
            setUserData((prev) => ({ ...prev, emergencyContactPhone: formatted }));
          }
        }
        break;
      }
      case 'emergencyContactName': {
        if (value.length > 0 && value.length < 2) error = 'Name too short';
        break;
      }
      case 'allergies':
      case 'currentMedications':
      case 'medicalConditions': {
        if (value.length > 500) error = 'Too long (max 500 characters)';
        break;
      }
      case 'location': {
        if (value.length === 0) error = 'Location is required';
        break;
      }
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const validateAll = (): boolean => {
    const fieldsToCheck: (keyof typeof userData)[] = [
      'age','address1','city','province','postalCode','location','emergencyContactName','emergencyContactPhone','allergies','currentMedications','medicalConditions'
    ];
    const results = fieldsToCheck.map((f) => validateField(f, String((userData as any)[f] ?? '')));
    return results.every(Boolean);
  };

  // Validate only personal info fields
  const validatePersonalInfo = (): boolean => {
    const fieldsToCheck: (keyof typeof userData)[] = [
      'age','address1','city','province','postalCode','location'
    ];
    const results = fieldsToCheck.map((f) => validateField(f, String((userData as any)[f] ?? '')));
    return results.every(Boolean);
  };

  // Validate only emergency contact fields
  const validateEmergencyContact = (): boolean => {
    const fieldsToCheck: (keyof typeof userData)[] = [
      'emergencyContactName','emergencyContactPhone'
    ];
    const results = fieldsToCheck.map((f) => validateField(f, String((userData as any)[f] ?? '')));
    return results.every(Boolean);
  };

  // Validate only medical info fields
  const validateMedicalInfo = (): boolean => {
    const fieldsToCheck: (keyof typeof userData)[] = [
      'allergies','currentMedications','medicalConditions'
    ];
    const results = fieldsToCheck.map((f) => validateField(f, String((userData as any)[f] ?? '')));
    return results.every(Boolean);
  };

  // Debounced fetch of address suggestions from Mapbox
  const debouncedFetchAddressSuggestions = (q: string) => {
    const ts = Date.now();
    latestAddressQueryTsRef.current = ts;
    if (!q || q.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }
    setIsFetchingAddress(true);
    // Delay 300ms
    setTimeout(async () => {
      // Only proceed if this is the latest request
      if (latestAddressQueryTsRef.current !== ts) return;
      try {
        if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'YOUR_MAPBOX_PUBLIC_TOKEN') {
          setIsFetchingAddress(false);
          return;
        }
        const country = 'ca';
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?autocomplete=true&country=${country}&types=address,place,postcode&limit=5&access_token=${MAPBOX_ACCESS_TOKEN}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const features = Array.isArray(data?.features) ? data.features : [];
        const suggestions = features.map((f: any) => {
          const label = f.place_name as string;
          const context: any[] = f.context || [];
          const placeType: string[] = Array.isArray(f.place_type) ? f.place_type : [];
          const byId = (idStart: string) => context.find((c) => typeof c.id === 'string' && c.id.startsWith(idStart));
          const city = (byId('place')?.text || byId('locality')?.text) as string | undefined;
          const region = (byId('region')?.short_code || byId('region')?.text) as string | undefined;
          const province = region?.toUpperCase() === 'CA-AB' ? 'AB' : (region === 'Alberta' ? 'AB' : region);
          const postal = (byId('postcode')?.text || '') as string;
          // Preserve leading house number when available for address features
          const number: string | undefined = (f.address || f.properties?.address) as any;
          const street: string | undefined = f.text as any;
          const address1 = placeType.includes('address')
            ? [number, street].filter(Boolean).join(' ')
            : (street || label);
          return {
            id: f.id as string,
            label,
            address1,
            city,
            province,
            postalCode: postal,
          };
        });
        setAddressSuggestions(suggestions);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setIsFetchingAddress(false);
      }
    }, 300);
  };

  const handleSelectAddressSuggestion = (s: { id: string; label: string; address1: string; city?: string; province?: string; postalCode?: string; }) => {
    setAddressSuggestions([]);
    setUserData((prev) => ({
      ...prev,
      address1: s.address1 || prev.address1,
      city: s.city || prev.city,
      province: s.province || prev.province,
      postalCode: s.postalCode ? (s.postalCode.length === 6 ? (s.postalCode.slice(0,3).toUpperCase() + ' ' + s.postalCode.slice(3).toUpperCase()) : s.postalCode.toUpperCase()) : prev.postalCode,
      location: [s.city, s.province].filter(Boolean).join(', ') || prev.location,
    }));
    // Validate updated fields
    if (s.city) validateField('city', s.city);
    if (s.province) validateField('province', s.province);
    if (s.postalCode) validateField('postalCode', s.postalCode);
  };

  // Handle sign out
  const handleSignOut = async () => {
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
        onPress: async () => {
          setModalVisible(false);
          try {
            console.log("🔄 Signing out...");
            await signOut();
            try { setReminderUserKey(null); } catch {}
            console.log("✅ Signed out successfully");
            router.replace("/auth/signin");
          } catch (error) {
            console.error("❌ Sign out failed:", error);
            router.replace("/auth/signin");
          }
        },
        variant: 'destructive',
      },
    ]);
    setModalVisible(true);
  };

  // Show loading while auth is loading
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <CurvedHeader
            title="Profile"
            height={150}
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
          />
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </CurvedBackground>
      </SafeAreaView>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    // This should trigger automatically due to your AuthGuard, but as a safeguard:
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <CurvedHeader 
            title="Profile" 
            height={150} 
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
          />
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Redirecting...</Text>
          </View>
        </CurvedBackground>
      </SafeAreaView>
    );
  }

  // Show loading while profile data is loading
  // Note: userProfile will be null if the query returns null (unauthenticated)
  // but since we're checking isAuthenticated above, it should load data
  if (userProfile === undefined) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <CurvedHeader 
            title="Profile" 
            height={150} 
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
          />
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </CurvedBackground>
      </SafeAreaView>
    );
  }

  // Handle case where profile is null (shouldn't happen due to auth check above)
  if (userProfile === null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <CurvedHeader 
            title="Profile" 
            height={150} 
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
          />
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Profile not found...</Text>
          </View>
        </CurvedBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <CurvedHeader 
          title="Profile" 
          height={150} 
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
          reminderEnabled={userData.reminderEnabled}
          reminderSettings={{
            enabled: userData.reminderEnabled,
            frequency: userData.reminderFrequency,
            time: (() => {
              // Convert 12-hour format back to 24-hour
              const timeMatch = userData.reminderTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
              if (!timeMatch) return userData.reminderTime;
              let hours = parseInt(timeMatch[1], 10);
              const minutes = timeMatch[2];
              const ampm = timeMatch[3].toUpperCase();
              if (ampm === 'PM' && hours !== 12) hours += 12;
              else if (ampm === 'AM' && hours === 12) hours = 0;
              return `${String(hours).padStart(2, '0')}:${minutes}`;
            })(),
            dayOfWeek: userData.reminderDayOfWeek,
          }}
        />
        <ScrollView style={styles.container}>
          {/* Privacy Notice */}
          <View style={styles.card}>
            <View style={styles.privacyHeader}>
              <View style={styles.privacyIcon}>
                <Text style={styles.privacyIconText}>✓</Text>
              </View>
              <Text style={styles.cardTitle}>Privacy Protected</Text>
            </View>
            <Text style={styles.privacyText}>
              Your personal information is encrypted and stored locally. No data
              is shared without your consent.
            </Text>
          </View>

          {/* Personal Information Card */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggleSection("personalInfo")}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>Personal Information</Text>
              <Text style={styles.editButton}>
                {expandedSections.personalInfo ? "Done" : "Edit"}
              </Text>
            </TouchableOpacity>

            {expandedSections.personalInfo ? (
              <>
                <Text style={styles.sectionTitle}>Age</Text>
                <TextInput
                  style={[styles.input, errors.age ? styles.inputError : null]}
                  value={userData.age}
                  onChangeText={(text) => handleInputChange("age", text)}
                  placeholder="e.g., 25"
                  placeholderTextColor={COLORS.lightGray}
                  keyboardType="numeric"
                />
                {errors.age ? <Text style={styles.errorText}>{errors.age}</Text> : null}

                <Text style={styles.sectionTitle}>Address Line 1</Text>
                <TextInput
                  style={[styles.input, errors.address1 ? styles.inputError : null]}
                  value={userData.address1}
                  onChangeText={(text) => handleInputChange("address1", text)}
                  placeholder="Street address, P.O. box"
                  placeholderTextColor={COLORS.lightGray}
                />
                {errors.address1 ? <Text style={styles.errorText}>{errors.address1}</Text> : null}
                {!!addressSuggestions.length && (
                  <View style={styles.suggestionsBox}>
                    {addressSuggestions.map((s) => (
                      <TouchableOpacity key={s.id} style={styles.suggestionItem} onPress={() => handleSelectAddressSuggestion(s)}>
                        <Text style={styles.suggestionText}>{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                    {isFetchingAddress ? (
                      <View style={styles.suggestionLoading}><Text style={styles.suggestionLoadingText}>Searching…</Text></View>
                    ) : null}
                  </View>
                )}

                <Text style={styles.sectionTitle}>Address Line 2</Text>
                <TextInput
                  style={styles.input}
                  value={userData.address2}
                  onChangeText={(text) => handleInputChange("address2", text)}
                  placeholder="Apartment, suite, unit, building (optional)"
                  placeholderTextColor={COLORS.lightGray}
                />

                <Text style={styles.sectionTitle}>City</Text>
                <TextInput
                  style={[styles.input, errors.city ? styles.inputError : null]}
                  value={userData.city}
                  onChangeText={(text) => handleInputChange("city", text)}
                  placeholder="e.g., Calgary"
                  placeholderTextColor={COLORS.lightGray}
                />
                {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}

                <Text style={styles.sectionTitle}>Province</Text>
                <TextInput
                  style={[styles.input, errors.province ? styles.inputError : null]}
                  value={userData.province}
                  onChangeText={(text) => handleInputChange("province", text)}
                  placeholder="e.g., Alberta"
                  placeholderTextColor={COLORS.lightGray}
                  autoCapitalize="characters"
                />
                {errors.province ? <Text style={styles.errorText}>{errors.province}</Text> : null}

                <Text style={styles.sectionTitle}>Postal Code</Text>
                <TextInput
                  style={[styles.input, errors.postalCode ? styles.inputError : null]}
                  value={userData.postalCode}
                  onChangeText={(text) => handleInputChange("postalCode", text)}
                  placeholder="e.g., T2X 0M4"
                  placeholderTextColor={COLORS.lightGray}
                  autoCapitalize="characters"
                />
                {errors.postalCode ? <Text style={styles.errorText}>{errors.postalCode}</Text> : null}

                <Text style={styles.sectionTitle}>Location (for services)</Text>
                <TextInput
                  style={[styles.input, errors.location ? styles.inputError : null]}
                  value={userData.location}
                  onChangeText={(text) => handleInputChange("location", text)}
                  placeholder="City or region for nearby clinics"
                  placeholderTextColor={COLORS.lightGray}
                />
                {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Age:</Text>{" "}
                  {userData.age || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Address:</Text>{" "}
                  {userData.address1 || "Not set"}
                  {userData.address2 ? `, ${userData.address2}` : ""}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>City:</Text>{" "}
                  {userData.city || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Province:</Text>{" "}
                  {userData.province || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Postal Code:</Text>{" "}
                  {userData.postalCode || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Location:</Text>{" "}
                  {userData.location || "Not set"}
                </Text>
              </>
            )}
          </View>

          {/* Emergency Contacts Card */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggleSection("emergencyContacts")}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>Emergency Contact</Text>
              <Text style={styles.editButton}>
                {expandedSections.emergencyContacts ? "Done" : "Edit"}
              </Text>
            </TouchableOpacity>

            {expandedSections.emergencyContacts ? (
              <>
                <Text style={styles.sectionTitle}>Contact Name</Text>
                <TextInput
                  style={[styles.input, errors.emergencyContactName ? styles.inputError : null]}
                  value={userData.emergencyContactName}
                  onChangeText={(text) =>
                    handleInputChange("emergencyContactName", text)
                  }
                  placeholder="Emergency contact name"
                  placeholderTextColor={COLORS.lightGray}
                />
                {errors.emergencyContactName ? <Text style={styles.errorText}>{errors.emergencyContactName}</Text> : null}

                <Text style={styles.sectionTitle}>Phone Number</Text>
                <TextInput
                  style={[styles.input, errors.emergencyContactPhone ? styles.inputError : null]}
                  value={userData.emergencyContactPhone}
                  onChangeText={(text) =>
                    handleInputChange("emergencyContactPhone", text)
                  }
                  placeholder="Emergency contact phone"
                  placeholderTextColor={COLORS.lightGray}
                  keyboardType="phone-pad"
                />
                {errors.emergencyContactPhone ? <Text style={styles.errorText}>{errors.emergencyContactPhone}</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Name:</Text>{" "}
                  {userData.emergencyContactName || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Phone:</Text>{" "}
                  {userData.emergencyContactPhone || "Not set"}
                </Text>
              </>
            )}
          </View>

          {/* Medical Information Card */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggleSection("medicalInfo")}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>Medical Information</Text>
              <Text style={styles.editButton}>
                {expandedSections.medicalInfo ? "Done" : "Edit"}
              </Text>
            </TouchableOpacity>

            {expandedSections.medicalInfo ? (
              <>
                <Text style={styles.sectionTitle}>Allergies</Text>
                <TextInput
                  style={[styles.input, errors.allergies ? styles.inputError : null]}
                  value={userData.allergies}
                  onChangeText={(text) => handleInputChange("allergies", text)}
                  placeholder="List any allergies"
                  placeholderTextColor={COLORS.lightGray}
                  multiline
                />
                {errors.allergies ? <Text style={styles.errorText}>{errors.allergies}</Text> : null}

                <Text style={styles.sectionTitle}>Current Medications</Text>
                <TextInput
                  style={[styles.input, errors.currentMedications ? styles.inputError : null]}
                  value={userData.currentMedications}
                  onChangeText={(text) =>
                    handleInputChange("currentMedications", text)
                  }
                  placeholder="List current medications"
                  placeholderTextColor={COLORS.lightGray}
                  multiline
                />
                {errors.currentMedications ? <Text style={styles.errorText}>{errors.currentMedications}</Text> : null}

                <Text style={styles.sectionTitle}>Medical Conditions</Text>
                <TextInput
                  style={[styles.input, errors.medicalConditions ? styles.inputError : null]}
                  value={userData.medicalConditions}
                  onChangeText={(text) =>
                    handleInputChange("medicalConditions", text)
                  }
                  placeholder="List medical conditions"
                  placeholderTextColor={COLORS.lightGray}
                  multiline
                />
                {errors.medicalConditions ? <Text style={styles.errorText}>{errors.medicalConditions}</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Allergies:</Text>{" "}
                  {userData.allergies || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Medications:</Text>{" "}
                  {userData.currentMedications || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Conditions:</Text>{" "}
                  {userData.medicalConditions || "Not set"}
                </Text>
              </>
            )}
          </View>

          {/* App Settings Card */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggleSection("appSettings")}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>App Settings</Text>
            </TouchableOpacity>

            <View style={[styles.toggleRow, userData.reminderEnabled ? { marginBottom: 12 } : null]}>
              <Text style={styles.toggleText}>Symptom Assessment Reminder</Text>
              <Switch
                value={userData.reminderEnabled}
                onValueChange={(value) => handleInputChange("reminderEnabled", value)}
              />
            </View>

            {userData.reminderEnabled && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={styles.sectionTitle}>Reminders</Text>
                  <TouchableOpacity onPress={() => { setAddingReminder(true); setEditingReminderId(null); setReminderForm({ frequency: 'daily', time: '09:00' }); }} style={styles.addButton}>
                    <Icon name="add" size={20} color={COLORS.white} />
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {addingReminder && (
                  <View style={styles.reminderCard}>
                    <Text style={{ fontFamily: FONTS.BarlowSemiCondensedBold, color: COLORS.darkText, marginBottom: 8 }}>
                      {editingReminderId ? 'Edit Reminder' : 'New Reminder'}
                    </Text>
                    <Text style={{ fontFamily: FONTS.BarlowSemiCondensed, color: COLORS.darkGray, marginBottom: 6 }}>Frequency</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(['hourly','daily','weekly'] as const).map((f) => (
                        <TouchableOpacity
                          key={f}
                          onPress={() => setReminderForm((prev) => ({ ...prev, frequency: f }))}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 16,
                            backgroundColor: reminderForm.frequency === f ? COLORS.primary : '#f1f1f1',
                          }}
                        >
                          <Text style={{ color: reminderForm.frequency === f ? COLORS.white : COLORS.darkText, fontFamily: FONTS.BarlowSemiCondensedBold }}>
                            {f[0].toUpperCase() + f.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {reminderForm.frequency === 'weekly' && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={{ fontFamily: FONTS.BarlowSemiCondensed, color: COLORS.darkGray, marginBottom: 6 }}>Day of week</Text>
                        <View style={styles.dayGridRow}>
                          {['Mon','Tue','Wed','Thu'].map((d) => (
                            <TouchableOpacity key={d} onPress={() => setReminderForm((p) => ({ ...p, dayOfWeek: d }))} style={[styles.dayChip, reminderForm.dayOfWeek === d && styles.dayChipActive]}>
                              <Text style={[styles.dayChipText, reminderForm.dayOfWeek === d && styles.dayChipTextActive]}>{d}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={styles.dayGridRow}>
                          {['Fri','Sat','Sun'].map((d) => (
                            <TouchableOpacity key={d} onPress={() => setReminderForm((p) => ({ ...p, dayOfWeek: d }))} style={[styles.dayChip, reminderForm.dayOfWeek === d && styles.dayChipActive]}>
                              <Text style={[styles.dayChipText, reminderForm.dayOfWeek === d && styles.dayChipTextActive]}>{d}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {reminderForm.frequency !== 'hourly' && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={{ fontFamily: FONTS.BarlowSemiCondensed, color: COLORS.darkGray, marginBottom: 6 }}>Time</Text>
                        <View style={styles.timeSummaryRow}>
                          <Text style={styles.timeSummaryText}>{`${timeHour}:${timeMinute} ${timeAmPm}`}</Text>
                          <TouchableOpacity
                            onPress={() => {
                              // seed temp with current values and open modal
                              setTempHour(timeHour);
                              setTempMinute(timeMinute);
                              setTempAmPm(timeAmPm);
                              setShowTimeSelectModal(true);
                            }}
                            style={styles.smallActionBtn}
                          >
                            <Text style={{ color: COLORS.white, fontFamily: FONTS.BarlowSemiCondensedBold }}>Select Time</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                      <TouchableOpacity onPress={() => { setAddingReminder(false); setEditingReminderId(null); setReminderForm({ frequency: 'daily', time: '09:00' }); }} style={[styles.smallActionBtn, { backgroundColor: COLORS.lightGray }]}>
                        <Text style={{ color: COLORS.darkText, fontFamily: FONTS.BarlowSemiCondensedBold }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleSaveSingleReminder} style={[styles.smallActionBtn, { marginLeft: 8 }]}>
                        <Text style={{ color: COLORS.white, fontFamily: FONTS.BarlowSemiCondensedBold }}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {reminders.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                    <Text style={{ fontFamily: FONTS.BarlowSemiCondensed, color: COLORS.darkGray }}>No reminders yet</Text>
                  </View>
                ) : (
                  reminders.map(r => (
                    <View key={r.id} style={styles.reminderCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Icon name="alarm" size={18} color={COLORS.primary} />
                          <Text style={[styles.reminderTitle, { marginLeft: 8 }]}>
                            {r.frequency === 'hourly' ? 'Hourly' : r.frequency === 'daily' ? `Daily ${r.time}` : `Weekly ${r.dayOfWeek} ${r.time}`}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row' }}>
                          <TouchableOpacity onPress={() => { setEditingReminderId(r.id); setReminderForm({ frequency: r.frequency as any, time: r.time, dayOfWeek: r.dayOfWeek }); setAddingReminder(true); }} style={styles.smallActionBtn}>
                            <Icon name="edit" size={18} color={COLORS.white} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={async () => { await deleteReminder(r.id); await refreshReminders(); }} style={[styles.smallActionBtn, { backgroundColor: COLORS.error, marginLeft: 8 }]}>
                            <Icon name="delete" size={18} color={COLORS.white} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            <View style={[styles.toggleRow, { marginTop: 12 }]}>
              <Text style={styles.toggleText}>Data Encryption</Text>
              <Switch
                value={userData.dataEncryption}
                onValueChange={(value) =>
                  handleInputChange("dataEncryption", value)
                }
              />
            </View>

            <View style={[styles.toggleRow, { marginTop: 12 }]}>
              <Text style={styles.toggleText}>Location Services</Text>
              <Switch
                value={userData.locationServices}
                onValueChange={handleLocationServicesToggle}
              />
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Icon
              name="exit-to-app"
              size={20}
              color={COLORS.white}
              style={styles.signOutIcon}
            />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </CurvedBackground>
      <BottomNavigation />

      {/* App-wide modal (white, elevated) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
        }}>
          <View style={{
            width: '80%', backgroundColor: COLORS.white, borderRadius: 12, padding: 16,
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8
          }}>
            <Text style={{ fontFamily: FONTS.BarlowSemiCondensedBold, fontSize: 18, color: COLORS.darkText, marginBottom: 8 }}>{modalTitle}</Text>
            <Text style={{ fontFamily: FONTS.BarlowSemiCondensed, fontSize: 14, color: COLORS.darkGray, marginBottom: 16 }}>{modalMessage}</Text>
            <View style={{ flexDirection: 'row', justifyContent: modalButtons.length > 1 ? 'space-between' : 'center', gap: 12 }}>
              {(modalButtons.length ? modalButtons : [{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]).map((b, idx) => {
                const isSecondary = b.variant === 'secondary';
                const isDestructive = b.variant === 'destructive';
                const backgroundColor = isSecondary ? COLORS.white : (isDestructive ? COLORS.error : COLORS.primary);
                const textColor = isSecondary ? COLORS.primary : COLORS.white;
                const borderStyle = isSecondary ? { borderWidth: 1, borderColor: COLORS.primary } : {};
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={b.onPress}
                    style={{
                      backgroundColor,
                      borderRadius: 8,
                      paddingVertical: 10,
                      alignItems: 'center',
                      flex: modalButtons.length > 1 ? 1 : undefined,
                      paddingHorizontal: modalButtons.length > 1 ? 0 : 18,
                      ...borderStyle as any,
                    }}
                  >
                    <Text style={{ color: textColor, fontFamily: FONTS.BarlowSemiCondensedBold, fontSize: 16 }}>{b.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Legacy reminder modals removed in favor of inline manager */}

      {/* Time Selection Modal (white card, matches success modal style) */}
      <Modal
        visible={showTimeSelectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimeSelectModal(false)}
      >
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
        }}>
          <View style={styles.timeModalCard}>
            <Text style={{ fontFamily: FONTS.BarlowSemiCondensedBold, fontSize: 18, color: COLORS.darkText, marginBottom: 8 }}>Select Time</Text>
            <View style={styles.timeModalGridRow}>
              <View style={styles.timeModalColumn}>
                <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ paddingBottom: 4 }}>
                  {hours12.map(h => (
                    <TouchableOpacity
                      key={h}
                      onPress={() => setTempHour(h)}
                      style={[styles.timeModalOption, tempHour === h && styles.timeModalOptionActive]}
                    >
                      <Text style={[styles.timeModalOptionText, tempHour === h && styles.timeModalOptionTextActive]}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.timeModalColumn}>
                <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ paddingBottom: 4 }}>
                  {minutes60.map(m => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setTempMinute(m)}
                      style={[styles.timeModalOption, tempMinute === m && styles.timeModalOptionActive]}
                    >
                      <Text style={[styles.timeModalOptionText, tempMinute === m && styles.timeModalOptionTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.timeModalColumn}>
                <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ paddingBottom: 4 }}>
                  {(['AM','PM'] as const).map(ap => (
                    <TouchableOpacity
                      key={ap}
                      onPress={() => setTempAmPm(ap)}
                      style={[styles.timeModalOption, tempAmPm === ap && styles.timeModalOptionActive]}
                    >
                      <Text style={[styles.timeModalOptionText, tempAmPm === ap && styles.timeModalOptionTextActive]}>{ap}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View style={styles.modalActionsRow}>
              <TouchableOpacity onPress={() => setShowTimeSelectModal(false)} style={[styles.smallActionBtn, { backgroundColor: COLORS.lightGray }]}>
                <Text style={{ color: COLORS.darkText, fontFamily: FONTS.BarlowSemiCondensedBold }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setTimeHour(tempHour);
                  setTimeMinute(tempMinute);
                  setTimeAmPm(tempAmPm);
                  const t24 = from12h(tempHour, tempMinute, tempAmPm);
                  setReminderForm((p) => ({ ...p, time: t24 }));
                  setShowTimeSelectModal(false);
                }}
                style={[styles.smallActionBtn, { marginLeft: 8 }]}
              >
                <Text style={{ color: COLORS.white, fontFamily: FONTS.BarlowSemiCondensedBold }}>Done</Text>
              </TouchableOpacity>
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
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: COLORS.darkGray,
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
  debugCard: {
    backgroundColor: "#fff3cd",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderColor: "#ffeaa7",
    borderWidth: 1,
  },
  debugTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: "#856404",
    marginBottom: 8,
  },
  debugText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: "#856404",
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 18,
    color: COLORS.darkText,
  },
  sectionTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    marginBottom: 8,
    color: COLORS.darkGray,
    marginTop: 12,
  },
  text: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    color: COLORS.darkText,
    backgroundColor: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  suggestionsBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
  },
  suggestionLoading: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  suggestionLoadingText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    fontStyle: 'italic',
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  toggleText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
    flex: 1,
  },
  editButton: {
    color: COLORS.primary,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    marginBottom: 8,
    alignSelf: 'center',
    width: '70%',
  },
  timeButton: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    alignSelf: 'center',
    width: '70%',
    marginBottom: 8,
  },
  timeButtonText: {
    color: COLORS.darkText,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
  },
  centerText: {
    textAlign: 'center',
  },
  customPickerButton: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    alignSelf: 'center',
    width: '70%',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  customPickerButtonText: {
    color: COLORS.darkText,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  privacyText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 8,
    fontStyle: "italic",
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  privacyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  privacyIconText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  signOutButton: {
    backgroundColor: COLORS.error,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 100,
    marginTop: 8,
  },
  signOutText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    marginLeft: 8,
  },
  signOutIcon: {
    marginRight: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    marginLeft: 6,
  },
  reminderCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  reminderTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    color: COLORS.darkText,
    fontSize: 14,
  },
  smallActionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  dayChip: {
    flexGrow: 1,
    flexBasis: 0,
    marginHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
  },
  dayChipText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    color: COLORS.darkText,
  },
  dayChipTextActive: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  customTimeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    color: COLORS.darkText,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  triplePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  pickerBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  pickerSeparator: {
    marginHorizontal: 8,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    color: COLORS.darkText,
    fontSize: 18,
  },
  timeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },
  timeSummaryText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    color: COLORS.darkText,
    fontSize: 16,
  },
  timeModalCard: {
    width: '85%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  timeModalGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeModalColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  timeModalOption: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginBottom: 6,
  },
  timeModalOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#f2f7ff',
  },
  timeModalOptionText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    color: COLORS.darkText,
    fontSize: 16,
  },
  timeModalOptionTextActive: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    color: COLORS.primary,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
});
