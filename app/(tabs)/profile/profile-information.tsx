import { api } from "@/convex/_generated/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useWatermelonDatabase } from "../../../watermelon/hooks/useDatabase";
import { MAPBOX_ACCESS_TOKEN } from "../../_config/mapbox.config";
import { getReminders, ReminderItem } from "../../_utils/notifications";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import StatusModal from "../../components/StatusModal";
import { COLORS, FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { getPhoneSecurely, normalizeNanpToE164, savePhoneSecurely } from "../../utils/securePhone";

export default function ProfileInformation() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { isOnline } = useNetworkStatus();
  const database = useWatermelonDatabase();
  
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );
  
  const userProfile = useQuery(
    api.profile.personalInformation.getProfile,
    isAuthenticated ? {} : "skip"
  );

  const updatePersonalInfo = useMutation(
    api.profile.personalInformation.updatePersonalInfo
  );
  const updatePhone = useMutation(api.users.updatePhone);
  const updateEmergencyContactMutation = useMutation(
    (api as any)["emergencyContactOnboarding/update"].withNameAndPhone
  );
  const updateMedicalHistoryMutation = useMutation(
    (api as any)["medicalHistoryOnboarding/update"].withAllConditions
  );

  // State for reminders (for notification bell)
  const [reminders, setReminders] = useState<ReminderItem[]>([]);

  // Load reminders for notification bell
  useEffect(() => {
    if (!currentUser?._id) return;
    (async () => {
      const stored = await getReminders();
      setReminders(stored);
    })();
  }, [currentUser?._id]);

  // State for user data
  const [userData, setUserData] = useState({
    email: "",
    fullName: "",
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
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Track unsaved edits for each section
  const [dirtyPersonal, setDirtyPersonal] = useState(false);
  const [dirtyEmergency, setDirtyEmergency] = useState(false);
  const [dirtyMedical, setDirtyMedical] = useState(false);
  // Refs to always call the latest savers in cleanup
  const handleUpdatePersonalInfoRef = useRef<((opts?: { silent?: boolean }) => Promise<boolean>) | null>(null);
  const handleUpdateEmergencyContactRef = useRef<(() => Promise<boolean>) | null>(null);
  const handleUpdateMedicalInfoRef = useRef<(() => Promise<boolean>) | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning'>('success');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

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

  // Expandable sections (now per-field instead of per-section)
  const [expandedSections, setExpandedSections] = useState({
    fullName: false,
    phone: false,
    age: false,
    address: false,
    location: false,
    emergencyContactName: false,
    emergencyContactPhone: false,
    allergies: false,
    currentMedications: false,
    medicalConditions: false,
    // Keep old section keys for backwards compatibility with auto-save logic
    personalInfo: false,
    emergencyContacts: false,
    medicalInfo: false,
  });

  // Load profile data when online - merge without wiping existing values when profile is partial
  React.useEffect(() => {
    if (!isOnline) return; // Only run this block when online
    // Avoid overwriting user edits while editing or when local changes are unsaved in ANY section
    if (expandedSections.personalInfo || expandedSections.emergencyContacts || expandedSections.medicalInfo) return;
    if (dirtyPersonal || dirtyEmergency || dirtyMedical) return;
    if (userProfile) {
      console.log("📊 Online merge: userProfile from server", {
        age: userProfile.age,
        allergies: userProfile.allergies,
        currentMedications: userProfile.currentMedications,
        medicalConditions: userProfile.medicalConditions
      });
      (async () => {
        try {
          const uid = currentUser?._id ? String(currentUser._id) : "";
          // If there are pending offline changes in ANY section, prefer local cache and skip server merge to avoid reverting edits
          if (uid) {
            const needsSync = await AsyncStorage.getItem(`${uid}:profile_needs_sync`);
            const needsEmergencySync = await AsyncStorage.getItem(`${uid}:profile_emergency_needs_sync`);
            const needsMedicalSync = await AsyncStorage.getItem(`${uid}:profile_medical_needs_sync`);
            const needsPhoneSync = await AsyncStorage.getItem(`${uid}:phone_needs_sync`);
            
            if (needsSync === '1' || needsEmergencySync === '1' || needsMedicalSync === '1' || needsPhoneSync === '1') {
              try {
                const raw = await AsyncStorage.getItem(`${uid}:profile_cache_v1`);
                const cached = raw ? JSON.parse(raw) : {};
                const phone = await getPhoneSecurely(uid);
                setUserData((prev) => ({
                  ...prev,
                  fullName: cached.fullName ?? prev.fullName ?? "",
                  phone: (phone || cached.phone) ?? prev.phone ?? "",
                  age: cached.age ?? prev.age ?? "",
                  address1: cached.address1 ?? prev.address1 ?? "",
                  address2: cached.address2 ?? prev.address2 ?? "",
                  city: cached.city ?? prev.city ?? "",
                  province: cached.province ?? prev.province ?? "",
                  postalCode: cached.postalCode ?? prev.postalCode ?? "",
                  location: cached.location ?? prev.location ?? "",
                  allergies: cached.allergies ?? prev.allergies ?? "",
                  currentMedications: cached.currentMedications ?? prev.currentMedications ?? "",
                  emergencyContactName: cached.emergencyContactName ?? prev.emergencyContactName ?? "",
                  emergencyContactPhone: cached.emergencyContactPhone ?? prev.emergencyContactPhone ?? "",
                  medicalConditions: cached.medicalConditions ?? prev.medicalConditions ?? "",
                }));
                console.log("⏭️ Skipped server merge; pending offline sync detected.", { 
                  _id: uid,
                  needsSync,
                  needsEmergencySync,
                  needsMedicalSync,
                  needsPhoneSync
                });
                return; // do not overwrite cache or UI with server data yet
              } catch {}
            }
          }

          // No pending offline changes; merge server profile into UI
          const fullNameFromServer = (currentUser?.firstName || currentUser?.lastName 
            ? [currentUser?.firstName || "", currentUser?.lastName || ""].filter(val => val.trim()).join(" ") 
            : "");
          setUserData((prev) => ({
            ...prev,
            fullName: fullNameFromServer || prev.fullName || "",
            age: userProfile.age ?? prev.age ?? "",
            address1: userProfile.address1 ?? prev.address1 ?? "",
            address2: userProfile.address2 ?? prev.address2 ?? "",
            city: userProfile.city ?? prev.city ?? "",
            province: userProfile.province ?? prev.province ?? "",
            postalCode: userProfile.postalCode ?? prev.postalCode ?? "",
            location: userProfile.location ?? prev.location ?? "",
            allergies: userProfile.allergies ?? prev.allergies ?? "",
            currentMedications: userProfile.currentMedications ?? prev.currentMedications ?? "",
            emergencyContactName: userProfile.emergencyContactName ?? prev.emergencyContactName ?? "",
            emergencyContactPhone: userProfile.emergencyContactPhone ?? prev.emergencyContactPhone ?? "",
            medicalConditions: userProfile.medicalConditions ?? prev.medicalConditions ?? "",
          }));

          // Cache the latest profile for offline usage (namespaced per user)
          // NOTE: WatermelonDB mirroring is disabled due to persistent schema errors
          // Relying on AsyncStorage as the source of truth for offline data
          if (uid) {
            // Include phone in cache (from currentUser, not userProfile)
            const cacheData = {
              ...userProfile,
              phone: currentUser?.phone || '',
            };
            await AsyncStorage.setItem(`${uid}:profile_cache_v1`, JSON.stringify(cacheData));
            console.log("📥 Cached user profile to AsyncStorage", { 
              _id: uid, 
              age: userProfile.age, 
              address2: userProfile.address2, 
              phone: cacheData.phone,
              allergies: cacheData.allergies,
              currentMedications: cacheData.currentMedications,
              medicalConditions: cacheData.medicalConditions
            });
          }
        } catch (err) {
          console.error('❌ Failed during online merge/cache:', err);
        }
      })();
    }
    // Don't reset userData when userProfile is undefined (offline mode)
  }, [
    userProfile, 
    currentUser?._id, 
    currentUser?.phone, 
    currentUser?.firstName,
    currentUser?.lastName,
    isOnline, 
    database, 
    expandedSections.personalInfo, 
    expandedSections.emergencyContacts, 
    expandedSections.medicalInfo,
    dirtyPersonal, 
    dirtyEmergency, 
    dirtyMedical
  ]);

  // If offline or userProfile missing, hydrate userData from cache
  // CRITICAL: Only hydrate on mount when userProfile is unavailable, NOT on every userProfile change
  // to avoid overwriting user edits when transitioning online→offline
  React.useEffect(() => {
    const hydrateFromCache = async () => {
      try {
        if (userProfile) return; // server data available
        if (isOnline) return; // Don't hydrate from stale cache while online
        const uid = currentUser?._id ? String(currentUser._id) : "";
        if (!uid) return;
        const raw = await AsyncStorage.getItem(`${uid}:profile_cache_v1`);
        if (!raw) return;
        const cached = JSON.parse(raw) || {};
        setUserData((prev) => ({
          ...prev,
          fullName: cached.fullName ?? prev.fullName ?? "",
          phone: cached.phone ?? prev.phone ?? "",
          age: cached.age ?? prev.age ?? "",
          address1: cached.address1 ?? prev.address1 ?? "",
          address2: cached.address2 ?? prev.address2 ?? "",
          city: cached.city ?? prev.city ?? "",
          province: cached.province ?? prev.province ?? "",
          postalCode: cached.postalCode ?? prev.postalCode ?? "",
          location: cached.location ?? prev.location ?? "",
          allergies: cached.allergies ?? prev.allergies ?? "",
          currentMedications: cached.currentMedications ?? prev.currentMedications ?? "",
          emergencyContactName: cached.emergencyContactName ?? prev.emergencyContactName ?? "",
          emergencyContactPhone: cached.emergencyContactPhone ?? prev.emergencyContactPhone ?? "",
          medicalConditions: cached.medicalConditions ?? prev.medicalConditions ?? "",
        }));
        console.log("📤 Loaded user profile from cache", { _id: uid, phone: cached.phone });
      } catch {
        // ignore cache errors
      }
    };
    hydrateFromCache();
  }, [userProfile, currentUser?._id, isOnline]);

    // Reload from WatermelonDB when screen comes into focus (for offline edits)
    // NOTE: Disabled WMDB loading due to schema issues. Using AsyncStorage as source of truth.
    // useFocusEffect(
    //   React.useCallback(() => {
    //     if (isOnline) return;
    //     ...
    //   }, [currentUser?._id, database, isOnline])
    // );

  // Prefill phone and fullName from current user
  React.useEffect(() => {
    if (currentUser?.phone !== undefined) {
      setUserData((prev) => ({ ...prev, phone: currentUser?.phone || "" }));
    }
  }, [currentUser?.phone]);

  React.useEffect(() => {
    if (currentUser?.email !== undefined) {
      setUserData((prev) => ({ ...prev, email: currentUser?.email || "" }));
    }
  }, [currentUser?.email]);

  React.useEffect(() => {
    if (currentUser?.firstName || currentUser?.lastName) {
      const fullName = [currentUser?.firstName || "", currentUser?.lastName || ""].filter(val => val.trim()).join(" ");
      console.log("📝 Setting fullName from currentUser:", { firstName: currentUser?.firstName, lastName: currentUser?.lastName, fullName });
      setUserData((prev) => ({ ...prev, fullName }));
    }
  }, [currentUser?.firstName, currentUser?.lastName]);

  const toggleSection = async (section: keyof typeof expandedSections) => {
    const isClosing = expandedSections[section];
    
    if (isClosing) {
      // Closing individual field - auto-save based on which field it is
      const personalFields = ['fullName', 'phone', 'age', 'address', 'location'];
      const emergencyFields = ['emergencyContactName', 'emergencyContactPhone'];
      const medicalFields = ['allergies', 'currentMedications', 'medicalConditions'];
      
      let ok = true;
      if (personalFields.includes(section)) {
        ok = await handleUpdatePersonalInfo({ silent: false, showModal: true });
      } else if (emergencyFields.includes(section)) {
        ok = await handleUpdateEmergencyContact();
      } else if (medicalFields.includes(section)) {
        ok = await handleUpdateMedicalInfo();
      } else if (section === "personalInfo") {
        ok = await handleUpdatePersonalInfo();
      } else if (section === "emergencyContacts") {
        ok = await handleUpdateEmergencyContact();
      } else if (section === "medicalInfo") {
        ok = await handleUpdateMedicalInfo();
      }
      
      if (!ok) return; // Keep open if save failed
    }
    
    // Close all other expanded fields when opening a new one
    setExpandedSections((prev) => {
      const updated = Object.keys(prev).reduce((acc, key) => ({
        ...acc,
        [key]: key === section ? !prev[section as keyof typeof prev] : false
      }), {} as typeof prev);
      return updated;
    });
  };

  const handleUpdatePersonalInfo = async (opts?: { silent?: boolean; showModal?: boolean }): Promise<boolean> => {
    const silent = !!opts?.silent;
    const showModal = !!opts?.showModal;
    try {
      // For silent saves, don't block on full validation. We'll merge with cached values to ensure required fields are present.
      const mustValidate = !silent;
      if (mustValidate) {
        const valid = validatePersonalInfo();
        if (!valid) {
          if (!silent) {
            setModalType('error');
            setModalTitle('Validation Error');
            setModalMessage('Please correct the highlighted fields in Personal Information.');
            setModalVisible(true);
          }
          return false;
        }
      }
      
      // If offline, persist to local cache AND WatermelonDB so data syncs later
      if (!isOnline) {
        try {
          let uid = currentUser?._id ? String(currentUser._id) : "";
          if (!uid) {
            try {
              const rawUser = await AsyncStorage.getItem("@profile_user");
              if (rawUser) {
                const parsed = JSON.parse(rawUser);
                uid = parsed?._id || parsed?.id || uid;
              }
            } catch {}
          }
          if (uid) {
            // Save to AsyncStorage cache for immediate visibility
            const raw = await AsyncStorage.getItem(`${uid}:profile_cache_v1`);
            const cached = raw ? JSON.parse(raw) : {};
            const merged = {
              ...cached,
              age: userData.age,
              address1: userData.address1,
              address2: userData.address2,
              city: userData.city,
              province: userData.province,
              postalCode: userData.postalCode,
              location: userData.location,
            };
            await AsyncStorage.setItem(`${uid}:profile_cache_v1`, JSON.stringify(merged));
              // Mark that a profile sync is needed on next online transition
              try { await AsyncStorage.setItem(`${uid}:profile_needs_sync`, '1'); } catch {}
            // Cache phone securely and mark for sync if provided
            try {
              const normalizedPhone = normalizeNanpToE164(userData.phone || '');
              if (normalizedPhone) {
                await savePhoneSecurely(normalizedPhone, uid);
                await AsyncStorage.setItem(`${uid}:phone_needs_sync`, '1');
              }
            } catch {}
            // Keep profile summary cache in sync for Profile index screen
            try {
              const rawProfile = await AsyncStorage.getItem("@profile_data");
              const cachedProfile = rawProfile ? JSON.parse(rawProfile) : {};
              const mergedProfile = { ...cachedProfile, ...merged };
              await AsyncStorage.setItem("@profile_data", JSON.stringify(mergedProfile));
            } catch {}
            console.log("📦 Offline: saved personal info to cache", { _id: uid });
            // Update local state immediately for persistence within session
            setUserData((prev) => ({
              ...prev,
              age: userData.age,
              address1: userData.address1,
              address2: userData.address2,
              city: userData.city,
              province: userData.province,
              postalCode: userData.postalCode,
              location: userData.location,
            }));
            
            // NOTE: WatermelonDB sync DISABLED - writes fail with schema errors
            // and stale WMDB data was syncing to server, overwriting changes.
            // AsyncStorage is now the single source of truth for offline edits.
            // When online, edits save directly to server via Convex mutations.
            console.log("📦 Offline: saved personal info to AsyncStorage (WMDB sync disabled)", { _id: uid, age: userData.age });
          }
        } catch (e) {
          console.error("Failed to save offline changes:", e);
        }
        if (!silent) {
          setModalType('warning');
          setModalTitle('Offline Mode');
          setModalMessage('Changes saved locally. They will sync when you reconnect to the internet.');
          setModalVisible(true);
        }
        setDirtyPersonal(false);
        return true;
      }
      
      // Update phone
      try {
        const normalized = normalizeNanpToE164(userData.phone || "");
        if (normalized) {
          await updatePhone({ phone: normalized });
          const uid = currentUser?._id ? String(currentUser._id) : undefined;
          await savePhoneSecurely(normalized, uid);
          // Clear pending phone sync if any
          if (uid) {
            try { await AsyncStorage.removeItem(`${uid}:phone_needs_sync`); } catch {}
          }
        }
      } catch (e) {
        console.log("⚠️ Phone update skipped:", e);
      }

      // Build payload; for silent saves, merge with last cached profile so required fields are not blank
      let base: any = {};
      try {
        const uid = currentUser?._id ? String(currentUser._id) : "";
        if (uid) {
          const raw = await AsyncStorage.getItem(`${uid}:profile_cache_v1`);
          base = raw ? JSON.parse(raw) : {};
        }
      } catch {}
      const payload = {
        age: String(userData.age || base.age || ''),
        address1: String((userData.address1 ?? base.address1) ?? ''),
        address2: String((userData.address2 ?? base.address2) ?? ''),
        city: String((userData.city ?? base.city) ?? ''),
        province: String((userData.province ?? base.province) ?? ''),
        postalCode: String((userData.postalCode ?? base.postalCode) ?? ''),
        location: String((userData.location ?? base.location) ?? ''),
      };
      await updatePersonalInfo(payload);

      // Clear any pending offline sync flags and refresh caches to avoid double-sync on reconnect
      try {
        const uid = currentUser?._id ? String(currentUser._id) : "";
        if (uid) {
          // Clear needs-sync flag so useSyncOnOnline will skip profile sync
          await AsyncStorage.removeItem(`${uid}:profile_needs_sync`);
          // Update per-user offline cache with the latest saved values
          try {
            const raw = await AsyncStorage.getItem(`${uid}:profile_cache_v1`);
            const cached = raw ? JSON.parse(raw) : {};
            const merged = {
              ...cached,
              age: userData.age,
              address1: userData.address1,
              address2: userData.address2,
              city: userData.city,
              province: userData.province,
              postalCode: userData.postalCode,
              location: userData.location,
              allergies: userData.allergies,
              currentMedications: userData.currentMedications,
              emergencyContactName: userData.emergencyContactName,
              emergencyContactPhone: userData.emergencyContactPhone,
              medicalConditions: userData.medicalConditions,
            };
            await AsyncStorage.setItem(`${uid}:profile_cache_v1`, JSON.stringify(merged));
          } catch {}
          // Keep profile summary cache in sync for Profile index screen
          try {
            const rawProfile = await AsyncStorage.getItem("@profile_data");
            const cachedProfile = rawProfile ? JSON.parse(rawProfile) : {};
            const mergedProfile = {
              ...cachedProfile,
              age: userData.age,
              address1: userData.address1,
              address2: userData.address2,
              city: userData.city,
              province: userData.province,
              postalCode: userData.postalCode,
              location: userData.location,
              allergies: userData.allergies,
              currentMedications: userData.currentMedications,
              emergencyContactName: userData.emergencyContactName,
              emergencyContactPhone: userData.emergencyContactPhone,
              medicalConditions: userData.medicalConditions,
            };
            await AsyncStorage.setItem("@profile_data", JSON.stringify(mergedProfile));
          } catch {}
        }
      } catch {}
      
      if (showModal) {
        setModalType('success');
        setModalTitle('Saved');
        setModalMessage('Personal information updated successfully');
        setModalVisible(true);
      }
      setDirtyPersonal(false);
      return true;
    } catch (error) {
      console.error(error);
      if (showModal || !silent) {
        setModalType('error');
        setModalTitle('Error');
        setModalMessage('Failed to update personal information. Please try again.');
        setModalVisible(true);
      }
      return false;
    }
  };

  // Keep ref pointing to the latest handler implementation (safe to set during render)
  handleUpdatePersonalInfoRef.current = handleUpdatePersonalInfo;

  const handleUpdateEmergencyContact = async (): Promise<boolean> => {
    try {
      const valid = validateEmergencyContact();
      if (!valid) {
        setModalType('error');
        setModalTitle('Validation Error');
        setModalMessage('Please correct the highlighted fields in Emergency Contact.');
        setModalVisible(true);
        return false;
      }
      
      // Check if online before attempting server updates
      if (!isOnline) {
        // Save to AsyncStorage cache for later sync (WatermelonDB disabled)
        try {
          let uid = currentUser?._id ? String(currentUser._id) : "";
          if (!uid) {
            try {
              const rawUser = await AsyncStorage.getItem("@profile_user");
              if (rawUser) {
                const parsed = JSON.parse(rawUser);
                uid = parsed?._id || parsed?.id || uid;
              }
            } catch {}
          }
          if (uid) {
            const raw = await AsyncStorage.getItem(`${uid}:profile_cache_v1`);
            const cached = raw ? JSON.parse(raw) : {};
            const merged = {
              ...cached,
              emergencyContactName: userData.emergencyContactName,
              emergencyContactPhone: userData.emergencyContactPhone,
            };
            await AsyncStorage.setItem(`${uid}:profile_cache_v1`, JSON.stringify(merged));
            // Mark emergency sync needed
            try { await AsyncStorage.setItem(`${uid}:profile_emergency_needs_sync`, '1'); } catch {}
            // Keep profile summary cache updated
            try {
              const rawProfile = await AsyncStorage.getItem("@profile_data");
              const cachedProfile = rawProfile ? JSON.parse(rawProfile) : {};
              const mergedProfile = {
                ...cachedProfile,
                emergencyContactName: userData.emergencyContactName,
                emergencyContactPhone: userData.emergencyContactPhone,
              };
              await AsyncStorage.setItem("@profile_data", JSON.stringify(mergedProfile));
            } catch {}
            console.log("� Offline: saved emergency contact to AsyncStorage cache", { _id: uid });
          }
        } catch (e) {
          console.warn("⚠️ Failed to cache emergency contact offline:", e);
        }
        setModalType('warning');
        setModalTitle('Offline Mode');
        setModalMessage('Changes saved locally. They will sync when you reconnect to the internet.');
        setModalVisible(true);
        setDirtyEmergency(false); // Clear dirty flag on offline save
        return true;
      }
      
      await updateEmergencyContactMutation({
        emergencyContactName: userData.emergencyContactName,
        emergencyContactPhone: userData.emergencyContactPhone,
      });
      // On success online, clear offline flag and refresh caches
      try {
        const uid = currentUser?._id ? String(currentUser._id) : "";
        if (uid) {
          await AsyncStorage.removeItem(`${uid}:profile_emergency_needs_sync`);
          const raw = await AsyncStorage.getItem(`${uid}:profile_cache_v1`);
          const cached = raw ? JSON.parse(raw) : {};
          const merged = {
            ...cached,
            emergencyContactName: userData.emergencyContactName,
            emergencyContactPhone: userData.emergencyContactPhone,
          };
          await AsyncStorage.setItem(`${uid}:profile_cache_v1`, JSON.stringify(merged));
          // Update profile summary cache
          try {
            const rawProfile = await AsyncStorage.getItem("@profile_data");
            const cachedProfile = rawProfile ? JSON.parse(rawProfile) : {};
            const mergedProfile = {
              ...cachedProfile,
              emergencyContactName: userData.emergencyContactName,
              emergencyContactPhone: userData.emergencyContactPhone,
            };
            await AsyncStorage.setItem("@profile_data", JSON.stringify(mergedProfile));
          } catch {}
        }
      } catch {}
      
      setModalType('success');
      setModalTitle('Success');
      setModalMessage('Emergency contact updated successfully');
      setModalVisible(true);
      setDirtyEmergency(false); // Clear dirty flag on success
      
      // Manually update userData state to reflect the saved values
      // (don't wait for server query reactivity which may be blocked by guards)
      setUserData((prev) => ({
        ...prev,
        emergencyContactName: userData.emergencyContactName,
        emergencyContactPhone: userData.emergencyContactPhone,
      }));
      
      return true;
    } catch (error) {
      console.error(error);
      setModalType('error');
      setModalTitle('Error');
      setModalMessage('Failed to update emergency contact. Please try again.');
      setModalVisible(true);
      return false;
    }
  };
  // Store ref for autosave
  handleUpdateEmergencyContactRef.current = handleUpdateEmergencyContact;

  const handleUpdateMedicalInfo = async (): Promise<boolean> => {
    try {
      const valid = validateMedicalInfo();
      if (!valid) {
        setModalType('error');
        setModalTitle('Validation Error');
        setModalMessage('Please correct the highlighted fields in Medical Information.');
        setModalVisible(true);
        return false;
      }
      
      // Check if online before attempting server updates
      if (!isOnline) {
        // Save to AsyncStorage cache for later sync (WatermelonDB disabled)
        try {
          let uid = currentUser?._id ? String(currentUser._id) : "";
          if (!uid) {
            try {
              const rawUser = await AsyncStorage.getItem("@profile_user");
              if (rawUser) {
                const parsed = JSON.parse(rawUser);
                uid = parsed?._id || parsed?.id || uid;
              }
            } catch {}
          }
          if (uid) {
            const raw = await AsyncStorage.getItem(`${uid}:profile_cache_v1`);
            const cached = raw ? JSON.parse(raw) : {};
            const merged = {
              ...cached,
              allergies: userData.allergies,
              currentMedications: userData.currentMedications,
              medicalConditions: userData.medicalConditions,
            };
            await AsyncStorage.setItem(`${uid}:profile_cache_v1`, JSON.stringify(merged));
            // Mark medical sync needed
            try { await AsyncStorage.setItem(`${uid}:profile_medical_needs_sync`, '1'); } catch {}
            // Update cached profile summary for Profile index
            try {
              const rawProfile = await AsyncStorage.getItem("@profile_data");
              const cachedProfile = rawProfile ? JSON.parse(rawProfile) : {};
              const mergedProfile = {
                ...cachedProfile,
                allergies: userData.allergies,
                currentMedications: userData.currentMedications,
                medicalConditions: userData.medicalConditions,
              };
              await AsyncStorage.setItem("@profile_data", JSON.stringify(mergedProfile));
            } catch {}
            console.log("� Offline: saved medical info to AsyncStorage cache", { _id: uid });
          }
        } catch (e) {
          console.warn("⚠️ Failed to cache medical info offline:", e);
        }
        setModalType('warning');
        setModalTitle('Offline Mode');
        setModalMessage('Changes saved locally. They will sync when you reconnect to the internet.');
        setModalVisible(true);
        setDirtyMedical(false); // Clear dirty flag on offline save
        return true;
      }
      
      await updateMedicalHistoryMutation({
        allergies: userData.allergies,
        currentMedications: userData.currentMedications,
        medicalConditions: userData.medicalConditions,
      });
      // On success online, clear offline flag and refresh caches
      try {
        const uid = currentUser?._id ? String(currentUser._id) : "";
        if (uid) {
          await AsyncStorage.removeItem(`${uid}:profile_medical_needs_sync`);
          const raw = await AsyncStorage.getItem(`${uid}:profile_cache_v1`);
          const cached = raw ? JSON.parse(raw) : {};
          const merged = {
            ...cached,
            allergies: userData.allergies,
            currentMedications: userData.currentMedications,
            medicalConditions: userData.medicalConditions,
          };
          await AsyncStorage.setItem(`${uid}:profile_cache_v1`, JSON.stringify(merged));
          // Update profile summary cache
          try {
            const rawProfile = await AsyncStorage.getItem("@profile_data");
            const cachedProfile = rawProfile ? JSON.parse(rawProfile) : {};
            const mergedProfile = {
              ...cachedProfile,
              allergies: userData.allergies,
              currentMedications: userData.currentMedications,
              medicalConditions: userData.medicalConditions,
            };
            await AsyncStorage.setItem("@profile_data", JSON.stringify(mergedProfile));
          } catch {}
        }
      } catch {}
      
      setModalType('success');
      setModalTitle('Success');
      setModalMessage('Medical information updated successfully');
      setModalVisible(true);
      setDirtyMedical(false); // Clear dirty flag on success
      
      // Manually update userData state to reflect the saved values
      // (don't wait for server query reactivity which may be blocked by guards)
      setUserData((prev) => ({
        ...prev,
        allergies: userData.allergies,
        currentMedications: userData.currentMedications,
        medicalConditions: userData.medicalConditions,
      }));
      
      return true;
    } catch (error) {
      console.error(error);
      setModalType('error');
      setModalTitle('Error');
      setModalMessage('Failed to update medical information. Please try again.');
      setModalVisible(true);
      return false;
    }
  };
  // Store ref for autosave
  handleUpdateMedicalInfoRef.current = handleUpdateMedicalInfo;

  const handleInputChange = (field: keyof typeof userData, value: string) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
    
    // Mark section as dirty based on field type
    const personalFields: (keyof typeof userData)[] = [
      'phone', 'age', 'address1', 'address2', 'city', 'province', 'postalCode', 'location'
    ];
    const emergencyFields: (keyof typeof userData)[] = [
      'emergencyContactName', 'emergencyContactPhone'
    ];
    const medicalFields: (keyof typeof userData)[] = [
      'allergies', 'currentMedications', 'medicalConditions'
    ];
    
    if (personalFields.includes(field)) {
      setDirtyPersonal(true);
    } else if (emergencyFields.includes(field)) {
      setDirtyEmergency(true);
    } else if (medicalFields.includes(field)) {
      setDirtyMedical(true);
    }
    
    if (field === "address1") {
      debouncedFetchAddressSuggestions(value);
    }
    
    if (field === "city" || field === "province") {
      setUserData((prev) => ({
        ...prev,
        location: [
          field === "city" ? value : prev.city,
          field === "province" ? value : prev.province,
        ].filter(Boolean).join(", "),
      }));
    }
  };

  // Auto-save all sections when leaving the screen if there are unsaved edits
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Fire and forget; silent to avoid disruptive modals on navigation
        if (dirtyPersonal) {
          handleUpdatePersonalInfoRef.current?.({ silent: true });
        }
        if (dirtyEmergency) {
          handleUpdateEmergencyContactRef.current?.();
        }
        if (dirtyMedical) {
          handleUpdateMedicalInfoRef.current?.();
        }
      };
    }, [dirtyPersonal, dirtyEmergency, dirtyMedical])
  );

  const validateField = (field: string, raw: string): boolean => {
    const value = (raw || "").trim();
    let error = "";
    
    switch (field) {
      case "phone": {
        if (value.length === 0) {
          error = "Phone number is required";
          break;
        }
        const digits = value.replace(/\D/g, "");
        if (!(digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))) {
          error = "Enter a valid phone number";
        }
        break;
      }
      case "age": {
        if (value.length === 0) {
          error = "Age is required";
          break;
        }
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0 || n > 120) error = "Age must be between 0 and 120";
        break;
      }
      case "address1": {
        if (value.length === 0) error = "Address is required";
        break;
      }
      case "city": {
        if (value.length === 0) error = "City is required";
        break;
      }
      case "province": {
        if (value.length === 0) {
          error = "Province is required";
        } else {
          const allowed = ["AB", "Alberta"];
          if (!allowed.includes(value)) {
            error = 'Use "Alberta" or "AB"';
          }
        }
        break;
      }
      case "postalCode": {
        if (value.length === 0) {
          error = "Postal code is required";
          break;
        }
        const formatted = value.replace(/\s+/g, "").toUpperCase();
        if (!/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/.test(formatted)) {
          error = "Enter a valid Canadian postal code (e.g., T2X 0M4)";
        } else if (value !== formatted.slice(0, 3) + " " + formatted.slice(3)) {
          setUserData((prev) => ({ ...prev, postalCode: formatted.slice(0, 3) + " " + formatted.slice(3) }));
        }
        break;
      }
      case "emergencyContactPhone": {
        if (value.length === 0) {
          error = "Phone is required";
          break;
        }
        const digits = value.replace(/\D/g, "");
        if (digits.length !== 10) {
          error = "Enter a 10-digit phone number";
        }
        break;
      }
      case "emergencyContactName": {
        if (value.length > 0 && value.length < 2) error = "Name too short";
        break;
      }
    }
    
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const validatePersonalInfo = (): boolean => {
    const fieldsToCheck: (keyof typeof userData)[] = [
      "fullName",
      "phone",
      "age",
      "address1",
      "city",
      "province",
      "postalCode",
      "location",
    ];
    const results = fieldsToCheck.map((f) =>
      validateField(f, String((userData as any)[f] ?? ""))
    );
    return results.every(Boolean);
  };

  const validateEmergencyContact = (): boolean => {
    const fieldsToCheck: (keyof typeof userData)[] = [
      "emergencyContactName",
      "emergencyContactPhone",
    ];
    const results = fieldsToCheck.map((f) =>
      validateField(f, String((userData as any)[f] ?? ""))
    );
    return results.every(Boolean);
  };

  const validateMedicalInfo = (): boolean => {
    // Medical info fields are optional, no strict validation
    return true;
  };

  const debouncedFetchAddressSuggestions = (q: string) => {
    const ts = Date.now();
    latestAddressQueryTsRef.current = ts;
    if (!q || q.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }
    setIsFetchingAddress(true);
    setTimeout(async () => {
      if (latestAddressQueryTsRef.current !== ts) return;
      try {
        if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === "YOUR_MAPBOX_PUBLIC_TOKEN") {
          setIsFetchingAddress(false);
          return;
        }
        const country = "ca";
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          q
        )}.json?autocomplete=true&country=${country}&types=address,place,postcode&limit=5&access_token=${MAPBOX_ACCESS_TOKEN}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const features = Array.isArray(data?.features) ? data.features : [];
        const suggestions = features.map((f: any) => {
          const label = f.place_name as string;
          const context: any[] = f.context || [];
          const byId = (idStart: string) =>
            context.find((c) => typeof c.id === "string" && c.id.startsWith(idStart));
          const cityVal = (byId("place")?.text || byId("locality")?.text) as string | undefined;
          const region = (byId("region")?.short_code || byId("region")?.text) as string | undefined;
          const provinceVal =
            region?.toUpperCase() === "CA-AB" ? "AB" : region === "Alberta" ? "AB" : region;
          const postal = (byId("postcode")?.text || "") as string;
          const fullAddress = f.address ? `${f.address} ${f.text}` : f.place_name.split(",")[0] || f.text;

          return {
            id: f.id as string,
            label,
            address1: fullAddress,
            city: cityVal,
            province: provinceVal,
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

  const handleSelectAddressSuggestion = (s: {
    id: string;
    label: string;
    address1: string;
    city?: string;
    province?: string;
    postalCode?: string;
  }) => {
    setAddressSuggestions([]);
    setUserData((prev) => ({
      ...prev,
      address1: s.address1 || prev.address1,
      city: s.city || prev.city,
      province: s.province || prev.province,
      postalCode: s.postalCode
        ? s.postalCode.length === 6
          ? s.postalCode.slice(0, 3).toUpperCase() + " " + s.postalCode.slice(3).toUpperCase()
          : s.postalCode.toUpperCase()
        : prev.postalCode,
      location: [s.city, s.province].filter(Boolean).join(", ") || prev.location,
    }));
    if (s.city) validateField("city", s.city);
    if (s.province) validateField("province", s.province);
    if (s.postalCode) validateField("postalCode", s.postalCode);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top','bottom'] : ['bottom']}>
      <CurvedBackground>
        <CurvedHeader
          title="Profile Information"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
          reminderEnabled={reminders.some((r) => r.enabled)}
          reminderSettings={
            reminders.find((r) => r.enabled && r.frequency !== "hourly")
              ? {
                  enabled: true,
                  time: reminders.find((r) => r.enabled && r.frequency !== "hourly")?.time || "09:00",
                  frequency: reminders.find((r) => r.enabled && r.frequency !== "hourly")?.frequency as "daily" | "weekly",
                  dayOfWeek: reminders.find((r) => r.enabled && r.frequency !== "hourly")?.dayOfWeek,
                }
              : null
          }
        />
        <DueReminderBanner topOffset={120} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          // Offset to account for curved header + reminder banner
          keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
        >
        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
          contentInsetAdjustmentBehavior="always"
          contentContainerStyle={{ paddingBottom: 200 }}
        >
          {/* Section Title */}
          <Text style={styles.sectionHeader}>Personal Information</Text>
          
          {/* Full Name Field */}
          <TouchableOpacity
            style={styles.fieldCard}
            onPress={() => toggleSection("fullName")}
            activeOpacity={0.7}
          >
            <View style={styles.fieldIconWrap}>
              <Icon name="person" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              {expandedSections.fullName ? (
                <TextInput
                  style={[styles.fieldInput, errors.fullName ? styles.inputError : null]}
                  value={userData.fullName}
                  onChangeText={(text) => handleInputChange("fullName", text)}
                  placeholder="Enter your full name"
                  placeholderTextColor={COLORS.lightGray}
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue}>{userData.fullName || "Not set"}</Text>
              )}
              {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
            </View>
            <Icon 
              name={expandedSections.fullName ? "check" : "edit"} 
              size={20} 
              color={expandedSections.fullName ? "#28A745" : "#868E96"}
              style={{ marginLeft: 12 }}
            />
          </TouchableOpacity>
          
          {/* Email Field (Read-only) */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldIconWrap}>
              <Icon name="email" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{userData.email || "Not set"}</Text>
            </View>
          </View>
          
          {/* Phone Number Field */}
          <TouchableOpacity
            style={styles.fieldCard}
            onPress={() => toggleSection("phone")}
            activeOpacity={0.7}
          >
            <View style={styles.fieldIconWrap}>
              <Icon name="phone" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              {expandedSections.phone ? (
                <TextInput
                  style={[styles.fieldInput, errors.phone ? styles.inputError : null]}
                  value={userData.phone}
                  onChangeText={(text) => handleInputChange("phone", text)}
                  placeholder="(403) 555-0123"
                  placeholderTextColor={COLORS.lightGray}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue}>{userData.phone || "Not set"}</Text>
              )}
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            </View>
            <Icon 
              name={expandedSections.phone ? "check" : "edit"} 
              size={20} 
              color={expandedSections.phone ? "#28A745" : "#868E96"}
              style={{ marginLeft: 12 }}
            />
          </TouchableOpacity>

          {/* Age Field */}
          <TouchableOpacity
            style={styles.fieldCard}
            onPress={() => toggleSection("age")}
            activeOpacity={0.7}
          >
            <View style={styles.fieldIconWrap}>
              <Icon name="cake" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Age</Text>
              {expandedSections.age ? (
                <TextInput
                  style={[styles.fieldInput, errors.age ? styles.inputError : null]}
                  value={userData.age}
                  onChangeText={(text) => handleInputChange("age", text)}
                  placeholder="e.g., 25"
                  placeholderTextColor={COLORS.lightGray}
                  keyboardType="numeric"
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue}>{userData.age || "Not set"}</Text>
              )}
              {errors.age ? <Text style={styles.errorText}>{errors.age}</Text> : null}
            </View>
            <Icon 
              name={expandedSections.age ? "check" : "edit"} 
              size={20} 
              color={expandedSections.age ? "#28A745" : "#868E96"}
              style={{ marginLeft: 12 }}
            />
          </TouchableOpacity>

          {/* Address Card (Combined) */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldIconWrap}>
              <Icon name="home" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.fieldContent}>
              <TouchableOpacity 
                onPress={() => toggleSection("address")}
                activeOpacity={0.7}
                style={{ flex: 1 }}
              >
                <Text style={styles.fieldLabel}>Address</Text>
                {expandedSections.address ? null : (
                  <Text style={styles.fieldValue} numberOfLines={2}>
                    {userData.address1 || "Not set"}
                    {userData.city || userData.province || userData.postalCode 
                      ? `\n${[userData.city, userData.province, userData.postalCode].filter(Boolean).join(", ")}`
                      : ""}
                  </Text>
                )}
              </TouchableOpacity>
              
              {expandedSections.address && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.inputLabel}>Address Line 1</Text>
                  <TextInput
                    style={[styles.fieldInput, errors.address1 ? styles.inputError : null]}
                    value={userData.address1}
                    onChangeText={(text) => handleInputChange("address1", text)}
                    placeholder="Street address"
                    placeholderTextColor={COLORS.lightGray}
                  />
                  {errors.address1 ? <Text style={styles.errorText}>{errors.address1}</Text> : null}
                  {!!addressSuggestions.length && (
                    <View style={styles.suggestionsBox}>
                      {addressSuggestions.map((s) => (
                        <TouchableOpacity
                          key={s.id}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectAddressSuggestion(s)}
                        >
                          <Text style={styles.suggestionText}>{s.label}</Text>
                        </TouchableOpacity>
                      ))}
                      {isFetchingAddress ? (
                        <View style={styles.suggestionLoading}>
                          <Text style={styles.suggestionLoadingText}>Searching…</Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  <Text style={styles.inputLabel}>Address Line 2 (Optional)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={userData.address2}
                    onChangeText={(text) => handleInputChange("address2", text)}
                    placeholder="Apartment, suite, unit"
                    placeholderTextColor={COLORS.lightGray}
                  />

                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={[styles.fieldInput, errors.city ? styles.inputError : null]}
                    value={userData.city}
                    onChangeText={(text) => handleInputChange("city", text)}
                    placeholder="e.g., Calgary"
                    placeholderTextColor={COLORS.lightGray}
                  />
                  {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}

                  <Text style={styles.inputLabel}>Province</Text>
                  <TextInput
                    style={[styles.fieldInput, errors.province ? styles.inputError : null]}
                    value={userData.province}
                    onChangeText={(text) => handleInputChange("province", text)}
                    placeholder="e.g., Alberta"
                    placeholderTextColor={COLORS.lightGray}
                    autoCapitalize="characters"
                  />
                  {errors.province ? <Text style={styles.errorText}>{errors.province}</Text> : null}

                  <Text style={styles.inputLabel}>Postal Code</Text>
                  <TextInput
                    style={[styles.fieldInput, errors.postalCode ? styles.inputError : null]}
                    value={userData.postalCode}
                    onChangeText={(text) => handleInputChange("postalCode", text)}
                    placeholder="e.g., T2X 0M4"
                    placeholderTextColor={COLORS.lightGray}
                    autoCapitalize="characters"
                  />
                  {errors.postalCode ? <Text style={styles.errorText}>{errors.postalCode}</Text> : null}
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => toggleSection("address")} style={{ marginLeft: 12 }}>
              <Icon 
                name={expandedSections.address ? "check" : "edit"} 
                size={20} 
                color={expandedSections.address ? "#28A745" : "#868E96"} 
              />
            </TouchableOpacity>
          </View>

          {/* Location Field */}
          <TouchableOpacity
            style={styles.fieldCard}
            onPress={() => toggleSection("location")}
            activeOpacity={0.7}
          >
            <View style={styles.fieldIconWrap}>
              <Icon name="place" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Location (for services)</Text>
              {expandedSections.location ? (
                <TextInput
                  style={[styles.fieldInput, errors.location ? styles.inputError : null]}
                  value={userData.location}
                  onChangeText={(text) => handleInputChange("location", text)}
                  placeholder="City or region"
                  placeholderTextColor={COLORS.lightGray}
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue}>{userData.location || "Not set"}</Text>
              )}
              {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
            </View>
            <Icon 
              name={expandedSections.location ? "check" : "edit"} 
              size={20} 
              color={expandedSections.location ? "#28A745" : "#868E96"}
              style={{ marginLeft: 12 }}
            />
          </TouchableOpacity>

          {/* Section Title */}
          <Text style={styles.sectionHeader}>Emergency Contact</Text>
          
          {/* Emergency Contact Name */}
          <TouchableOpacity
            style={styles.fieldCard}
            onPress={() => toggleSection("emergencyContactName")}
            activeOpacity={0.7}
          >
            <View style={styles.fieldIconWrap}>
              <Icon name="person" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Contact Name</Text>
              {expandedSections.emergencyContactName ? (
                <TextInput
                  style={[styles.fieldInput, errors.emergencyContactName ? styles.inputError : null]}
                  value={userData.emergencyContactName}
                  onChangeText={(text) => handleInputChange("emergencyContactName", text)}
                  placeholder="Emergency contact name"
                  placeholderTextColor={COLORS.lightGray}
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue}>{userData.emergencyContactName || "Not set"}</Text>
              )}
              {errors.emergencyContactName ? <Text style={styles.errorText}>{errors.emergencyContactName}</Text> : null}
            </View>
            <Icon 
              name={expandedSections.emergencyContactName ? "check" : "edit"} 
              size={20} 
              color={expandedSections.emergencyContactName ? "#28A745" : "#868E96"}
              style={{ marginLeft: 12 }}
            />
          </TouchableOpacity>

          {/* Emergency Contact Phone */}
          <TouchableOpacity
            style={styles.fieldCard}
            onPress={() => toggleSection("emergencyContactPhone")}
            activeOpacity={0.7}
          >
            <View style={styles.fieldIconWrap}>
              <Icon name="phone" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Contact Phone</Text>
              {expandedSections.emergencyContactPhone ? (
                <TextInput
                  style={[styles.fieldInput, errors.emergencyContactPhone ? styles.inputError : null]}
                  value={userData.emergencyContactPhone}
                  onChangeText={(text) => handleInputChange("emergencyContactPhone", text)}
                  placeholder="Emergency contact phone"
                  placeholderTextColor={COLORS.lightGray}
                  keyboardType="phone-pad"
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue}>{userData.emergencyContactPhone || "Not set"}</Text>
              )}
              {errors.emergencyContactPhone ? <Text style={styles.errorText}>{errors.emergencyContactPhone}</Text> : null}
            </View>
            <Icon 
              name={expandedSections.emergencyContactPhone ? "check" : "edit"} 
              size={20} 
              color={expandedSections.emergencyContactPhone ? "#28A745" : "#868E96"}
              style={{ marginLeft: 12 }}
            />
          </TouchableOpacity>

          {/* Section Title */}
          <Text style={styles.sectionHeader}>Medical Information</Text>
          
          {/* Allergies */}
          <TouchableOpacity
            style={styles.fieldCard}
            onPress={() => toggleSection("allergies")}
            activeOpacity={0.7}
          >
            <View style={styles.fieldIconWrap}>
              <Icon name="warning" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Allergies</Text>
              {expandedSections.allergies ? (
                <TextInput
                  style={[styles.fieldInput, errors.allergies ? styles.inputError : null]}
                  value={userData.allergies}
                  onChangeText={(text) => handleInputChange("allergies", text)}
                  placeholder="List any allergies"
                  placeholderTextColor={COLORS.lightGray}
                  multiline
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue} numberOfLines={2}>{userData.allergies || "Not set"}</Text>
              )}
              {errors.allergies ? <Text style={styles.errorText}>{errors.allergies}</Text> : null}
            </View>
            <Icon 
              name={expandedSections.allergies ? "check" : "edit"} 
              size={20} 
              color={expandedSections.allergies ? "#28A745" : "#868E96"}
              style={{ marginLeft: 12 }}
            />
          </TouchableOpacity>

          {/* Current Medications */}
          <TouchableOpacity
            style={styles.fieldCard}
            onPress={() => toggleSection("currentMedications")}
            activeOpacity={0.7}
          >
            <View style={styles.fieldIconWrap}>
              <Icon name="local-pharmacy" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Current Medications</Text>
              {expandedSections.currentMedications ? (
                <TextInput
                  style={[styles.fieldInput, errors.currentMedications ? styles.inputError : null]}
                  value={userData.currentMedications}
                  onChangeText={(text) => handleInputChange("currentMedications", text)}
                  placeholder="List current medications"
                  placeholderTextColor={COLORS.lightGray}
                  multiline
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue} numberOfLines={2}>{userData.currentMedications || "Not set"}</Text>
              )}
              {errors.currentMedications ? <Text style={styles.errorText}>{errors.currentMedications}</Text> : null}
            </View>
            <Icon 
              name={expandedSections.currentMedications ? "check" : "edit"} 
              size={20} 
              color={expandedSections.currentMedications ? "#28A745" : "#868E96"}
              style={{ marginLeft: 12 }}
            />
          </TouchableOpacity>

          {/* Medical Conditions */}
          <TouchableOpacity
            style={styles.fieldCard}
            onPress={() => toggleSection("medicalConditions")}
            activeOpacity={0.7}
          >
            <View style={styles.fieldIconWrap}>
              <Icon name="medical-services" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Medical Conditions</Text>
              {expandedSections.medicalConditions ? (
                <TextInput
                  style={[styles.fieldInput, errors.medicalConditions ? styles.inputError : null]}
                  value={userData.medicalConditions}
                  onChangeText={(text) => handleInputChange("medicalConditions", text)}
                  placeholder="List medical conditions"
                  placeholderTextColor={COLORS.lightGray}
                  multiline
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue} numberOfLines={2}>{userData.medicalConditions || "Not set"}</Text>
              )}
              {errors.medicalConditions ? <Text style={styles.errorText}>{errors.medicalConditions}</Text> : null}
            </View>
            <Icon 
              name={expandedSections.medicalConditions ? "check" : "edit"} 
              size={20} 
              color={expandedSections.medicalConditions ? "#28A745" : "#868E96"}
              style={{ marginLeft: 12 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Icon name="chevron-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      </CurvedBackground>

      {/* StatusModal for success/error messages */}
      <StatusModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />

      <BottomNavigation floating={true} />
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
  sectionHeader: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 18,
    color: COLORS.darkText,
    marginTop: 24,
    marginBottom: 12,
    marginLeft: 4,
  },
  fieldCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 70,
  },
  fieldIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F3F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  fieldContent: {
    flex: 1,
    justifyContent: "center",
  },
  fieldLabel: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    color: "#495057",
    marginBottom: 4,
  },
  fieldValue: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 15,
    color: COLORS.darkText,
    lineHeight: 20,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 10,
    padding: 10,
    color: COLORS.darkText,
    backgroundColor: "#F8F9FA",
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 15,
    marginTop: 4,
  },
  inputLabel: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 13,
    color: "#495057",
    marginTop: 12,
    marginBottom: 6,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 20,
    color: COLORS.darkText,
    flex: 1,
  },
  sectionTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    marginBottom: 8,
    color: "#495057",
    marginTop: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  text: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 15,
    color: COLORS.darkText,
    marginBottom: 12,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 12,
    padding: 14,
    color: COLORS.darkText,
    backgroundColor: "#F8F9FA",
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 15,
    minHeight: 48,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: "#FFF5F5",
  },
  errorText: {
    color: COLORS.error,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 4,
  },
  suggestionsBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  suggestionText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 15,
    color: COLORS.darkText,
  },
  suggestionLoading: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  suggestionLoadingText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 13,
    color: "#868E96",
    fontStyle: "italic",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: COLORS.primary,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    marginLeft: 4,
  },
  backButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 16,
  },
  backButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
  },
});