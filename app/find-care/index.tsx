import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { FONTS } from "../constants/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function FindCareEntry() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Background decoration */}
      <View style={styles.backgroundDecor}>
        <View style={[styles.blob, styles.blob1]} />
        <View style={[styles.blob, styles.blob2]} />
      </View>

      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Icon name="arrow-back" size={24} color="#64748B" />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationCircle}>
            <Icon name="local-hospital" size={64} color="#0EA5E9" />
          </View>
        </View>

        {/* Text */}
        <Text style={styles.title}>Find care your way</Text>
        <Text style={styles.subtitle}>
          Connect with healthcare services near you. Browse clinics, check
          availability, and choose what works best.
        </Text>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Icon name="place" size={20} color="#10B981" />
            </View>
            <Text style={styles.featureText}>Find nearby clinics</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Icon name="schedule" size={20} color="#10B981" />
            </View>
            <Text style={styles.featureText}>Check hours & availability</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Icon name="directions" size={20} color="#10B981" />
            </View>
            <Text style={styles.featureText}>Get directions instantly</Text>
          </View>
        </View>
      </View>

      {/* CTAs */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={styles.primaryCta}
          onPress={() => router.push("/find-care/clinics")}
          activeOpacity={0.9}
        >
          <Icon name="search" size={22} color="#FFF" />
          <Text style={styles.primaryCtaText}>View nearby clinics</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryCta}
          onPress={() => router.push("/find-care/clinics?customLocation=true")}
          activeOpacity={0.7}
        >
          <Icon name="edit-location" size={18} color="#64748B" />
          <Text style={styles.secondaryCtaText}>Choose a different location</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backgroundDecor: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
  },
  blob1: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    backgroundColor: "#F0F9FF",
    top: -SCREEN_WIDTH * 0.3,
    right: -SCREEN_WIDTH * 0.2,
  },
  blob2: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    backgroundColor: "#ECFDF5",
    bottom: SCREEN_WIDTH * 0.1,
    left: -SCREEN_WIDTH * 0.3,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  illustrationContainer: {
    marginBottom: 32,
  },
  illustrationCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#E0F2FE",
  },
  title: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 32,
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 17,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 40,
  },
  features: {
    gap: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: "#334155",
  },
  ctaContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  primaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#0EA5E9",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryCtaText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 18,
    color: "#FFFFFF",
  },
  secondaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  secondaryCtaText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 15,
    color: "#64748B",
  },
});
