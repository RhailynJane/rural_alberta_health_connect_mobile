import { useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View
} from "react-native";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";

export default function AddHealthEntry() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSeverityDropdown, setShowSeverityDropdown] = useState(false);

  const severityOptions = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

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
