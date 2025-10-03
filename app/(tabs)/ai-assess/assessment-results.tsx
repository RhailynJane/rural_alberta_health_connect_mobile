import Ionicons from "@expo/vector-icons/Ionicons";
import { useAction } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../../convex/_generated/api";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function AssessmentResults() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [symptomContext, setSymptomContext] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [assessmentError, setAssessmentError] = useState(false);
  const [actualSeverity, setActualSeverity] = useState(5);

  useEffect(() => {
    console.log("📋 ALL RECEIVED PARAMS:", {
      description: params.description,
      severity: params.severity,
      duration: params.duration,
      category: params.category,
      hasAiContext: !!params.aiContext,
    });

    // Extract severity with proper debugging
    const rawSeverity = params.severity;
    console.log("🔍 Raw severity value:", rawSeverity);

    const severity = parseInt(
      Array.isArray(rawSeverity) ? rawSeverity[0] : rawSeverity || "5"
    );

    console.log("✅ Parsed severity:", severity);
    setActualSeverity(severity);

    if (params.aiContext) {
      const parsedContext = JSON.parse(params.aiContext as string);
      console.log("📦 Parsed AI Context:", parsedContext);
    }
  }, []);

  const aiContext = params.aiContext
    ? JSON.parse(params.aiContext as string)
    : null;

  const generateContext = useAction(api.aiAssessment.generateContextWithGemini);

  useEffect(() => {
    const fetchAIAssessment = async () => {
      try {
        setIsLoading(true);
        setAssessmentError(false);

        // Extract parameters with proper fallbacks
        const description = Array.isArray(params.description)
          ? params.description[0]
          : params.description || "";

        const severity = parseInt(
          Array.isArray(params.severity)
            ? params.severity[0]
            : params.severity || "5"
        );

        const duration = Array.isArray(params.duration)
          ? params.duration[0]
          : params.duration || "";

        const category =
          aiContext?.category ||
          (Array.isArray(params.category)
            ? params.category[0]
            : params.category) ||
          "General Symptoms";

        console.log("🚀 Calling Gemini with:", {
          description: description.substring(0, 50),
          severity,
          duration,
          category,
          symptomsCount: aiContext?.symptoms?.length || 0,
        });

        const res = await generateContext({
          description,
          severity,
          duration,
          environmentalFactors: aiContext?.environmentalFactors || [],
          category,
          symptoms: aiContext?.symptoms || [],
          images: aiContext?.uploadedPhotos || [],
        });

        setSymptomContext(res.context);
      } catch (error) {
        console.error("❌ AI assessment error:", error);
        setAssessmentError(true);

        // Use the actual severity for fallback
        const severity = parseInt(
          Array.isArray(params.severity)
            ? params.severity[0]
            : params.severity || "5"
        );

        const category = aiContext?.category || "General Symptoms";
        const duration = Array.isArray(params.duration)
          ? params.duration[0]
          : params.duration || "";

        const fallback = getDetailedFallbackAssessment(
          category,
          severity,
          duration,
          aiContext?.symptoms || []
        );
        setSymptomContext(fallback.context);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAIAssessment();
  }, []);

  const getDurationDisplay = (duration: string): string => {
    const durationMap: Record<string, string> = {
      today: "Started today",
      yesterday: "Started yesterday",
      "2-3_days": "2-3 days ago",
      "1_week": "1 week ago",
      "2_weeks_plus": "2+ weeks ago",
      ongoing: "Ongoing condition",
    };
    return durationMap[duration] || duration || "Not specified";
  };

  const getDetailedFallbackAssessment = (
    category: string,
    severity: number,
    duration: string,
    symptoms: string[]
  ): { context: string } => {
    const mainSymptoms =
      symptoms.length > 0
        ? symptoms.slice(0, 3).join(", ")
        : "the symptoms you described";

    return {
      context: `I apologize, but I'm unable to provide a detailed assessment at this time. Based on your reported symptoms (${mainSymptoms}) with severity ${severity}/10:

${severity >= 7 ? "⚠️ URGENT: Your severity level indicates this requires prompt medical attention. Contact Health Link Alberta at 811 immediately for professional guidance, or proceed to the nearest emergency department if symptoms are worsening." : "Please contact Health Link Alberta at 811 for a proper medical assessment. They can provide personalized guidance based on your specific situation."}

For immediate medical emergencies (difficulty breathing, chest pain, severe bleeding, loss of consciousness), always call 911.`,
    };
  };

  const handleCall911 = () => Linking.openURL("tel:911");
  const handleCall811 = () => Linking.openURL("tel:811");
  const handleNewAssessment = () => router.replace("/(tabs)/ai-assess");
  const handleReturnHome = () => router.replace("/(tabs)/dashboard");

  const getUrgencyColor = (severity: number) => {
    if (severity >= 9) return "#DC3545";
    if (severity >= 7) return "#FF6B35";
    if (severity >= 4) return "#FFC107";
    return "#28A745";
  };

  const getUrgencyText = (severity: number) => {
    if (severity >= 9) return "Critical Emergency";
    if (severity >= 7) return "Severe - Urgent Care";
    if (severity >= 4) return "Moderate - Prompt Care";
    return "Mild - Self Care";
  };

  const getUrgencyIcon = (severity: number) => {
    if (severity >= 9) return "alert-circle";
    if (severity >= 7) return "warning";
    if (severity >= 4) return "information-circle";
    return "checkmark-circle";
  };

  const ResultCard = ({
    title,
    children,
    icon,
  }: {
    title: string;
    children: React.ReactNode;
    icon: string;
  }) => (
    <View style={styles.resultCard}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon as any} size={20} color="#2A7DE1" />
        <Text
          style={[styles.cardTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );

  const EmergencyItem = ({ text }: { text: string }) => (
    <View style={styles.emergencyItem}>
      <Ionicons name="warning" size={16} color="#DC3545" />
      <Text
        style={[
          styles.emergencyText,
          { fontFamily: FONTS.BarlowSemiCondensed },
        ]}
      >
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
          <CurvedHeader
            title="Assessment Results"
            height={120}
            showLogo={true}
          />

          <View style={styles.contentSection}>
            <Text
              style={[
                styles.sectionTitle,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              AI Health Assessment
            </Text>

            <View style={styles.urgencyContainer}>
              <View
                style={[
                  styles.urgencyIndicator,
                  { backgroundColor: getUrgencyColor(actualSeverity) },
                ]}
              >
                <Ionicons
                  name={getUrgencyIcon(actualSeverity) as any}
                  size={24}
                  color="white"
                />
                <Text style={styles.urgencyText}>
                  {getUrgencyText(actualSeverity)}
                </Text>
                <Text style={styles.severityText}>
                  Severity Level: {actualSeverity}/10
                </Text>
              </View>
            </View>

            <ResultCard title="Medical Triage Assessment" icon="medical">
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2A7DE1" />
                  <Text
                    style={[
                      styles.loadingText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Analyzing your symptoms with AI assessment...
                  </Text>
                </View>
              ) : (
                <>
                  <Text
                    style={[
                      styles.cardText,
                      { fontFamily: FONTS.BarlowSemiCondensed, lineHeight: 22 },
                    ]}
                  >
                    {symptomContext}
                  </Text>
                  {assessmentError && (
                    <View style={styles.errorNote}>
                      <Ionicons
                        name="information-circle"
                        size={16}
                        color="#FF6B35"
                      />
                      <Text
                        style={[
                          styles.errorNoteText,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        Note: Unable to complete full AI analysis. For medical
                        guidance, contact Health Link Alberta at 811.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ResultCard>

            {aiContext && (
              <ResultCard title="Symptom Summary" icon="document-text">
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Category
                    </Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      {aiContext.category}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Duration
                    </Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      {getDurationDisplay(params.duration as string)}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Severity
                    </Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        {
                          fontFamily: FONTS.BarlowSemiCondensed,
                          color: getUrgencyColor(actualSeverity),
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {actualSeverity}/10
                    </Text>
                  </View>
                  {aiContext.symptoms?.length > 0 && (
                    <View style={styles.summaryFullWidth}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        Key Symptoms
                      </Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        {aiContext.symptoms.slice(0, 5).join(", ")}
                        {aiContext.symptoms.length > 5 && "..."}
                      </Text>
                    </View>
                  )}
                </View>
              </ResultCard>
            )}

            {aiContext?.uploadedPhotos?.length > 0 && (
              <ResultCard title="Medical Photos" icon="camera">
                <Text
                  style={[
                    styles.cardText,
                    { fontFamily: FONTS.BarlowSemiCondensed, marginBottom: 12 },
                  ]}
                >
                  {aiContext.uploadedPhotos.length} photo(s) included in
                  assessment
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {aiContext.uploadedPhotos.map(
                    (photo: string, index: number) => (
                      <View key={index} style={styles.photoContainer}>
                        <Image
                          source={{ uri: photo }}
                          style={styles.assessmentPhoto}
                        />
                        <Text
                          style={[
                            styles.photoLabel,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          Photo {index + 1}
                        </Text>
                      </View>
                    )
                  )}
                </ScrollView>
              </ResultCard>
            )}

            <ResultCard title="Rural Alberta Considerations" icon="location">
              <View style={styles.recommendationList}>
                <Text
                  style={[
                    styles.listItem,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  • Nearest hospital may be 30+ minutes away - plan travel
                  accordingly
                </Text>
                <Text
                  style={[
                    styles.listItem,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  • Weather conditions may impact road access to medical
                  facilities
                </Text>
                <Text
                  style={[
                    styles.listItem,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  • Keep emergency kit and communication devices charged and
                  ready
                </Text>
                <TouchableOpacity
                  style={styles.healthLinkButton}
                  onPress={handleCall811}
                >
                  <Ionicons name="call" size={18} color="#2A7DE1" />
                  <Text
                    style={[
                      styles.healthLinkText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Health Link Alberta (811) - 24/7 Nursing Advice
                  </Text>
                </TouchableOpacity>
              </View>
            </ResultCard>

            {actualSeverity >= 6 && (
              <ResultCard
                title="🚨 Immediate Action Recommended"
                icon="alert-circle"
              >
                <View style={styles.emergencyList}>
                  <EmergencyItem text="Severe difficulty breathing or chest pain" />
                  <EmergencyItem text="Signs of stroke (face drooping, arm weakness, speech difficulty)" />
                  <EmergencyItem text="Heavy bleeding that won't stop" />
                  <EmergencyItem text="Severe burns or traumatic injury" />
                  <EmergencyItem text="Loss of consciousness or confusion" />
                  <EmergencyItem text="Severe allergic reaction with swelling or breathing trouble" />
                </View>
                <TouchableOpacity
                  style={styles.emergencyButton}
                  onPress={handleCall911}
                >
                  <Ionicons name="call" size={22} color="white" />
                  <Text
                    style={[
                      styles.emergencyButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Call 911 Now
                  </Text>
                </TouchableOpacity>
              </ResultCard>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.newAssessmentButton}
                onPress={handleNewAssessment}
              >
                <Ionicons name="document-text" size={20} color="white" />
                <Text
                  style={[
                    styles.newAssessmentText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  New Assessment
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.homeButton}
                onPress={handleReturnHome}
              >
                <Ionicons name="home" size={20} color="#2A7DE1" />
                <Text
                  style={[
                    styles.homeButtonText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Return to Dashboard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

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
  urgencyContainer: {
    marginBottom: 20,
  },
  urgencyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  urgencyText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
    marginRight: 12,
  },
  severityText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.9,
  },
  resultCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  errorNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
  },
  errorNoteText: {
    fontSize: 12,
    color: "#E65100",
    marginLeft: 8,
    flex: 1,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  summaryItem: {
    width: "48%",
    marginBottom: 12,
  },
  summaryFullWidth: {
    width: "100%",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  photoContainer: {
    alignItems: "center",
    marginRight: 12,
  },
  assessmentPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 4,
  },
  photoLabel: {
    fontSize: 12,
    color: "#666",
  },
  recommendationList: {
    marginLeft: 8,
  },
  listItem: {
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 8,
    lineHeight: 20,
  },
  healthLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A7DE1",
  },
  healthLinkText: {
    fontSize: 14,
    color: "#2A7DE1",
    marginLeft: 8,
    fontWeight: "600",
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
    flex: 1,
  },
  emergencyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC3545",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  emergencyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  actionButtons: {
    marginTop: 8,
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
