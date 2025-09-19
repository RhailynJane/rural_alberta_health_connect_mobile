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

export default function Tracker() {
  const [activeTab, setActiveTab] = useState<"daily" | "history">("daily");

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
    paddingBottom: 100, // Extra space for the fixed button
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
});
