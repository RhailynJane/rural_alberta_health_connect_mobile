/* eslint-disable @typescript-eslint/no-unused-vars */
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { MAPBOX_ACCESS_TOKEN } from "../../_config/mapbox.config";
import {
  ReminderItem,
  addReminder,
  deleteReminder,
  getReminders,
  scheduleAllReminderItems,
  setConvexSyncCallback,
  setReminderUserKey,
  updateReminder,
} from "../../_utils/notifications";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import StatusModal from "../../components/StatusModal";
import { COLORS, FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { normalizeNanpToE164, savePhoneSecurely } from "../../utils/securePhone";

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
  const updateUserImage = useMutation((api as any).users.updateImage);
    const generateUploadUrl = useMutation(api.healthEntries.generateUploadUrl);
    const storeUploadedPhoto = useMutation(api.healthEntries.storeUploadedPhoto);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
      // If backend provides photo URL in future, prefer it
      const maybePhoto = (currentUserOnline as any)?.photoUrl || (currentUserOnline as any)?.avatarUrl || (currentUserOnline as any)?.image;
      if (maybePhoto) setAvatarUrl(String(maybePhoto));
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

          // Load cached avatar
          AsyncStorage.getItem("@profile_avatar_url")
            .then((url) => { if (url) setAvatarUrl(url); })
            .catch(() => {});
    }
  }, [isOnline]);

  // Save avatar URL cache when it changes
  useEffect(() => {
    if (avatarUrl) {
      AsyncStorage.setItem("@profile_avatar_url", avatarUrl).catch(() => {});
    }
  }, [avatarUrl]);

  const pickAndUploadAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setModalTitle("Permissions Needed");
        setModalMessage("Please allow photo library access to set your profile picture.");
        setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
        setModalVisible(true);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1,1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const uri = result.assets[0].uri;
      setUploadingAvatar(true);
      if (isOnline) {
        try {
          const uploadUrl = await generateUploadUrl();
          const res = await fetch(uri);
          const blob = await res.blob();
          const put = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
          if (!put.ok) throw new Error('Upload failed');
          const { storageId } = await put.json();
          const photoUrl = await storeUploadedPhoto({ storageId });
          setAvatarUrl(photoUrl);
          try { await updateUserImage({ image: photoUrl } as any); } catch (err) { console.warn('Failed to persist avatar URL', err); }
        } catch (e) {
          // Fallback to local URI even if upload fails
          setAvatarUrl(uri);
        }
      } else {
        setAvatarUrl(uri);
      }
    } catch (e) {
      setModalTitle('Error');
      setModalMessage('Failed to choose photo. Please try again.');
      setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
    } finally {
      setUploadingAvatar(false);
    }
  };

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const latestAddressQueryTsRef = useRef<number>(0);
  const [addressSuggestions, setAddressSuggestions] = useState<{ id: string; label: string; address1: string; city?: string; province?: string; postalCode?: string }[]>([]);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  
  // Reminders manager (local)
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [reminderForm, setReminderForm] = useState<{ frequency: 'daily' | 'weekly'; time: string; dayOfWeek?: string }>({ frequency: 'daily', time: '09:00' });
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [reminderEditorVisible, setReminderEditorVisible] = useState(false);
  const [showTimeSelectModal, setShowTimeSelectModal] = useState(false);

  // Notification frequency and time picker states
  const [notificationFrequencyModalVisible, setNotificationFrequencyModalVisible] = useState(false);
  const [notificationTimePickerVisible, setNotificationTimePickerVisible] = useState(false);
  const [selectedNotificationTime, setSelectedNotificationTime] = useState<string>("09:00");
  const [notificationTimeUnit, setNotificationTimeUnit] = useState<'hour' | 'minute'>('hour');
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

  // Helper conversions
  const normalizeTimeInput = (time?: string): string | null => {
    if (!time || !time.includes(':')) return null;
    const [rawH, rawM] = time.split(':');
    const h = Math.max(0, Math.min(23, parseInt(rawH, 10) || 0));
    const m = Math.max(0, Math.min(59, parseInt(rawM, 10) || 0));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const to12h = (time24?: string) => {
    const normalized = normalizeTimeInput(time24 || '09:00') || '09:00';
    const [h, m] = normalized.split(':');
    const hours = parseInt(h, 10);
    const isPM = hours >= 12;
    const hr12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return { hour: String(hr12).padStart(2, '0'), minute: String(m).padStart(2, '0'), ampm: isPM ? 'PM' : 'AM' as const };
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
      const normalizedTime = normalizeTimeInput(reminderForm.time);
      if (!normalizedTime) {
        setModalTitle('Invalid Time');
        setModalMessage('Time must be in HH:mm (00-23:00-59).');
        setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
        setModalVisible(true);
        return;
      }

      const payload = {
        frequency: reminderForm.frequency,
        time: normalizedTime,
        dayOfWeek: reminderForm.frequency === 'weekly' ? reminderForm.dayOfWeek : undefined,
      } as const;

      let updatedList: ReminderItem[] = [];
      if (editingReminderId) {
        updatedList = await updateReminder(editingReminderId, { ...payload, enabled: true });
      } else {
        updatedList = await addReminder({ ...payload, enabled: true });
      }

      setUserData((prev) => ({ ...prev, reminderEnabled: true, reminderTime: `${to12h(payload.time).hour}:${to12h(payload.time).minute} ${to12h(payload.time).ampm}` }));
      setReminders(updatedList);

      // Schedule locally and try to sync the primary settings to backend
      try { await scheduleAllReminderItems(updatedList); } catch {}
      try {
        await updateReminderSettings({
          enabled: true,
          frequency: payload.frequency,
          time: payload.time,
          dayOfWeek: payload.dayOfWeek,
        });
      } catch (syncError) {
        console.log('Could not sync to backend (may be offline)', syncError);
      }

      // Clear form and close editor
      setEditingReminderId(null);
      setReminderForm({ frequency: 'daily', time: '09:00' });
      setReminderEditorVisible(false);
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

  const openReminderEditor = (rem?: ReminderItem) => {
    if (rem) {
      setEditingReminderId(rem.id);
      setReminderForm({
        frequency: rem.frequency === 'weekly' ? 'weekly' : 'daily',
        time: rem.time || '09:00',
        dayOfWeek: rem.dayOfWeek || 'Mon',
      });
    } else {
      setEditingReminderId(null);
      setReminderForm({ frequency: 'daily', time: selectedNotificationTime || '09:00' });
    }
    setReminderEditorVisible(true);
  };

  const handleToggleReminderItem = async (reminder: ReminderItem) => {
    try {
      const updated = await updateReminder(reminder.id, { enabled: !reminder.enabled });
      setReminders(updated);
      try { await scheduleAllReminderItems(updated); } catch {}
    } catch (e) {
      console.error('Failed to toggle reminder', e);
    }
  };

  const handleDeleteReminderItem = async (id: string) => {
    try {
      const updated = await deleteReminder(id);
      setReminders(updated);
      try { await scheduleAllReminderItems(updated); } catch {}
    } catch (e) {
      console.error('Failed to delete reminder', e);
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
        <ScrollView style={[styles.container, styles.scroll]} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
          {/* Profile Header */}
          <View style={styles.headerSection}>
            <View style={styles.headerCard}>
              {/* Dock avatar to the card top */}
              <View style={styles.avatarDock}>
                <View style={styles.avatarHolder}>
                  <View style={styles.avatar}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>
                        {(() => {
                          const n = (currentUser?.firstName || currentUser?.name || 'U') as string;
                          return String(n).trim().charAt(0).toUpperCase();
                        })()}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.avatarEditBtn}
                    onPress={pickAndUploadAvatar}
                    activeOpacity={0.85}
                  >
                    <Icon name={uploadingAvatar ? 'hourglass-empty' : 'photo-camera'} size={18} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.headerCenter}>
                <View style={styles.headerTextWrap}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {currentUser?.firstName ? `${currentUser.firstName} ${currentUser?.lastName || ''}`.trim() : 'Your Profile'}
                </Text>
                <Text style={[styles.metaText, styles.centerText]} numberOfLines={1}>
                  {(() => {
                    const year = (() => {
                      const d = (userProfile as any)?.createdAt || (currentUser as any)?.createdAt || (currentUser as any)?._creationTime;
                      if (!d) return null;
                      const dt = new Date(d);
                      return isNaN(dt.getTime()) ? null : dt.getFullYear();
                    })();
                    return year ? `Member since ${year}` : 'Welcome back';
                  })()}
                </Text>
              </View>
              </View>

            {/* Stats Grid (2x2) */}
            <View style={styles.statsGrid}>
              <View style={[styles.statBox, styles.statBoxFirst]}>
                <Text style={styles.statNumber}>{(() => {
                  const fields: (keyof typeof userData)[] = ['age','address1','city','province','postalCode','emergencyContactName','emergencyContactPhone','allergies','currentMedications','medicalConditions'];
                  const done = fields.filter(k => String((userData as any)[k] || '').trim().length > 0).length;
                  return Math.round((done / fields.length) * 100) || 0;
                })()}%</Text>
                <Text style={styles.statLabel}>Complete</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{userData.reminderEnabled ? 'On' : 'Off'}</Text>
                <Text style={styles.statLabel}>Reminders</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxFirst]}>
                <Text style={styles.statNumber}>{userData.locationServices ? 'On' : 'Off'}</Text>
                <Text style={styles.statLabel}>Location</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{isOnline ? 'Online' : 'Offline'}</Text>
                <Text style={styles.statLabel}>Sync</Text>
              </View>
            </View>
            </View>
          </View>

          {/* Profile Information Tile */}
          <View style={styles.listCard}>
            <TouchableOpacity style={styles.listItem} onPress={() => router.push("/profile/profile-information" as any)} activeOpacity={0.85}>
              <View style={styles.listIconWrap}><Icon name="person" size={20} color={COLORS.primary} /></View>
              <View style={styles.listTextWrap}>
                <Text style={styles.listTitle}>Profile Information</Text>
                <Text style={styles.listSubtitle}>Personal details & medical history</Text>
              </View>
              <Icon name="chevron-right" size={20} color={COLORS.darkGray} />
            </TouchableOpacity>
          </View>

          {/* Notifications Toggle */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleIconWrap}>
              <Icon name="notifications" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Notifications</Text>
              <Text style={styles.toggleSubtitle}>Reminder alerts</Text>
            </View>
            <Switch
              value={userData.reminderEnabled}
              onValueChange={async (value) => {
                if (value) {
                  // Show frequency chooser when enabling
                  setNotificationFrequencyModalVisible(true);
                } else {
                  // Disable directly
                  setUserData(prev => ({ ...prev, reminderEnabled: false }));
                  if (isOnline) {
                    try {
                      await updateReminderSettings({ enabled: false });
                    } catch (error) {
                      console.error("Failed to update reminder settings:", error);
                    }
                  }
                }
              }}
              trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          {/* Multi-reminder list */}
          {userData.reminderEnabled && (
            <View style={styles.reminderListCard}>
              <View style={styles.reminderListHeader}>
                <View>
                  <Text style={styles.reminderListTitle}>Reminders</Text>
                  <Text style={styles.reminderListSubtitle}>Add multiple reminder times</Text>
                </View>
                <TouchableOpacity
                  style={styles.reminderAddBtn}
                  onPress={() => openReminderEditor()}
                  activeOpacity={0.9}
                >
                  <Icon name="add" size={18} color={COLORS.white} />
                  <Text style={styles.reminderAddText}>New</Text>
                </TouchableOpacity>
              </View>

              {reminders.length === 0 ? (
                <Text style={styles.reminderEmptyText}>No reminders yet. Add one to get started.</Text>
              ) : (
                reminders.map((rem) => {
                  const timeNorm = normalizeTimeInput(rem.time || '09:00') || '09:00';
                  const { hour, minute, ampm } = to12h(timeNorm);
                  const label = rem.frequency === 'weekly'
                    ? `Weekly on ${rem.dayOfWeek || 'Mon'}`
                    : 'Daily';
                  return (
                    <View key={rem.id} style={styles.reminderRow}>
                      <View style={styles.reminderRowText}>
                        <Text style={styles.reminderTimeText}>{`${parseInt(hour, 10)}:${minute} ${ampm}`}</Text>
                        <Text style={styles.reminderMetaText}>{label}</Text>
                      </View>
                      <View style={styles.reminderRowActions}>
                        <Switch
                          value={rem.enabled}
                          onValueChange={() => handleToggleReminderItem(rem)}
                          trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
                          thumbColor={COLORS.white}
                        />
                        <TouchableOpacity onPress={() => openReminderEditor(rem)} style={styles.reminderIconBtn} activeOpacity={0.85}>
                          <Icon name="edit" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteReminderItem(rem.id)} style={styles.reminderIconBtn} activeOpacity={0.85}>
                          <Icon name="delete" size={18} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Location Services Toggle */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleIconWrap}>
              <Icon name="location-on" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Location Services</Text>
              <Text style={styles.toggleSubtitle}>Enable location tracking</Text>
            </View>
            <Switch
              value={userData.locationServices}
              onValueChange={async (value) => {
                // Update local state
                setUserData(prev => ({ ...prev, locationServices: value }));
                // Persist to backend if online
                if (isOnline) {
                  try {
                    await toggleLocationServices({ enabled: value });
                  } catch (error) {
                    console.error("Failed to update location services:", error);
                  }
                }
              }}
              trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          {/* Sign Out */}
          <View style={styles.signOutSection}>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.9}>
              <Icon name="logout" size={20} color={COLORS.error} />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* Privacy footnote */}
          <View style={styles.privacyFootnote}>
            <Text style={styles.privacyFootnoteText}>Your data stays on your device and is encrypted.</Text>
          </View>
        </ScrollView>
      </CurvedBackground>
      <BottomNavigation floating={true} />



      {/* Status Modal */}
      <StatusModal
        visible={modalVisible}
        type={modalTitle === 'Success' || modalTitle === 'Saved' ? 'success' : modalTitle === 'Error' ? 'error' : 'info'}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
        buttons={modalButtons.length > 0 ? modalButtons : undefined}
      />

      {/* Notification Frequency Chooser Modal */}
      <StatusModal
        visible={notificationFrequencyModalVisible}
        type="info"
        title="Reminder Frequency"
        message="How often should you be reminded?"
        onClose={() => setNotificationFrequencyModalVisible(false)}
        buttons={[
          {
            label: "Daily",
            variant: "primary",
            onPress: async () => {
              setNotificationFrequencyModalVisible(false);
              setUserData(prev => ({ ...prev, reminderFrequency: 'daily' }));
              // Show time picker
              setSelectedNotificationTime("09:00");
              setNotificationTimePickerVisible(true);
            },
          },
          {
            label: "Cancel",
            variant: "secondary",
            onPress: () => setNotificationFrequencyModalVisible(false),
          },
        ]}
      />

      {/* Multi-reminder Editor Overlay */}
      {reminderEditorVisible && (
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationCard}>
            <Text style={styles.notificationTimePickerLabel}>{editingReminderId ? 'Edit Reminder' : 'Add Reminder'}</Text>
            <Text style={styles.notificationTimePickerSub}>Choose frequency and time.</Text>

            <View style={styles.reminderFrequencyRow}>
              {['daily', 'weekly'].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.reminderFrequencyChip,
                    reminderForm.frequency === freq ? styles.reminderFrequencyChipActive : null,
                  ]}
                  onPress={() => setReminderForm((p) => ({ ...p, frequency: freq as 'daily' | 'weekly' }))}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.reminderFrequencyText,
                      reminderForm.frequency === freq ? styles.reminderFrequencyTextActive : null,
                    ]}
                  >
                    {freq === 'daily' ? 'Daily' : 'Weekly'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {reminderForm.frequency === 'weekly' && (
              <View style={styles.dayChipRow}>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.reminderDayChip, reminderForm.dayOfWeek === d ? styles.reminderDayChipActive : null]}
                    onPress={() => setReminderForm((p) => ({ ...p, dayOfWeek: d }))}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.reminderDayChipText, reminderForm.dayOfWeek === d ? styles.reminderDayChipTextActive : null]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {(() => {
              const normalized = normalizeTimeInput(reminderForm.time) || '09:00';
              const [h, m] = normalized.split(':');
              return (
                <View style={styles.notificationTimeInputRow}>
                  <View style={styles.timeUnitColumn}>
                    <TouchableOpacity
                      style={styles.notificationTimeAdjustBtn}
                      onPress={() => {
                        const newH = Math.max(0, Math.min(23, parseInt(h, 10) - 1));
                        setReminderForm((p) => ({ ...p, time: `${String(newH).padStart(2, '0')}:${m}` }));
                      }}
                    >
                      <Icon name="expand-less" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.notificationTimeValue}>{h}</Text>
                    <TouchableOpacity
                      style={styles.notificationTimeAdjustBtn}
                      onPress={() => {
                        const newH = Math.max(0, Math.min(23, parseInt(h, 10) + 1));
                        setReminderForm((p) => ({ ...p, time: `${String(newH).padStart(2, '0')}:${m}` }));
                      }}
                    >
                      <Icon name="expand-more" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.notificationTimeLabel}>Hour</Text>
                  </View>

                  <Text style={styles.notificationTimeSeparator}>:</Text>

                  <View style={styles.timeUnitColumn}>
                    <TouchableOpacity
                      style={styles.notificationTimeAdjustBtn}
                      onPress={() => {
                        const newM = Math.max(0, Math.min(59, parseInt(m, 10) - 5));
                        setReminderForm((p) => ({ ...p, time: `${h}:${String(newM).padStart(2, '0')}` }));
                      }}
                    >
                      <Icon name="expand-less" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.notificationTimeValue}>{m}</Text>
                    <TouchableOpacity
                      style={styles.notificationTimeAdjustBtn}
                      onPress={() => {
                        const newM = Math.max(0, Math.min(59, parseInt(m, 10) + 5));
                        setReminderForm((p) => ({ ...p, time: `${h}:${String(newM).padStart(2, '0')}` }));
                      }}
                    >
                      <Icon name="expand-more" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.notificationTimeLabel}>Minute</Text>
                  </View>
                </View>
              );
            })()}

            <View style={styles.notificationTimeActions}>
              <TouchableOpacity
                style={[styles.notificationTimeActionBtn, styles.notificationTimeSecondary]}
                onPress={() => {
                  setReminderEditorVisible(false);
                  setEditingReminderId(null);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.notificationTimeActionTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notificationTimeActionBtn, styles.notificationTimePrimary]}
                onPress={handleSaveSingleReminder}
                activeOpacity={0.9}
              >
                <Text style={styles.notificationTimeActionTextPrimary}>{editingReminderId ? 'Update' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Notification Time Picker Overlay */}
      {notificationTimePickerVisible && (
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationCard}>
            <Text style={styles.notificationTimePickerLabel}>Select Reminder Time</Text>
            <Text style={styles.notificationTimePickerSub}>Adjust hour and minute, then set time.</Text>

            <View style={styles.notificationTimeInputRow}>
              {/* Hour Selector */}
              <View style={styles.timeUnitColumn}>
                <TouchableOpacity
                  style={styles.notificationTimeAdjustBtn}
                  onPress={() => {
                    const [h, m] = selectedNotificationTime.split(':');
                    const newH = Math.max(0, parseInt(h) - 1).toString().padStart(2, '0');
                    setSelectedNotificationTime(newH + ':' + m);
                  }}
                >
                  <Icon name="expand-less" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.notificationTimeValue}>{selectedNotificationTime.split(':')[0]}</Text>
                <TouchableOpacity
                  style={styles.notificationTimeAdjustBtn}
                  onPress={() => {
                    const [h, m] = selectedNotificationTime.split(':');
                    const newH = Math.min(23, parseInt(h) + 1).toString().padStart(2, '0');
                    setSelectedNotificationTime(newH + ':' + m);
                  }}
                >
                  <Icon name="expand-more" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.notificationTimeLabel}>Hour</Text>
              </View>

              {/* Separator */}
              <Text style={styles.notificationTimeSeparator}>:</Text>

              {/* Minute Selector */}
              <View style={styles.timeUnitColumn}>
                <TouchableOpacity
                  style={styles.notificationTimeAdjustBtn}
                  onPress={() => {
                    const [h, m] = selectedNotificationTime.split(':');
                    const newM = Math.max(0, parseInt(m) - 5).toString().padStart(2, '0');
                    setSelectedNotificationTime(h + ':' + newM);
                  }}
                >
                  <Icon name="expand-less" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.notificationTimeValue}>{selectedNotificationTime.split(':')[1]}</Text>
                <TouchableOpacity
                  style={styles.notificationTimeAdjustBtn}
                  onPress={() => {
                    const [h, m] = selectedNotificationTime.split(':');
                    const newM = Math.min(59, parseInt(m) + 5).toString().padStart(2, '0');
                    setSelectedNotificationTime(h + ':' + newM);
                  }}
                >
                  <Icon name="expand-more" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.notificationTimeLabel}>Minute</Text>
              </View>
            </View>

            <View style={styles.notificationTimeActions}>
              <TouchableOpacity
                style={[styles.notificationTimeActionBtn, styles.notificationTimeSecondary]}
                onPress={() => setNotificationTimePickerVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.notificationTimeActionTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notificationTimeActionBtn, styles.notificationTimePrimary]}
                onPress={async () => {
                  setNotificationTimePickerVisible(false);
                  setUserData(prev => ({ ...prev, reminderEnabled: true, reminderTime: selectedNotificationTime }));
                  if (isOnline) {
                    try {
                      await updateReminderSettings({
                        enabled: true,
                        frequency: 'daily',
                        time: selectedNotificationTime,
                      });
                    } catch (error) {
                      console.error("Failed to update reminder settings:", error);
                    }
                  }
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.notificationTimeActionTextPrimary}>Set Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
    backgroundColor: "transparent",
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    // Extra bottom space so the Sign out button clears the inline BottomNavigation
    paddingBottom: 160,
    backgroundColor: 'transparent',
  },
  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 0,
    marginTop: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    overflow: 'visible',
    position: 'relative',
    paddingTop: 64,
  },
  headerSection: {
    position: 'relative',
    marginBottom: 12,
  },
  headerGradient: {
    // gradient removed
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerCenter: {
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTextWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F1FF',
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
  },
  avatarDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  avatarHolder: {
    width: 96,
    height: 96,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 94,
    height: 94,
    borderRadius: 47,
  },
  avatarText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    color: COLORS.primary,
    fontSize: 28,
  },
  avatarEditBtn: {
    position: 'absolute',
    left: -8,
    bottom: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  nameText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 20,
    color: COLORS.darkText,
  },
  metaText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 13,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  editProfileBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editProfileBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statBoxFirst: {
    marginLeft: 0,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  statCardFirst: {
    marginLeft: 0,
  },
  statNumber: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 18,
    color: COLORS.darkText,
  },
  statLabel: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  tile: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F1FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tileText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    color: COLORS.darkText,
    textAlign: 'center',
  },
  tileDanger: {
    backgroundColor: '#FFF5F5',
    borderColor: '#F2D6D6',
  },
  tileDangerIcon: {
    backgroundColor: '#DC3545',
    borderColor: '#DC3545',
  },
  tileDangerText: {
    color: '#DC3545',
  },
  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingVertical: 4,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  listIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E8F1FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginRight: 12,
  },
  listTextWrap: {
    flex: 1,
  },
  listTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 15,
    color: COLORS.darkText,
  },
  listSubtitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  suggestionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    padding: 12,
    marginBottom: 12,
  },
  suggestionTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.darkText,
    marginBottom: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
  },
  suggestionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionBadge: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    color: COLORS.darkText,
    fontSize: 12,
  },
  privacyFootnote: {
    alignItems: 'center',
    marginTop: 4,
  },
  privacyFootnoteText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
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
  suggestionRowText: {
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
  toggleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E8F1FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 15,
    color: COLORS.darkText,
  },
  toggleSubtitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  reminderListCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  reminderListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reminderListTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 15,
    color: COLORS.darkText,
  },
  reminderListSubtitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  reminderAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  reminderAddText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 13,
  },
  reminderEmptyText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 13,
    color: COLORS.darkGray,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF1F3',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: COLORS.white,
  },
  reminderRowText: {
    flex: 1,
  },
  reminderTimeText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 15,
    color: COLORS.darkText,
  },
  reminderMetaText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  reminderRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 10,
  },
  reminderIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  reminderFrequencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  reminderFrequencyChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  reminderFrequencyChipActive: {
    backgroundColor: '#E8F1FF',
    borderColor: COLORS.primary,
  },
  reminderFrequencyText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    color: COLORS.darkText,
    fontSize: 13,
  },
  reminderFrequencyTextActive: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    color: COLORS.primary,
  },
  reminderDayChip: {
    flexGrow: 1,
    flexBasis: 0,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  reminderDayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reminderDayChipText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    color: COLORS.darkText,
    fontSize: 12,
  },
  reminderDayChipTextActive: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
  },
  dayChipRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
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
  signOutSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  signOutHeadline: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.error,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  signOutButtonText: {
    color: COLORS.error,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
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
  notificationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 999,
  },
  notificationCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  notificationTimePickerLabel: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 18,
    color: COLORS.darkText,
    marginBottom: 6,
    textAlign: 'center',
  },
  notificationTimePickerSub: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 12,
    textAlign: 'center',
  },
  notificationTimeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  timeUnitColumn: {
    alignItems: 'center',
    gap: 8,
  },
  notificationTimeAdjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E8F1FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  notificationTimeValue: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 32,
    color: COLORS.darkText,
    minWidth: 50,
    textAlign: 'center',
  },
  notificationTimeSeparator: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 28,
    color: COLORS.darkText,
    marginBottom: 20,
  },
  notificationTimeLabel: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
  },
  notificationTimeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  notificationTimeActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationTimePrimary: {
    backgroundColor: COLORS.primary,
  },
  notificationTimeSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  notificationTimeActionTextPrimary: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 15,
  },
  notificationTimeActionTextSecondary: {
    color: COLORS.darkText,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 15,
  },
});

