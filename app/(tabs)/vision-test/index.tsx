import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Camera, useCameraDevice, useCameraPermission, useSkiaFrameProcessor } from "react-native-vision-camera";
import { Skia, PaintStyle } from "@shopify/react-native-skia";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function VisionTest() {
  const [isCameraActive, setIsCameraActive] = useState(true);

  // Camera setup
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  // Minimal Skia Frame Processor - Just draw a static red box
  const frameProcessor = useSkiaFrameProcessor((frame) => {
    'worklet'

    // STEP 1: Render the camera frame (REQUIRED)
    frame.render();

    // STEP 2: Draw a static red rectangle in the center
    const centerX = frame.width / 2;
    const centerY = frame.height / 2;
    const boxSize = 200;

    // Create rectangle (centered at centerX, centerY)
    const rect = Skia.XYWHRect(
      centerX - boxSize / 2,  // x (left edge)
      centerY - boxSize / 2,  // y (top edge)
      boxSize,                 // width
      boxSize                  // height
    );

    // Create red paint with stroke (outline)
    const paint = Skia.Paint();
    paint.setColor(Skia.Color('red'));
    paint.setStyle(PaintStyle.Stroke); // Outline only (not filled)
    paint.setStrokeWidth(4);

    // Draw the rectangle
    frame.drawRect(rect, paint);

    // Draw text label
    const textPaint = Skia.Paint();
    textPaint.setColor(Skia.Color('red'));
    const font = Skia.Font(null, 24);
    frame.drawText(
      'Skia Test Box',
      centerX - 70,
      centerY - boxSize / 2 - 10,
      textPaint,
      font
    );
  }, []);

  const handleFreeze = () => {
    console.log("🔄 Freezing camera view");
    setIsCameraActive(false);
  };

  const handleContinue = () => {
    console.log("▶️ Resuming camera view");
    setIsCameraActive(true);
  };

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
          <CurvedHeader title="Skia Test" height={100} showLogo={false} />
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
              🎨 Skia Frame Processor Test
            </Text>
          </View>
          <Text
            style={[
              styles.statusSubtext,
              { fontFamily: FONTS.BarlowSemiCondensed },
            ]}
          >
            Look for the red box!
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
