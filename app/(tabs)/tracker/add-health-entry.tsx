import { router } from "@/.expo/types/router";
import { FONTS } from "@/app/constants/constants";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
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

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // Format time as HH:MM
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
        {/* Main content area */}
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <CurvedHeader title="Health Tracker" height={120} showLogo={true} />

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
          </View>
        </ScrollView>
        {/* Bottom navigation component */}
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
});
