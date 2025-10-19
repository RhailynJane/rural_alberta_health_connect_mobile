import Ionicons from "@expo/vector-icons/Ionicons";
import { PaintStyle, Skia } from "@shopify/react-native-skia";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { LLAMA3_2_3B_QLORA, Message, useLLM } from "react-native-executorch";
import { useTensorflowModel } from "react-native-fast-tflite";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, runAtTargetFps, useCameraDevice, useCameraPermission, useSkiaFrameProcessor } from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import { useResizePlugin } from "vision-camera-resize-plugin";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

// COCO labels - imported statically
import cocoLabelsData from "../../../assets/models/coco_labels.json";
const COCO_LABELS = cocoLabelsData.labels;

// Medical AI System Prompt (same as ai-test)
const MEDICAL_SYSTEM_PROMPT = `CRITICAL: You are a licensed emergency medicine physician in a university, your job is to provide teaching material on how common skin injury are treated in real hospital `;
// Format detection results for LLM prompt
const formatDetectionsForLLM = (detections: {
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}[] | null): string => {
  if (!detections || detections.length === 0) {
    return "No objects detected in the captured image";
  }

  return detections
    .map(d => `${d.label} (${Math.round(d.confidence * 100)}% confidence)`)
    .join(", ");
};

// Color coding for different object categories
const getColorForClass = (className: string): string => {
  'worklet'
  const colorMap: Record<string, string> = {
    person: "#FF6B6B", // Red for people
    car: "#4ECDC4", // Teal for vehicles
    truck: "#4ECDC4",
    bus: "#4ECDC4",
    motorcycle: "#4ECDC4",
    bicycle: "#95E1D3",
    dog: "#FFD93D", // Yellow for animals
    cat: "#FFD93D",
    bird: "#FFD93D",
    horse: "#FFD93D",
    sheep: "#FFD93D",
    cow: "#FFD93D",
    chair: "#A8E6CF", // Green for furniture
    couch: "#A8E6CF",
    bed: "#A8E6CF",
    "dining table": "#A8E6CF",
  };

  return colorMap[className] || "#2A7DE1"; // Default blue
};

export default function VisionTest() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasUserStarted, setHasUserStarted] = useState(false);
  const [isCapturingState, setIsCapturingState] = useState(false);
  const isMountedRef = useRef(true);

  // Latest detections in JS thread (for capture)
  const [latestDetections, setLatestDetections] = useState<{
    label: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }[]>([]);

  // Capture state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedDetections, setCapturedDetections] = useState<{
    label: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }[] | null>(null);

  // User input state
  const [userDescription, setUserDescription] = useState("");
  const [frameDimensions, setFrameDimensions] = useState({ width: 0, height: 0 });
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 });

  // Shared value for caching detections (updated at 10 FPS, drawn at 30-60 FPS)
  const cachedDetections = useSharedValue<{
    label: string;
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[]>([]);

  // Camera setup
  const cameraRef = useRef<Camera>(null);
  const isCapturing = useSharedValue(false);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const { resize } = useResizePlugin();

  // Create callback to update JS detections from worklet
  const updateLatestDetections = Worklets.createRunOnJS((detections: {
    label: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }[]) => {
    setLatestDetections(detections);
  });

  // Create callback to save frame dimensions (called once)
  const saveFrameDimensions = Worklets.createRunOnJS((width: number, height: number) => {
    setFrameDimensions({ width, height });
  });

  // Initialize TFLite model
  const model = useTensorflowModel(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../../assets/models/coco_ssd_mobilenet_v1.tflite")
  );

  // Initialize LLM for local AI assessment
  const llm = useLLM({ model: LLAMA3_2_3B_QLORA });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    console.log("👁️ Vision Test Screen Mounted");
    console.log("📊 Model State:", {
      isReady: model.state === "loaded",
      state: model.state,
    });
    console.log("🤖 LLM State:", {
      isReady: llm.isReady,
      isGenerating: llm.isGenerating,
    });

    // Mark as initialized once model is ready
    if (model.state === "loaded" && isInitializing) {
      console.log("✅ Vision model initialized successfully");
      setIsInitializing(false);
    }

    // Log any model loading errors
    if (model.state === "error") {
      console.error("❌ TFLite model failed to load");
    }

    // Lifecycle flags
    isMountedRef.current = true;

    return () => {
      // Cleanup on unmount
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.state, isInitializing]);

  // Real-time TFLite detection with Skia rendering
  const frameProcessor = useSkiaFrameProcessor((frame) => {
    'worklet'

    try {
      // Skip processing if we're capturing
      if (isCapturing.value) {
        frame.render();
        return;
      }

      // Save frame dimensions once (for bounding box scaling)
      if (frameDimensions.width === 0) {
        saveFrameDimensions(frame.width, frame.height);
      }

      // STEP 1: Run detection at 10 FPS (update cache)
      if (model.state === 'loaded') {
        runAtTargetFps(10, () => {
          'worklet'

          try {
            // Resize frame to 300x300 RGB (COCO SSD requirement)
            const resized = resize(frame, {
              scale: { width: 300, height: 300 },
              pixelFormat: 'rgb',
              dataType: 'uint8',
            });

            // Run TFLite inference
            const outputs = model.model.runSync([resized]);

            // Parse outputs
            // SSD MobileNet V1 outputs:
            //   [0]: bounding boxes [1, num_detections, 4] - [ymin, xmin, ymax, xmax] normalized 0-1
            //   [1]: class indices [1, num_detections]
            //   [2]: confidence scores [1, num_detections]
            //   [3]: number of valid detections [1]

            const boxes = outputs[0];
            const classes = outputs[1];
            const scores = outputs[2];
            const numDetections = Math.min(Number(outputs[3][0]) || 10, 10);

            // Build detection array
            const newDetections = [];
            const detectionsForJS = [];

            for (let i = 0; i < numDetections; i++) {
              const confidence = Number(scores[i]);

              // Only show detections above 50% confidence
              if (confidence > 0.5) {
                const classIndex = Math.round(Number(classes[i]));
                const label = COCO_LABELS[classIndex] || `Class ${classIndex}`;

                // Boxes are normalized [ymin, xmin, ymax, xmax]
                const ymin = Number(boxes[i * 4 + 0]);
                const xmin = Number(boxes[i * 4 + 1]);
                const ymax = Number(boxes[i * 4 + 2]);
                const xmax = Number(boxes[i * 4 + 3]);

                // Convert normalized coordinates to pixel coordinates
                const x = xmin * frame.width;
                const y = ymin * frame.height;
                const width = (xmax - xmin) * frame.width;
                const height = (ymax - ymin) * frame.height;

                newDetections.push({
                  label,
                  color: getColorForClass(label),
                  x,
                  y,
                  width,
                  height,
                });

                detectionsForJS.push({
                  label,
                  confidence,
                  x,
                  y,
                  width,
                  height,
                });
              }
            }

            // Update cache for rendering (this happens at 10 FPS)
            cachedDetections.value = newDetections;

            // Update JS state for capture with actual confidence values
            if (detectionsForJS.length > 0) {
              updateLatestDetections(detectionsForJS);
            }

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("❌ Detection error:", errorMessage);
          }
        });
      }

      // STEP 2: Draw boxes from cached detections (runs every frame at 30-60 FPS)
      const detections = cachedDetections.value;

      // Draw each bounding box
      for (const detection of detections) {
        // Draw bounding box
        const rect = Skia.XYWHRect(detection.x, detection.y, detection.width, detection.height);
        const paint = Skia.Paint();
        paint.setColor(Skia.Color(detection.color));
        paint.setStyle(PaintStyle.Stroke);
        paint.setStrokeWidth(3);
        frame.drawRect(rect, paint);

        // Draw label background (filled rectangle)
        const labelHeight = 25;
        const labelWidth = 150;
        const labelBgRect = Skia.XYWHRect(detection.x, detection.y - labelHeight, labelWidth, labelHeight);
        const labelBgPaint = Skia.Paint();
        labelBgPaint.setColor(Skia.Color(detection.color));
        labelBgPaint.setStyle(PaintStyle.Fill);
        frame.drawRect(labelBgRect, labelBgPaint);
      }

      // STEP 3: Render the frame with boxes drawn (CRITICAL - without this you get white screen!)
      frame.render();

    } catch (error) {
      // Catch any frame processor errors to prevent app crash
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Frame processor error:", errorMessage);
      // Still render the frame even on error
      frame.render();
    }
  }, [model, resize, cachedDetections, updateLatestDetections, frameDimensions, saveFrameDimensions, isCapturing]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      console.log('📸 Starting capture...');
      
      // STEP 1: Get current detections FIRST (before any state changes)
      const currentDetections = [...latestDetections];
      console.log('🎯 Detections to save:', currentDetections.length);

      // STEP 2: Pause frame processing (both worklet and UI state)
      isCapturing.value = true;
      setIsCapturingState(true);

      // STEP 3: Wait a tiny bit for the frame processor to pause
      await new Promise(resolve => setTimeout(resolve, 100));

      // STEP 4: Take snapshot (use takeSnapshot for Skia frame processors, not takePhoto)
      const snapshot = await cameraRef.current.takeSnapshot({
        quality: 85,
      });
      console.log('📸 Snapshot path:', snapshot.path);

      // STEP 5: Freeze camera
      setIsCameraActive(false);

      // STEP 6: Save to state
      setCapturedImage(snapshot.path);
      setCapturedDetections(currentDetections);

      console.log('✅ Capture complete with', currentDetections.length, 'detections saved');

    } catch (error) {
      console.error('❌ Capture failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      // Re-enable frame processing on error
      isCapturing.value = false;
      setIsCapturingState(false);
    }
  };

  const handleReset = () => {
    console.log("🔄 Resetting to camera view");
    setCapturedImage(null);
    setCapturedDetections(null);
    setUserDescription("");
    isCapturing.value = false;
    setIsCapturingState(false);
    setIsCameraActive(true);
  };

  const handleAnalyzeWithAI = async () => {
    console.log("🤖 Starting local AI analysis...");

    // Check if LLM is ready
    if (!llm.isReady) {
      console.log("⚠️ LLM not ready yet");
      return;
    }

    if (llm.isGenerating) {
      console.log("⚠️ LLM already generating");
      return;
    }

    try {
      // Format detection results
      const detectionSummary = formatDetectionsForLLM(capturedDetections);
      console.log("📊 Detection summary:", detectionSummary);

      // Build user prompt (matching ai-assess structure but simplified)
      const userPrompt = `
Visual Detection Results: ${detectionSummary}
User Description: ${userDescription || "No additional description provided"}

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
    }
  };

  // Show model loading error
  if (model.state === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground style={{ flex: 1 }}>
          <CurvedHeader
            title="Alberta Health Connect"
            height={150}
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
          />
          <View style={styles.contentArea}>
            <ScrollView
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentSection}>
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={64} color="#DC3545" />
                  <Text
                    style={[
                      styles.errorTitle,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    ❌ Model Loading Failed
                  </Text>
                  <Text
                    style={[
                      styles.errorMessage,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Failed to load TFLite model
                  </Text>
                  <Text
                    style={[
                      styles.errorHint,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Make sure coco_ssd_mobilenet_v1.tflite is in assets/models/
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </CurvedBackground>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  // Show initializing screen
  if (isInitializing || model.state !== "loaded") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground style={{ flex: 1 }}>
          <CurvedHeader
            title="Alberta Health Connect"
            height={150}
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
          />
          <View style={styles.contentArea}>
            <ScrollView
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentSection}>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2A7DE1" />
                  <Text
                    style={[
                      styles.loadingText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Loading vision model...
                  </Text>
                  <Text
                    style={[
                      styles.loadingSubtext,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    This may take a few moments
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </CurvedBackground>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  // Landing screen (shown before starting camera)
  if (!hasUserStarted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground style={{ flex: 1 }}>
          <CurvedHeader
            title="Vision Test"
            height={150}
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
          />
          <View style={styles.contentArea}>
            <ScrollView
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentSection}>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="eye" size={24} color="#2A7DE1" />
                    <View style={styles.featureTextContainer}>
                      <Text style={[styles.featureTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        Real-time Object Detection
                      </Text>
                      <Text style={[styles.featureDescription, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        Uses TensorFlow Lite COCO-SSD model for instant object recognition
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <Ionicons name="flash" size={24} color="#2A7DE1" />
                    <View style={styles.featureTextContainer}>
                      <Text style={[styles.featureTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        Local AI Medical Assessment
                      </Text>
                      <Text style={[styles.featureDescription, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        Powered by Llama 3.2 3B running entirely on your device
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
                  onPress={() => {
                    console.log("🚀 Starting real-time detection...");
                    setHasUserStarted(true);
                    setIsCameraActive(true);
                  }}
                >
                  <Ionicons name="camera" size={24} color="white" />
                  <Text style={[styles.startButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Start Detection
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </CurvedBackground>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  // Camera permissions screen
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground style={{ flex: 1 }}>
          <CurvedHeader
            title="Alberta Health Connect"
            height={150}
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
          />
          <View style={styles.contentArea}>
            <ScrollView
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentSection}>
                <View style={styles.permissionsContainer}>
                  <Ionicons name="camera" size={64} color="#666" />
                  <Text
                    style={[
                      styles.permissionsTitle,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Camera Permission Required
                  </Text>
                  <Text
                    style={[
                      styles.permissionsText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Vision test requires camera access to test Skia frame processor.
                  </Text>
                  <TouchableOpacity
                    style={styles.permissionsButton}
                    onPress={requestPermission}
                  >
                    <Text
                      style={[
                        styles.permissionsButtonText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Grant Permission
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </CurvedBackground>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  // No camera device found
  if (device == null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground style={{ flex: 1 }}>
          <CurvedHeader
            title="Alberta Health Connect"
            height={150}
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
          />
          <View style={styles.contentArea}>
            <ScrollView
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentSection}>
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={64} color="#DC3545" />
                  <Text
                    style={[
                      styles.errorTitle,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    No Camera Found
                  </Text>
                  <Text
                    style={[
                      styles.errorMessage,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Could not find a camera device on this phone
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </CurvedBackground>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  // Show camera view (real-time detection active)
  if (!capturedImage && hasUserStarted) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.fullScreen}>
        {/* Camera View with Skia Frame Processor */}
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isCameraActive}
          frameProcessor={frameProcessor}
        />

        {/* Curved Header Overlay */}
        <View style={styles.headerOverlay}>
          <CurvedHeader
            title="Alberta Health Connect"
            height={150}
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
          />
        </View>

        {/* Status Overlay - positioned below header with safe area */}
        <View style={[styles.statusOverlay, { top: insets.top + 160 }]}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text
              style={[
                styles.statusText,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              Detecting Objects...
            </Text>
          </View>
          <Text
            style={[
              styles.statusSubtext,
              { fontFamily: FONTS.BarlowSemiCondensed },
            ]}
          >
            Point camera at objects • {latestDetections.length} detected
          </Text>
        </View>

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleCapture}
            disabled={isCapturingState}
          >
            <Ionicons name="camera" size={70} color="white" />
            <Text
              style={[
                styles.buttonText,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              Capture
            </Text>
          </TouchableOpacity>
        </View>

        <BottomNavigation />
      </View>
      </SafeAreaView>
    );
  }

  // Show captured image review page
  if (capturedImage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground style={{ flex: 1 }}>
          <CurvedHeader
            title="Alberta Health Connect"
            height={150}
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
          />
          <View style={styles.contentArea}>
            <ScrollView
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentSection}>
              <Text style={[styles.sectionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Captured Image
              </Text>

              {/* Image Preview with Bounding Boxes */}
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: `file://${capturedImage}` }}
                  style={styles.previewImage}
                  resizeMode="contain"
                  onLayout={(event) => {
                    const { width, height } = event.nativeEvent.layout;
                    setImageLayout({ width, height });
                  }}
                />
                {/* Overlay bounding boxes - only show when image layout and frame dimensions are known */}
                {imageLayout.width > 0 && frameDimensions.width > 0 && capturedDetections && capturedDetections.map((det, idx) => {
                  // Calculate scaling factors based on actual frame dimensions
                  const scaleX = imageLayout.width / frameDimensions.width;
                  const scaleY = imageLayout.height / frameDimensions.height;

                  return (
                    <View
                      key={idx}
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
                      <Text style={styles.boundingBoxLabel}>{det.label}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Detection Results Summary */}
              <View style={styles.detectionsSummary}>
                <Text style={[styles.detectionsSummaryTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Detected Objects:
                </Text>
                {capturedDetections && capturedDetections.length > 0 ? (
                  capturedDetections.map((det, idx) => (
                    <Text key={idx} style={[styles.detectionItem, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      • {det.label} ({Math.round(det.confidence * 100)}%)
                    </Text>
                  ))
                ) : (
                  <Text style={[styles.detectionItem, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    No objects detected
                  </Text>
                )}
              </View>            {/* Model Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Model Status:
                </Text>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={[styles.statusValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    {llm.isReady ? "Ready" : "Loading..."}
                  </Text>
                </View>
              </View>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Model:
                </Text>
                <Text style={[styles.statusValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Llama 3.2 3B
                </Text>
              </View>
            </View>

            {/* User Description Input */}
            <Text style={[styles.inputLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Describe what you&apos;re experiencing:
            </Text>
            <TextInput
              style={[styles.descriptionInput, { fontFamily: FONTS.BarlowSemiCondensed }]}
              placeholder="Enter your description here..."
              value={userDescription}
              onChangeText={setUserDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleReset}
              >
                <Ionicons name="trash-outline" size={20} color="#DC3545" />
                <Text style={[styles.resetButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Start Over
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.analyzeButton,
                  (!userDescription.trim() || !llm.isReady || llm.isGenerating) && styles.analyzeButtonDisabled
                ]}
                onPress={handleAnalyzeWithAI}
                disabled={!userDescription.trim() || !llm.isReady || llm.isGenerating}
              >
                {llm.isGenerating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="flash" size={20} color="white" />
                )}
                <Text style={[styles.analyzeButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {llm.isGenerating ? "Analyzing..." : !llm.isReady ? "Loading AI..." : "Analyze with AI"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* AI Assessment Results Section */}
            {llm.response && (
              <View style={styles.assessmentSection}>
                <View style={styles.responseCard}>
                  <View style={styles.responseHeader}>
                    <Ionicons name="medical" size={20} color="#2A7DE1" />
                    <Text style={[styles.responseTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      AI Assessment
                    </Text>
                  </View>

                  <Text style={[styles.responseText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    {llm.response}
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
                  onPress={handleReset}
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
        </View>
      </CurvedBackground>
      <BottomNavigation />
    </SafeAreaView>
    );
  }

  // If no captured image, return null (shouldn't happen, but safety check)
  return null;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  contentArea: {
    flex: 1,
  },
  contentSection: {
    padding: 24,
    paddingTop: 20,
  },

  // Header Overlay
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },

  // Status Overlay
  statusOverlay: {
    position: "absolute",
    top: 110,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#28A745",
    marginRight: 6,
  },
  statusText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  statusSubtext: {
    color: "white",
    fontSize: 14,
    opacity: 0.8,
  },


  // Control Buttons
  controlsContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  captureButton: {
    alignItems: "center",
    padding: 16,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Error Container
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#DC3545",
    marginTop: 20,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  errorHint: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 32,
  },

  // Loading Container
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

  // Permissions Container
  permissionsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  permissionsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  permissionsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionsButton: {
    backgroundColor: "#2A7DE1",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  permissionsButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  // Section Title
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },

  // Image Preview
  imagePreviewContainer: {
    width: "100%",
    height: 300,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
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

  // Detection Summary
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

  // Input Section
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  descriptionInput: {
    backgroundColor: "#F9F9F9",
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
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#DC3545",
    paddingVertical: 16,
    borderRadius: 12,
  },
  resetButtonText: {
    color: "#DC3545",
    fontSize: 16,
    fontWeight: "600",
  },
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
  analyzeButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  analyzeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  // Status Card (from ai-test)
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

  // AI Assessment Results Section
  assessmentSection: {
    marginTop: 24,
  },

  // Response Card (from ai-test - nice blue style)
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
