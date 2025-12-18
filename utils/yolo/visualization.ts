/**
 * Visualization Module
 *
 * Draws bounding boxes on images using OpenCV.
 * This module is separate from detection to maintain modularity.
 *
 * Key responsibilities:
 * 1. Draw bounding boxes with class-specific colors
 * 2. Return annotated image as base64
 *
 * Note: react-native-fast-opencv doesn't support putText,
 * so we only draw rectangles (no text labels on image).
 */

import { EncodingType, readAsStringAsync } from "expo-file-system/legacy";
import { LineTypes, ObjectType, OpenCV } from "react-native-fast-opencv";
import type { Detection } from "./types";

// ============================================================
// Constants
// ============================================================

const LOG_PREFIX = "[YOLO:Viz]";

/**
 * Colors for each class (BGR format for OpenCV)
 * 8 classes: burns (3 degrees), rashes, abrasion, bruise, cut, frostbite
 */
export const CLASS_COLORS: Record<string, [number, number, number]> = {
  "1st degree burn": [0, 128, 255],   // Orange (BGR) - mild burn
  "2nd degree burn": [0, 69, 255],    // Red-Orange (BGR) - moderate burn
  "3rd degree burn": [0, 0, 200],     // Dark Red (BGR) - severe burn
  "Rashes": [203, 192, 255],          // Pink (BGR)
  abrasion: [0, 0, 255],              // Red (BGR)
  bruise: [255, 0, 128],              // Purple (BGR)
  cut: [0, 255, 0],                   // Green (BGR)
  frostbite: [255, 255, 0],           // Cyan (BGR) - cold injury
};

/**
 * Default color for unknown classes (Yellow)
 */
export const DEFAULT_COLOR: [number, number, number] = [0, 255, 255];

/**
 * Drawing configuration
 */
export const DRAW_CONFIG = {
  boxThickness: 3,
} as const;

// ============================================================
// Pure Functions (Testable)
// ============================================================

/**
 * Get color for a class name
 * @param className - Name of the detection class
 * @returns BGR color tuple
 */
export function getClassColor(className: string): [number, number, number] {
  return CLASS_COLORS[className] || DEFAULT_COLOR;
}

/**
 * Format detection label with confidence
 * @param detection - Detection object
 * @returns Formatted label string
 */
export function formatLabel(detection: Detection): string {
  const confidence = (detection.confidence * 100).toFixed(0);
  return `${detection.className} ${confidence}%`;
}

/**
 * Calculate label background rectangle coordinates
 * @param x - Top-left x of bounding box
 * @param y - Top-left y of bounding box
 * @param labelWidth - Estimated label width
 * @param labelHeight - Label height
 * @returns Coordinates for background rectangle
 */
export function calculateLabelBackground(
  x: number,
  y: number,
  labelWidth: number,
  labelHeight: number
): { x1: number; y1: number; x2: number; y2: number } {
  const padding = 5;
  return {
    x1: x,
    y1: Math.max(0, y - labelHeight - padding * 2),
    x2: x + labelWidth + padding * 2,
    y2: y,
  };
}

// ============================================================
// OpenCV Drawing Functions
// ============================================================

/**
 * Draw a single bounding box on a Mat
 * @param mat - OpenCV Mat to draw on
 * @param detection - Detection with box coordinates
 */
export function drawBoundingBox(mat: unknown, detection: Detection): void {
  const color = getClassColor(detection.className);

  // Use boxCorners which has x1, y1, x2, y2
  const { x1, y1, x2, y2 } = detection.boxCorners;

  // Create points for rectangle
  const pt1 = OpenCV.createObject(
    ObjectType.Point,
    Math.round(x1),
    Math.round(y1)
  );
  const pt2 = OpenCV.createObject(
    ObjectType.Point,
    Math.round(x2),
    Math.round(y2)
  );

  // Create color scalar (BGR)
  const colorScalar = OpenCV.createObject(
    ObjectType.Scalar,
    color[0],
    color[1],
    color[2],
    255
  );

  // Draw rectangle

  (OpenCV as any).invoke(
    "rectangle",
    mat,
    pt1,
    pt2,
    colorScalar,
    DRAW_CONFIG.boxThickness,
    LineTypes.LINE_8
  );

  console.log(
    `${LOG_PREFIX} Drew box for ${detection.className} at [${x1.toFixed(
      0
    )}, ${y1.toFixed(0)}] to [${x2.toFixed(0)}, ${y2.toFixed(0)}]`
  );
}

/**
 * Draw all detections on an image
 * @param mat - OpenCV Mat to draw on
 * @param detections - Array of detections
 */
export function drawAllDetections(mat: unknown, detections: Detection[]): void {
  console.log(`${LOG_PREFIX} Drawing ${detections.length} detection(s)...`);

  for (const detection of detections) {
    drawBoundingBox(mat, detection);
  }

  console.log(`${LOG_PREFIX} All detections drawn`);
}

// ============================================================
// Main Pipeline Function
// ============================================================

/**
 * Result of image annotation
 */
export interface AnnotationResult {
  /** Base64-encoded annotated image (JPEG) */
  base64: string;
  /** Width of annotated image */
  width: number;
  /** Height of annotated image */
  height: number;
  /** Number of detections drawn */
  detectionsDrawn: number;
  /** Time taken in ms */
  timeMs: number;
}

/**
 * Annotate an image with bounding boxes
 *
 * Pipeline:
 * 1. Load image from URI
 * 2. Draw bounding boxes
 * 3. Convert back to base64
 *
 * @param imageUri - URI of the image to annotate
 * @param detections - Detections to draw
 * @returns Annotated image as base64
 */
export async function annotateImage(
  imageUri: string,
  detections: Detection[]
): Promise<AnnotationResult> {
  console.log(`${LOG_PREFIX} ========================================`);
  console.log(`${LOG_PREFIX} Annotating image with detections`);
  console.log(`${LOG_PREFIX} ========================================`);
  console.log(`${LOG_PREFIX} Image: ${imageUri}`);
  console.log(`${LOG_PREFIX} Detections: ${detections.length}`);

  const startTime = Date.now();

  try {
    // Step 1: Load image
    console.log(`${LOG_PREFIX} Step 1: Loading image...`);
    const base64Input = await readAsStringAsync(imageUri, {
      encoding: EncodingType.Base64,
    });
    const mat = OpenCV.base64ToMat(base64Input);
    const matInfo = OpenCV.toJSValue(mat);
    console.log(`${LOG_PREFIX} Loaded: ${matInfo.cols}x${matInfo.rows}`);

    // Step 2: Draw detections (OpenCV uses BGR, image is already BGR from base64ToMat)
    console.log(`${LOG_PREFIX} Step 2: Drawing detections...`);
    drawAllDetections(mat, detections);

    // Step 3: Convert back to base64 (use toJSValue with 'jpeg' format)
    console.log(`${LOG_PREFIX} Step 3: Encoding result...`);
    const result = OpenCV.toJSValue(mat, "jpeg");
    const resultBase64 = result.base64;

    // Clean up
    OpenCV.clearBuffers();

    const timeMs = Date.now() - startTime;
    console.log(`${LOG_PREFIX} ========================================`);
    console.log(`${LOG_PREFIX} Annotation complete in ${timeMs}ms`);
    console.log(`${LOG_PREFIX} ========================================`);

    return {
      base64: resultBase64,
      width: matInfo.cols,
      height: matInfo.rows,
      detectionsDrawn: detections.length,
      timeMs,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error annotating image: ${error}`);
    OpenCV.clearBuffers();
    throw error;
  }
}

// ============================================================
// Test Functions
// ============================================================

/**
 * Test pure functions (no OpenCV required)
 */
export function testVisualizationPure(): void {
  console.log(`\n${LOG_PREFIX} ========== Testing Pure Functions ==========`);

  // Test getClassColor
  console.log(`${LOG_PREFIX} Testing getClassColor...`);
  const cutColor = getClassColor("cut");
  const unknownColor = getClassColor("unknown");
  console.log(
    `${LOG_PREFIX}   cut color: [${cutColor.join(
      ", "
    )}] (expected: [0, 255, 0])`
  );
  console.log(
    `${LOG_PREFIX}   unknown color: [${unknownColor.join(
      ", "
    )}] (expected: [0, 255, 255])`
  );
  const colorPass = cutColor[1] === 255 && unknownColor[0] === 0;
  console.log(`${LOG_PREFIX}   Result: ${colorPass ? "✅ PASS" : "❌ FAIL"}`);

  // Test formatLabel
  console.log(`${LOG_PREFIX} Testing formatLabel...`);
  const mockDetection: Detection = {
    classId: 2,
    className: "cut",
    confidence: 0.78,
    box: { x: 100, y: 100, width: 50, height: 50 },
    boxCorners: { x1: 75, y1: 75, x2: 125, y2: 125 },
  };
  const label = formatLabel(mockDetection);
  console.log(`${LOG_PREFIX}   Label: "${label}" (expected: "cut 78%")`);
  const labelPass = label === "cut 78%";
  console.log(`${LOG_PREFIX}   Result: ${labelPass ? "✅ PASS" : "❌ FAIL"}`);

  // Test calculateLabelBackground
  console.log(`${LOG_PREFIX} Testing calculateLabelBackground...`);
  const bg = calculateLabelBackground(100, 50, 60, 20);
  console.log(
    `${LOG_PREFIX}   Background: (${bg.x1}, ${bg.y1}) to (${bg.x2}, ${bg.y2})`
  );
  const bgPass = bg.x1 === 100 && bg.y1 === 20 && bg.x2 === 170;
  console.log(`${LOG_PREFIX}   Result: ${bgPass ? "✅ PASS" : "❌ FAIL"}`);

  console.log(`${LOG_PREFIX} ============================================\n`);
}

/**
 * Test full annotation pipeline with a real image
 * @param imageUri - URI of test image
 * @param detections - Test detections to draw
 */
export async function testAnnotation(
  imageUri: string,
  detections: Detection[]
): Promise<AnnotationResult> {
  console.log(`\n${LOG_PREFIX} ========== Testing Full Annotation ==========`);
  const result = await annotateImage(imageUri, detections);
  console.log(
    `${LOG_PREFIX} Result: ${result.width}x${result.height}, ${result.detectionsDrawn} boxes`
  );
  console.log(`${LOG_PREFIX} Base64 length: ${result.base64.length} chars`);
  console.log(`${LOG_PREFIX} =============================================\n`);
  return result;
}
