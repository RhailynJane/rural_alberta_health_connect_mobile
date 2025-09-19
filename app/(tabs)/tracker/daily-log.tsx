import { router } from "expo-router";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function DailyLog() {
  const handleAddLogEntry = () => {
    router.push("/tracker/add-health-entry");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <CurvedHeader title="Health Tracker" height={120} showLogo={true} />

          <View>
            <View style={styles.contentSection}>
              <Text style={[styles.disclaimerTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Daily Log
              </Text>
            </View>

            <View style={styles.contentSection}>
              <View style={styles.entriesContainer}>
                <Text style={[styles.entriesText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  No entries for today
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.addButtonContainer}>
          <TouchableOpacity style={styles.addEntryButton} onPress={handleAddLogEntry}>
            <Text style={[styles.addEntryButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Add Log Entry
            </Text>
          </TouchableOpacity>
        </View>

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
    paddingBottom: 100,
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
  entriesContainer: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -30,
  },
  entriesText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  addButtonContainer: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    backgroundColor: "transparent",
  },
  addEntryButton: {
    backgroundColor: "#28A745",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addEntryButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  disclaimerTitle: {
    fontSize: 20,
    color: "#333",
    textAlign: "center",
  },
});