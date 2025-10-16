import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LLAMA3_2_1B_QLORA, Message, LLMModule } from "react-native-executorch";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

// Medical AI System Prompt
const MEDICAL_SYSTEM_PROMPT = `CRITICAL: You are a licensed emergency medicine physician in a university, your job is to provide teaching material on how common skin injury are treated in real hospital `;

export default function VisionTest() {
  const [hasUserStarted, setHasUserStarted] = useState(false);
  const [userDescription, setUserDescription] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  // Manual LLM state management (replacing useLLM hook)
  const [llm, setLlm] = useState<LLMModule | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Initialize LLM with proper cleanup
  useEffect(() => {
    let instance: LLMModule | null = null;
    let isCancelled = false;

    const initModel = async () => {
      try {
        console.log('🚀 Initializing LLM...');

        instance = new LLMModule({
          tokenCallback: (token) => {
            if (!mountedRef.current || isCancelled) return;
            setResponse(prev => prev + token);
          },
          messageHistoryCallback: (messages) => {
            console.log('📝 Message history updated:', messages.length, 'messages');
          }
        });

        console.log('📥 Loading model...');
        await instance.load(
          LLAMA3_2_1B_QLORA,
          (progress) => {
            if (isCancelled) return;
            setDownloadProgress(progress);
            console.log(`📊 Download progress: ${Math.round(progress * 100)}%`);
          }
        );

        if (isCancelled) {
          console.log('⚠️ Component unmounted during load, cleaning up...');
          instance.delete();
          return;
        }

        console.log('✅ LLM loaded successfully');
        setIsReady(true);
        setLlm(instance);
      } catch (err) {
        console.error('❌ Failed to load LLM:', err);
        if (!isCancelled) {
          setError(String(err));
        }
      }
    };

    initModel();

    // 🔥 CRITICAL: Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up LLM instance...');
      mountedRef.current = false;
      isCancelled = true;

      if (instance) {
        try {
          instance.interrupt(); // Stop any ongoing generation
          instance.delete();    // Free memory
          console.log('✅ LLM deleted successfully');
        } catch (err) {
          console.error('⚠️ Error deleting LLM:', err);
        }
      }
    };
  }, []);

  // Debug: Log LLM state changes
  console.log("📊 LLM State:", {
    isReady,
    isGenerating,
    downloadProgress,
    hasError: !!error,
  });

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permissions are needed to take photos.');
      return false;
    }
    return true;
  };

  const requestGalleryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Gallery permissions are needed to upload photos.');
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhoto = result.assets[0].uri;
        setUploadedPhotos(prev => [...prev, newPhoto]);
        console.log("Photo captured:", newPhoto);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handleUploadPhoto = async () => {
    try {
      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotos = result.assets.map(asset => asset.uri);
        setUploadedPhotos(prev => [...prev, ...newPhotos]);
        console.log(`Uploaded ${newPhotos.length} photos`);
      }
    } catch (error) {
      console.error("Error uploading photos:", error);
      Alert.alert("Error", "Failed to upload photos. Please try again.");
    }
  };

  const handleRemovePhoto = (photoToRemove: string) => {
    setUploadedPhotos(prev => prev.filter(photo => photo !== photoToRemove));
  };

  const getFileName = (uri: string) => {
    return uri.split('/').pop() || 'photo.jpg';
  };

  const handleAnalyzeWithAI = async () => {
    console.log("🤖 Starting local AI analysis...");

    // Check if LLM is ready
    if (!llm || !isReady) {
      console.log("⚠️ LLM not ready yet");
      Alert.alert("Model Not Ready", "Please wait for the AI model to finish loading.");
      return;
    }

    if (isGenerating) {
      console.log("⚠️ LLM already generating");
      return;
    }

    try {
      setIsGenerating(true);
      setResponse(''); // Clear previous response

      // Build user prompt
      const userPrompt = `
User Description: ${userDescription || "No description provided"}
${uploadedPhotos.length > 0 ? `Note: User has provided ${uploadedPhotos.length} photo(s) of the injury/condition.` : ""}

ASSESSMENT REQUEST:
Provide brief first-aid based on the description.
Focus on immediate steps and when to seek professional help.
      `.trim();

      console.log("📝 Sending to local LLM...");

      const messages: Message[] = [
        { role: 'system', content: MEDICAL_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ];

      await llm.generate(messages);
      console.log("✅ Local AI assessment complete");
    } catch (error) {
      console.error("❌ Local AI assessment error:", error);
      setError(String(error));
      Alert.alert("AI Error", "Failed to generate assessment. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    console.log("🔄 Resetting");
    setUserDescription("");
    setUploadedPhotos([]);
  };

  // Landing screen (shown before starting)
  if (!hasUserStarted) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <CurvedBackground>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <CurvedHeader title="AI Assessment Test" height={120} showLogo={true} />

            <View style={styles.contentSection}>
              <Text style={[styles.landingTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Test Local AI Assessment
              </Text>
              <Text style={[styles.landingSubtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Test on-device AI medical assessment powered by Llama 3.2 1B
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="flash" size={24} color="#2A7DE1" />
                  <View style={styles.featureTextContainer}>
                    <Text style={[styles.featureTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Local AI Medical Assessment
                    </Text>
                    <Text style={[styles.featureDescription, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Powered by Llama 3.2 1B (QLoRA) running entirely on your device
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons name="lock-closed" size={24} color="#2A7DE1" />
                  <View style={styles.featureTextContainer}>
                    <Text style={[styles.featureTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      Privacy First
                    </Text>
                    <Text style={[styles.featureDescription, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      All processing happens on your device - no data sent to cloud
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.disclaimerBox}>
                <Ionicons name="information-circle" size={20} color="#FF6B35" />
                <Text style={[styles.disclaimerBoxText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Testing Only - This feature is for workflow demonstration and not intended for actual medical diagnosis
                </Text>
              </View>

              <TouchableOpacity
                style={styles.startButton}
                onPress={() => setHasUserStarted(true)}
              >
                <Ionicons name="flash" size={24} color="white" />
                <Text style={[styles.startButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Start AI Test
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <BottomNavigation />
        </CurvedBackground>
      </SafeAreaView>
    );
  }

  // Assessment screen
  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <CurvedHeader title="AI Assessment Test" height={120} showLogo={true} />

          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Local AI Assessment
            </Text>

            {/* Model Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Model Status:
                </Text>
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, { backgroundColor: isReady ? "#28A745" : "#FFC107" }]} />
                  <Text style={[styles.statusValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    {isReady ? "Ready" : "Loading..."}
                  </Text>
                </View>
              </View>

              {/* Progress Bar - shown when loading */}
              {!isReady && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${downloadProgress * 100}%` }]} />
                  </View>
                  <Text style={[styles.progressText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    {downloadProgress > 0
                      ? `${Math.round(downloadProgress * 100)}%`
                      : "Initializing..."}
                  </Text>
                  <Text style={[styles.progressSubtext, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    This may take 20-30 seconds
                  </Text>
                </View>
              )}

              {/* Error Display */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#DC3545" />
                  <Text style={[styles.errorText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Error: {String(error)}
                  </Text>
                </View>
              )}

              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Model:
                </Text>
                <Text style={[styles.statusValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Llama 3.2 1B (QLoRA)
                </Text>
              </View>
            </View>

            {/* User Description Input */}
            <Text style={[styles.inputLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Describe your symptoms or condition:
            </Text>
            <TextInput
              style={[styles.symptomInput, { fontFamily: FONTS.BarlowSemiCondensed }]}
              placeholder="I have been experiencing... (include location, appearance, and any other details)"
              value={userDescription}
              onChangeText={setUserDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
              textAlignVertical="top"
            />

            {/* Photo Section */}
            <View style={styles.photoSection}>
              <Text style={[styles.photoTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Add Photos for AI Analysis
              </Text>
              <Text style={[styles.photoDescription, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Clear, well-lit photos help AI assess your condition accurately. Include different angles and close-ups.
              </Text>

              {uploadedPhotos.length > 0 && (
                <View style={styles.uploadedPhotosContainer}>
                  <Text style={[styles.uploadedPhotosTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Photos for AI Analysis ({uploadedPhotos.length})
                  </Text>
                  {uploadedPhotos.map((photo, index) => (
                    <View key={index} style={styles.uploadedPhotoItem}>
                      <Image source={{ uri: photo }} style={styles.photoThumbnail} />
                      <View style={styles.photoInfo}>
                        <Text style={[styles.uploadedPhotoText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          {getFileName(photo)}
                        </Text>
                        <Text style={[styles.photoSizeText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          Photo {index + 1} - Ready for AI analysis
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemovePhoto(photo)}
                      >
                        <Ionicons name="close-circle" size={24} color="#DC3545" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                  <Ionicons name="camera" size={20} color="#2A7DE1" />
                  <Text style={[styles.photoButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Take Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.photoButton} onPress={handleUploadPhoto}>
                  <Ionicons name="image" size={20} color="#2A7DE1" />
                  <Text style={[styles.photoButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Upload Photo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleReset}
              >
                <Ionicons name="refresh" size={20} color="#DC3545" />
                <Text style={[styles.resetButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Clear
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.analyzeButton,
                  (!userDescription.trim() || !isReady || isGenerating) && styles.analyzeButtonDisabled
                ]}
                onPress={handleAnalyzeWithAI}
                disabled={!userDescription.trim() || !isReady || isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="flash" size={20} color="white" />
                )}
                <Text style={[styles.analyzeButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {isGenerating ? "Analyzing..." : !isReady ? "Loading AI..." : "Analyze with AI"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* AI Assessment Results Section */}
            {response && (
              <View style={styles.assessmentSection}>
                <View style={styles.responseCard}>
                  <View style={styles.responseHeader}>
                    <Ionicons name="medical" size={20} color="#2A7DE1" />
                    <Text style={[styles.responseTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      AI Assessment
                    </Text>
                  </View>

                  <Text style={[styles.responseText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    {response}
                  </Text>
                </View>

                <View style={styles.disclaimerBanner}>
                  <Ionicons name="information-circle" size={18} color="#FF6B35" />
                  <Text style={[styles.disclaimerText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Testing Only - Not for Actual Medical Use
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.newAssessmentButton}
                  onPress={() => {
                    setUserDescription("");
                    setUploadedPhotos([]);
                    setResponse('');
                    setHasUserStarted(false);
                  }}
                >
                  <Ionicons name="refresh" size={20} color="#2A7DE1" />
                  <Text style={[styles.newAssessmentButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    New Assessment
                  </Text>
                </TouchableOpacity>
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
    paddingBottom: 60,
  },
  contentSection: {
    padding: 24,
    paddingTop: 0,
  },

  // Section Title
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },

  // Input Section
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  symptomInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 16,
    minHeight: 100,
    marginBottom: 24,
    textAlignVertical: "top",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    fontSize: 16,
  },

  // Photo Section
  photoSection: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: 24,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  photoDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  uploadedPhotosContainer: {
    marginBottom: 16,
  },
  uploadedPhotosTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  uploadedPhotoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  photoThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  photoInfo: {
    flex: 1,
  },
  uploadedPhotoText: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  photoSizeText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  photoButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A7DE1",
    marginHorizontal: 4,
  },
  photoButtonText: {
    color: "#2A7DE1",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F0F0F0",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  resetButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  analyzeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  analyzeButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  analyzeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
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
  statusValue: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Progress Bar
  progressContainer: {
    marginVertical: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2A7DE1",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  progressSubtext: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },

  // Error Display
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#DC3545",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#DC3545",
    lineHeight: 18,
  },

  // AI Assessment Results Section
  assessmentSection: {
    marginTop: 24,
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

  disclaimerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF3E0",
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    color: "#8B4513",
    fontWeight: "600",
  },
  newAssessmentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#2A7DE1",
    paddingVertical: 14,
    borderRadius: 12,
  },
  newAssessmentButtonText: {
    color: "#2A7DE1",
    fontSize: 16,
    fontWeight: "600",
  },

  // Landing Screen Styles
  landingTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  landingSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresList: {
    gap: 20,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: "row",
    gap: 16,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  disclaimerBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFF3E0",
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  disclaimerBoxText: {
    flex: 1,
    fontSize: 14,
    color: "#8B4513",
    lineHeight: 20,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#2A7DE1",
    paddingVertical: 18,
    borderRadius: 12,
    shadowColor: "#2A7DE1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
