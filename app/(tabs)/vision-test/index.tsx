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
import { Camera, useCameraDevice, useCameraPermission, useSkiaFrameProcessor, runAtTargetFps } from "react-native-vision-camera";
import { Skia, PaintStyle } from "@shopify/react-native-skia";
import { useResizePlugin } from "vision-camera-resize-plugin";
import { useTensorflowModel } from "react-native-fast-tflite";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const [detectionCount, setDetectionCount] = useState(0);

  // Camera setup
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const { resize } = useResizePlugin();

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

  // Real-time TFLite detection with Skia rendering
  const frameProcessor = useSkiaFrameProcessor((frame) => {
    'worklet'

    // STEP 1: Render the camera frame (REQUIRED)
    frame.render();

    // Only run detection if model is loaded
    if (model.state !== 'loaded') return;

    // Run detection at 10 FPS for performance
    runAtTargetFps(10, () => {
      'worklet'

      try {
        // STEP 2: Resize frame to 300x300 RGB (COCO SSD requirement)
        const resized = resize(frame, {
          scale: { width: 300, height: 300 },
          pixelFormat: 'rgb',
          dataType: 'uint8',
        });

        // STEP 3: Run TFLite inference
        const outputs = model.model.runSync([resized]);

        // STEP 4: Parse outputs
        // SSD MobileNet V1 outputs:
        //   [0]: bounding boxes [1, num_detections, 4] - [ymin, xmin, ymax, xmax] normalized 0-1
        //   [1]: class indices [1, num_detections]
        //   [2]: confidence scores [1, num_detections]
        //   [3]: number of valid detections [1]

        const boxes = outputs[0];
        const classes = outputs[1];
        const scores = outputs[2];
        const numDetections = Math.min(Number(outputs[3][0]) || 10, 10);

        let detectedCount = 0;

        // STEP 5: Draw bounding boxes for each detection
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

            // Draw bounding box
            const rect = Skia.XYWHRect(x, y, width, height);
            const paint = Skia.Paint();
            paint.setColor(Skia.Color(getColorForClass(label)));
            paint.setStyle(PaintStyle.Stroke);
            paint.setStrokeWidth(3);
            frame.drawRect(rect, paint);

            // Draw label background (filled rectangle)
            const labelHeight = 25;
            const labelWidth = 150;
            const labelBgRect = Skia.XYWHRect(x, y - labelHeight, labelWidth, labelHeight);
            const labelBgPaint = Skia.Paint();
            labelBgPaint.setColor(Skia.Color(getColorForClass(label)));
            labelBgPaint.setStyle(PaintStyle.Fill);
            frame.drawRect(labelBgRect, labelBgPaint);

            detectedCount++;
          }
        }

        // Update detection count (note: this won't trigger re-render in worklet)
        // We're just tracking it for potential future use
        if (detectedCount > 0) {
          console.log(`Detected ${detectedCount} objects`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Frame processing error:", errorMessage);
      }
    });
  }, [model, resize]);

  const handleFreeze = () => {
    console.log("🔄 Freezing camera view");
    setIsCameraActive(false);
  };

  const handleContinue = () => {
    console.log("▶️ Resuming camera view");
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
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Ionicons name="play-circle" size={70} color="white" />
              <Text
                style={[
                  styles.buttonText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Continue
            </Text>
            </TouchableOpacity>
          )}
        </View>

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
});
