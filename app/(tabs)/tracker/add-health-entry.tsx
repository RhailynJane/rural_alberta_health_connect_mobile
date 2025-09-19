import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useState } from "react";
import {
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
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function AddHealthEntry() {
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
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Format time as HH:MM AM/PM in 12-hour format
  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12

    return `${hours}:${minutes} ${ampm}`;
  };

  // Handle date picker change
  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false); // Auto-close on Android
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  // Handle time picker change
  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false); // Auto-close on Android
    }
    if (date) {
      setSelectedTime(date);
    }
  };

  // Save health entry and navigate back
  const handleSaveEntry = () => {
    console.log("Saving entry:", {
      date: formatDate(selectedDate),
      time: formatTime(selectedTime),
      symptoms,
      severity,
      notes,
    });
    router.back(); // Return to previous screen
  };

  // Cancel and navigate back
  const handleCancel = () => {
    router.back(); // Return without saving
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
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
                  maximumDate={new Date()} // Can't select future dates
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
                multiline // Allow multiple lines
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
                      {severityOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={styles.dropdownItem}
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
                numberOfLines={4} // Set initial height
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
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 80, // Space for bottom nav
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
  inputGroup: {
    marginBottom: 24, // Space between form fields
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
    minHeight: 100, // Minimum height for notes
    textAlignVertical: "top", // Start text from top
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    width: "80%",
    maxHeight: 300, // Limit dropdown height
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF", // Separator between items
  },
  dropdownText: {
    fontSize: 16,
    color: "#1A1A1A",
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32, // Space above buttons
  },
  button: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 8, // Space between buttons
  },
  saveButton: {
    backgroundColor: "#28A745", // Green for save
  },
  cancelButton: {
    backgroundColor: "#6C757D", // Gray for cancel
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
