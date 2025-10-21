import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTensorflowModel } from "react-native-fast-tflite";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Camera,
  runAtTargetFps,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import { useResizePlugin } from "vision-camera-resize-plugin";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";
import { useVisionSession } from "./VisionSessionContext";

import cocoLabelsData from "../../../assets/models/coco_labels.json";
const COCO_LABELS = cocoLabelsData.labels;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Colors for detections are assigned inside the worklet via a local palette.

interface Detection {
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export default function VisionCameraScreen() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [latestDetections, setLatestDetections] = useState<Detection[]>([]);
  const [frameDimensions, setFrameDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const lastNonEmptyDetectionsRef = useRef<Detection[]>([]);
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const { resize } = useResizePlugin();
  const router = useRouter();
  const {
    setCapturedImage,
    setCapturedDetections,
    setFrameDimensions: setSessionFrameDimensions,
  } = useVisionSession();

  // Create callback to update JS detections from worklet
  const updateLatestDetections = Worklets.createRunOnJS(
    (detections: Detection[]) => {
      setLatestDetections(detections);
      if (detections && detections.length > 0) {
        lastNonEmptyDetectionsRef.current = detections;
      }
    }
  );

  // Create callback to save frame dimensions (called once)
  const saveFrameDimensions = Worklets.createRunOnJS(
    (width: number, height: number) => {
      setFrameDimensions({ width, height });
    }
  );
  // Create callback to log errors from inside the worklet with a readable message
  const logFrameError = Worklets.createRunOnJS((message: string) => {
    console.log("Frame processing error:", message);
  });

  const model = useTensorflowModel(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../../assets/models/coco_ssd_mobilenet_v1.tflite")
  );

  useEffect(() => {
    if (model.state === "loaded" && isInitializing) {
      setIsInitializing(false);
    }
  }, [model.state, isInitializing]);

  // Sync frame dimensions into session context once known
  useEffect(() => {
    if (frameDimensions.width > 0 && frameDimensions.height > 0) {
      setSessionFrameDimensions(frameDimensions);
    }
  }, [frameDimensions, setSessionFrameDimensions]);

  // Cleanup: Deactivate camera on unmount to prevent memory leaks
  useEffect(() => {
    setIsCameraActive(true);
    return () => {
      setIsCameraActive(false);
      setLatestDetections([]);
      lastNonEmptyDetectionsRef.current = [];
    };
  }, []);

  // Frame processor - using useMemo to create the processor object manually
  // This approach works without useFrameProcessor hook
  const tflitePtr: any = (model as any)?.model ?? null;
  const frameProcessor = useMemo(() => {
    // Capture the JSI TFLite model reference for use in the worklet
    const tfliteModel: any = tflitePtr ?? undefined;
    // One-time flags inside the worklet closure to reduce log spam
    let didLogFirstFrame = false;
    let didWarnMissingModel = false;
    // Simple temporal smoothing to reduce flicker: keep last detections
    let lastSelected: Detection[] = [];
    let emptyStreak = 0; // number of consecutive empty frames
    // IoU-based short-term tracking with hysteresis
    type Track = Detection & { misses: number };
    let tracks: Track[] = [];
    const workletFunction = (frame: any) => {
      "worklet";

      if (isCapturing) return;

      if (frameDimensions.width === 0) {
        saveFrameDimensions(frame.width, frame.height);
      }

      // Mark first frame received (silent)
      if (!didLogFirstFrame) {
        didLogFirstFrame = true;
      }

      if (tfliteModel) {
        runAtTargetFps(10, () => {
          "worklet";
          try {
            const resized = resize(frame, {
              scale: { width: 300, height: 300 },
              pixelFormat: "rgb",
              dataType: "uint8",
            });

            // Run the model with the resized frame
            const outputs = tfliteModel.runSync
              ? tfliteModel.runSync([resized])
              : undefined;
            if (!outputs) {
              throw new Error(
                "TFLite runSync returned no outputs (model not available on worklet?)"
              );
            }
            // Some SSD models return batched outputs: [1, 10, 4], [1, 10], [1, 10], [1]
            const rawBoxes: any = outputs[0];
            const rawClasses: any = outputs[1];
            const rawScores: any = outputs[2];
            const rawCount: any = outputs[3];
            const boxes =
              Array.isArray(rawBoxes?.[0]) && Array.isArray(rawBoxes?.[0][0])
                ? rawBoxes[0]
                : rawBoxes;
            const classes =
              Array.isArray(rawClasses?.[0]) &&
              !Array.isArray(rawClasses?.[0][0])
                ? rawClasses[0]
                : rawClasses;
            const scores =
              Array.isArray(rawScores?.[0]) && !Array.isArray(rawScores?.[0][0])
                ? rawScores[0]
                : rawScores;
            const countValue = Array.isArray(rawCount) ? rawCount[0] : rawCount;
            const numDetections = Math.min(Number(countValue) || 10, 10);
            const newDetections: Detection[] = [];
            // Local palette to avoid calling JS functions from worklet
            const palette = [
              "#FF6B6B",
              "#4ECDC4",
              "#95E1D3",
              "#FFD93D",
              "#A8E6CF",
              "#2A7DE1",
            ];
            const CONF_THRESHOLD = 0.6;
            // Helpers
            // Map COCO-SSD class IDs (1..90) to 0-based index in 80-class labels by skipping missing IDs
            const MISSING_IDS = [12, 26, 29, 30, 45, 66, 68, 69, 71, 83];
            function mapClassIdToIndex80(classId: number) {
              const id = Math.max(1, Math.round(classId));
              const missingBefore = MISSING_IDS.reduce(
                (c, m) => c + (m <= id ? 1 : 0),
                0
              );
              const idx = id - 1 - missingBefore;
              return idx;
            }
            function clamp(v: number, min: number, max: number) {
              return Math.max(min, Math.min(max, v));
            }

            const FRAME_AREA = SCREEN_WIDTH * SCREEN_HEIGHT;
            const LARGE_BOX_RATIO = 0.5; // drop very large boxes unless very confident
            const LARGE_BOX_MIN_CONF = 0.8;

            for (let i = 0; i < numDetections; i++) {
              const confidence = Number(scores?.[i] ?? 0);
              if (confidence >= CONF_THRESHOLD) {
                const classId = Number(classes?.[i] ?? -1);
                const idx80 = mapClassIdToIndex80(classId);
                const label = COCO_LABELS[idx80] || `Class ${classId}`;
                // Handle either flat [10*4] or nested [10][4] boxes
                let ymin = 0,
                  xmin = 0,
                  ymax = 0,
                  xmax = 0;
                const maybeRow: any = (boxes && (boxes as any)[i]) as any;
                if (
                  maybeRow &&
                  (Array.isArray(maybeRow) ||
                    typeof maybeRow?.length === "number")
                ) {
                  ymin = clamp(Number(maybeRow[0] ?? 0), 0, 1);
                  xmin = clamp(Number(maybeRow[1] ?? 0), 0, 1);
                  ymax = clamp(Number(maybeRow[2] ?? 0), 0, 1);
                  xmax = clamp(Number(maybeRow[3] ?? 0), 0, 1);
                } else {
                  ymin = clamp(Number((boxes as any)?.[i * 4 + 0] ?? 0), 0, 1);
                  xmin = clamp(Number((boxes as any)?.[i * 4 + 1] ?? 0), 0, 1);
                  ymax = clamp(Number((boxes as any)?.[i * 4 + 2] ?? 0), 0, 1);
                  xmax = clamp(Number((boxes as any)?.[i * 4 + 3] ?? 0), 0, 1);
                }

                const x = xmin * SCREEN_WIDTH;
                const y = ymin * SCREEN_HEIGHT;
                const width = (xmax - xmin) * SCREEN_WIDTH;
                const height = (ymax - ymin) * SCREEN_HEIGHT;

                // Suppress implausibly large boxes unless very confident
                const areaRatio = (width * height) / FRAME_AREA;
                if (
                  areaRatio > LARGE_BOX_RATIO &&
                  confidence < LARGE_BOX_MIN_CONF
                ) {
                  continue;
                }

                newDetections.push({
                  label,
                  color: palette[(idx80 >= 0 ? idx80 : 0) % palette.length],
                  confidence,
                  x,
                  y,
                  width,
                  height,
                });
              }
            }
            // Non-Max Suppression to reduce overlapping false positives
            const IOU_THRESHOLD = 0.5;
            const MAX_DETECTIONS = 5;
            // Sort by confidence desc
            const sorted = newDetections.sort(
              (a, b) => b.confidence - a.confidence
            );
            // Per-class NMS to avoid cross-class suppression
            const selected: Detection[] = [];
            function iou(a: Detection, b: Detection) {
              const x1 = Math.max(a.x, b.x);
              const y1 = Math.max(a.y, b.y);
              const x2 = Math.min(a.x + a.width, b.x + b.width);
              const y2 = Math.min(a.y + a.height, b.y + b.height);
              const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
              const areaA = a.width * a.height;
              const areaB = b.width * b.height;
              const union = areaA + areaB - inter;
              return union > 0 ? inter / union : 0;
            }
            const byLabel: Record<string, Detection[]> = {};
            for (const det of sorted) {
              if (!byLabel[det.label]) byLabel[det.label] = [];
              byLabel[det.label].push(det);
            }
            const perLabelSelected: Detection[] = [];
            for (const label in byLabel) {
              const list = byLabel[label];
              const kept: Detection[] = [];
              for (let i = 0; i < list.length; i++) {
                const cand = list[i];
                let ok = true;
                for (let j = 0; j < kept.length; j++) {
                  if (iou(cand, kept[j]) > IOU_THRESHOLD) {
                    ok = false;
                    break;
                  }
                }
                if (ok) kept.push(cand);
                if (kept.length >= MAX_DETECTIONS) break;
              }
              perLabelSelected.push(...kept);
            }
            // Limit overall count by top confidence
            perLabelSelected.sort((a, b) => b.confidence - a.confidence);
            selected.push(...perLabelSelected.slice(0, MAX_DETECTIONS));
            // IoU-based tracking with hysteresis thresholds to reduce flicker
            const MATCH_IOU = 0.4;
            const ADD_THRESHOLD = 0.55; // slightly lower to start track
            const KEEP_THRESHOLD = 0.45; // slightly lower to continue
            const MAX_MISSES = 8; // keep tracks even longer

            // Try to match current detections to existing tracks
            const used = new Array(selected.length).fill(false);
            // Smoothing factors
            const GEO_ALPHA = 0.6; // weight for current geometry vs previous
            const CONF_ALPHA = 0.7; // EMA for confidence

            for (let t = 0; t < tracks.length; t++) {
              let bestIdx = -1;
              let bestIou = 0;
              for (let i = 0; i < selected.length; i++) {
                if (used[i]) continue;
                if (selected[i].label !== tracks[t].label) continue;
                const overlap = iou(selected[i], tracks[t]);
                if (overlap > bestIou) {
                  bestIou = overlap;
                  bestIdx = i;
                }
              }
              if (bestIdx >= 0 && bestIou >= MATCH_IOU) {
                // Matched: update track even if confidence dips slightly (hysteresis)
                const cand = selected[bestIdx];
                // Smooth geometry
                const sx = GEO_ALPHA * cand.x + (1 - GEO_ALPHA) * tracks[t].x;
                const sy = GEO_ALPHA * cand.y + (1 - GEO_ALPHA) * tracks[t].y;
                const sw =
                  GEO_ALPHA * cand.width + (1 - GEO_ALPHA) * tracks[t].width;
                const sh =
                  GEO_ALPHA * cand.height + (1 - GEO_ALPHA) * tracks[t].height;
                // Smooth confidence (EMA) with hysteresis consideration
                const targetConf =
                  cand.confidence >= KEEP_THRESHOLD ||
                  cand.confidence >= ADD_THRESHOLD
                    ? cand.confidence
                    : Math.max(cand.confidence, tracks[t].confidence * 0.9);
                const sc =
                  CONF_ALPHA * targetConf +
                  (1 - CONF_ALPHA) * tracks[t].confidence;

                tracks[t] = {
                  ...cand,
                  x: sx,
                  y: sy,
                  width: sw,
                  height: sh,
                  confidence: sc,
                  misses: 0,
                };
                used[bestIdx] = true;
              } else {
                // No match this frame
                tracks[t].misses += 1;
              }
            }

            // Create new tracks for strong unmatched detections
            for (let i = 0; i < selected.length; i++) {
              if (used[i]) continue;
              const cand = selected[i];
              if (cand.confidence >= ADD_THRESHOLD) {
                tracks.push({ ...cand, misses: 0 });
              }
            }

            // Drop stale tracks
            tracks = tracks.filter((tr) => tr.misses <= MAX_MISSES);

            // Limit and output tracks
            tracks.sort((a, b) => b.confidence - a.confidence);
            const output = tracks.slice(0, MAX_DETECTIONS).map(
              (tr) =>
                ({
                  label: tr.label,
                  confidence: tr.confidence,
                  x: tr.x,
                  y: tr.y,
                  width: tr.width,
                  height: tr.height,
                  color: tr.color,
                }) as Detection
            );

            // Also maintain simple empty streak fallback as a second guard
            if (output.length === 0) {
              if (lastSelected.length > 0 && emptyStreak < 5) {
                emptyStreak += 1;
                updateLatestDetections(lastSelected);
              } else {
                emptyStreak = 0;
                lastSelected = [];
                updateLatestDetections([]);
              }
            } else {
              lastSelected = output;
              emptyStreak = 0;
              updateLatestDetections(output);
            }
          } catch (error) {
            // Safely stringify and log the error to JS thread
            try {
              const msg =
                typeof error?.message === "string" ? error.message : `${error}`;
              logFrameError(msg);
            } catch {
              logFrameError("Unknown error");
            }
          }
        });
      } else {
        if (!didWarnMissingModel) {
          didWarnMissingModel = true;
          try {
            logFrameError("TFLite model not yet available inside worklet");
          } catch {}
        }
      }
    };

    // Return the frame processor object that VisionCamera expects
    return {
      frameProcessor: workletFunction,
      type: "readonly",
    };
  }, [
    isCapturing,
    frameDimensions.width,
    saveFrameDimensions,
    tflitePtr,
    resize,
    updateLatestDetections,
    logFrameError,
  ]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      // Snapshot last known detections (prefer current, else last non-empty)
      const snapshot =
        latestDetections && latestDetections.length > 0
          ? latestDetections
          : lastNonEmptyDetectionsRef.current;
      setIsCapturing(true);
      const currentDetections = snapshot ? [...snapshot] : [];
      const photo = await cameraRef.current.takePhoto({
        flash: "off",
        enableShutterSound: false,
      });
      // Persist session state for review screen
      setCapturedImage(photo.path);
      setCapturedDetections(currentDetections);
      if (frameDimensions.width > 0 && frameDimensions.height > 0) {
        setSessionFrameDimensions(frameDimensions);
      }
      setIsCameraActive(false);
      console.log(
        "Photo captured:",
        photo.path,
        "with",
        currentDetections.length,
        "detections"
      );
      // Navigate to review screen
      router.replace({ pathname: "/(tabs)/vision-test/review" } as any);
    } catch (error) {
      console.error("Capture failed:", error);
      setIsCapturing(false);
      setIsCameraActive(true);
    }
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <CurvedHeader
            title="Vision Test - Camera"
            height={120}
            showLogo={false}
            screenType="signin"
            bottomSpacing={0}
          />
          <View style={styles.centerBox}>
            <Ionicons name="camera" size={48} color="#666" />
            <Text
              style={[styles.title, { fontFamily: FONTS.BarlowSemiCondensed }]}
            >
              Camera permission required
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={requestPermission}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Grant Permission
              </Text>
            </TouchableOpacity>
          </View>
        </CurvedBackground>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  if (isInitializing || model.state !== "loaded" || device == null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <CurvedHeader
            title="Vision Test - Camera"
            height={120}
            showLogo={false}
            screenType="signin"
            bottomSpacing={0}
          />
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#2A7DE1" />
            <Text
              style={[styles.title, { fontFamily: FONTS.BarlowSemiCondensed }]}
            >
              Loading vision model...
            </Text>
          </View>
        </CurvedBackground>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fullScreen}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isCameraActive}
        photo={true}
        frameProcessor={frameProcessor as any}
      />

      {/* Detection overlays - using React Native Views instead of Skia Canvas */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {latestDetections.map((detection, index) => (
          <View
            key={index}
            style={[
              styles.detectionBox,
              {
                left: detection.x,
                top: detection.y,
                width: detection.width,
                height: detection.height,
                borderColor: detection.color,
              },
            ]}
          >
            <View
              style={[styles.labelBox, { backgroundColor: detection.color }]}
            >
              <Text style={styles.labelText}>
                {detection.label} {Math.round(detection.confidence * 100)}%
              </Text>
            </View>
          </View>
        ))}
      </View>

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
            styles.statusSubtext,
            { fontFamily: FONTS.BarlowSemiCondensed },
          ]}
        >
          {latestDetections.length > 0
            ? `Detected ${latestDetections.length} object(s)`
            : "Point camera at objects to detect"}
        </Text>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
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
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  fullScreen: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 12,
  },
  primaryBtnText: { color: "white", fontSize: 16, fontWeight: "600" },
  statusOverlay: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  statusBadge: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#28A745",
    marginRight: 6,
  },
  statusText: { color: "white", fontSize: 16, fontWeight: "600" },
  statusSubtext: { color: "white", fontSize: 14, opacity: 0.8 },
  controlsContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  captureButton: { alignItems: "center", padding: 16 },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  detectionBox: {
    position: "absolute",
    borderWidth: 3,
    borderRadius: 4,
  },
  labelBox: {
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
});
