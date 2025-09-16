import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function SymptomSeverity() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [severityLevel, setSeverityLevel] = useState(5); // Default to middle value

  const handleContinue = () => {
    console.log("Severity level:", severityLevel);
    // Navigate to next screen with all collected data
    router.push({
      pathname: "/(tabs)/ai-assess/assessment-results",
      params: {
        ...params,
        severity: severityLevel.toString(),
      },
    });
  };

  const renderSeverityLabels = () => {
    return (
      <View style={styles.severityLabels}>
        <Text style={[styles.severityLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          Mild (1)
        </Text>
        <Text style={[styles.severityLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
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
                index + 1 <= severityLevel && styles.scalePointActive
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
                index + 1 === severityLevel && styles.scaleNumberActive
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
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with logo */}
          <CurvedHeader
            title="Symptom Assessment"
            height={120}
            showLogo={true}
          />

          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Symptom Severity
            </Text>
            <Text style={[styles.sectionSubtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Rate your overall discomfort level from 1-10
            </Text>

            {renderSeverityLabels()}
            
            {renderSeverityScale()}

            <View style={styles.severityIndicator}>
              <Text style={[styles.severityValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Level: {severityLevel}
              </Text>
              <Text style={[styles.severityDescription, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                {getSeverityDescription()}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={20} color="#666" />
                <Text style={[styles.backButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.continueButton} 
                onPress={handleContinue}
              >
                <Text style={[styles.continueButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Continue
                </Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
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
    paddingTop: 0,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
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