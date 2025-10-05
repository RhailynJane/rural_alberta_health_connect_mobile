/* eslint-disable @typescript-eslint/no-unused-vars */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLLM, LLAMA3_2_1B_SPINQUANT, Message } from "react-native-executorch";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

const SYSTEM_PROMPT = `You are a medical triage assistant for rural Alberta healthcare.
Provide brief, compassionate medical guidance. Keep responses under 150 words.`;

export default function AITest() {
  const [userInput, setUserInput] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize LLM with the LLAMA3_2_1B_SPINQUANT model
  const llm = useLLM({ model: LLAMA3_2_1B_SPINQUANT });

  useEffect(() => {
    console.log("🤖 AI Test Screen Mounted");
    console.log("📊 LLM State:", {
      isReady: llm.isReady,
      isGenerating: llm.isGenerating,
      downloadProgress: llm.downloadProgress,
      hasError: !!llm.error,
    });

    // Mark as initialized once model is ready
    if (llm.isReady && isInitializing) {
      console.log("✅ Model initialized successfully");
      setIsInitializing(false);
    }
  }, [llm.isReady, llm.isGenerating, llm.downloadProgress, llm.error, isInitializing]);

  const handleGenerate = async () => {
    if (!userInput.trim() || llm.isGenerating || !llm.isReady) {
      console.log("⚠️ Cannot generate:", {
        emptyInput: !userInput.trim(),
        isGenerating: llm.isGenerating,
        notReady: !llm.isReady
      });
      return;
    }

    console.log("🚀 Starting generation for:", userInput.substring(0, 50));

    try {
      const chat: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userInput }
      ];

      console.log("📝 Sending prompt to LLM");
      await llm.generate(chat);
      console.log("✅ Generation completed");
    } catch (error) {
      console.error("❌ Generation error:", error);
    }
  };

  const handleReset = () => {
    console.log("🔄 Resetting conversation");
    setUserInput("");
    // Note: react-native-executorch doesn't have resetContext, just clear the input
  };

  // Determine if we're downloading the model
  const isDownloading = llm.downloadProgress > 0 && llm.downloadProgress < 1;
  const downloadPercentage = Math.round(llm.downloadProgress * 100);

  // Show download screen
  if (isDownloading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <CurvedHeader
              title="AI Medical Test"
              height={120}
              showLogo={true}
            />

            <View style={styles.contentSection}>
              <View style={styles.downloadContainer}>
                <Ionicons name="cloud-download" size={64} color="#2A7DE1" />
                <Text style={[styles.downloadTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Downloading AI Model
                </Text>
                <Text style={[styles.downloadSubtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  First-time setup (~500MB)
                </Text>

                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${downloadPercentage}%` }
                    ]}
                  />
                </View>

                <Text style={[styles.progressText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {downloadPercentage}% Complete
                </Text>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#2A7DE1" />
                  <Text style={[styles.infoText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    The model will be cached after download. Future loads will be instant.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
          <BottomNavigation />
        </CurvedBackground>
      </SafeAreaView>
    );
  }

  // Show initializing screen
  if (isInitializing || !llm.isReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <CurvedHeader
              title="AI Medical Test"
              height={120}
              showLogo={true}
            />

            <View style={styles.contentSection}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2A7DE1" />
                <Text style={[styles.loadingText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Initializing model...
                </Text>
                <Text style={[styles.loadingSubtext, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  This may take a few moments
                </Text>
              </View>
            </View>
          </ScrollView>
          <BottomNavigation />
        </CurvedBackground>
      </SafeAreaView>
    );
  }

  // Main interface
  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <CurvedHeader
            title="AI Medical Test"
            height={120}
            showLogo={true}
          />

          <View style={styles.contentSection}>
            {/* Header Section */}
            <View style={styles.headerSection}>
              <Text style={[styles.pageTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                🤖 AI Medical Test
              </Text>
              <Text style={[styles.pageSubtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Privacy-first on-device LLM
              </Text>
            </View>

            {/* Privacy Badge */}
            <View style={styles.privacyBadge}>
              <Ionicons name="lock-closed" size={18} color="#28A745" />
              <Text style={[styles.privacyText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                🔒 Your data stays on your device
              </Text>
            </View>

            {/* Model Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Model Status:
                </Text>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={[styles.statusValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Ready
                  </Text>
                </View>
              </View>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Model:
                </Text>
                <Text style={[styles.statusValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Llama 3.2 1B
                </Text>
              </View>
            </View>

            {/* Input Section */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Ask a Medical Question
              </Text>
              <TextInput
                style={[styles.textInput, { fontFamily: FONTS.BarlowSemiCondensed }]}
                placeholder="E.g., I have a fever and sore throat for 2 days..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                value={userInput}
                onChangeText={setUserInput}
                editable={!llm.isGenerating}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  (llm.isGenerating || !userInput.trim()) && styles.generateButtonDisabled
                ]}
                onPress={handleGenerate}
                disabled={llm.isGenerating || !userInput.trim()}
              >
                {llm.isGenerating ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={[styles.generateButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Generating...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="medical" size={20} color="white" />
                    <Text style={[styles.generateButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Generate Assessment
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleReset}
                disabled={llm.isGenerating}
              >
                <Ionicons name="refresh" size={20} color="#2A7DE1" />
                <Text style={[styles.resetButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Reset
                </Text>
              </TouchableOpacity>
            </View>

            {/* Response Section */}
            {(llm.response || llm.isGenerating) && (
              <View style={styles.responseCard}>
                <View style={styles.responseHeader}>
                  <Ionicons name="chatbox-ellipses" size={20} color="#2A7DE1" />
                  <Text style={[styles.responseTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    AI Assessment
                  </Text>
                </View>

                {llm.isGenerating && !llm.response && (
                  <View style={styles.generatingContainer}>
                    <ActivityIndicator size="small" color="#2A7DE1" />
                    <Text style={[styles.generatingText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Analyzing your symptoms...
                    </Text>
                  </View>
                )}

                {llm.response && (
                  <Text style={[styles.responseText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    {llm.response}
                  </Text>
                )}
              </View>
            )}

            {/* Error Display */}
            {llm.error && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={20} color="#DC3545" />
                <Text style={[styles.errorText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {llm.error}
                </Text>
              </View>
            )}

            {/* Disclaimer */}
            <View style={styles.disclaimerCard}>
              <Text style={[styles.disclaimerTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                ⚠️ Testing Only
              </Text>
              <Text style={[styles.disclaimerText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                This is a test interface for the on-device LLM. Do not use for actual medical decisions.
                Always consult healthcare professionals for medical advice.
              </Text>
            </View>

            {/* Debug Info (only in development) */}
            {__DEV__ && (
              <View style={styles.debugCard}>
                <Text style={[styles.debugTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Debug Info
                </Text>
                <Text style={[styles.debugText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  isReady: {llm.isReady ? "✅" : "❌"}
                </Text>
                <Text style={[styles.debugText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  isGenerating: {llm.isGenerating ? "✅" : "❌"}
                </Text>
                <Text style={[styles.debugText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  downloadProgress: {downloadPercentage}%
                </Text>
                <Text style={[styles.debugText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  responseLength: {llm.response?.length || 0}
                </Text>
              </View>
            )}
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
    paddingBottom: 80,
  },
  contentSection: {
    padding: 24,
    paddingTop: 20,
  },

  // Header Styles
  headerSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  pageSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },

  // Privacy Badge
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#81C784",
  },
  privacyText: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
    marginLeft: 8,
  },

  // Status Card
  statusCard: {
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
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#28A745",
    marginRight: 6,
  },
  statusValue: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "600",
  },

  // Input Section
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1A1A1A",
    minHeight: 120,
    textAlignVertical: "top",
  },

  // Buttons
  buttonContainer: {
    marginBottom: 20,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A7DE1",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  generateButtonDisabled: {
    backgroundColor: "#B0BEC5",
    opacity: 0.6,
  },
  generateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A7DE1",
  },
  resetButtonText: {
    color: "#2A7DE1",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Response Card
  responseCard: {
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2A7DE1",
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#D1E8FF",
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginLeft: 8,
  },
  responseText: {
    fontSize: 15,
    color: "#1A1A1A",
    lineHeight: 22,
  },
  generatingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  generatingText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },

  // Error Card
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#DC3545",
  },
  errorText: {
    fontSize: 14,
    color: "#DC3545",
    marginLeft: 8,
    flex: 1,
  },

  // Disclaimer
  disclaimerCard: {
    backgroundColor: "#FFF3CD",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFEAA7",
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#856404",
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: "#856404",
    lineHeight: 20,
  },

  // Download Screen
  downloadContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  downloadTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 20,
    marginBottom: 8,
  },
  downloadSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
  },
  progressBarContainer: {
    width: "100%",
    height: 12,
    backgroundColor: "#E9ECEF",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#2A7DE1",
    borderRadius: 6,
  },
  progressText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2A7DE1",
    marginBottom: 32,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A7DE1",
  },
  infoText: {
    fontSize: 14,
    color: "#1A1A1A",
    marginLeft: 8,
    flex: 1,
  },

  // Loading Screen
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },

  // Debug Card
  debugCard: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontFamily: "monospace",
  },
});
