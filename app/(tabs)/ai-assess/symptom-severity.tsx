import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function SymptomSeverity() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [severityLevel, setSeverityLevel] = useState(5);

  const handleContinue = () => {
    console.log("Severity level selected:", severityLevel);

    router.push({
      pathname: "/(tabs)/ai-assess/symptom-duration",
      params: {
        ...params,
        severity: severityLevel.toString(),
      },
    });
  };

  const renderSeverityLabels = () => {
    return (
      <View style={styles.severityLabels}>
        <Text
          style={[
            styles.severityLabel,
            { fontFamily: FONTS.BarlowSemiCondensed },
          ]}
        >
          Mild (1)
        </Text>
        <Text
          style={[
            styles.severityLabel,
            { fontFamily: FONTS.BarlowSemiCondensed },
          ]}
        >
          Severe (10)
        </Text>
      </View>
    );
  };

  const renderSeverityScale = () => {
    return (
      <View style={styles.scaleContainer}>
        <View style={styles.scale}>
          {[...Array(10)].map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.scalePoint,
                index + 1 <= severityLevel && styles.scalePointActive,
              ]}
              onPress={() => setSeverityLevel(index + 1)}
            />
          ))}
        </View>
        <View style={styles.scaleNumbers}>
          {[...Array(10)].map((_, index) => (
            <Text
              key={index}
              style={[
                styles.scaleNumber,
                { fontFamily: FONTS.BarlowSemiCondensed },
                index + 1 === severityLevel && styles.scaleNumberActive,
              ]}
            >
              {index + 1}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  const getSeverityDescription = () => {
    if (severityLevel <= 3) return "Mild";
    if (severityLevel <= 7) return "Moderate";
    return "Severe";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Fixed Header */}
        <CurvedHeader
          title="Symptom Assessment"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
        />

        {/* Content Area - Takes all available space minus header and bottom nav */}
        <View style={styles.contentArea}>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentSection}>
              <Text
                style={[
                  styles.sectionTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Symptom Severity
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Rate your overall discomfort level from 1-10
              </Text>

              {renderSeverityLabels()}

              {renderSeverityScale()}

              <View style={styles.severityIndicator}>
                <Text
                  style={[
                    styles.severityValue,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Level: {severityLevel}
                </Text>
                <Text
                  style={[
                    styles.severityDescription,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  {getSeverityDescription()}
                </Text>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <Ionicons name="arrow-back" size={20} color="#666" />
                  <Text
                    style={[
                      styles.backButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={handleContinue}
                >
                  <Text
                    style={[
                      styles.continueButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Continue
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Bottom Navigation */}
      </CurvedBackground>
      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  contentSection: {
    padding: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  severityLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  severityLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  scaleContainer: {
    marginBottom: 24,
  },
  scale: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  scalePoint: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    borderWidth: 2,
    borderColor: "#BDBDBD",
  },
  scalePointActive: {
    backgroundColor: "#2A7DE1",
    borderColor: "#1A5CB0",
  },
  scaleNumbers: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scaleNumber: {
    width: 24,
    textAlign: "center",
    fontSize: 12,
    color: "#666",
  },
  scaleNumberActive: {
    color: "#2A7DE1",
    fontWeight: "bold",
  },
  severityIndicator: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    alignItems: "center",
    marginBottom: 32,
  },
  severityValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  severityDescription: {
    fontSize: 16,
    color: "#2A7DE1",
    fontWeight: "600",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F0",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    flex: 1,
    marginRight: 12,
  },
  backButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    flex: 1,
    marginLeft: 12,
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
});
