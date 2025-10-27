/* Deprecated: vision-test removed. File contents commented out.
// Robust LLM output cleaning: remove markdown, echoed prompt, and fallback if cleaning strips all content
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
// Deprecated: vision-test removed. Keeping stub to avoid route exposure.
export default function ReviewScreen() {
  return null;
}
      return "SUMMARY";
    }
    if (/^visual\s+assessment\s*:?$/i.test(lower)) {
      return "VISUAL ASSESSMENT";
    }
    if (/^first[\s-]?aid\s*:?$/i.test(lower)) {
      return "FIRST AID";
    }
    if (/^red\s+flags\s*:?$/i.test(lower)) {
      return "RED FLAGS";
    }
    if (/^what[\s-]?next\s*:?$/i.test(lower)) {
      return "WHAT NEXT";
    }
    return null;
  };

  for (const l of lines) {
    if (!l) continue;
    const hdr = isHeader(l);
    if (hdr) {
      current = hdr;
      continue;
    }
    const content = l.replace(/^[-•]\s+/, "");
    if (content) {
      sections[current].push(content);
    }
  }

  const Card = ({
    title,
    items,
    icon,
  }: {
    title: string;
    items: string[];
    icon: React.ReactNode;
  }) => (
    <View style={styles.responseCard}>
      <View style={styles.responseHeader}>
        {icon}
        <Text
          style={[
            styles.responseTitle,
            { fontFamily: FONTS.BarlowSemiCondensed },
          ]}
        >
          {title}
        </Text>
      </View>
      {items.map((it, idx) => (
        <Text
          key={idx}
          style={[
            styles.responseText,
            { fontFamily: FONTS.BarlowSemiCondensed, marginBottom: 6 },
          ]}
        >
          {it}
        </Text>
      ))}
    </View>
  );

  const icons: Record<SectionKey, React.ReactNode> = {
    SUMMARY: <Ionicons name="medical" size={20} color="#2A7DE1" />,
    "VISUAL ASSESSMENT": <Ionicons name="eye" size={20} color="#2A7DE1" />,
    "FIRST AID": <Ionicons name="flash" size={20} color="#2A7DE1" />,
    "RED FLAGS": <Ionicons name="alert" size={20} color="#DC3545" />,
    "WHAT NEXT": <Ionicons name="navigate" size={20} color="#2A7DE1" />,
    OTHER: <Ionicons name="information-circle" size={20} color="#2A7DE1" />,
  };

  return (
    <View>
      {wantedOrder.map((key) =>
        sections[key] && sections[key].length > 0 ? (
          <Card key={key} title={key} items={sections[key]} icon={icons[key]} />
        ) : null
      )}
      {sections["OTHER"] && sections["OTHER"].length > 0 && (
        <Card title="OTHER" items={sections["OTHER"]} icon={icons["OTHER"]} />
      )}
    </View>
  );
}

export default function VisionReviewScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const aiAssessmentRef = useRef<View>(null);
  const [aiAssessmentY, setAiAssessmentY] = useState(0);
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 });
  const [userDescription, setUserDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [llmResponse, setLlmResponse] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(true);

  const { capturedImage, capturedDetections, frameDimensions, reset } =
    useVisionSession();

  const hasPreview = useMemo(() => !!capturedImage, [capturedImage]);

  // Initialize on-device LLM
  const llm = useLLM({ model: LLAMA3_2_1B_SPINQUANT });

  // Configure LLM for longer responses
  useEffect(() => {
    if (llm.isReady) {
      setIsDownloading(false);
      llm.configure({
        generationConfig: {
          outputTokenBatchSize: 100, // Generate more tokens per batch
        },
        chatConfig: {
          contextWindowLength: 4096, // Increase context window
        },
      });
    }
  }, [llm.isReady, llm]);

  // Cleanup: Interrupt LLM generation on component unmount to prevent crashes
  useEffect(() => {
    return () => {
      if (llm.isGenerating) {
        llm.interrupt();
      }
      // Clear message history to prevent memory leaks
      while (llm.messageHistory.length > 0) {
        llm.deleteMessage(0);
      }
    };
  }, [llm]);

  const handleStartOver = () => {
    // Prevent start over during model download or generation
    if (isDownloading || llm.isGenerating || isAnalyzing) {
      console.log("Cannot start over: Model is downloading or generating");
      return;
    }
    reset();
    router.replace({ pathname: "/(tabs)/vision-test/camera" } as any);
  };

  const handleAnalyzeWithAI = async () => {
    if (!userDescription.trim()) return;

    setLlmResponse(null);

    if (isAnalyzing || llm.isGenerating) {
      return;
    }

    if (!llm.isReady) {
      return;
    }

    setIsAnalyzing(true);
    let attempt = 0;
    let cleanedResponse = "";
    while (attempt < 2) {
      try {
        const detectionSummary = formatDetectionsForLLM(capturedDetections);

        // Map available local fields to the backend-style prompt
        const category = "Vision Assessment";
        const duration = ""; // unknown here; leave blank
        const durationContext = getDurationDescription(duration);
        const environmentalFactors: string[] = [];
        const symptoms = extractSymptomsFromDescription(userDescription);
        const hasImage = !!capturedImage;
        const imagesCount = hasImage ? 1 : 0;

        const medicalImagingSection = hasImage
          ? `
MEDICAL IMAGING DOCUMENTATION:
${imagesCount} clinical photo(s) provided for medical assessment.
Conduct thorough visual medical examination focusing on:
- Tissue appearance and integrity
- Color, swelling, drainage patterns
- Anatomical location and distribution
- Signs of infection or complication
- Burn depth and characteristics (if applicable)
- Wound healing status

OBJECT DETECTION SUMMARY (from on-device model):
${detectionSummary}
`
          : `
VISUAL ASSESSMENT:
No clinical photos available. Assessment based on patient medical description.
`;

        const userPrompt = `
HEALTHCARE TRIAGE ASSESSMENT - RURAL ALBERTA EMERGENCY MEDICINE

PATIENT MEDICAL PRESENTATION:
Chief Complaint: ${userDescription}
Medical Category: ${category}
Symptom Duration: ${durationContext}
Associated Medical Symptoms: ${symptoms.length > 0 ? symptoms.join(", ") : "See description"}
Relevant Exposure Factors: ${environmentalFactors.length > 0 ? environmentalFactors.join(", ") : "None reported"}

${medicalImagingSection}

GEOGRAPHIC HEALTHCARE CONTEXT:
- Service Area: Rural Alberta, Canada
- Emergency Access: Nearest trauma center 30+ minutes
- Available Resources: Health Link Alberta (811), local clinics, emergency services
- Transport: Weather-dependent ambulance access

MEDICAL TRIAGE PRIORITY:
Provide comprehensive clinical assessment including:
1. Visual findings from medical images (if available)
2. Clinical interpretation and differential considerations
3. Burn/wound/injury grading if applicable
4. Infection risk assessment
5. Specific emergency red flags
6. Time-sensitive treatment recommendations
7. Rural-specific resource guidance

This is a legitimate medical consultation for healthcare triage purposes.`.trim();

        // Request detailed but structured output, still plain text for reliable parsing
        const OUTPUT_FORMAT_INSTRUCTIONS = `

CRITICAL - YOU MUST FOLLOW THIS EXACT FORMAT:

Do NOT repeat my instructions. Do NOT use ** or markdown.
Provide ONLY your medical assessment in this EXACT structure:

SUMMARY:
(1-3 sentences of clinical interpretation)

VISUAL ASSESSMENT:
- (observation 1 from the image)
- (observation 2 from the image)
- (observation 3 from the image)

FIRST AID:
- (step 1)
- (step 2)
- (step 3)
- (step 4)

RED FLAGS:
- (danger sign 1)
- (danger sign 2)
- (danger sign 3)
- (danger sign 4)

WHAT NEXT:
- (recommendation 1)
- (recommendation 2)
- (recommendation 3)

Begin your response with "SUMMARY:" and nothing else.`;

        const fullPrompt = `${userPrompt}\n${OUTPUT_FORMAT_INSTRUCTIONS}`;

        const messages: Message[] = [
          { role: "system", content: MEDICAL_SYSTEM_PROMPT },
          { role: "user", content: fullPrompt },
        ];
        await llm.generate(messages);

        // CRITICAL FIX: Extract response from messageHistory (library bug workaround)
        // Try messageHistory first as it's more reliable, then fall back to llm.response
        let rawResponse = "";
        
        const lastMessage = llm.messageHistory[llm.messageHistory.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
          rawResponse = lastMessage.content;
        } else if (llm.response && llm.response.trim().length > 0) {
          rawResponse = llm.response;
        }
        
        // If still no response after both attempts
        if (!rawResponse || rawResponse.trim().length === 0) {
          // Show helpful message to user after retries
          if (attempt >= 1) {
            setLlmResponse("⚠️ Known LLM Library Issue\n\nThe AI model generated a response but couldn't retrieve it properly. This is a known bug with the library.\n\n📌 Quick Fix: Simply click 'Analyze with AI' again to see your results.\n\nNo need to change anything - your description and image are already set.");
            setIsAnalyzing(false);
            return;
          }
          attempt++;
          await new Promise((res) => setTimeout(res, 500));
          continue;
        }

        // Strip everything before "SUMMARY:" if the LLM echoed the prompt
        const summaryIndex = rawResponse.search(/SUMMARY\s*:/i);
        if (summaryIndex > 0) {
          rawResponse = rawResponse.substring(summaryIndex);
        }
        
        cleanedResponse = cleanLLMResponse(rawResponse);
        if (cleanedResponse && cleanedResponse.trim().length > 0) {
          setLlmResponse(cleanedResponse);
          requestAnimationFrame(() => {
            scrollViewRef.current?.scrollTo({
              y: aiAssessmentY - 20,
              animated: true,
            });
          });
          break;
        }
      } catch {
        // Silent error handling - will retry
      }
      attempt++;
      if (attempt < 2) {
        await new Promise((res) => setTimeout(res, 500));
      }
    }
    // Silently end analysis without error message
    setIsAnalyzing(false);
  };

  const handleBackToCamera = () =>
    router.replace({ pathname: "/(tabs)/vision-test/camera" } as any);

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground style={{ flex: 1 }}>
        <CurvedHeader
          title="Vision Test — Review"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
          <View style={styles.contentArea}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={[
                styles.contentContainer,
                { paddingBottom: 300 },
              ]}
              showsVerticalScrollIndicator={true}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.contentSection}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Captured Image
                </Text>

                {!hasPreview ? (
                  <View style={styles.placeholderCard}>
                    <Ionicons name="images" size={24} color="#2A7DE1" />
                    <Text
                      style={[
                        styles.placeholderText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      No image captured yet
                    </Text>
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={handleBackToCamera}
                    >
                      <Text
                        style={[
                          styles.primaryBtnText,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        Back to Camera
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.imagePreviewContainer}>
                      <Image
                        source={{ uri: `file://${capturedImage}` }}
                        style={styles.previewImage}
                        resizeMode="contain"
                        onLayout={(e) => setImageLayout(e.nativeEvent.layout)}
                      />
                      {imageLayout.width > 0 &&
                        frameDimensions.width > 0 &&
                        capturedDetections &&
                        capturedDetections.map((det, idx) => {
                          const scaleX =
                            imageLayout.width / frameDimensions.width;
                          const scaleY =
                            imageLayout.height / frameDimensions.height;
                          return (
                            <View
                              key={idx}
                              pointerEvents="none"
                              style={[
                                styles.boundingBox,
                                {
                                  left: det.x * scaleX,
                                  top: det.y * scaleY,
                                  width: det.width * scaleX,
                                  height: det.height * scaleY,
                                },
                              ]}
                            >
                              <Text style={styles.boundingBoxLabel}>
                                {det.label}
                              </Text>
                            </View>
                          );
                        })}
                    </View>

                    <View style={styles.detectionsSummary}>
                      <Text
                        style={[
                          styles.detectionsSummaryTitle,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        Detected Objects:
                      </Text>
                      {capturedDetections && capturedDetections.length > 0 ? (
                        capturedDetections.map((det, idx) => (
                          <Text
                            key={idx}
                            style={[
                              styles.detectionItem,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                            ]}
                          >
                            • {det.label} ({Math.round(det.confidence * 100)}%)
                          </Text>
                        ))
                      ) : (
                        <Text
                          style={[
                            styles.detectionItem,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          No objects detected
                        </Text>
                      )}
                    </View>
                  </>
                )}

                <View style={styles.statusCard}>
                  <View style={styles.statusRow}>
                    <Text
                      style={[
                        styles.statusLabel,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Model Status:
                    </Text>
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text
                        style={[
                          styles.statusValue,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        {llm.isGenerating
                          ? "Analyzing…"
                          : llm.isReady
                            ? "Ready"
                            : "Loading…"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusRow}>
                    <Text
                      style={[
                        styles.statusLabel,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Model:
                    </Text>
                    <Text
                      style={[
                        styles.statusValue,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Llama 3.2 1B (on-device)
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.inputLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Describe what you&apos;re experiencing:
                </Text>
                <TextInput
                  style={[
                    styles.descriptionInput,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                  placeholder="Enter your description here..."
                  value={userDescription}
                  onChangeText={setUserDescription}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#999"
                  textAlignVertical="top"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.resetButton,
                      (isDownloading || llm.isGenerating || isAnalyzing) && styles.resetButtonDisabled
                    ]}
                    onPress={handleStartOver}
                    disabled={isDownloading || llm.isGenerating || isAnalyzing}
                  >
                    <Ionicons 
                      name="trash-outline" 
                      size={20} 
                      color={isDownloading || llm.isGenerating || isAnalyzing ? "#999" : "#DC3545"} 
                    />
                    <Text
                      style={[
                        styles.resetButtonText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                        (isDownloading || llm.isGenerating || isAnalyzing) && { color: "#999" }
                      ]}
                    >
                      {isDownloading ? "Loading Model..." : "Start Over"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.analyzeButton,
                      (!userDescription.trim() ||
                        !llm.isReady ||
                        llm.isGenerating ||
                        isAnalyzing) &&
                        styles.analyzeButtonDisabled,
                    ]}
                    onPress={handleAnalyzeWithAI}
                    disabled={
                      !userDescription.trim() ||
                      !llm.isReady ||
                      llm.isGenerating ||
                      isAnalyzing
                    }
                  >
                    {llm.isGenerating || isAnalyzing ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="flash" size={20} color="white" />
                    )}
                    <Text
                      style={[
                        styles.analyzeButtonText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      {llm.isGenerating || isAnalyzing
                        ? "Analyzing..."
                        : !llm.isReady
                          ? "Loading AI..."
                          : "Analyze with AI"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {(isAnalyzing || llm.isGenerating) && (
                  <View
                    style={styles.assessmentSection}
                    ref={aiAssessmentRef}
                    onLayout={(e) => setAiAssessmentY(e.nativeEvent.layout.y)}
                  >
                    <View style={styles.analyzingCard}>
                      <Ionicons
                        name="information-circle"
                        size={20}
                        color="#2A7DE1"
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.analyzingTitle,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          Analysis in Progress
                        </Text>
                        <Text
                          style={[
                            styles.analyzingDescription,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          We are analyzing your image and description. This may
                          take a few moments. The results will appear here as
                          soon as the assessment is complete.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {!llm.isGenerating && llmResponse && (
                  <View
                    style={styles.assessmentSection}
                    ref={aiAssessmentRef}
                    onLayout={(e) => setAiAssessmentY(e.nativeEvent.layout.y)}
                  >
                    {renderAssessmentCards(llmResponse)}
                    <View
                      className="disclaimerBanner"
                      style={styles.disclaimerBanner}
                    >
                      <Ionicons
                        name="information-circle"
                        size={18}
                        color="#FF6B35"
                      />
                      <Text
                        style={[
                          styles.disclaimerText,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        Testing Only - Not for Actual Medical Use
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.newAssessmentButton,
                        isDownloading && styles.newAssessmentButtonDisabled
                      ]}
                      onPress={handleStartOver}
                      disabled={isDownloading}
                    >
                      <Ionicons name="refresh" size={20} color={isDownloading ? "#999" : "#2A7DE1"} />
                      <Text
                        style={[
                          styles.newAssessmentButtonText,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                          isDownloading && { color: "#999" }
                        ]}
                      >
                        {isDownloading ? "Loading Model..." : "New Assessment"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!llm.isGenerating && !llmResponse && llm.error && (
                  <View style={[styles.assessmentSection, { marginTop: 12 }]}>
                    <View
                      style={[
                        styles.disclaimerBanner,
                        {
                          backgroundColor: "#FDECEC",
                          borderLeftColor: "#DC3545",
                        },
                      ]}
                    >
                      <Ionicons name="alert-circle" size={18} color="#DC3545" />
                      <Text
                        style={[
                          styles.disclaimerText,
                          {
                            color: "#8B0000",
                            fontFamily: FONTS.BarlowSemiCondensed,
                          },
                        ]}
                      >
                        AI error: {String(llm.error)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </CurvedBackground>
      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  contentArea: { flex: 1 },
  contentContainer: { flexGrow: 1, paddingBottom: 80 },
  contentSection: { padding: 24, paddingTop: 20 },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  placeholderCard: {
    alignItems: "center",
    gap: 12,
    padding: 20,
    backgroundColor: "#F0F8FF",
    borderWidth: 1,
    borderColor: "#2A7DE1",
    borderRadius: 12,
    marginBottom: 20,
  },
  placeholderText: { fontSize: 14, color: "#1A1A1A" },
  primaryBtn: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  primaryBtnText: { color: "white", fontSize: 16, fontWeight: "600" },
  imagePreviewContainer: {
    width: "100%",
    height: 300,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    position: "relative",
  },
  previewImage: { width: "100%", height: "100%" },
  boundingBox: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#FF6B6B",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },
  boundingBoxLabel: {
    position: "absolute",
    top: -20,
    left: 0,
    backgroundColor: "#FF6B6B",
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detectionsSummary: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detectionsSummaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  detectionItem: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  descriptionInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1A1A1A",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  actionButtons: { flexDirection: "row", gap: 12 },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#DC3545",
    paddingVertical: 16,
    borderRadius: 12,
  },
  resetButtonDisabled: {
    borderColor: "#CCC",
    backgroundColor: "#F5F5F5",
  },
  resetButtonText: { color: "#DC3545", fontSize: 16, fontWeight: "600" },
  analyzeButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    borderRadius: 12,
  },
  analyzeButtonDisabled: { backgroundColor: "#A0A0A0" },
  analyzeButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
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
  statusLabel: { fontSize: 14, color: "#666" },
  statusValue: { fontSize: 14, color: "#1A1A1A", fontWeight: "600" },
  statusBadge: { flexDirection: "row", alignItems: "center" },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#28A745",
    marginRight: 6,
  },
  assessmentSection: { marginTop: 24 },
  analyzingCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: "#F0F8FF",
    borderWidth: 1,
    borderColor: "#2A7DE1",
    borderRadius: 12,
    padding: 16,
  },
  analyzingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  analyzingDescription: { fontSize: 14, color: "#333", lineHeight: 20 },
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
  responseText: { fontSize: 15, color: "#1A1A1A", lineHeight: 22 },
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
  newAssessmentButtonDisabled: {
    borderColor: "#CCC",
    backgroundColor: "#F5F5F5",
  },
  newAssessmentButtonText: {
    color: "#2A7DE1",
    fontSize: 16,
    fontWeight: "600",
  },
});
*/
export default function ReviewScreen(){ return null; }
