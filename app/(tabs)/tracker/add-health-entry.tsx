import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { api } from "../../../convex/_generated/api";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function AddHealthEntry() {
  const currentUser = useQuery(api.users.getCurrentUser);
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
  const [uploading, setUploading] = useState(false);

  // State for picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSeverityDropdown, setShowSeverityDropdown] = useState(false);

  // Severity options (1-10)
  const severityOptions = Array.from({ length: 10 }, (_, i) =>
    (i + 1).toString()
  );

  // Format date as YYYY-MM-DD in UTC to match the query
  const formatDate = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
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
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions to upload photos.');
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
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera permissions to take photos.');
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
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Upload image to Convex storage
  const uploadImage = async (imageUri: string) => {
    if (uploading) return;
    
    setUploading(true);
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Convert image to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Upload to Convex
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type },
        body: blob,
      });
      
      if (!result.ok) {
        throw new Error('Upload failed');
      }
      
      const { storageId } = await result.json();
      
      // Store the photo reference
      const photoUrl = await storeUploadedPhoto({ storageId });
      
      // Add to local state
      setPhotos(prev => [...prev, photoUrl]);
      
      console.log('✅ Photo uploaded successfully:', photoUrl);
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Remove photo from list
  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
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
    const [timeStr, modifier] = formatTime(time).split(' ');
    let [hours, minutes] = timeStr.split(':');
    
    if (modifier === 'PM' && hours !== '12') {
      hours = (parseInt(hours) + 12).toString();
    }
    if (modifier === 'AM' && hours === '12') {
      hours = '00';
    }
    
    combinedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return combinedDate.getTime();
  };

  // Save health entry and navigate back
  const handleSaveEntry = async () => {
    if (!currentUser?._id) {
      Alert.alert("Error", "You must be logged in to save entries.");
      return;
    }

    if (!symptoms.trim() || !severity) {
      Alert.alert("Missing Information", "Please fill in symptoms and severity.");
      return;
    }

    try {
      const timestamp = createTimestamp(selectedDate, selectedTime);
      const dateString = formatDate(selectedDate);

      console.log("Saving entry:", {
        date: dateString,
        timestamp,
        symptoms,
        severity: parseInt(severity),
        notes,
        photos: photos.length,
      });

      await logManualEntry({
        userId: currentUser._id,
        date: dateString,
        timestamp,
        symptoms,
        severity: parseInt(severity),
        notes,
        photos: photos, 
        createdBy: currentUser.firstName || "User",
      });

      console.log("✅ Manual entry saved successfully with photos");
      router.back();
    } catch (error) {
      console.error("❌ Failed to save manual entry:", error);
      Alert.alert("Error", "Failed to save entry. Please try again.");
    }
  };

  // Cancel and navigate back
  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with title */}
            <CurvedHeader title="Health Tracker" height={150} showLogo={true} />

            <View>
              <Text
                style={[
                  styles.headerText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Add a new health entry
              </Text>
            </View>

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
                  Add Photos ({photos.length}/5)
                </Text>
                
                {/* Photo Upload Buttons */}
                <View style={styles.photoButtonsContainer}>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={pickImage}
                    disabled={uploading || photos.length >= 5}
                  >
                    <Ionicons name="image-outline" size={20} color="#2A7DE1" />
                    <Text style={styles.photoButtonText}>Choose from Library</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={takePhoto}
                    disabled={uploading || photos.length >= 5}
                  >
                    <Ionicons name="camera-outline" size={20} color="#2A7DE1" />
                    <Text style={styles.photoButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>

                {/* Uploading Indicator */}
                {uploading && (
                  <View style={styles.uploadingContainer}>
                    <Text style={styles.uploadingText}>Uploading photo...</Text>
                  </View>
                )}

                {/* Selected Photos Preview */}
                {photos.length > 0 && (
                  <View style={styles.photosContainer}>
                    <Text style={styles.photosLabel}>Selected Photos:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.photosList}>
                        {photos.map((photo, index) => (
                          <View key={index} style={styles.photoItem}>
                            <Image source={{ uri: photo }} style={styles.photoPreview} />
                            <TouchableOpacity
                              style={styles.removePhotoButton}
                              onPress={() => removePhoto(index)}
                            >
                              <Ionicons name="close-circle" size={20} color="#DC3545" />
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

        {/* Bottom navigation */}
        <BottomNavigation />
      </CurvedBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '80%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  dropdownScrollView: {
    maxHeight: 300,
  },
  dropdownItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownText: {
    fontSize: 18,
    color: "#1A1A1A",
    fontWeight: '500',
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
});