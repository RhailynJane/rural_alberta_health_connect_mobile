import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
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
  
  // State for form fields
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");

  // State for picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSeverityDropdown, setShowSeverityDropdown] = useState(false);

  // Severity options (1-10)
  const severityOptions = Array.from({ length: 10 }, (_, i) =>
    (i + 1).toString()
  );

  // Format date as YYYY-MM-DD in local timezone
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
      });

      await logManualEntry({
        userId: currentUser._id,
        date: dateString,
        timestamp,
        symptoms,
        severity: parseInt(severity),
        notes,
        createdBy: currentUser.firstName || "User",
        // type: "manual_entry", // Remove this if not in schema
      });

      console.log("✅ Manual entry saved successfully");
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
            <CurvedHeader title="Health Tracker" height={120} showLogo={true} />

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
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Save Entry
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