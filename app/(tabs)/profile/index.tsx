/* eslint-disable @typescript-eslint/no-unused-vars */
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { ReminderItem, setConvexSyncCallback, setReminderUserKey } from "../../_utils/notifications";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import StatusModal from "../../components/StatusModal";
import { COLORS, FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { normalizeNanpToE164, savePhoneSecurely } from "../../utils/securePhone";
import { LLMTest } from "@/utils/llm";

export default function Profile() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const { isOnline } = useNetworkStatus();
  const [cachedProfile, setCachedProfile] = useState<any>(null);
  const [cachedUser, setCachedUser] = useState<any>(null);

  const updatePersonalInfo = useMutation(
    api.profile.personalInformation.updatePersonalInfo
  );
  const ensureProfileExists = useMutation(
    (api as any)["profile/ensureProfileExists"].ensureProfileExists
  );
  const updateReminderSettings = useMutation(
    (api as any)["profile/reminders"].updateReminderSettings
  );
  const saveAllReminders = useMutation(
    (api as any)["profile/reminders"].saveAllReminders
  );
  const updateEmergencyContactMutation = useMutation(
    (api as any)["emergencyContactOnboarding/update"].withNameAndPhone
  );
  const updateMedicalHistoryMutation = useMutation(
    (api as any)["medicalHistoryOnboarding/update"].withAllConditions
  );
  const updatePhone = useMutation(api.users.updatePhone);
  const currentUserOnline = useQuery(
    api.users.getCurrentUser,
    isAuthenticated && !isLoading ? {} : "skip"
  );

  // Skip queries if not authenticated - allow offline access via cache
  const userProfileOnline = useQuery(
    api.profile.personalInformation.getProfile,
    isAuthenticated && !isLoading ? {} : "skip"
  );
  const reminderSettings = useQuery(
    (api as any)["profile/reminders"].getReminderSettings,
    isAuthenticated && !isLoading ? {} : "skip"
  );

  // Cache user data when online
  useEffect(() => {
    if (isOnline && currentUserOnline) {
      AsyncStorage.setItem("@profile_user", JSON.stringify(currentUserOnline)).catch((err) =>
        console.error("Failed to cache user:", err)
      );
      setCachedUser(currentUserOnline);
    }
  }, [isOnline, currentUserOnline]);

  // Cache profile data when online
  useEffect(() => {
    if (isOnline && userProfileOnline) {
      AsyncStorage.setItem("@profile_data", JSON.stringify(userProfileOnline)).catch((err) =>
        console.error("Failed to cache profile:", err)
      );
      setCachedProfile(userProfileOnline);
    }
  }, [isOnline, userProfileOnline]);

  // Load cached data when offline
  useEffect(() => {
    if (!isOnline) {
      AsyncStorage.getItem("@profile_user")
        .then((cached) => {
          if (cached) setCachedUser(JSON.parse(cached));
        })
        .catch((err) => console.error("Failed to load cached user:", err));

      AsyncStorage.getItem("@profile_data")
        .then((cached) => {
          if (cached) setCachedProfile(JSON.parse(cached));
        })
        .catch((err) => console.error("Failed to load cached profile:", err));
    }
  }, [isOnline]);

  // Use online or cached data
  const currentUser = isOnline ? currentUserOnline : (cachedUser || currentUserOnline);
  const userProfile = isOnline ? userProfileOnline : (cachedProfile || userProfileOnline);

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

  // State for user data
  const [userData, setUserData] = useState({
    phone: "",
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

  // Update state when userProfile loads
  useEffect(() => {
    if (userProfile) {
      // Log fuller profile details again for debugging clarity
      console.log("📥 Loaded user profile", userProfile);
      setUserData((prev) => ({
        ...prev,
        // Phone is managed on users table, set from currentUser in separate effect
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
      // Set up Convex sync callback for reminders
      setConvexSyncCallback(async (reminders: ReminderItem[]) => {
        try {
          await saveAllReminders({ reminders: JSON.stringify(reminders) });
          console.log('✅ Synced', reminders.length, 'reminders to Convex');
        } catch (err) {
          console.error('❌ Failed to sync reminders to Convex:', err);
        }
      });
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
  }, [userProfile, isAuthenticated, isLoading, ensureProfileExists, saveAllReminders]);

  // Prefill phone from current user when available
  useEffect(() => {
    if (currentUser?.phone !== undefined) {
      setUserData((prev) => ({ ...prev, phone: currentUser?.phone || "" }));
    }
  }, [currentUser?.phone]);

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

  // State for expandable sections - two-level hierarchy
  const [expandedSections, setExpandedSections] = useState({
    profileInformation: false, // top-level: Profile Information
    personalInfo: false,
    emergencyContacts: false,
    medicalInfo: false,
    appSettings: false, // top-level: App Settings
  });

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalMessage, setModalMessage] = useState<string>("");
  const [modalButtons, setModalButtons] = useState<{ label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'destructive' }[]>([]);
  
  // Reminders manager (local)
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [showTimeSelectModal, setShowTimeSelectModal] = useState(false);

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
      // Update phone on users table and secure store (best-effort)
      try {
        const normalized = normalizeNanpToE164(userData.phone || "");
        if (normalized) {
          await updatePhone({ phone: normalized });
          const uid = currentUser?._id ? String(currentUser._id) : undefined;
          await savePhoneSecurely(normalized, uid);
        }
      } catch (e) {
        console.log("⚠️ Phone update skipped (possibly offline):", e);
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

  /* Unused helper functions - functionality moved to separate pages */
  const refreshReminders = async () => {};
  const validatePersonalInfo = (): boolean => true;
  const validateEmergencyContact = (): boolean => true;
  const validateMedicalInfo = (): boolean => true;
  const to12h = (time24?: string) => ({ hour: '09', minute: '00', ampm: 'AM' as const });

  /* Unused functions removed - functionality moved to separate pages
  // Toggle section expansion
  const toggleSection = async (section: keyof typeof expandedSections) => { ... }
  // Handle input changes  
  const handleInputChange = async (field, value) => { ... }
  // Handle save single reminder
  const handleSaveSingleReminder = async () => { ... }
  // Load reminders when enabled
  const refreshReminders = async () => { ... }
  // Debounced address fetch
  const debouncedFetchAddressSuggestions = debounce(...) => { ... }
  // Handle select address suggestion
  const handleSelectAddressSuggestion = (s) => { ... }
  */

  /* OLD UNUSED CODE - COMMENTING OUT TO FIX COMPILATION
  // Handle sign out
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
      
      // Save locally first (works offline)
      if (editingReminderId) {
        await updateReminder(editingReminderId, { ...payload, enabled: true });
      } else {
        await addReminder({ ...payload, enabled: true });
      }
      
      // Refresh local reminders
      await refreshReminders();
      
      // Try to sync to backend (may fail if offline, but that's okay)
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
      } catch (syncError) {
        console.log('Could not sync to backend (may be offline)', syncError);
        // Don't show error, local save was successful
      }
      
      // Clear form and show success
      setAddingReminder(false);
      setEditingReminderId(null);
      setReminderForm({ frequency: 'daily', time: '09:00' });
      setModalTitle('Saved');
      setModalMessage('Reminder saved successfully!');
      setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
    } catch (e) {
      console.error('Failed saving reminder', e);
      setModalTitle('Error');
      setModalMessage('Failed to save reminder. Please try again.');
      setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
    }
  };

  // Validation rules
  const validateField = (field: string, raw: string): boolean => {
    const value = (raw || '').trim();
    let error = '';
    switch (field) {
      case 'phone': {
        if (value.length === 0) { error = 'Phone number is required'; break; }
        const digits = value.replace(/\D/g, '');
        if (!(digits.length === 10 || (digits.length === 11 && digits.startsWith('1')))) {
          error = 'Enter a valid phone number';
        }
        break;
      }
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
      'phone','age','address1','city','province','postalCode','location'
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
  */

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
      <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
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
      <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
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
      <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
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
      <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
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
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
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
        <DueReminderBanner topOffset={120} />
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

          {/* Profile Information - Navigation Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/profile/profile-information" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Icon name="person" size={24} color={COLORS.primary} style={{ marginRight: 12 }} />
                <Text style={styles.cardTitle}>Profile Information</Text>
              </View>
              <Icon name="chevron-right" size={24} color={COLORS.darkGray} />
            </View>
            <Text style={styles.cardSubtitle}>
              View and edit your personal information, emergency contact, and medical history
            </Text>
          </TouchableOpacity>

          {/* App Settings - Navigation Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/profile/app-settings" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Icon name="settings" size={24} color={COLORS.primary} style={{ marginRight: 12 }} />
                <Text style={styles.cardTitle}>App Settings</Text>
              </View>
              <Icon name="chevron-right" size={24} color={COLORS.darkGray} />
            </View>
            <Text style={styles.cardSubtitle}>
              Manage symptom assessment reminders and location services
            </Text>
          </TouchableOpacity>

          {/* Help & Support - Navigation Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/profile/help-support" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Icon name="help-outline" size={24} color={COLORS.primary} style={{ marginRight: 12 }} />
                <Text style={styles.cardTitle}>Help & Support</Text>
              </View>
              <Icon name="chevron-right" size={24} color={COLORS.darkGray} />
            </View>
            <Text style={styles.cardSubtitle}>
              FAQs, user guide, feedback, and report issues
            </Text>
          </TouchableOpacity>

          {/* LLM Test - DEV ONLY */}
          <LLMTest />

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



      {/* Status Modal */}
      <StatusModal
        visible={modalVisible}
        type={modalTitle === 'Success' || modalTitle === 'Saved' ? 'success' : modalTitle === 'Error' ? 'error' : 'info'}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
        buttons={modalButtons.length > 0 ? modalButtons : undefined}
      />

      {/* Legacy reminder modals removed in favor of inline manager */}

      {/* Time Selection Modal - Moved to app-settings page
      <TimePickerModal
        visible={showTimeSelectModal}
        value={reminderForm.time || '09:00'}
        onSelect={(time24h) => {
          const { hour, minute, ampm } = to12h(time24h);
          setTimeHour(hour);
          setTimeMinute(minute);
          setTimeAmPm(ampm);
          setReminderForm((p) => ({ ...p, time: time24h }));
          setShowTimeSelectModal(false);
        }}
        onCancel={() => setShowTimeSelectModal(false)}
        title="Select Time"
      />
      */}
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
  nestedCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  nestedCardTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.darkText,
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
  cardSubtitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 8,
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
});
