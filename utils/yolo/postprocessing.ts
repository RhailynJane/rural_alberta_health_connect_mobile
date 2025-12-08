/**
 * YOLO Post-processing Module
 *
 * Handles parsing raw YOLO output and converting to usable detections.
 * All functions are pure (no side effects) and independently testable.
 */

import type {
  BoundingBox,
  BoundingBoxCorners,
  Detection,
  ModelConfig,
  PreprocessResult,
} from './types';
import {
  MODEL_CONFIG,
  YOLO_OUTPUT_INFO,
  FEATURE_INDICES,
  LOG_PREFIX,
} from './constants';

/**
 * Convert bounding box from center format to corner format
 *
 * @param box - Box in center format {x, y, width, height}
 * @returns Box in corner format {x1, y1, x2, y2}
 *
 * @example
 * const center = { x: 100, y: 100, width: 50, height: 50 };
 * const corners = centerToCorners(center);
 * // corners = { x1: 75, y1: 75, x2: 125, y2: 125 }
 */
export function centerToCorners(box: BoundingBox): BoundingBoxCorners {
  const halfWidth = box.width / 2;
  const halfHeight = box.height / 2;

  return {
    x1: box.x - halfWidth,
    y1: box.y - halfHeight,
    x2: box.x + halfWidth,
    y2: box.y + halfHeight,
  };
}

/**
 * Calculate Intersection over Union (IoU) between two boxes
 * Used for Non-Maximum Suppression to identify overlapping detections
 *
 * @param boxA - First bounding box (center format)
 * @param boxB - Second bounding box (center format)
 * @returns IoU value between 0 and 1
 *
 * @example
 * const boxA = { x: 100, y: 100, width: 50, height: 50 };
 * const boxB = { x: 100, y: 100, width: 50, height: 50 };
 * const iou = calculateIoU(boxA, boxB); // Returns 1.0 (identical boxes)
 */
export function calculateIoU(boxA: BoundingBox, boxB: BoundingBox): number {
  const cornersA = centerToCorners(boxA);
  const cornersB = centerToCorners(boxB);

  // Calculate intersection coordinates
  const intersectX1 = Math.max(cornersA.x1, cornersB.x1);
  const intersectY1 = Math.max(cornersA.y1, cornersB.y1);
  const intersectX2 = Math.min(cornersA.x2, cornersB.x2);
  const intersectY2 = Math.min(cornersA.y2, cornersB.y2);

  // Calculate intersection area
  const intersectWidth = Math.max(0, intersectX2 - intersectX1);
  const intersectHeight = Math.max(0, intersectY2 - intersectY1);
  const intersectionArea = intersectWidth * intersectHeight;

  // Calculate union area
  const areaA = boxA.width * boxA.height;
  const areaB = boxB.width * boxB.height;
  const unionArea = areaA + areaB - intersectionArea;

  // Avoid division by zero
  if (unionArea === 0) return 0;

  return intersectionArea / unionArea;
}

/**
 * Apply Non-Maximum Suppression to remove overlapping detections
 * Keeps the detection with highest confidence when boxes overlap significantly
 *
 * @param detections - Array of detections to filter
 * @param iouThreshold - IoU threshold above which boxes are considered duplicates
 * @returns Filtered array of detections
 *
 * @example
 * const detections = [...]; // 7 overlapping detections
 * const filtered = applyNMS(detections, 0.45);
 * // filtered = 1 or 2 detections (overlapping ones removed)
 */
export function applyNMS(
  detections: Detection[],
  iouThreshold: number = MODEL_CONFIG.iouThreshold
): Detection[] {
  console.log(`${LOG_PREFIX.NMS} Input detections: ${detections.length}`);
  console.log(`${LOG_PREFIX.NMS} IoU threshold: ${iouThreshold}`);

  if (detections.length === 0) {
    console.log(`${LOG_PREFIX.NMS} No detections to process`);
    return [];
  }

  // Sort by confidence (highest first)
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  console.log(`${LOG_PREFIX.NMS} Sorted by confidence, top: ${sorted[0]?.confidence.toFixed(3)}`);

  const kept: Detection[] = [];
  const suppressed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;

    const current = sorted[i];
    kept.push(current);

    // Suppress all boxes with high IoU overlap
    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;

      const iou = calculateIoU(current.box, sorted[j].box);
      if (iou > iouThreshold) {
        suppressed.add(j);
        console.log(`${LOG_PREFIX.NMS} Suppressed detection ${j} (IoU: ${iou.toFixed(3)} with detection ${i})`);
      }
    }
  }

  console.log(`${LOG_PREFIX.NMS} Output detections: ${kept.length} (suppressed: ${suppressed.size})`);
  return kept;
}

/**
 * Parse raw YOLO output tensor into Detection objects
 *
 * YOLO output shape: [1, 7, 8400]
 * - 1: batch size
 * - 7: features [x_center, y_center, width, height, class0_prob, class1_prob, class2_prob]
 * - 8400: number of predictions
 *
 * Data layout (row-major): For prediction i, feature f is at index (f * 8400 + i)
 *
 * @param output - Raw Float32Array from ONNX inference
 * @param config - Model configuration
 * @returns Array of detections above confidence threshold
 */
export function parseYoloOutput(
  output: Float32Array,
  config: ModelConfig = MODEL_CONFIG
): Detection[] {
  const { numFeatures, numPredictions } = YOLO_OUTPUT_INFO;
  const expectedLength = numFeatures * numPredictions;

  console.log(`${LOG_PREFIX.POSTPROCESS} ========================================`);
  console.log(`${LOG_PREFIX.POSTPROCESS} Parsing YOLO output`);
  console.log(`${LOG_PREFIX.POSTPROCESS} ========================================`);
  console.log(`${LOG_PREFIX.POSTPROCESS} Input length: ${output.length}`);
  console.log(`${LOG_PREFIX.POSTPROCESS} Expected length: ${expectedLength} (${numFeatures} x ${numPredictions})`);
  console.log(`${LOG_PREFIX.POSTPROCESS} Confidence threshold: ${config.confidenceThreshold}`);
  console.log(`${LOG_PREFIX.POSTPROCESS} Class names: ${config.classNames.join(', ')}`);

  if (output.length !== expectedLength) {
    console.error(`${LOG_PREFIX.POSTPROCESS} ERROR: Output length mismatch!`);
    console.error(`${LOG_PREFIX.POSTPROCESS} Got ${output.length}, expected ${expectedLength}`);
    return [];
  }

  // Log first few raw values for debugging
  console.log(`${LOG_PREFIX.POSTPROCESS} First 10 raw values: [${Array.from(output.slice(0, 10)).map(v => v.toFixed(4)).join(', ')}]`);

  const detections: Detection[] = [];
  let belowThresholdCount = 0;

  // Iterate through all predictions
  for (let i = 0; i < numPredictions; i++) {
    // Extract box coordinates
    // Data layout: feature f, prediction i is at index (f * numPredictions + i)
    const xCenter = output[FEATURE_INDICES.X_CENTER * numPredictions + i];
    const yCenter = output[FEATURE_INDICES.Y_CENTER * numPredictions + i];
    const width = output[FEATURE_INDICES.WIDTH * numPredictions + i];
    const height = output[FEATURE_INDICES.HEIGHT * numPredictions + i];

    // Extract class probabilities and find best class
    let maxProb = 0;
    let maxClassId = 0;

    for (let c = 0; c < config.numClasses; c++) {
      const prob = output[(FEATURE_INDICES.CLASS_PROBS_START + c) * numPredictions + i];
      if (prob > maxProb) {
        maxProb = prob;
        maxClassId = c;
      }
    }

    // Filter by confidence threshold
    if (maxProb < config.confidenceThreshold) {
      belowThresholdCount++;
      continue;
    }

    const box: BoundingBox = {
      x: xCenter,
      y: yCenter,
      width: width,
      height: height,
    };

    const detection: Detection = {
      box,
      boxCorners: centerToCorners(box),
      classId: maxClassId,
      className: config.classNames[maxClassId] || `class_${maxClassId}`,
      confidence: maxProb,
    };

    detections.push(detection);
  }

  console.log(`${LOG_PREFIX.POSTPROCESS} Predictions processed: ${numPredictions}`);
  console.log(`${LOG_PREFIX.POSTPROCESS} Below threshold: ${belowThresholdCount}`);
  console.log(`${LOG_PREFIX.POSTPROCESS} Above threshold: ${detections.length}`);

  // Log top detections
  if (detections.length > 0) {
    const top5 = detections
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    console.log(`${LOG_PREFIX.POSTPROCESS} Top 5 detections:`);
    top5.forEach((d, idx) => {
      console.log(`${LOG_PREFIX.POSTPROCESS}   ${idx + 1}. ${d.className} (${(d.confidence * 100).toFixed(1)}%) at [${d.box.x.toFixed(1)}, ${d.box.y.toFixed(1)}, ${d.box.width.toFixed(1)}, ${d.box.height.toFixed(1)}]`);
    });
  }

  return detections;
}

/**
 * Scale detection boxes from model coordinates (640x640) back to original image
 * Accounts for letterbox padding
 *
 * @param detections - Detections in model coordinate space
 * @param preprocessResult - Preprocessing info with scale and padding
 * @returns Detections with boxes scaled to original image coordinates
 */
export function scaleDetections(
  detections: Detection[],
  preprocessResult: PreprocessResult
): Detection[] {
  const { scale, padX, padY, originalWidth, originalHeight } = preprocessResult;

  console.log(`${LOG_PREFIX.POSTPROCESS} Scaling detections to original image`);
  console.log(`${LOG_PREFIX.POSTPROCESS}   Original size: ${originalWidth}x${originalHeight}`);
  console.log(`${LOG_PREFIX.POSTPROCESS}   Scale: ${scale.toFixed(4)}, Pad: (${padX.toFixed(1)}, ${padY.toFixed(1)})`);

  return detections.map(detection => {
    // Remove padding and scale back
    const scaledBox: BoundingBox = {
      x: (detection.box.x - padX) / scale,
      y: (detection.box.y - padY) / scale,
      width: detection.box.width / scale,
      height: detection.box.height / scale,
    };

    // Clamp to image bounds
    const clampedBox: BoundingBox = {
      x: Math.max(0, Math.min(originalWidth, scaledBox.x)),
      y: Math.max(0, Math.min(originalHeight, scaledBox.y)),
      width: Math.max(0, Math.min(originalWidth - scaledBox.x, scaledBox.width)),
      height: Math.max(0, Math.min(originalHeight - scaledBox.y, scaledBox.height)),
    };

    return {
      ...detection,
      box: clampedBox,
      boxCorners: centerToCorners(clampedBox),
    };
  });
}

/**
 * Full post-processing pipeline: parse → NMS → scale
 *
 * @param output - Raw ONNX output
 * @param preprocessResult - Preprocessing info for scaling
 * @param config - Model configuration
 * @returns Final filtered and scaled detections
 */
export function postprocess(
  output: Float32Array,
  preprocessResult: PreprocessResult,
  config: ModelConfig = MODEL_CONFIG
): Detection[] {
  console.log(`${LOG_PREFIX.POSTPROCESS} ========================================`);
  console.log(`${LOG_PREFIX.POSTPROCESS} Starting full post-processing pipeline`);
  console.log(`${LOG_PREFIX.POSTPROCESS} ========================================`);

  const startTime = Date.now();

  // Step 1: Parse raw output
  const rawDetections = parseYoloOutput(output, config);

  // Step 2: Apply NMS
  const nmsDetections = applyNMS(rawDetections, config.iouThreshold);

  // Step 3: Scale to original image coordinates
  const scaledDetections = scaleDetections(nmsDetections, preprocessResult);

  const elapsed = Date.now() - startTime;
  console.log(`${LOG_PREFIX.POSTPROCESS} Pipeline complete in ${elapsed}ms`);
  console.log(`${LOG_PREFIX.POSTPROCESS} Final detections: ${scaledDetections.length}`);

  return scaledDetections;
}

// ============================================================
// TESTING UTILITIES
// ============================================================

/**
 * Test calculateIoU with known values
 * Run this to verify IoU calculation is correct
 */
export function testCalculateIoU(): void {
  console.log('\n========== Testing calculateIoU ==========');

  // Test 1: Identical boxes → IoU = 1.0
  const box1 = { x: 100, y: 100, width: 50, height: 50 };
  const iou1 = calculateIoU(box1, box1);
  console.log(`Test 1 - Identical boxes: IoU = ${iou1.toFixed(4)} (expected: 1.0000) ${Math.abs(iou1 - 1.0) < 0.0001 ? '✅' : '❌'}`);

  // Test 2: No overlap → IoU = 0.0
  const box2a = { x: 50, y: 50, width: 20, height: 20 };
  const box2b = { x: 200, y: 200, width: 20, height: 20 };
  const iou2 = calculateIoU(box2a, box2b);
  console.log(`Test 2 - No overlap: IoU = ${iou2.toFixed(4)} (expected: 0.0000) ${iou2 === 0 ? '✅' : '❌'}`);

  // Test 3: 50% overlap
  const box3a = { x: 100, y: 100, width: 100, height: 100 }; // 50-150, 50-150
  const box3b = { x: 150, y: 100, width: 100, height: 100 }; // 100-200, 50-150
  // Intersection: 100-150 x 50-150 = 50 x 100 = 5000
  // Union: 10000 + 10000 - 5000 = 15000
  // IoU: 5000/15000 = 0.333
  const iou3 = calculateIoU(box3a, box3b);
  console.log(`Test 3 - Partial overlap: IoU = ${iou3.toFixed(4)} (expected: ~0.3333) ${Math.abs(iou3 - 0.3333) < 0.01 ? '✅' : '❌'}`);

  console.log('==========================================\n');
}

/**
 * Test centerToCorners conversion
 */
export function testCenterToCorners(): void {
  console.log('\n========== Testing centerToCorners ==========');

  const center = { x: 100, y: 100, width: 50, height: 50 };
  const corners = centerToCorners(center);

  console.log(`Input: center=(${center.x}, ${center.y}), size=(${center.width}, ${center.height})`);
  console.log(`Output: (${corners.x1}, ${corners.y1}) to (${corners.x2}, ${corners.y2})`);
  console.log(`Expected: (75, 75) to (125, 125)`);

  const pass = corners.x1 === 75 && corners.y1 === 75 && corners.x2 === 125 && corners.y2 === 125;
  console.log(`Result: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('=============================================\n');
}

/**
 * Test parseYoloOutput with synthetic data
 */
export function testParseYoloOutput(): void {
  console.log('\n========== Testing parseYoloOutput ==========');

  const { numFeatures, numPredictions } = YOLO_OUTPUT_INFO;

  // Create synthetic output: [1, 7, 8400]
  // We'll put one strong detection at prediction index 0
  const output = new Float32Array(numFeatures * numPredictions);

  // Prediction 0: strong detection
  const predIdx = 0;
  output[FEATURE_INDICES.X_CENTER * numPredictions + predIdx] = 320; // x center
  output[FEATURE_INDICES.Y_CENTER * numPredictions + predIdx] = 320; // y center
  output[FEATURE_INDICES.WIDTH * numPredictions + predIdx] = 100;    // width
  output[FEATURE_INDICES.HEIGHT * numPredictions + predIdx] = 100;   // height
  output[(FEATURE_INDICES.CLASS_PROBS_START + 0) * numPredictions + predIdx] = 0.2; // abrasion
  output[(FEATURE_INDICES.CLASS_PROBS_START + 1) * numPredictions + predIdx] = 0.1; // bruise
  output[(FEATURE_INDICES.CLASS_PROBS_START + 2) * numPredictions + predIdx] = 0.8; // cut ← highest

  // Prediction 1: weak detection (should be filtered)
  const predIdx2 = 1;
  output[FEATURE_INDICES.X_CENTER * numPredictions + predIdx2] = 100;
  output[FEATURE_INDICES.Y_CENTER * numPredictions + predIdx2] = 100;
  output[FEATURE_INDICES.WIDTH * numPredictions + predIdx2] = 50;
  output[FEATURE_INDICES.HEIGHT * numPredictions + predIdx2] = 50;
  output[(FEATURE_INDICES.CLASS_PROBS_START + 0) * numPredictions + predIdx2] = 0.1; // all low
  output[(FEATURE_INDICES.CLASS_PROBS_START + 1) * numPredictions + predIdx2] = 0.1;
  output[(FEATURE_INDICES.CLASS_PROBS_START + 2) * numPredictions + predIdx2] = 0.1;

  const config: ModelConfig = {
    ...MODEL_CONFIG,
    confidenceThreshold: 0.5,
  };

  const detections = parseYoloOutput(output, config);

  console.log(`\nExpected: 1 detection (cut at 0.8 confidence)`);
  console.log(`Got: ${detections.length} detection(s)`);

  if (detections.length === 1) {
    const d = detections[0];
    const pass = d.className === 'cut' && Math.abs(d.confidence - 0.8) < 0.01;
    console.log(`Detection: ${d.className} @ ${d.confidence.toFixed(2)}`);
    console.log(`Result: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  } else {
    console.log('Result: ❌ FAIL (wrong count)');
  }

  console.log('=============================================\n');
}

/**
 * Run all tests
 */
export function runAllTests(): void {
  console.log('\n🧪 Running YOLO Postprocessing Tests...\n');
  testCenterToCorners();
  testCalculateIoU();
  testParseYoloOutput();
  console.log('🧪 All tests complete!\n');
}
