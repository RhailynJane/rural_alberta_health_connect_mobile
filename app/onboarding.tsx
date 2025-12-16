import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS } from "../app/constants/constants";

export default function Onboarding() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.contentSection}>
          <Text style={[styles.mainTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
            Your trusted healthcare companion for rural Alberta communities
          </Text>
            {/* Feature 1: AI-Powered Triage */}
            <View style={styles.featureContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="medical" size={32} color="#2A7DE1" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.featureTitle, {fontFamily: FONTS.BarlowSemiCondensed}]}>
                  AI-Powered Triage
                </Text>
                <Text style={[styles.featureDescription, {fontFamily: FONTS.BarlowSemiCondensed}]}>
                  Get instant guidance for your health concerns
                </Text>
              </View>
            </View>

            {/* Feature 2: Rural-Focused */}
            <View style={styles.featureContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="location" size={32} color="#2A7DE1" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.featureTitle, {fontFamily: FONTS.BarlowSemiCondensed}]}>
                  Rural-Focused
                </Text>
                <Text style={[styles.featureDescription, {fontFamily: FONTS.BarlowSemiCondensed}]}>
                  Designed specifically for Alberta&#39;s remote communities
                </Text>
              </View>
            </View>

            {/* Feature 3: Secure & Private */}
            <View style={styles.featureContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed" size={32} color="#2A7DE1" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.featureTitle, {fontFamily: FONTS.BarlowSemiCondensed}]}>
                  Secure & Private
                </Text>
                <Text style={[styles.featureDescription, {fontFamily: FONTS.BarlowSemiCondensed}]}>
                  Your health data is protected and confidential
                </Text>
              </View>
            </View>

            {/* Get Started Button */}
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={() => {
                console.log("🔘 Get Started button pressed!");
                router.push("/auth/signin");
                console.log("📤 router.push('/auth/signin') called");
              }}
            >
              <Text style={[styles.getStartedText, {fontFamily: FONTS.BarlowSemiCondensed}]}>
                Get Started
              </Text>
            </TouchableOpacity>

            {/* Disclaimer */}
            <Text style={[styles.disclaimer, {fontFamily: FONTS.BarlowSemiCondensed}]}>
              By continuing, you acknowledge that this app provides health
              information only and does not replace professional medical advice,
              diagnosis, or treatment.
            </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 36,
    paddingHorizontal: 16,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
  featureContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E8F2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  getStartedButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 90,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
  },
  getStartedText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disclaimer: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    lineHeight: 16,
  },
});