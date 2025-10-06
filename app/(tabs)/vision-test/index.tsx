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
  View,
} from "react-native";
import { useTensorflowModel } from "react-native-fast-tflite";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const [isCameraActive, setIsCameraActive] = useState(true);

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

  // Confirmation state (for testing flow)
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [userDescription, setUserDescription] = useState("");
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 });
  const [frameDimensions, setFrameDimensions] = useState({ width: 0, height: 0 });

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

  useEffect(() => {
    console.log("👁️ Vision Test Screen Mounted");
    console.log("📊 Model State:", {
      isReady: model.state === "loaded",
      state: model.state,
    });

    // Mark as initialized once model is ready
    if (model.state === "loaded" && isInitializing) {
      console.log("✅ Vision model initialized successfully");
      setIsInitializing(false);
    }
  }, [model.state, isInitializing]);

  // Real-time TFLite detection with Skia rendering
  const frameProcessor = useSkiaFrameProcessor((frame) => {
    'worklet'

    // STEP 1: Render the camera frame (REQUIRED)
    frame.render();

    // Save frame dimensions once (for bounding box scaling)
    if (frameDimensions.width === 0) {
      saveFrameDimensions(frame.width, frame.height);
    }

    // STEP 2: Run detection at 10 FPS (update cache)
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
            }
          }

          // Update cache for rendering (this happens at 10 FPS)
          cachedDetections.value = newDetections;

          // Also update JS state for capture (map to simpler format with confidence)
          const detectionsForJS = newDetections.map(det => ({
            label: det.label,
            confidence: 0.85, // Placeholder - we can get actual confidence from scores array
            x: det.x,
            y: det.y,
            width: det.width,
            height: det.height,
          }));
          updateLatestDetections(detectionsForJS);

          if (newDetections.length > 0) {
            console.log(`Detected ${newDetections.length} objects`);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("❌ Detection error:", errorMessage);
        }
      });
    }

    // STEP 3: Draw boxes EVERY frame from cached detections (runs at 30-60 FPS)
    const detections = cachedDetections.value;

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

  }, [model, resize, cachedDetections, updateLatestDetections, frameDimensions, saveFrameDimensions]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      // STEP 1: Get current detections immediately (from last frame)
      const currentDetections = [...latestDetections]; // Copy immediately
      console.log('🎯 Detections at capture time:', currentDetections);

      // STEP 2: Take photo FIRST (while camera is still active)
      const photo = await cameraRef.current.takePhoto();
      console.log('📸 Photo captured:', photo.path);

      // STEP 3: Freeze camera AFTER photo is taken
      setIsCameraActive(false);

      // STEP 4: Save both to state
      setCapturedImage(photo.path);
      setCapturedDetections(currentDetections);

      console.log('✅ Capture complete with', currentDetections.length, 'detections');

    } catch (error) {
      console.error('❌ Capture failed:', error);
      // Show the actual error message
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      // Re-enable camera on error
      setIsCameraActive(true);
    }
  };

  const handleContinue = () => {
    console.log("▶️ Resuming camera view");
    setCapturedImage(null);
    setCapturedDetections(null);
    setIsCameraActive(true);
  };

  const handleUsePhoto = () => {
    console.log("✅ User confirmed photo");
    setIsConfirmed(true);
  };

  const handleReset = () => {
    console.log("🔄 Resetting capture");
    setCapturedImage(null);
    setCapturedDetections(null);
    setIsConfirmed(false);
    setUserDescription("");
    setIsCameraActive(true);
  };

  const handleAnalyzeWithAI = () => {
    console.log("🤖 Analyzing with AI:");
    console.log("  Image:", capturedImage);
    console.log("  Detections:", capturedDetections);
    console.log("  User Description:", userDescription);
    // TODO: Call LLM API here
  };

  // Show model loading error
  if (model.state === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <CurvedHeader title="Vision Model Test" height={120} showLogo={true} />

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
          <BottomNavigation />
        </CurvedBackground>
      </SafeAreaView>
    );
  }

  // Show initializing screen
  if (isInitializing || model.state !== "loaded") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <CurvedHeader title="Vision Model Test" height={120} showLogo={true} />

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
          <BottomNavigation />
        </CurvedBackground>
      </SafeAreaView>
    );
  }

  // Camera permissions screen
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <CurvedHeader title="Vision Model Test" height={120} showLogo={true} />

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
          <BottomNavigation />
        </CurvedBackground>
      </SafeAreaView>
    );
  }

  // No camera device found
  if (device == null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <CurvedHeader title="Vision Model Test" height={120} showLogo={true} />

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
          <BottomNavigation />
        </CurvedBackground>
      </SafeAreaView>
    );
  }

  // Main camera interface with Skia drawing
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.fullScreen}>
        {/* Camera View with Skia Frame Processor */}
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isCameraActive}
          frameProcessor={frameProcessor}
          photo={true}
        />

        {/* Curved Header Overlay */}
        <View style={styles.headerOverlay}>
          <CurvedHeader title="Real-Time Detection" height={100} showLogo={false} />
        </View>

        {/* Status Overlay */}
        <View style={styles.statusOverlay}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text
              style={[
                styles.statusText,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              COCO Model Ready ✅
            </Text>
          </View>
          <Text
            style={[
              styles.statusSubtext,
              { fontFamily: FONTS.BarlowSemiCondensed },
            ]}
          >
            Point camera at objects to detect
          </Text>
        </View>

        {/* Captured Results Overlay */}
        {capturedImage && capturedDetections && (
          <View style={styles.resultsOverlay}>
            <Text style={[styles.resultsTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Captured Detections:
            </Text>
            {capturedDetections.length > 0 ? (
              capturedDetections.map((det, idx) => (
                <Text key={idx} style={[styles.detectionText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {det.label}
                </Text>
              ))
            ) : (
              <Text style={[styles.detectionText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                No objects detected
              </Text>
            )}
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          {isCameraActive ? (
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapture}
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
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleContinue}
              >
                <Ionicons name="refresh" size={40} color="white" />
                <Text
                  style={[
                    styles.buttonText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Retake
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleUsePhoto}
              >
                <Ionicons name="checkmark-circle" size={40} color="white" />
                <Text
                  style={[
                    styles.buttonText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Use This Photo
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Confirmation Section - Shows when user clicks "Use This Photo" */}
        {isConfirmed && capturedImage && capturedDetections && (
          <ScrollView style={styles.confirmationSection} contentContainerStyle={styles.confirmationContent}>
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
              {imageLayout.width > 0 && frameDimensions.width > 0 && capturedDetections.map((det, idx) => {
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
                style={styles.analyzeButton}
                onPress={handleAnalyzeWithAI}
                disabled={!userDescription.trim()}
              >
                <Ionicons name="flash" size={20} color="white" />
                <Text style={[styles.analyzeButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Analyze with AI
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        <BottomNavigation />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  fullScreen: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 80,
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

  // Results Overlay
  resultsOverlay: {
    position: "absolute",
    top: 180,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 16,
    borderRadius: 12,
    maxHeight: 200,
  },
  resultsTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  detectionText: {
    color: "white",
    fontSize: 16,
    marginBottom: 6,
    paddingLeft: 8,
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
  continueButton: {
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

  // Button Row (for Retake + Use This Photo)
  buttonRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  primaryButton: {
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(42, 125, 225, 0.9)",
    borderRadius: 12,
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(128, 128, 128, 0.7)",
    borderRadius: 12,
    flex: 1,
  },

  // Confirmation Section
  confirmationSection: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 80,
    backgroundColor: "white",
    zIndex: 100,
  },
  confirmationContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },

  // Image Preview
  imagePreviewContainer: {
    width: "100%",
    height: 250,
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
  analyzeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
