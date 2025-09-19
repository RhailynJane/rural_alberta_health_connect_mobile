import { router } from "@/.expo/types/router";
import { useState } from "react";
import {
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View
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
  const severityOptions = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Format time as HH:MM
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle date picker change
  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false); // Auto-close on Android
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  // Handle time picker change
  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
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
      notes
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
        <View style={styles.mainContent}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <CurvedHeader title="Health Tracker" height={120} showLogo={true} />
          </ScrollView>
        </View>

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
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, 
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
});
