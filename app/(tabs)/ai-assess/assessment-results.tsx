/* eslint-disable react-hooks/exhaustive-deps */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation } from "convex/react";
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
  View
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

  const aiContext = params.aiContext
    ? JSON.parse(params.aiContext as string)
    : null;

  const generateContext = useMutation(api.aiAssessment.generateContextWithGemini);

  useEffect(() => {
    const fetchAIAssessment = async () => {
      try {
        setIsLoading(true);
        setAssessmentError(false);
        
        const res = await generateContext({
          description: params.description as string || "",
          severity: parseInt(
            Array.isArray(params.severity)
              ? params.severity[0]
              : params.severity || "5"
          ),
          duration: params.duration as string || "",
          environmentalFactors: aiContext?.environmentalFactors || [],
          category: aiContext?.category || "General Symptoms",
          symptoms: aiContext?.symptoms || [],
          images: aiContext?.uploadedPhotos || [],
        });
        
        setSymptomContext(res.context);
      } catch (error) {
        console.error("AI assessment error:", error);
        setAssessmentError(true);
        setSymptomContext(
          "We're experiencing high demand for assessments. Based on your reported symptoms, we recommend contacting Health Link Alberta at 811 for professional medical guidance tailored to your rural location."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAIAssessment();
  }, []);

  const handleCall911 = () => Linking.openURL("tel:911");
  const handleCall811 = () => Linking.openURL("tel:811");
  const handleNewAssessment = () => router.replace("/(tabs)/ai-assess");
  const handleReturnHome = () => router.replace("/(tabs)/dashboard");

  const getUrgencyColor = (severity: number) => {
    if (severity >= 8) return "#DC3545"; // Emergency - Red
    if (severity >= 6) return "#FF6B35"; // Urgent - Orange
    if (severity >= 4) return "#FFC107"; // Moderate - Yellow
    return "#28A745"; // Low - Green
  };

  const getUrgencyText = (severity: number) => {
    if (severity >= 8) return "Emergency Care Needed";
    if (severity >= 6) return "Urgent Care Recommended";
    if (severity >= 4) return "Moderate Urgency";
    return "Routine Care";
  };

  const getUrgencyIcon = (severity: number) => {
    if (severity >= 8) return "alert-circle";
    if (severity >= 6) return "warning";
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

  const severity = aiContext?.severity || 5;

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

            {/* Urgency Indicator */}
            <View style={styles.urgencyContainer}>
              <View style={[
                styles.urgencyIndicator, 
                { backgroundColor: getUrgencyColor(severity) }
              ]}>
                <Ionicons 
                  name={getUrgencyIcon(severity) as any} 
                  size={24} 
                  color="white" 
                />
                <Text style={styles.urgencyText}>
                  {getUrgencyText(severity)}
                </Text>
                <Text style={styles.severityText}>
                  Severity Level: {severity}/10
                </Text>
              </View>
            </View>

            {/* AI Assessment */}
            <ResultCard title="Gemini Health Assessment" icon="medical">
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2A7DE1" />
                  <Text style={[styles.loadingText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Analyzing your symptoms with Google Gemini...
                  </Text>
                </View>
              ) : (
                <>
                  <Text
                    style={[
                      styles.cardText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    {symptomContext}
                  </Text>
                  {assessmentError && (
                    <View style={styles.errorNote}>
                      <Ionicons name="information-circle" size={16} color="#FF6B35" />
                      <Text style={[styles.errorNoteText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        Using fallback assessment. For precise guidance, contact Health Link Alberta.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ResultCard>

            {/* Symptom Summary */}
            {aiContext && (
              <ResultCard title="Symptom Summary" icon="document-text">
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Category
                    </Text>
                    <Text style={[styles.summaryValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      {aiContext.category}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Duration
                    </Text>
                    <Text style={[styles.summaryValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      {aiContext.duration}
                    </Text>
                  </View>
                  {aiContext.symptoms?.length > 0 && (
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        Detected Symptoms
                      </Text>
                      <Text style={[styles.summaryValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        {aiContext.symptoms.slice(0, 3).join(", ")}
                        {aiContext.symptoms.length > 3 && "..."}
                      </Text>
                    </View>
                  )}
                </View>
              </ResultCard>
            )}

            {/* Uploaded Photos */}
            {aiContext?.uploadedPhotos?.length > 0 && (
              <ResultCard title="Medical Photos" icon="camera">
                <Text style={[styles.cardText, { fontFamily: FONTS.BarlowSemiCondensed, marginBottom: 12 }]}>
                  {aiContext.uploadedPhotos.length} photo(s) analyzed for symptom assessment
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {aiContext.uploadedPhotos.map(
                    (photo: string, index: number) => (
                      <View key={index} style={styles.photoContainer}>
                        <Image
                          source={{ uri: photo }}
                          style={styles.assessmentPhoto}
                        />
                        <Text style={[styles.photoLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          Photo {index + 1}
                        </Text>
                      </View>
                    )
                  )}
                </ScrollView>
              </ResultCard>
            )}

            {/* Rural Considerations */}
            <ResultCard title="Rural Alberta Considerations" icon="location">
              <View style={styles.recommendationList}>
                <Text
                  style={[
                    styles.listItem,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  • Nearest hospital may be 30+ minutes away - plan travel accordingly
                </Text>
                <Text
                  style={[
                    styles.listItem,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  • Weather conditions may impact road access to medical facilities
                </Text>
                <Text
                  style={[
                    styles.listItem,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  • Keep emergency kit and communication devices charged and ready
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

            {/* Emergency Section - Show more prominently for high severity */}
            {(severity >= 6) && (
              <ResultCard title="🚨 Immediate Action Recommended" icon="alert-circle">
                <View style={styles.emergencyList}>
                  <EmergencyItem text="Severe difficulty breathing or chest pain" />
                  <EmergencyItem text="Signs of stroke (face drooping, arm weakness, speech difficulty)" />
                  <EmergencyItem text="Heavy bleeding that won't stop" />
                  <EmergencyItem text="Severe burns or traumatic injury" />
                  <EmergencyItem text="Loss of consciousness or confusion" />
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

            {/* Action Buttons */}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
    textAlign: 'center',
  },
  errorNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  errorNoteText: {
    fontSize: 12,
    color: '#E65100',
    marginLeft: 8,
    flex: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
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
    alignItems: 'center',
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