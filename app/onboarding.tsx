import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CurvedBackground from "../app/components/curvedBackground";
import CurvedHeader from "../app/components/curvedHeader";

export default function Onboarding() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
          <CurvedHeader
            title="Your trusted healthcare companion for rural Alberta communities"
            height={150}
          />

          <View style={styles.contentSection}>
            {/* Feature 1: AI-Powered Triage */}
            <View style={styles.featureContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="medical" size={32} color="#2A7DE1" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.featureTitle}>AI-Powered Triage</Text>
                <Text style={styles.featureDescription}>
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
                <Text style={styles.featureTitle}>Rural-Focused</Text>
                <Text style={styles.featureDescription}>
                  Designed specifically for Alberta&#39;s remote communities
                </Text>
              </View>
            </View>
          </View>


        </ScrollView>
      </CurvedBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
});
