import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
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

export default function AssessmentResults() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [symptomContext, setSymptomContext] = useState("");

  // Extract parameters from previous screens
  const category = params.category || "General Symptoms";
  const description = params.description || "";
  const severity = params.severity || "5";
  const duration = params.duration || "recent";

  useEffect(() => {
    // Generate contextual information based on the symptoms
    generateSymptomContext();
  }, []);

  const generateSymptomContext = () => {
    let context = "";
    
    // Add context based on category
    if (category === "Cold Weather Injuries") {
      context = "Based on your cold weather symptoms, it appears you may have been exposed to freezing temperatures. This can cause tissue damage, especially in extremities like fingers, toes, nose, and ears.";
    } else if (category === "Burns & Heat Injuries") {
      context = "Your heat-related symptoms suggest exposure to high temperatures, flames, or chemicals. Burns can vary in severity from superficial redness to deep tissue damage.";
    } else if (category === "Trauma & Injuries") {
      context = "The traumatic injury symptoms you described indicate possible physical damage to body tissues. This can range from minor cuts to more serious internal injuries.";
    } else {
      context = "The symptoms you've described require medical attention to properly diagnose and treat the underlying condition.";
    }
    
    // Add context based on severity
    const severityNum = parseInt(Array.isArray(severity) ? severity[0] : severity);
    if (severityNum >= 8) {
      context += " The high severity level you reported suggests this may be a serious condition that needs prompt medical evaluation.";
    } else if (severityNum >= 5) {
      context += " The moderate severity level indicates this condition should be assessed by a healthcare professional.";
    }
    
    // Add context based on duration
    if (duration === "today" || duration === "yesterday") {
      context += " Since your symptoms began recently, early intervention may help prevent complications.";
    } else if (duration === "2_weeks_plus" || duration === "ongoing") {
      context += " The prolonged nature of your symptoms suggests this may be a chronic or recurring issue that needs proper diagnosis.";
    }
    
    setSymptomContext(context);
  };

  const handleCall911 = () => {
    Linking.openURL('tel:911');
  };

  const handleCall811 = () => {
    Linking.openURL('tel:811');
  };

  const handleNewAssessment = () => {
    router.replace("/(tabs)/ai-assess");
  };

  const handleReturnHome = () => {
    router.replace("/(tabs)/dashboard");
  };

  const ResultCard = ({ title, children, icon }: { title: string; children: React.ReactNode; icon: string }) => (
    <View style={styles.resultCard}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon as any} size={20} color="#2A7DE1" />
        <Text style={[styles.cardTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );

  const EmergencyItem = ({ text }: { text: string }) => (
    <View style={styles.emergencyItem}>
      <Ionicons name="warning" size={16} color="#DC3545" />
      <Text style={[styles.emergencyText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
        {text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with logo */}
          <CurvedHeader
            title="Assessment Results"
            height={120}
            showLogo={true}
          />

          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Health Assessment
            </Text>

            {/* Symptom Context */}
            {symptomContext ? (
              <View style={styles.contextContainer}>
                <Text style={[styles.contextText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {symptomContext}
                </Text>
              </View>
            ) : null}

            <ResultCard title="AI Health Assessment" icon="medical">
              <Text style={[styles.cardText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Your symptoms suggest you should contact a healthcare provider today or visit a clinic.
              </Text>
              
              <Text style={[styles.subheading, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Recommended Actions:
              </Text>
              <View style={styles.recommendationList}>
                <Text style={[styles.listItem, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  • Rest and stay hydrated
                </Text>
                <Text style={[styles.listItem, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  • Monitor symptoms for changes
                </Text>
                <Text style={[styles.listItem, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  • Keep warm and avoid further exposure if weather-related
                </Text>
              </View>
            </ResultCard>

            <ResultCard title="Rural Alberta Considerations" icon="location">
              <View style={styles.recommendationList}>
                <Text style={[styles.listItem, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  • Nearest hospital may be far - don&apos;t delay if symptoms worsen
                </Text>
                <Text style={[styles.listItem, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  • Keep emergency supplies and communication devices ready
                </Text>
                <Text style={[styles.listItem, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  • Weather conditions may affect travel to medical facilities
                </Text>
                <TouchableOpacity style={styles.healthLinkButton} onPress={handleCall811}>
                  <Ionicons name="call" size={16} color="#2A7DE1" />
                  <Text style={[styles.healthLinkText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Health Link Alberta (811) available 24/7 for guidance
                  </Text>
                </TouchableOpacity>
              </View>
            </ResultCard>

            <ResultCard title="Call 911 immediately if:" icon="alert-circle">
              <View style={styles.emergencyList}>
                <EmergencyItem text="Severe difficulty breathing" />
                <EmergencyItem text="Chest pain" />
                <EmergencyItem text="Loss of consciousness" />
                <EmergencyItem text="Severe bleeding" />
                <EmergencyItem text="Signs of stroke" />
                <EmergencyItem text="Any life-threatening symptoms" />
              </View>
              <TouchableOpacity style={styles.emergencyButton} onPress={handleCall911}>
                <Ionicons name="call" size={20} color="white" />
                <Text style={[styles.emergencyButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Call 911 Now
                </Text>
              </TouchableOpacity>
            </ResultCard>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.newAssessmentButton}
                onPress={handleNewAssessment}
              >
                <Ionicons name="document-text" size={20} color="white" />
                <Text style={[styles.newAssessmentText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Start New Assessment
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.homeButton}
                onPress={handleReturnHome}
              >
                <Ionicons name="home" size={20} color="#2A7DE1" />
                <Text style={[styles.homeButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Return to Home
                </Text>
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
    marginBottom: 16,
    textAlign: "center",
  },
  contextContainer: {
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2A7DE1",
    marginBottom: 20,
  },
  contextText: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 20,
  },
  resultCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginLeft: 8,
  },
  cardText: {
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 12,
    lineHeight: 20,
  },
  subheading: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2A7DE1",
    marginBottom: 8,
  },
  recommendationList: {
    marginLeft: 8,
  },
  listItem: {
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 6,
    lineHeight: 20,
  },
  healthLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    padding: 8,
    backgroundColor: "#F0F8FF",
    borderRadius: 6,
  },
  healthLinkText: {
    fontSize: 14,
    color: "#2A7DE1",
    marginLeft: 8,
    fontWeight: "500",
  },
  emergencyList: {
    marginBottom: 16,
  },
  emergencyItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: "#DC3545",
    fontWeight: "500",
    marginLeft: 8,
  },
  emergencyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC3545",
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  emergencyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  actionButtons: {
    marginTop: 16,
  },
  newAssessmentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A7DE1",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  newAssessmentText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A7DE1",
  },
  homeButtonText: {
    color: "#2A7DE1",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});