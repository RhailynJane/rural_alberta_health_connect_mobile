import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function VisionTestStart() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground style={{ flex: 1 }}>
        <CurvedHeader
          title="Vision Test"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
        />
        <View style={styles.contentArea}>
          <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.contentSection}>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="eye" size={24} color="#2A7DE1" />
                  <View style={styles.featureTextContainer}>
                    <Text style={[styles.featureTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>Real-time Object Detection</Text>
                    <Text style={[styles.featureDescription, { fontFamily: FONTS.BarlowSemiCondensed }]}>Uses TensorFlow Lite COCO-SSD model for instant object recognition</Text>
                  </View>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="flash" size={24} color="#2A7DE1" />
                  <View style={styles.featureTextContainer}>
                    <Text style={[styles.featureTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>Local AI Medical Assessment</Text>
                    <Text style={[styles.featureDescription, { fontFamily: FONTS.BarlowSemiCondensed }]}>Powered by Llama 3.2 3B running entirely on your device</Text>
                  </View>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="lock-closed" size={24} color="#2A7DE1" />
                  <View style={styles.featureTextContainer}>
                    <Text style={[styles.featureTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>Privacy First</Text>
                    <Text style={[styles.featureDescription, { fontFamily: FONTS.BarlowSemiCondensed }]}>All processing happens on your device - no data sent to cloud</Text>
                  </View>
                </View>
              </View>

              <View style={styles.disclaimerBox}>
                <Ionicons name="information-circle" size={20} color="#FF6B35" />
                <Text style={[styles.disclaimerBoxText, { fontFamily: FONTS.BarlowSemiCondensed }]}>Testing Only - This feature is for workflow demonstration and not intended for actual medical diagnosis</Text>
              </View>

              <Link href="/(tabs)/vision-test/camera" asChild>
                <TouchableOpacity style={styles.startButton} activeOpacity={0.7}>
                  <Ionicons name="camera" size={24} color="white" />
                  <Text style={[styles.startButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>Start Detection</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </ScrollView>
        </View>
      </CurvedBackground>
      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  contentContainer: { flexGrow: 1, paddingBottom: 80 },
  contentArea: { flex: 1 },
  contentSection: { padding: 24, paddingTop: 20 },
  featuresList: { gap: 20, marginBottom: 24 },
  featureItem: {
    flexDirection: "row",
    gap: 16,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featureTextContainer: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: "600", color: "#1A1A1A", marginBottom: 4 },
  featureDescription: { fontSize: 14, color: "#666", lineHeight: 20 },
  disclaimerBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFF3E0",
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  disclaimerBoxText: { flex: 1, fontSize: 14, color: "#8B4513", lineHeight: 20 },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#2A7DE1",
    paddingVertical: 18,
    borderRadius: 12,
    shadowColor: "#2A7DE1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: { color: "white", fontSize: 18, fontWeight: "600" },
});
