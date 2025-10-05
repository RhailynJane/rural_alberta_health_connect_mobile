import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTensorflowModel } from "react-native-fast-tflite";
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

interface ImageDimensions {
  width: number;
  height: number;
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<ImageDimensions>({
    width: 0,
    height: 0,
  });
  const [displayedImageSize, setDisplayedImageSize] = useState<ImageDimensions>(
    { width: 0, height: 0 }
  );
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize TFLite model
  const model = useTensorflowModel(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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

  // Image selection from library
  const pickImageFromLibrary = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Permission required to access photos");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1.0,
      });

      if (!result.canceled && result.assets[0]) {
        console.log("🖼️ Image selected from library");
        setSelectedImage(result.assets[0].uri);
        setOriginalImageSize({
          width: result.assets[0].width,
          height: result.assets[0].height,
        });
        setDetections([]); // Clear previous detections
      }
    } catch (error) {
      console.error("❌ Image picker error:", error);
      alert("Failed to pick image");
    }
  };

  // Image capture from camera
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        alert("Permission required to access camera");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1.0,
      });

      if (!result.canceled && result.assets[0]) {
        console.log("📸 Photo captured");
        setSelectedImage(result.assets[0].uri);
        setOriginalImageSize({
          width: result.assets[0].width,
          height: result.assets[0].height,
        });
        setDetections([]); // Clear previous detections
      }
    } catch (error) {
      console.error("❌ Camera error:", error);
      alert("Failed to take photo");
    }
  };

  // Run object detection
  const detectObjects = async () => {
    if (!selectedImage || model.state !== "loaded") {
      console.log("⚠️ Cannot detect: no image or model not ready");
      return;
    }

    setIsDetecting(true);
    setDetections([]);

    try {
      console.log("🔍 Detection started");
      console.log("Image size:", originalImageSize);
      console.log("Model inputs:", model.model.inputs);
      console.log("Model outputs:", model.model.outputs);

      // Step 1: Resize image to 300x300 (COCO SSD MobileNet V1 requirement)
      console.log("📐 Resizing image to 300x300...");
      const resizedImage = await ImageManipulator.manipulateAsync(
        selectedImage,
        [{ resize: { width: 300, height: 300 } }]
      );
      console.log("✅ Image resized:", resizedImage.uri);

      // Step 2: Attempt inference - try different input formats
      console.log("🤖 Attempting TFLite inference...");

      let outputs: any;
      let inferenceSucceeded = false;

      // Attempt 1: Try URI string directly (some implementations support this)
      try {
        console.log("  Attempt 1: Trying URI string...");
        outputs = model.model.runSync([resizedImage.uri] as any);
        inferenceSucceeded = true;
        console.log("✅ URI-based inference succeeded!");
      } catch (uriError) {
        console.log("  ❌ URI failed:", uriError);

        // Attempt 2: Try file:// protocol
        try {
          console.log("  Attempt 2: Trying file:// URI...");
          const fileUri = resizedImage.uri.startsWith('file://')
            ? resizedImage.uri
            : `file://${resizedImage.uri}`;
          outputs = model.model.runSync([fileUri] as any);
          inferenceSucceeded = true;
          console.log("✅ file:// URI inference succeeded!");
        } catch (fileError) {
          console.log("  ❌ file:// failed:", fileError);
          throw new Error("Image input format not supported. react-native-fast-tflite requires VisionCamera integration or raw RGB pixel data.");
        }
      }

      if (inferenceSucceeded) {
        console.log("✅ Inference complete, outputs:", outputs.length);

        // Step 4: Parse outputs
        // SSD MobileNet V1 outputs:
        //   [0]: bounding boxes [1, num_detections, 4] - [ymin, xmin, ymax, xmax] normalized 0-1
        //   [1]: class indices [1, num_detections]
        //   [2]: confidence scores [1, num_detections]
        //   [3]: number of valid detections [1]

        const boxes = outputs[0]; // Float32Array or similar
        const classes = outputs[1];
        const scores = outputs[2];
        const numDetections = Math.min(Number(outputs[3][0]) || 10, 10); // Max 10 detections

        console.log(`📊 Found ${numDetections} detections`);

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

            // Convert normalized coordinates to pixel coordinates (original image size)
            const box: BoundingBox = {
              x: xmin * originalImageSize.width,
              y: ymin * originalImageSize.height,
              width: (xmax - xmin) * originalImageSize.width,
              height: (ymax - ymin) * originalImageSize.height,
            };

            foundDetections.push({
              label,
              confidence,
              box,
            });

            console.log(`  ${i + 1}. ${label} (${(confidence * 100).toFixed(1)}%) at [${Math.round(box.x)}, ${Math.round(box.y)}, ${Math.round(box.width)}×${Math.round(box.height)}]`);
          }
        }

        setDetections(foundDetections);
        console.log(`✅ Showing ${foundDetections.length} detections above 50% confidence`);
      }

    } catch (error) {
      console.error("❌ Detection failed:", error);
      alert(`Detection failed: ${error}`);
      setDetections([]);
    } finally {
      setIsDetecting(false);
    }
  };

  // Clear current image and detections
  const handleClear = () => {
    console.log("🔄 Clearing image and detections");
    setSelectedImage(null);
    setDetections([]);
    setOriginalImageSize({ width: 0, height: 0 });
    setDisplayedImageSize({ width: 0, height: 0 });
  };

  // Calculate scale factor for bounding boxes
  const imageScale =
    displayedImageSize.width > 0 && originalImageSize.width > 0
      ? displayedImageSize.width / originalImageSize.width
      : 1;

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

  // Main interface
  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <CurvedHeader title="Vision Model Test" height={120} showLogo={true} />

          <View style={styles.contentSection}>
            {/* Header Section */}
            <View style={styles.headerSection}>
              <Text
                style={[
                  styles.pageTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                👁️ Vision Model Test
              </Text>
              <Text
                style={[
                  styles.pageSubtitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Testing TFLite object detection with COCO dataset
              </Text>
            </View>

            {/* Model Status Card */}
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
                    ✅ Ready
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
                  COCO SSD MobileNet V1
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text
                  style={[
                    styles.statusLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Classes:
                </Text>
                <Text
                  style={[
                    styles.statusValue,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  90 COCO objects
                </Text>
              </View>
            </View>

            {/* Test Instructions */}
            <View style={styles.instructionsCard}>
              <Text
                style={[
                  styles.instructionsTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                📝 How to Test:
              </Text>
              <Text
                style={[
                  styles.instructionsText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                1. Upload any photo (people, objects, animals)
              </Text>
              <Text
                style={[
                  styles.instructionsText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                2. Tap &quot;🔍 Detect Objects&quot;
              </Text>
              <Text
                style={[
                  styles.instructionsText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                3. Bounding boxes will appear around detected items
              </Text>
              <Text
                style={[
                  styles.instructionsText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                4. Check if detections are accurate
              </Text>
              <Text
                style={[
                  styles.instructionsTip,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                💡 Tip: COCO model detects common objects like people, cars,
                animals, furniture, etc.
              </Text>
            </View>

            {/* Image Upload Section */}
            <View style={styles.uploadSection}>
              <Text
                style={[
                  styles.sectionLabel,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Select Image
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera" size={20} color="white" />
                  <Text
                    style={[
                      styles.uploadButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    📸 Take Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={pickImageFromLibrary}
                >
                  <Ionicons name="images" size={20} color="white" />
                  <Text
                    style={[
                      styles.uploadButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    🖼️ Choose from Library
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Image Display with Bounding Boxes */}
            {selectedImage && (
              <View style={styles.imageSection}>
                <View style={styles.imageContainer}>
                  {/* Base Image */}
                  <RNImage
                    source={{ uri: selectedImage }}
                    style={styles.detectionImage}
                    onLayout={(event) => {
                      const { width, height } = event.nativeEvent.layout;
                      setDisplayedImageSize({ width, height });
                      console.log("📐 Displayed image size:", { width, height });
                    }}
                    resizeMode="contain"
                  />

                  {/* Bounding Box Overlays */}
                  {detections.map((detection, index) => {
                    const scaledBox = {
                      left: detection.box.x * imageScale,
                      top: detection.box.y * imageScale,
                      width: detection.box.width * imageScale,
                      height: detection.box.height * imageScale,
                    };

                    return (
                      <View
                        key={index}
                        style={[
                          styles.boundingBox,
                          scaledBox,
                          {
                            borderColor: getColorForClass(detection.label),
                          },
                        ]}
                      >
                        {/* Label above box */}
                        <View
                          style={[
                            styles.labelContainer,
                            {
                              backgroundColor: getColorForClass(
                                detection.label
                              ),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.labelText,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                            ]}
                          >
                            {detection.label}{" "}
                            {(detection.confidence * 100).toFixed(0)}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.detectButton,
                      isDetecting && styles.detectButtonDisabled,
                    ]}
                    onPress={detectObjects}
                    disabled={isDetecting}
                  >
                    {isDetecting ? (
                      <>
                        <ActivityIndicator size="small" color="white" />
                        <Text
                          style={[
                            styles.detectButtonText,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          Detecting...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="scan" size={20} color="white" />
                        <Text
                          style={[
                            styles.detectButtonText,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          🔍 Detect Objects
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClear}
                    disabled={isDetecting}
                  >
                    <Ionicons name="close-circle" size={20} color="#DC3545" />
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
              </View>
            )}

            {/* Detection Results List */}
            {detections.length > 0 && (
              <View style={styles.resultsCard}>
                <Text
                  style={[
                    styles.resultsTitle,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Detected Objects ({detections.length})
                </Text>
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
                    <Text
                      style={[
                        styles.resultBox,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      [{Math.round(d.box.x)}, {Math.round(d.box.y)},{" "}
                      {Math.round(d.box.width)}×{Math.round(d.box.height)}]
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Debug Info (dev mode only) */}
            {__DEV__ && (
              <View style={styles.debugCard}>
                <Text
                  style={[
                    styles.debugTitle,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Debug Info
                </Text>
                <Text
                  style={[
                    styles.debugText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Model State: {model.state}
                </Text>
                <Text
                  style={[
                    styles.debugText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Image Selected: {selectedImage ? "✅" : "❌"}
                </Text>
                <Text
                  style={[
                    styles.debugText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Original Size: {originalImageSize.width}×
                  {originalImageSize.height}
                </Text>
                <Text
                  style={[
                    styles.debugText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Displayed Size: {Math.round(displayedImageSize.width)}×
                  {Math.round(displayedImageSize.height)}
                </Text>
                <Text
                  style={[
                    styles.debugText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Image Scale: {imageScale.toFixed(3)}
                </Text>
                <Text
                  style={[
                    styles.debugText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Detections: {detections.length}
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

  // Instructions Card
  instructionsCard: {
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2A7DE1",
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 6,
  },
  instructionsTip: {
    fontSize: 14,
    color: "#2A7DE1",
    marginTop: 8,
    fontWeight: "600",
  },

  // Upload Section
  uploadSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A7DE1",
    padding: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  uploadButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Image Section
  imageSection: {
    marginBottom: 20,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  detectionImage: {
    width: "100%",
    height: "100%",
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

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  detectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#28A745",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  detectButtonDisabled: {
    backgroundColor: "#B0BEC5",
    opacity: 0.6,
  },
  detectButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DC3545",
  },
  clearButtonText: {
    color: "#DC3545",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Results Card
  resultsCard: {
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
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
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
  resultBox: {
    fontSize: 11,
    color: "#666",
    fontFamily: "monospace",
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
