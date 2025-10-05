import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from "react-native-vision-camera";
import { useResizePlugin } from "vision-camera-resize-plugin";
import { useTensorflowModel } from "react-native-fast-tflite";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

// COCO labels - imported statically
import cocoLabelsData from "../../../assets/models/coco_labels.json";
const COCO_LABELS = cocoLabelsData.labels;

// Types for detection results
interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Detection {
  label: string;
  confidence: number;
  box: BoundingBox;
}

// Color coding for different object categories
const getColorForClass = (className: string): string => {
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
  const detectionsShared = useSharedValue<Detection[]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(true);

  // Camera setup
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const { resize } = useResizePlugin();

  // Frame counter for performance optimization
  const frameCounter = useSharedValue(0);

  // Initialize TFLite model
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const model = useTensorflowModel(
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

  // Sync shared value to React state every 200ms for UI updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDetections(detectionsShared.value);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Real-time frame processor
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'

    // Process every 3rd frame for performance (30fps → ~10fps detection)
    frameCounter.value++;
    if (frameCounter.value % 3 !== 0) return;

    if (model.state !== 'loaded') return;

    try {
      console.log("🔍 Frame processor: Starting...");

      // Step 1: Resize frame to 300x300 RGB (COCO SSD MobileNet V1 requirement)
      console.log("📐 Resizing frame to 300x300...");
      const resized = resize(frame, {
        scale: { width: 300, height: 300 },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      });
      console.log("✅ Resize complete. Type:", typeof resized, "Length:", resized?.length);

      // Step 2: Run TFLite inference (synchronous for performance)
      console.log("🤖 Running TFLite inference...");
      const outputs = model.model.runSync([resized]);
      console.log("✅ Inference complete. Outputs:", outputs?.length);

      // Step 3: Parse outputs
      // SSD MobileNet V1 outputs:
      //   [0]: bounding boxes [1, num_detections, 4] - [ymin, xmin, ymax, xmax] normalized 0-1
      //   [1]: class indices [1, num_detections]
      //   [2]: confidence scores [1, num_detections]
      //   [3]: number of valid detections [1]

      const boxes = outputs[0];
      const classes = outputs[1];
      const scores = outputs[2];
      const numDetections = Math.min(Number(outputs[3][0]) || 10, 10);

      const foundDetections: Detection[] = [];

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

          // Convert normalized coordinates to pixel coordinates (frame size)
          foundDetections.push({
            label,
            confidence,
            box: {
              x: xmin * frame.width,
              y: ymin * frame.height,
              width: (xmax - xmin) * frame.width,
              height: (ymax - ymin) * frame.height,
            },
          });
        }
      }

      // Step 4: Update React state (must use runOnJS)
      console.log("📊 Found detections:", foundDetections.length);

      // Convert to plain object for serialization across worklet boundary
      const serializedDetections = foundDetections.map(d => ({
        label: String(d.label),
        confidence: Number(d.confidence),
        box: {
          x: Number(d.box.x),
          y: Number(d.box.y),
          width: Number(d.box.width),
          height: Number(d.box.height),
        },
      }));

      // Update shared value directly (no runOnJS needed)
      detectionsShared.value = serializedDetections;

    } catch (error) {
      // Serialize error to string for better visibility in worklet context
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error("❌ Frame processing error:", errorMessage);
      console.error("Stack:", errorStack);
    }
  }, [model]);

  const handleFreeze = () => {
    console.log("🔄 Freezing camera view");
    setIsCameraActive(false);
  };

  const handleContinue = () => {
    console.log("▶️ Resuming camera view");
    setIsCameraActive(true);
  };

  const handleClear = () => {
    console.log("🔄 Clearing detections and resuming");
    setDetections([]);
    setIsCameraActive(true);
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
                  Vision test requires camera access to detect objects in real-time.
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

  // Main camera interface with real-time detection
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.fullScreen}>
        {/* Camera View */}
        <Camera
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

        {/* Bounding Box Overlays */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {detections.map((detection, index) => (
            <View
              key={index}
              style={[
                styles.boundingBox,
                {
                  left: detection.box.x,
                  top: detection.box.y,
                  width: detection.box.width,
                  height: detection.box.height,
                  borderColor: getColorForClass(detection.label),
                },
              ]}
            >
              {/* Label above box */}
              <View
                style={[
                  styles.labelContainer,
                  {
                    backgroundColor: getColorForClass(detection.label),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.labelText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  {detection.label} {(detection.confidence * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          ))}
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
              COCO Model Ready
            </Text>
          </View>
          <Text
            style={[
              styles.detectionCount,
              { fontFamily: FONTS.BarlowSemiCondensed },
            ]}
          >
            Detections: {detections.length}
          </Text>
        </View>

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          {isCameraActive ? (
            <TouchableOpacity
              style={styles.freezeButton}
              onPress={handleFreeze}
            >
              <Ionicons name="pause-circle" size={70} color="white" />
              <Text
                style={[
                  styles.buttonText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Freeze
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.frozenControls}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
              >
                <Ionicons name="play-circle" size={40} color="#2A7DE1" />
                <Text
                  style={[
                    styles.continueButtonText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Continue
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClear}
              >
                <Ionicons name="refresh-circle" size={40} color="#DC3545" />
                <Text
                  style={[
                    styles.clearButtonText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Detection Results List (when frozen) */}
        {!isCameraActive && detections.length > 0 && (
          <View style={styles.resultsCard}>
            <Text
              style={[
                styles.resultsTitle,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              Detected Objects ({detections.length})
            </Text>
            <ScrollView style={styles.resultsList}>
              {detections.map((d, i) => (
                <View key={i} style={styles.resultItem}>
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: getColorForClass(d.label) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.resultLabel,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    {d.label}
                  </Text>
                  <Text
                    style={[
                      styles.resultConfidence,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    {(d.confidence * 100).toFixed(0)}%
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
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

  // Bounding Boxes
  boundingBox: {
    position: "absolute",
    borderWidth: 3,
    borderStyle: "solid",
    backgroundColor: "transparent",
  },
  labelContainer: {
    position: "absolute",
    top: -25,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  labelText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },

  // Status Overlay
  statusOverlay: {
    position: "absolute",
    top: 110,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 12,
    borderRadius: 8,
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
  statusText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  detectionCount: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  // Control Buttons
  controlsContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  freezeButton: {
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
  frozenControls: {
    flexDirection: "row",
    gap: 20,
  },
  continueButton: {
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  continueButtonText: {
    color: "#2A7DE1",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  clearButtonText: {
    color: "#DC3545",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },

  // Results Card
  resultsCard: {
    position: "absolute",
    bottom: 200,
    left: 16,
    right: 16,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    maxHeight: 250,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  resultsList: {
    maxHeight: 150,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  resultLabel: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  resultConfidence: {
    fontSize: 14,
    color: "#28A745",
    fontWeight: "600",
    marginRight: 10,
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
});
