import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";

export default function LocationServices() {

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground style={{ flex: 1 }}>
        <CurvedHeader
          title="Location Services"
          backgroundColor="transparent"
          textColor="#1A1A1A"
          showLogo
          showNotificationBell
        />
        <View style={[styles.container, { paddingBottom: 130 }]}>
          <View style={styles.contentCard}>
            <Text style={[styles.icon, { fontFamily: FONTS.BarlowSemiCondensed }]}>🚧</Text>
            <Text style={[styles.title, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Location Services
            </Text>
            <Text style={[styles.message, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              This feature is currently under development.
            </Text>
            <Text style={[styles.submessage, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              We&apos;re working hard to bring you location-based healthcare services soon!
            </Text>
          </View>
        </View>
      </CurvedBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  contentCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    maxWidth: 400,
    width: "100%",
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  submessage: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    lineHeight: 24,
  },
});
