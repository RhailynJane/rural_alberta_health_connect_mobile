import Ionicons from "@expo/vector-icons/Ionicons";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
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
import { syncManager } from "../../../watermelon/sync/syncManager";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import { COLORS, FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

export default function AddHealthEntry() {
  const database = useDatabase();
  const { isOnline } = useNetworkStatus();
  const currentUser = useQuery(api.users.getCurrentUser, isOnline ? {} : "skip");
  const logManualEntry = useMutation(api.healthEntries.logManualEntry);
  const generateUploadUrl = useMutation(api.healthEntries.generateUploadUrl);
  const storeUploadedPhoto = useMutation(api.healthEntries.storeUploadedPhoto);

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

  // Handle image picker
  const pickImage = async () => {
    try {
      // Check photo limit
      if (photos.length >= 3) {
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

  // Take photo with camera
  const takePhoto = async () => {
    try {
      // Check photo limit
      if (photos.length >= 3) {
        setErrorModalMessage("You can only add up to 3 photos per health entry.");
        setErrorModalVisible(true);
        return;
      }

      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        setErrorModalMessage("Sorry, we need camera permissions to take photos.");
        setErrorModalVisible(true);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const takenPhoto = result.assets[0];
        await uploadImage(takenPhoto.uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      setErrorModalMessage("Failed to take photo. Please try again.");
      setErrorModalVisible(true);
    }
  };

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
      const timestamp = createTimestamp(selectedDate, selectedTime);
      const dateString = formatDate(selectedDate);
      const saveUserId = userId || 'offline_user';

      console.log("Saving entry:", {
        mode: isOnline ? 'online' : 'offline',
        date: dateString,
        timestamp,
        symptoms,
        severity: parseInt(severity),
        notes,
        photos: photos.length,
        localPhotos: localPhotoUris.length,
      });

      if (isOnline && userId) {
        // ONLINE: Save directly to Convex
        await logManualEntry({
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
      } else {
        // OFFLINE: Save to WatermelonDB
        const healthEntriesCollection = database.collections.get('health_entries');
        
        await database.write(async () => {
          await healthEntriesCollection.create((entry: any) => {
            entry.userId = saveUserId;
            entry.date = dateString;
            entry.timestamp = timestamp;
            entry.symptoms = symptoms;
            entry.severity = parseInt(severity);
            entry.notes = notes || '';
            entry.photos = JSON.stringify([...photos, ...localPhotoUris]); // Combine uploaded and local
            entry.type = 'manual';
            entry.synced = false; // Mark for sync when online
            entry.createdBy = currentUser?.firstName || 'User';
          });
        });
        
        console.log("📴 Entry saved offline, will sync when online");
        
        // Add to sync queue
        await syncManager.addToQueue({
          type: 'health_entry',
          data: {
            userId: saveUserId,
            date: dateString,
            timestamp,
            symptoms,
            severity: parseInt(severity),
            notes,
            photos: [...photos, ...localPhotoUris],
            createdBy: currentUser?.firstName || 'User',
          },
        });
      }

      setShowSuccessModal(true);
    } catch (error) {
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
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Fixed Header (not scrollable) */}
        <CurvedHeader
          title="Tracker - Add Entry"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
        />
        <DueReminderBanner topOffset={120} />

        {/* Scrollable content under header */}
        <View style={styles.contentArea}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
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
                  {showTimePicker && (
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
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
                    Add Photos ({photos.length}/3)
                  </Text>

                  {/* Photo Upload Buttons */}
                  <View style={styles.photoButtonsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.photoButton,
                        (uploading || photos.length >= 3) && styles.photoButtonDisabled,
                      ]}
                      onPress={pickImage}
                      disabled={uploading || photos.length >= 3}
                    >
                      <Ionicons
                        name="image-outline"
                        size={20}
                        color={uploading || photos.length >= 3 ? "#999" : "#2A7DE1"}
                      />
                      <Text 
                        style={[
                          styles.photoButtonText,
                          (uploading || photos.length >= 3) && styles.photoButtonTextDisabled,
                        ]}
                      >
                        Choose from Library
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.photoButton,
                        (uploading || photos.length >= 3) && styles.photoButtonDisabled,
                      ]}
                      onPress={takePhoto}
                      disabled={uploading || photos.length >= 3}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={20}
                        color={uploading || photos.length >= 3 ? "#999" : "#2A7DE1"}
                      />
                      <Text 
                        style={[
                          styles.photoButtonText,
                          (uploading || photos.length >= 3) && styles.photoButtonTextDisabled,
                        ]}
                      >
                        Take Photo
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Uploading Indicator */}
                  {uploading && (
                    <View style={styles.uploadingContainer}>
                      <Text style={styles.uploadingText}>
                        Uploading photo...
                      </Text>
                    </View>
                  )}

                  {/* Selected Photos Preview */}
                  {photos.length > 0 && (
                    <View style={styles.photosContainer}>
                      <Text style={styles.photosLabel}>Selected Photos:</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        <View style={styles.photosList}>
                          {photos.map((photo, index) => (
                            <View key={index} style={styles.photoItem}>
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
                      {uploading ? "Uploading..." : "Save Entry"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>

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
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 200,
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
});
