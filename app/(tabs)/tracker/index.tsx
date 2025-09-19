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
    marginBottom: 24,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    overflow: 'hidden',
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
});
