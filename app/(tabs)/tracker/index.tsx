import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function Tracker() {
   // State to track active tab
  const [activeTab, setActiveTab] = useState<'daily' | 'history'>('daily');
  
  // Handle emergency call button press
  const handleEmergencyCall = (): void => {
    Alert.alert(
      "Emergency Call",
      "For life-threatening emergencies, call 911 immediately.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Call 911",
          onPress: () => {
            console.log("Calling 911...");
          },
        },
      ]
    );
  };

  // Handle Health Link call button press
  const callHealthLink = (): void => {
    Alert.alert("Health Link Alberta", "Call 811 for urgent health concerns?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Call 811",
        onPress: () => {
          console.log("Calling Health Link Alberta at 811...");
        },
      },
    ]);
  };

  // Render content based on active tab
const renderTabContent = () => {
  if (activeTab === 'daily') {
    return (
      <View style={styles.entriesContainer}>
        <Text style={[styles.entriesText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          No entries for today
        </Text>
      </View>
    );
  } else {
    return (
      <View style={styles.entriesContainer}>
        <Text style={[styles.entriesText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          No historical entries found. Your past health logs will appear here once you start tracking your symptoms and health metrics over time.
        </Text>
      </View>
    );
  }
};


  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <CurvedHeader title="Health Tracker" height={120} showLogo={true} />

          <View style={styles.contentSection}>
            {/* Medical Disclaimer */}
            <View style={styles.disclaimerContainer}>
              <Text
                style={[
                  styles.disclaimerTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Medical Disclaimer
              </Text>
              <Text
                style={[
                  styles.disclaimerText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                This tracker is for personal monitoring only.
              </Text>
              <Text
                style={[
                  styles.disclaimerText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Seek immediate medical attention for severe symptoms or
                emergencies.
              </Text>
            </View>

            {/* Daily Log/History tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity 
                style={activeTab === 'daily' ? styles.activeTab : styles.inactiveTab}
                onPress={() => setActiveTab('daily')}
              >
                <Text style={[
                  styles.tabText, 
                  { fontFamily: FONTS.BarlowSemiCondensed },
                  activeTab === 'daily' ? styles.activeTabText : styles.inactiveTabText
                ]}>
                  Daily Log
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={activeTab === 'history' ? styles.activeTab : styles.inactiveTab}
                onPress={() => setActiveTab('history')}
              >
                <Text style={[
                  styles.tabText, 
                  { fontFamily: FONTS.BarlowSemiCondensed },
                  activeTab === 'history' ? styles.activeTabText : styles.inactiveTabText
                ]}>
                  History
                </Text>
              </TouchableOpacity>
            </View>

             {/* Tab content */}
            {renderTabContent()}

            {/* Add new log entry button */}
            <TouchableOpacity style={styles.addEntryButton}>
              <Text style={[styles.addEntryButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Add Log Entry
              </Text>
            </TouchableOpacity>
            
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
    paddingBottom: 60,
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
  disclaimerContainer: {
    backgroundColor: "#FFF3CD",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFEAA7",
    marginBottom: 15,
    marginTop: -30,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#856404",
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: "#856404",
    marginBottom: 4,
    lineHeight: 20,
  },
   tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    overflow: 'hidden',
    marginBottom: 5,
  },
  activeTab: {
    flex: 1,
    padding: 16,
    backgroundColor: "#2A7DE1",
    alignItems: "center",
  },
  inactiveTab: {
    flex: 1,
    padding: 16,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
  },
  activeTabText: {
    color: "white",
  },
  inactiveTabText: {
    color: "#666",
  },
 entriesContainer: {
    backgroundColor: "#F8F9FA",
    padding: 16, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: 24,
    minHeight: 100, 
  },
  entriesText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24, 
  },
  addEntryButton: {
    backgroundColor: "#28A745",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 32,
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
});
