import Ionicons from "@expo/vector-icons/Ionicons";
import { Q } from "@nozbe/watermelondb";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../../convex/_generated/api";
import { safeWrite } from "../../../watermelon/utils/safeWrite";
import { healthEntriesEvents } from "../../_context/HealthEntriesEvents";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import { COLORS, FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

function logErrorDetails(context: string, error: any, extra: Record<string, any> = {}) {
  console.group(`❌ [${context}]`);
  console.error('Message:', error?.message);
  console.error('Name:', error?.name);
  console.error('Stack:', error?.stack);
  console.log('Extra context:', JSON.stringify(extra, null, 2));
  console.groupEnd();
}

export default function AddHealthEntry() {
  const database = useDatabase();
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");
  const logManualEntry = useMutation(api.healthEntries.logManualEntry);
  const updateHealthEntry = useMutation(api.healthEntries.updateHealthEntry);
  const generateUploadUrl = useMutation(api.healthEntries.generateUploadUrl);
  const storeUploadedPhoto = useMutation(api.healthEntries.storeUploadedPhoto);

  // Detect edit mode from route/search params
  // todo: here's two Id: entryId, convexId 
  const { entryId, convexId, mode } = useLocalSearchParams<{ entryId?: string; convexId?: string, mode: string }>();
  const editEntryId = entryId;
  const editConvexId = convexId;

  // State for form fields
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [localPhotoUris, setLocalPhotoUris] = useState<string[]>([]); // For offline photo storage
  const [uploading, setUploading] = useState(false);

  // Error modal state
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  // Alert modal state
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalTitle, setAlertModalTitle] = useState("");
  const [alertModalMessage, setAlertModalMessage] = useState("");
  const [alertModalButtons, setAlertModalButtons] = useState<
    {
      label: string;
      onPress: () => void;
      variant?: "primary" | "secondary" | "destructive";
    }[]
  >([]);

  // State for picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSeverityDropdown, setShowSeverityDropdown] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Edit mode state - preserve original timestamp (Option A)
  const [originalTimestamp, setOriginalTimestamp] = useState<number | null>(null);
  const [isLoadingEntry, setLoadingEntry] = useState(false);
  const [watermelonRecordId, setWatermelonRecordId] = useState<string | null>(null);

  // Severity options (1-10)
  const severityOptions = Array.from({ length: 10 }, (_, i) =>
    (i + 1).toString()
  );

  // Format date as YYYY-MM-DD using LOCAL date parts (not UTC)
  // This ensures the date shown matches the user's local timezone
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Format time as HH:MM AM/PM in 12-hour format
  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${hours}:${minutes} ${ampm}`;
  };

  /**
   * Load entry data for edit mode - fetches from WatermelonDB to pre-populate form
   * @param id - WatermelonDB ID or Convex ID of the entry to edit
   */
  const loadEntryForEdit = useCallback(async (id: string) => {
    setLoadingEntry(true);
    try {
      const healthCollection = database.get('health_entries');
      let entry: any = null;

      // Detect if this is a Convex ID (starts with 'k' or 'j', longer than 20 chars)
      // Same logic as log-details.tsx
      const isConvexId = id && id.length > 20 && /^[kj]/.test(id);

      if (isConvexId) {
        // Query by convexId field (Convex ID is stored as a field, not primary key)
        console.log('🔍 Querying WatermelonDB by convexId field:', id);
        const results = await healthCollection
          .query(Q.where('convexId', id))
          .fetch();

        if (results.length > 0) {
          // Choose the best candidate when duplicates exist (e.g., rescue path created a new row)
          const score = (x: any) => [
            x.isDeleted ? 0 : 1, // prefer non-deleted
            x.lastEditedAt || 0, // prefer most recently edited
            x.editCount || 0,    // prefer more edits
            x.timestamp || 0     // fallback to newer timestamp
          ];
          const better = (a: any, b: any) => {
            const sa = score(a);
            const sb = score(b);
            for (let i = 0; i < sa.length; i++) {
              if (sa[i] === sb[i]) continue;
              return sa[i] > sb[i] ? a : b;
            }
            return a;
          };
          console.log('🔍 [EDIT LOADER] Scoring', results.length, 'duplicates:');
          results.forEach((r: any) => {
            console.log('  ', r.id, '→', score(r), '| symptoms:', r.symptoms?.substring(0, 30));
          });
          entry = results.reduce((best, cur) => better(best, cur));
          const ids = results.map((r: any) => r.id);
          console.log('✅ Found entries by convexId:', ids, '→ chosen:', entry.id, 'with symptoms:', entry.symptoms?.substring(0, 30));
        } else {
          throw new Error(`No entry found with convexId: ${id}`);
        }
      } else {
        // Direct find by WatermelonDB ID
        console.log('🔍 Finding entry by WatermelonDB ID:', id);
        entry = await healthCollection.find(id);
      }

      if (!entry) {
        throw new Error('Entry not found');
      }

      // Pre-populate form fields
      setSymptoms(entry.symptoms || '');
      setSeverity(entry.severity?.toString() || '');
      setNotes(entry.notes || '');

      // Handle photos (parse JSON if string)
      try {
        const photoArray = typeof entry.photos === 'string'
          ? JSON.parse(entry.photos)
          : (entry.photos || []);
        setPhotos(photoArray);
      } catch {
        setPhotos([]);
      }

      // Preserve original timestamp (Option A)
      setOriginalTimestamp(entry.timestamp);

      // Store WatermelonDB record ID for later update
      setWatermelonRecordId(entry.id);
      console.log('💾 Stored watermelonRecordId for later update:', entry.id);
      // If this unmounted

      // Set date/time from original timestamp for display
      const date = new Date(entry.timestamp);
      setSelectedDate(date);
      setSelectedTime(date);

      console.log('✅ Entry loaded for editing:', {
        watermelonId: entry.id,
        convexId: entry.convexId,
        symptoms: entry.symptoms,
        severity: entry.severity,
        originalTimestamp: entry.timestamp,
      });
    } catch (error) {
      console.error('❌ Failed to load entry for editing:', error);
      setAlertModalTitle('Error');
      setAlertModalMessage('Failed to load entry for editing. Please try again.');
      setAlertModalButtons([
        {
          label: 'Go Back',
          onPress: () => router.back(),
          variant: 'primary',
        },
      ]);
      setAlertModalVisible(true);
    } finally {
      setLoadingEntry(false);
    }
  }, [database]);

  // Load entry data for edit mode when component mounts
  useEffect(() => {
    if (mode === 'edit' && editEntryId) {
      // IIFE (Immediately Invoked Function Expression) to handle async/await in useEffect
      (async () => {
        try {
          await loadEntryForEdit(editEntryId);
        } catch (error) {
          console.error('Failed to load entry in effect:', error);
        }
      })();
    }
  }, [mode, editEntryId, loadEntryForEdit]);

  // Handle image picker
  const pickImage = async () => {
    try {
      // Check photo limit (combine both online and offline photos)
      if (photos.length + localPhotoUris.length >= 3) {
        setErrorModalMessage("You can only add up to 3 photos per health entry.");
        setErrorModalVisible(true);
        return;
      }

      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setErrorModalMessage("Sorry, we need camera roll permissions to upload photos.");
        setErrorModalVisible(true);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        await uploadImage(selectedImage.uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setErrorModalMessage("Failed to pick image. Please try again.");
      setErrorModalVisible(true);
    }
  };

  // Camera capture option intentionally removed (requested: remove "Take Photo" UX).
  // Only gallery selection via pickImage is supported now.

  // Upload image to Convex storage (online) or save locally (offline)
  const uploadImage = async (imageUri: string) => {
    if (uploading) return;

    // Double-check photo limit before starting upload
    if (photos.length + localPhotoUris.length >= 3) {
      setErrorModalMessage("You can only add up to 3 photos per health entry.");
      setErrorModalVisible(true);
      return;
    }

    setUploading(true);
    try {
      if (isOnline) {
        // Online: Upload to Convex
        const uploadUrl = await generateUploadUrl();

        const response = await fetch(imageUri);
        const blob = await response.blob();

        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });

        if (!result.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = await result.json();
        const photoUrl = await storeUploadedPhoto({ storageId });

        setPhotos((prev) => {
          if (prev.length >= 3) {
            setErrorModalMessage("You can only add up to 3 photos per health entry.");
            setErrorModalVisible(true);
            return prev;
          }
          return [...prev, photoUrl];
        });

        console.log("✅ Photo uploaded successfully:", photoUrl);
      } else {
        // Offline: Just store the local URI directly (no upload needed)
        // Photos will be uploaded when back online during sync
        setLocalPhotoUris((prev) => [...prev, imageUri]);
        console.log("📴 Photo saved for offline upload:", imageUri);
      }
    } catch (error) {
      console.error("❌ Error uploading image:", error);
      setErrorModalMessage(isOnline
        ? "Failed to upload photo. Please try again."
        : "Failed to save photo locally. Please try again.");
      setErrorModalVisible(true);
    } finally {
      setUploading(false);
    }
  };

  // Remove photo from list
  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle date picker change
  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  // Handle time picker change
  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (date) {
      setSelectedTime(date);
    }
  };

  // Create timestamp from date and time
  const createTimestamp = (date: Date, time: Date) => {
    const combinedDate = new Date(date);
    const [timeStr, modifier] = formatTime(time).split(" ");
    let [hours, minutes] = timeStr.split(":");

    if (modifier === "PM" && hours !== "12") {
      hours = (parseInt(hours) + 12).toString();
    }
    if (modifier === "AM" && hours === "12") {
      hours = "00";
    }

    combinedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return combinedDate.getTime();
  };

  // Save health entry and navigate back
  const handleSaveEntry = async () => {
    // getting conex internal Id may be underfine
    const userId = currentUser?._id;

    // Allow offline saves without authentication check
    if (!isOnline && !userId) {
      setAlertModalTitle("Offline Mode");
      setAlertModalMessage("Your entry will be saved locally and synced when you're back online. Please sign in when online to sync your data.");
      setAlertModalButtons([
        {
          label: "Continue",
          onPress: () => setAlertModalVisible(false),
          variant: "primary",
        },
      ]);
      setAlertModalVisible(true);
    }

    if (!symptoms.trim() || !severity) {
      setAlertModalTitle("Missing Information");
      setAlertModalMessage("Please fill in symptoms and severity.");
      setAlertModalButtons([
        {
          label: "OK",
          onPress: () => setAlertModalVisible(false),
          variant: "primary",
        },
      ]);
      setAlertModalVisible(true);
      return;
    }

    try {
      // Create timestamp from selected date/time (always use user's selection)
      // This allows editing the date/time of an entry
      const timestamp = createTimestamp(selectedDate, selectedTime);
      const dateString = formatDate(selectedDate);
      // Use actual userId if available, skip saving if offline without userId
      const saveUserId = userId;

      console.log("Saving entry:", {
        mode: mode === 'edit' ? 'edit' : (isOnline ? 'online' : 'offline'),
        editMode: mode === 'edit',
        hasUserId: !!saveUserId,
        date: dateString,
        timestamp,
        originalTimestamp: mode === 'edit' ? originalTimestamp : null,
        symptoms,
        severity: parseInt(severity),
        notes,
        photos: photos.length,
        localPhotos: localPhotoUris.length,
      });

      // EDIT MODE FLOW
      if (mode === 'edit' && editEntryId) {
        console.log('📝 EDIT MODE - IDs:', {
          editEntryId,
          editConvexId,
          watermelonRecordId,
          isOnline,
          hasUserId: !!userId,
        });

        if (isOnline && userId && editConvexId) {
          // ONLINE EDIT: Update Convex first; local WMDB update becomes best-effort.
          try {
            await updateHealthEntry({
              entryId: editConvexId as any,
              userId: userId as any,
              symptoms,
              severity: parseInt(severity),
              notes,
              photos: [...photos, ...localPhotoUris],
              timestamp, // Include timestamp so date/time updates are sent to server
            });
            console.log("✅ Entry updated online (Convex)");
          } catch (remoteErr) {
            console.error("❌ Failed to update entry on server:", remoteErr);
            throw remoteErr; // can't proceed if server update failed
          }

          // Emit event so detail/history/daily log can refresh
          healthEntriesEvents.emit({ type: 'edit', convexId: editConvexId || undefined, watermelonId: watermelonRecordId || undefined, timestamp: Date.now() });

          // Best-effort local WMDB update. Any failure here is non-fatal; UI will reflect server state while online,
          // and the hydration effect will reconcile the local cache shortly after.
          console.log('🔄 About to update WatermelonDB, watermelonRecordId:', watermelonRecordId);
          if (watermelonRecordId) {
            try {
              const healthCollection = database.get('health_entries');

              console.log('🔍 Finding entry with ID:', watermelonRecordId);
              const entry = await healthCollection.find(watermelonRecordId);

              console.log('🔍 Entry after find():', entry);
              console.log('🔍 Entry is null?', entry === null);
              console.log('🔍 Entry is undefined?', entry === undefined);
              console.log('🔍 Entry type:', typeof entry);

              if (!entry) {
                console.error('❌ Entry not found after find()! ID:', watermelonRecordId);
                throw new Error(`WatermelonDB record ${watermelonRecordId} not found`);
              }

              console.log('🔍 Photos array:', photos);
              console.log('🔍 LocalPhotoUris array:', localPhotoUris);
              console.log('🔍 Combined photos:', [...photos, ...localPhotoUris]);
              console.log('🔍 Stringified photos:', JSON.stringify([...photos, ...localPhotoUris]));
              console.log('🔍 Severity value:', severity, 'parsed:', parseInt(severity));
              console.log('🔍 Notes value:', notes, 'coalesced:', notes || '');

              console.log("🔍 About to update entry, entry type:", typeof entry);
              console.log("🔍 Entry prototype:", Object.getPrototypeOf(entry)?.constructor?.name);
              console.log("🔍 Entry keys:", Object.keys(entry || {}));

              await safeWrite(
                database,
                async () => {
                  const schemaColumns: Record<string, any> = (entry as any)?.collection?.schema?.columns || {};
                  const columnNames = Object.keys(schemaColumns);
                  console.log('🧪 [WMDB DEBUG] health_entries schema columns seen in JS:', columnNames);
                  console.log('🧪 [WMDB DEBUG] Contains type?', 'type' in schemaColumns, 'lastEditedAt?', 'lastEditedAt' in schemaColumns, 'editCount?', 'editCount' in schemaColumns);
                  const rawKeysBefore = Object.keys((entry as any)?._raw || {});
                  console.log('🧪 [WMDB DEBUG] Raw entry keys BEFORE update:', rawKeysBefore);
                  const unknownBefore = rawKeysBefore.filter(k => !schemaColumns[k]);
                  if (unknownBefore.length > 0) {
                    console.log('⚠️ [WMDB DEBUG] Unknown raw keys BEFORE update (not in schema):', unknownBefore);
                  }

                  let primaryError: any = null;
                  try {
                    const updatedEntry = entry.prepareUpdate((record: any) => {
                      console.log('🔄 Inside prepareUpdate callback (dynamic column assignment)');
                      record.symptoms = symptoms;
                      record.severity = parseInt(severity);
                      record.notes = notes || '';
                      // @json decorator handles serialization - pass array directly
                      record.photos = [...photos, ...localPhotoUris];
                      record.timestamp = timestamp; // Update timestamp for date/time changes
                      if ('type' in schemaColumns && !record.type) {
                        record.type = 'manual_entry';
                      }
                      if ('lastEditedAt' in schemaColumns) {
                        record.lastEditedAt = Date.now();
                      }
                      if ('editCount' in schemaColumns) {
                        record.editCount = (record.editCount || 0) + 1;
                      }
                    });
                    await database.batch(updatedEntry);
                    console.log('✅ Fields updated successfully via prepareUpdate (full)');
                  } catch (e) {
                    primaryError = e;
                    console.warn('⚠️ [WMDB DEBUG] Primary update failed, will attempt minimal fallback (non-fatal):', e);
                    const rawKeysAfterPrimary = Object.keys((entry as any)?._raw || {});
                    console.log('🧪 [WMDB DEBUG] Raw entry keys AFTER primary failure:', rawKeysAfterPrimary);
                    const unknownAfterPrimary = rawKeysAfterPrimary.filter(k => !schemaColumns[k]);
                    if (unknownAfterPrimary.length > 0) {
                      console.log('⚠️ [WMDB DEBUG] Unknown raw keys AFTER primary failure:', unknownAfterPrimary);
                    }
                    try {
                      const minimalEntry = entry.prepareUpdate((record: any) => {
                        console.log('🔄 [WMDB DEBUG] Minimal fallback prepareUpdate executing');
                        record.symptoms = symptoms;
                        record.severity = parseInt(severity);
                        record.notes = notes || '';
                        if ('photos' in schemaColumns) {
                          (record as any).photos = JSON.stringify([...photos, ...localPhotoUris]);
                        }
                      });
                      await database.batch(minimalEntry);
                      console.log('✅ [WMDB DEBUG] Minimal fallback update succeeded');
                      primaryError = null;
                    } catch (fallbackErr) {
                      console.warn('⚠️ [WMDB DEBUG] Minimal fallback also failed. Attempting duplicate-record rescue strategy (non-fatal).', fallbackErr);
                      try {
                        const healthCollection = database.get('health_entries');
                        const duplicate = await healthCollection.create((newRec: any) => {
                          newRec.userId = (entry as any).userId;
                          newRec.convexId = (entry as any).convexId; // maintain link
                          newRec.date = (entry as any).date;
                          newRec.timestamp = (entry as any).timestamp; // preserve original timestamp
                          newRec.symptoms = symptoms;
                          newRec.severity = parseInt(severity);
                          newRec.notes = notes || '';
                          newRec.photos = JSON.stringify([...photos, ...localPhotoUris]);
                          newRec.type = (entry as any).type || 'manual_entry';
                          newRec.isSynced = (entry as any).isSynced; // preserve sync state
                          newRec.createdBy = (entry as any).createdBy;
                          if ('lastEditedAt' in schemaColumns) newRec.lastEditedAt = Date.now();
                          if ('editCount' in schemaColumns) newRec.editCount = ((entry as any).editCount || 0) + 1;
                          if ('isDeleted' in schemaColumns) newRec.isDeleted = false; // new active record
                        });
                        console.log('🛟 [WMDB DEBUG] Duplicate rescue record created with id:', duplicate.id);
                        if ('isDeleted' in schemaColumns) {
                          try {
                            const softDelete = entry.prepareUpdate((r: any) => { r.isDeleted = true; });
                            await database.batch(softDelete);
                            console.log('🛟 [WMDB DEBUG] Original record soft-deleted');
                          } catch (sdErr) {
                            console.warn('⚠️ [WMDB DEBUG] Soft-delete failed, leaving original alongside duplicate (will be deduped in queries):', sdErr);
                          }
                        }
                        console.log('🛟 [WMDB DEBUG] Rescue strategy completed. Duplicate will be treated as latest version.');
                        primaryError = null;
                      } catch (duplicateErr) {
                        console.error('💥 [WMDB DEBUG] Rescue duplicate strategy failed:', duplicateErr);
                        throw duplicateErr;
                      }
                    }
                  }
                },
                10000,
                'updateHealthEntryOnlineEdit'
              );

              console.log("✅ Entry also updated in WatermelonDB");
            } catch (localErr) {
              console.warn('⚠️ Skipping local WatermelonDB update due to error; relying on server + hydration:', (localErr as any)?.message || localErr);
            }
          } else {
            console.warn("⚠️ watermelonRecordId is null - WatermelonDB NOT updated!");
          }
        } else {
          // OFFLINE EDIT: Update WatermelonDB only (use stored WatermelonDB ID)
          console.log('📴 OFFLINE EDIT MODE - watermelonRecordId:', watermelonRecordId);
          if (watermelonRecordId) {
            const healthCollection = database.get('health_entries');

            console.log('🔍 [OFFLINE] Finding entry with ID:', watermelonRecordId);
            const entry = await healthCollection.find(watermelonRecordId);

            console.log('🔍 [OFFLINE] Entry after find():', entry);
            console.log('🔍 [OFFLINE] Entry is null?', entry === null);
            console.log('🔍 [OFFLINE] Entry is undefined?', entry === undefined);

            if (!entry) {
              console.error('❌ [OFFLINE] Entry not found! ID:', watermelonRecordId);
              throw new Error(`WatermelonDB record ${watermelonRecordId} not found (offline mode)`);
            }

            console.log('🔍 [OFFLINE] Photos array:', photos);
            console.log('🔍 [OFFLINE] LocalPhotoUris array:', localPhotoUris);

            console.log('🔄 [OFFLINE] About to update entry');
            // Use same resilience strategy as online edit: multi-stage fallback + duplicate rescue
            await safeWrite(
              database,
              async () => {
                const schemaColumns: Record<string, any> = (entry as any)?.collection?.schema?.columns || {};
                const columnNames = Object.keys(schemaColumns);
                console.log('🧪 [WMDB DEBUG] (offline) health_entries schema columns seen in JS:', columnNames);
                console.log('🧪 [WMDB DEBUG] (offline) Contains type?', 'type' in schemaColumns, 'lastEditedAt?', 'lastEditedAt' in schemaColumns, 'editCount?', 'editCount' in schemaColumns);

                let primaryError: any = null;
                try {
                  const updatedEntry = entry.prepareUpdate((e: any) => {
                    console.log('🔄 [OFFLINE] Inside prepareUpdate callback (dynamic column assignment)');
                    e.symptoms = symptoms;
                    e.severity = parseInt(severity);
                    e.notes = notes || '';
                    // @json decorator handles serialization - pass array directly
                    e.photos = [...photos, ...localPhotoUris];
                    e.timestamp = timestamp; // Update timestamp for date/time changes
                    e.isSynced = false; // Mark for re-sync
                    if ('type' in schemaColumns && !e.type) {
                      e.type = 'manual_entry';
                    }
                    if ('lastEditedAt' in schemaColumns) {
                      e.lastEditedAt = Date.now();
                    }
                    if ('editCount' in schemaColumns) {
                      e.editCount = (e.editCount || 0) + 1;
                    }
                  });
                  await database.batch(updatedEntry);
                  console.log('✅ [OFFLINE] Fields updated successfully via prepareUpdate');
                } catch (e) {
                  primaryError = e;
                  console.warn('⚠️ [WMDB DEBUG] (offline) Primary update failed, will attempt minimal fallback (non-fatal):', e);
                  try {
                    const minimalEntry = entry.prepareUpdate((record: any) => {
                      console.log('🔄 [WMDB DEBUG] (offline) Minimal fallback prepareUpdate executing');
                      record.symptoms = symptoms;
                      record.severity = parseInt(severity);
                      record.notes = notes || '';
                      if ('photos' in schemaColumns) {
                        (record as any).photos = JSON.stringify([...photos, ...localPhotoUris]);
                      }
                      if ('isSynced' in schemaColumns) {
                        record.isSynced = false;
                      }
                    });
                    await database.batch(minimalEntry);
                    console.log('✅ [WMDB DEBUG] (offline) Minimal fallback update succeeded');
                    primaryError = null;
                  } catch (fallbackErr) {
                    console.warn('⚠️ [WMDB DEBUG] (offline) Minimal fallback also failed. Attempting duplicate-record rescue strategy (non-fatal).', fallbackErr);
                    try {
                      const healthCollection = database.get('health_entries');
                      const now = Date.now();
                      const duplicate = await healthCollection.create((newRec: any) => {
                        newRec.userId = (entry as any).userId;
                        newRec.convexId = (entry as any).convexId; // maintain link
                        newRec.date = (entry as any).date; // Keep original date key for categorization
                        newRec.timestamp = timestamp; // Use updated timestamp for date/time changes
                        newRec.symptoms = symptoms;
                        newRec.severity = parseInt(severity);
                        newRec.notes = notes || '';
                        newRec.photos = JSON.stringify([...photos, ...localPhotoUris]);
                        newRec.type = (entry as any).type || 'manual_entry';
                        newRec.isSynced = false; // Offline edit means not synced
                        newRec.createdBy = (entry as any).createdBy;
                        if ('lastEditedAt' in schemaColumns) newRec.lastEditedAt = now;
                        if ('editCount' in schemaColumns) newRec.editCount = ((entry as any).editCount || 0) + 1;
                        if ('isDeleted' in schemaColumns) newRec.isDeleted = false; // new active record
                      });
                        newRec.createdBy = (entry as any).createdBy;
                        if ('lastEditedAt' in schemaColumns) newRec.lastEditedAt = now;
                        if ('editCount' in schemaColumns) newRec.editCount = ((entry as any).editCount || 0) + 1;
                        if ('isDeleted' in schemaColumns) newRec.isDeleted = false; // new active record
                      });
                      console.log('🛟 [WMDB DEBUG] (offline) Duplicate rescue record created with id:', duplicate.id);
                      if ('isDeleted' in schemaColumns) {
                        try {
                          const softDelete = entry.prepareUpdate((r: any) => { r.isDeleted = true; });
                          await database.batch(softDelete);
                          console.log('🛟 [WMDB DEBUG] (offline) Original record soft-deleted');
                        } catch (sdErr) {
                          console.warn('⚠️ [WMDB DEBUG] (offline) Soft-delete failed, leaving original alongside duplicate (will be deduped in queries):', sdErr);
                        }
                      }
                      console.log('🛟 [WMDB DEBUG] (offline) Rescue strategy completed. Duplicate will be treated as latest version.');
                      primaryError = null;
                    } catch (duplicateErr) {
                      console.error('💥 [WMDB DEBUG] (offline) Rescue duplicate strategy failed:', duplicateErr);
                      throw duplicateErr;
                    }
                  }
                }
              },
              10000,
              'updateHealthEntryOfflineEdit'
            );

            console.log("📴 Entry updated offline, will sync when online");
            // Emit event for real-time refresh
            healthEntriesEvents.emit({ type: 'edit', convexId: editConvexId || undefined, watermelonId: watermelonRecordId || undefined, timestamp: Date.now() });
          } else {
            console.error("❌ watermelonRecordId is null - cannot update offline!");
            throw new Error("Cannot update: WatermelonDB record ID not found");
          }
        }

        // Emit edit event for real-time refresh consumers
        healthEntriesEvents.emit({ type: 'edit', convexId: editConvexId || undefined, watermelonId: watermelonRecordId || undefined, timestamp: Date.now() });
        // Navigate back to detail screen
        router.back();
        return;
      }

      if (isOnline && userId) {
        // ONLINE: Save to both Convex AND WatermelonDB
        try {
          const newId = await logManualEntry({
            userId,
            date: dateString,
            timestamp,
            symptoms,
            severity: parseInt(severity),
            notes,
            photos: photos,
            createdBy: currentUser.firstName || "User",
          });
          console.log("✅ Manual entry saved online");

          // Also save to WatermelonDB for offline access
          const healthEntriesCollection = database.collections.get('health_entries');
          let createdLocalId: string | undefined;
          await safeWrite(
            database,
            async () => {
              const rec = await healthEntriesCollection.create((entry: any) => {
                entry.userId = userId;
                entry.date = dateString;
                entry.timestamp = timestamp;
                entry.symptoms = symptoms;
                entry.severity = parseInt(severity);
                entry.notes = notes || '';
                // @json decorator handles serialization - pass array directly
                entry.photos = photos;
                entry.type = 'manual_entry';
                entry.isSynced = true; // Already synced
                entry.createdBy = currentUser?.firstName || 'User';
                // tie local to server to avoid future hydration duplicates
                entry.convexId = newId;
              });
              createdLocalId = (rec as any)?.id;
            },
            10000,
            'createHealthEntryOnlineAdd'
          );
          console.log("✅ Entry also saved to WatermelonDB for offline access");
          // Emit add event for real-time refresh
          healthEntriesEvents.emit({ type: 'add', convexId: newId, watermelonId: createdLocalId, timestamp: Date.now() });
        } catch (error) {
          console.error("❌ Failed to save online:", error);
          throw error;
        }
      } else if (!isOnline && userId) {
        // OFFLINE with valid userId: Save to WatermelonDB for later sync
        const healthEntriesCollection = database.collections.get('health_entries');
        let createdLocalId: string | undefined;
        await safeWrite(
          database,
          async () => {
            const rec = await healthEntriesCollection.create((entry: any) => {
              entry.userId = userId;
              entry.date = dateString;
              entry.timestamp = timestamp;
              entry.symptoms = symptoms;
              entry.severity = parseInt(severity);
              entry.notes = notes || '';
              // @json decorator handles serialization - pass array directly
              entry.photos = [...photos, ...localPhotoUris];
              entry.type = 'manual_entry';
              entry.isSynced = false; // Mark for sync when online
              entry.createdBy = currentUser?.firstName || 'User';
            });
            createdLocalId = (rec as any)?.id;
          },
          10000,
          'createHealthEntryOfflineAdd'
        );

        console.log("📴 Entry saved offline, will sync when online");
        // Emit add event for real-time refresh
        healthEntriesEvents.emit({ type: 'add', convexId: undefined, watermelonId: createdLocalId, timestamp: Date.now() });
      } else {
        // No userId available - can't save
        console.error("❌ Cannot save entry: No user ID available");
        setAlertModalTitle("Error");
        setAlertModalMessage("Cannot save entry. Please sign in first.");
        setAlertModalButtons([
          {
            label: "OK",
            onPress: () => setAlertModalVisible(false),
            variant: "primary",
          },
        ]);
        setAlertModalVisible(true);
        return;
      }

      setShowSuccessModal(true);
    } catch (error) {
      logErrorDetails("handleSaveEntry", error, {
        mode,
        isOnline,
        userId,
        editEntryId,
        editConvexId,
        watermelonRecordId,
        symptoms,
        severity
      });

      console.error("❌ Failed to save manual entry:", error);

      setAlertModalTitle("Error");
      setAlertModalMessage(isOnline
        ? "Failed to save entry online. Please try again."
        : "Failed to save entry offline. Please check storage and try again.");
      setAlertModalButtons([
        {
          label: "OK",
          onPress: () => setAlertModalVisible(false),
          variant: "primary",
        },
      ]);
      setAlertModalVisible(true);
    }
  };

  // Cancel and navigate back
  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Fixed Header (not scrollable) */}
        <CurvedHeader
          title={mode === 'edit' ? "Tracker - Edit Entry" : "Tracker - Add Entry"}
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
        />
        <DueReminderBanner topOffset={120} />

        {/* Scrollable content under header */}
        <KeyboardAvoidingView
          style={styles.contentArea}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.contentSection}>
              {/* Date selection */}
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Select Date
                </Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    {formatDate(selectedDate)}
                  </Text>
                </TouchableOpacity>
                {/* Date Picker - iOS Modal with backdrop dismissal */}
                {showDatePicker && Platform.OS === "ios" && (
                  <Modal
                    visible={showDatePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowDatePicker(false)}
                  >
                    <TouchableOpacity
                      style={styles.datePickerModalOverlay}
                      activeOpacity={1}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <View style={styles.datePickerContainer}>
                        <View style={styles.datePickerHeader}>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                            <Text style={styles.datePickerDoneButton}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={selectedDate}
                          mode="date"
                          display="spinner"
                          onChange={handleDateChange}
                          maximumDate={new Date()}
                          themeVariant="light"
                          style={styles.dateTimePicker}
                        />
                      </View>
                    </TouchableOpacity>
                  </Modal>
                )}
                {showDatePicker && Platform.OS === "android" && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>

              {/* Time selection */}
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Select Time
                </Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    {formatTime(selectedTime)}
                  </Text>
                </TouchableOpacity>
                {/* Time Picker - iOS Modal with backdrop dismissal */}
                {showTimePicker && Platform.OS === "ios" && (
                  <Modal
                    visible={showTimePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowTimePicker(false)}
                  >
                    <TouchableOpacity
                      style={styles.datePickerModalOverlay}
                      activeOpacity={1}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <View style={styles.datePickerContainer}>
                        <View style={styles.datePickerHeader}>
                          <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                            <Text style={styles.datePickerDoneButton}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={selectedTime}
                          mode="time"
                          display="spinner"
                          onChange={handleTimeChange}
                          themeVariant="light"
                          style={styles.dateTimePicker}
                        />
                      </View>
                    </TouchableOpacity>
                  </Modal>
                )}
                {showTimePicker && Platform.OS === "android" && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </View>

              {/* Photo Upload Section */}
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Add Photos ({photos.length + localPhotoUris.length}/3)
                </Text>

                {/* Photo Upload Buttons */}
                <View style={styles.photoButtonsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.photoButton,
                      (uploading || photos.length + localPhotoUris.length >= 3) && styles.photoButtonDisabled,
                    ]}
                    onPress={pickImage}
                    disabled={uploading || photos.length + localPhotoUris.length >= 3}
                  >
                    <Ionicons
                      name="image-outline"
                      size={20}
                      color={uploading || photos.length + localPhotoUris.length >= 3 ? "#999" : "#2A7DE1"}
                    />
                    <Text
                      style={[
                        styles.photoButtonText,
                        (uploading || photos.length + localPhotoUris.length >= 3) && styles.photoButtonTextDisabled,
                      ]}
                    >
                      Choose from Library
                    </Text>
                  </TouchableOpacity>

                  {/* Camera (Take Photo) button removed*/}
                </View>

                {/* Uploading Indicator */}
                {uploading && (
                  <View style={styles.uploadingContainer}>
                    <Text style={styles.uploadingText}>
                      Uploading photo...
                    </Text>
                  </View>
                )}

                {/* Selected Photos Preview - Show both online and offline photos */}
                {(photos.length > 0 || localPhotoUris.length > 0) && (
                  <View style={styles.photosContainer}>
                    <Text style={styles.photosLabel}>
                      Selected Photos: {photos.length + localPhotoUris.length}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <View style={styles.photosList}>
                        {/* Online photos */}
                        {photos.map((photo, index) => (
                          <View key={`online-${index}`} style={styles.photoItem}>
                            <Image
                              source={{ uri: photo }}
                              style={styles.photoPreview}
                            />
                            <TouchableOpacity
                              style={styles.removePhotoButton}
                              onPress={() => removePhoto(index)}
                            >
                              <Ionicons
                                name="close-circle"
                                size={20}
                                color="#DC3545"
                              />
                            </TouchableOpacity>
                          </View>
                        ))}
                        {/* Offline photos (local URIs) */}
                        {localPhotoUris.map((photoUri, index) => (
                          <View key={`offline-${index}`} style={styles.photoItem}>
                            <Image
                              source={{ uri: photoUri }}
                              style={styles.photoPreview}
                            />
                            <TouchableOpacity
                              style={styles.removePhotoButton}
                              onPress={() => {
                                setLocalPhotoUris((prev) => prev.filter((_, i) => i !== index));
                              }}
                            >
                              <Ionicons
                                name="close-circle"
                                size={20}
                                color="#DC3545"
                              />
                            </TouchableOpacity>
                            {/* Offline indicator badge */}
                            <View style={styles.offlineBadge}>
                              <Ionicons name="cloud-offline" size={12} color="white" />
                            </View>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Symptoms input */}
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Symptoms/Details
                </Text>
                {/* Speech-to-text removed */}
                <TextInput
                  style={[
                    styles.textInput,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                  placeholder="e.g: Headache, Fatigue"
                  placeholderTextColor="#999"
                  value={symptoms}
                  onChangeText={setSymptoms}
                  multiline
                />
              </View>

              {/* Severity dropdown */}
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Severity (1-10)
                </Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowSeverityDropdown(true)}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    {severity || "Select severity"}
                  </Text>
                </TouchableOpacity>

                {/* Dropdown modal */}
                <Modal
                  visible={showSeverityDropdown}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setShowSeverityDropdown(false)}
                >
                  <TouchableWithoutFeedback
                    onPress={() => setShowSeverityDropdown(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.dropdownContainer}>
                        <ScrollView
                          style={styles.dropdownScrollView}
                          showsVerticalScrollIndicator={true}
                        >
                          {severityOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.dropdownItem,
                                { backgroundColor: "white" },
                              ]}
                              onPress={() => {
                                setSeverity(option);
                                setShowSeverityDropdown(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownText,
                                  { fontFamily: FONTS.BarlowSemiCondensed },
                                ]}
                              >
                                {option}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                </Modal>
              </View>

              {/* Additional notes */}
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Notes
                </Text>
                {/* Speech-to-text removed */}
                <TextInput
                  style={[
                    styles.textInput,
                    styles.notesInput,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                  placeholder="Additional Details"
                  placeholderTextColor="#999"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Action buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSaveEntry}
                  disabled={uploading}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    {uploading ? "Uploading..." : (mode === 'edit' ? "Update Entry" : "Save Entry")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.successModalOverlay}>
            <View style={styles.successModalContainer}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={64} color="#28A745" />
              </View>
              <Text style={[styles.successTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Entry Logged Successfully!
              </Text>
              <Text style={[styles.successMessage, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Your health entry has been saved.
              </Text>
              <View style={styles.successButtonContainer}>
                <TouchableOpacity
                  style={[styles.successButton, styles.goToLogButton]}
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.push("/(tabs)/tracker/daily-log");
                  }}
                >
                  <Ionicons name="calendar" size={20} color="white" />
                  <Text style={[styles.successButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Go to Log
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.successButton, styles.dismissButton]}
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.back();
                  }}
                >
                  <Text style={[styles.successButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Error Modal */}
        <Modal
          visible={errorModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setErrorModalVisible(false)}
        >
          <View style={styles.errorModalOverlay}>
            <View style={styles.errorModalContainer}>
              <Text
                style={[
                  styles.errorModalMessage,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                {errorModalMessage}
              </Text>
              <TouchableOpacity
                style={styles.errorModalButton}
                onPress={() => setErrorModalVisible(false)}
              >
                <Text
                  style={[
                    styles.errorModalButtonText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Bottom navigation */}
      </CurvedBackground>
      <BottomNavigation />

      {/* Alert Modal */}
      <Modal
        visible={alertModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertModalVisible(false)}
      >
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalContent}>
            <Text style={styles.alertModalTitle}>{alertModalTitle}</Text>
            <Text style={styles.alertModalMessage}>{alertModalMessage}</Text>
            <View style={styles.alertModalButtons}>
              {alertModalButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.alertModalButton,
                    button.variant === "destructive" && styles.alertDestructiveButton,
                    button.variant === "secondary" && styles.alertSecondaryButton,
                  ]}
                  onPress={button.onPress}
                >
                  <Text
                    style={[
                      styles.alertModalButtonText,
                      button.variant === "secondary" && styles.alertSecondaryButtonText,
                    ]}
                  >
                    {button.label}
                  </Text>
                </TouchableOpacity>
              ))}
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
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 140, // Extra padding to ensure buttons are always visible above bottom nav
  },
  contentSection: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1A1A1A",
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  pickerButton: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  pickerText: {
    fontSize: 16,
    color: "#1A1A1A",
  },
  textInput: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    fontSize: 16,
    color: "#1A1A1A",
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  // Photo upload styles
  photoButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A7DE1",
    borderStyle: "dashed",
    gap: 8,
  },
  photoButtonText: {
    fontSize: 14,
    color: "#2A7DE1",
    fontWeight: "600",
  },
  photoButtonDisabled: {
    backgroundColor: "#F8F9FA",
    borderColor: "#E9ECEF",
  },
  photoButtonTextDisabled: {
    color: "#999",
  },
  uploadingContainer: {
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
  },
  uploadingText: {
    fontSize: 14,
    color: "#E65100",
    textAlign: "center",
  },
  photosContainer: {
    marginTop: 12,
  },
  photosLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  photosList: {
    flexDirection: "row",
    gap: 12,
  },
  photoItem: {
    position: "relative",
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  removePhotoButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 10,
  },
  offlineBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    width: "80%",
    maxHeight: "60%",
    overflow: "hidden",
  },
  dropdownScrollView: {
    maxHeight: 300,
  },
  dropdownItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownText: {
    fontSize: 18,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
  },
  button: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 8,
  },
  saveButton: {
    backgroundColor: "#28A745",
  },
  cancelButton: {
    backgroundColor: "#6C757D",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successModalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 32,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  successButtonContainer: {
    flexDirection: "column",
    width: "100%",
    gap: 12,
  },
  successButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    width: "100%",
    gap: 8,
  },
  goToLogButton: {
    backgroundColor: "#2A7DE1",
  },
  dismissButton: {
    backgroundColor: "#6C757D",
  },
  successButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorModalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorModalMessage: {
    fontSize: 16,
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  errorModalButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 30,
    minWidth: 120,
    alignItems: "center",
  },
  errorModalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  // Alert Modal styles
  alertModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  alertModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 12,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  alertModalMessage: {
    fontSize: 16,
    color: "#333",
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  alertModalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  alertModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 100,
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  alertSecondaryButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  alertDestructiveButton: {
    backgroundColor: "#DC3545",
  },
  alertModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  alertSecondaryButtonText: {
    color: COLORS.primary,
  },
  // Date Picker Modal Styles
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  datePickerDoneButton: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  dateTimePicker: {
    backgroundColor: "white",
    height: 200,
  },
});
