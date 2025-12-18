/**
 * YOLO Detection Module
 *
 * A modular, testable YOLO object detection pipeline for React Native.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  index.ts - Public API                                      │
 * ├─────────────────────────────────────────────────────────────┤
 * │  pipeline.ts - Multi-image orchestrator (main entry point)  │
 * │  preprocessing.ts - Pure math functions (testable)          │
 * │  opencv-bridge.ts - OpenCV wrapper (device-tested)          │
 * │  inference.ts - ONNX Runtime wrapper                        │
 * │  postprocessing.ts - Output parsing + NMS (testable)        │
 * │  visualization.ts - Bounding box drawing (OpenCV)           │
 * │  types.ts - TypeScript interfaces                           │
 * │  constants.ts - Configuration                               │
 * └─────────────────────────────────────────────────────────────┘
 *
 * RECOMMENDED USAGE (via Pipeline):
 * ```typescript
 * import { runPipeline, processImage } from '@/utils/yolo';
 *
 * // Process multiple images
 * const result = await runPipeline(['file://photo1.jpg', 'file://photo2.jpg']);
 * console.log(`Found ${result.totalDetections} detections`);
 * result.results.forEach(r => {
 *   // r.annotatedImageBase64 - image with bounding boxes
 *   // r.detections - array of Detection objects
 * });
 *
 * // Process single image
 * const singleResult = await processImage('file://photo.jpg');
 * ```
 *
 * ADVANCED USAGE (manual control):
 * ```typescript
 * import { YoloInference, preprocessImage, postprocess, MODEL_CONFIG } from '@/utils/yolo';
 *
 * // Initialize
 * const yolo = new YoloInference();
 * await yolo.loadModel(modelUri);
 *
 * // Run detection
 * const preprocess = await preprocessImage(imageUri);
 * const output = await yolo.runInference(preprocess.tensor);
 * const detections = postprocess(output, preprocess, MODEL_CONFIG);
 * ```
 */

// Import test functions for local use in runAllYoloTests
import { runAllPreprocessingTests as _runPreprocessTests } from "./preprocessing";
import { runAllTests as _runPostprocessTests } from "./postprocessing";
import { testVisualizationPure as _testVizPure } from "./visualization";
import { testPipeline as _testPipeline, testModelLoad as _testModelLoad } from "./pipeline";

// ============================================================
// TYPES
// ============================================================

export type {
  // Core detection types
  BoundingBox,
  BoundingBoxCorners,
  Detection,
  PreprocessResult,
  ModelConfig,
  YoloOutputInfo,
  InferenceTiming,
  DetectionResult,
  // Pipeline types (multi-image processing)
  ImageDetectionResult,
  DetectionSummary,
  PipelineResult,
  PipelineOptions,
  PipelineProgress,
  PipelineProgressCallback,
} from "./types";

// ============================================================
// CONFIGURATION
// ============================================================

export {
  MODEL_CONFIG,
  YOLO_OUTPUT_INFO,
  FEATURE_INDICES,
  LOG_PREFIX,
  PIPELINE_CONFIG,
  CONFIDENCE_COLORS,
} from "./constants";

// ============================================================
// PIPELINE (Main entry point for multi-image processing)
// ============================================================

export {
  // Main pipeline functions
  runPipeline,
  processImage,
  hasDetections,
  // Model management
  isModelReady,
  unloadModel,
  // Testing
  testPipeline,
  testModelLoad,
} from "./pipeline";

// ============================================================
// GEMINI CONTEXT (Format detections for Gemini prompt)
// ============================================================

export {
  formatForGemini,
  hasDetectionsForGemini,
  testGeminiContext,
} from "./geminiContext";

// ============================================================
// PREPROCESSING
// ============================================================

export {
  // Main pipeline
  preprocessImage,
  createDummyPreprocessResult,
  // Pure functions (testable)
  calculateLetterboxParams,
  normalizePixels,
  hwcToChw,
  // Tests
  runAllPreprocessingTests,
  testLetterboxCalculation,
  testNormalizePixels,
  testHwcToChw,
  testPreprocessingWithImage,
} from "./preprocessing";

// ============================================================
// OPENCV BRIDGE
// ============================================================

export {
  // Core functions
  loadImagePixels,
  resizeImage,
  applyPadding,
  // Tests
  testOpenCVBridge,
  testOpenCVBasic,
  // Types
  type RawImage,
} from "./opencv-bridge";

// ============================================================
// POSTPROCESSING
// ============================================================

export {
  // Main functions
  parseYoloOutput,
  applyNMS,
  calculateIoU,
  centerToCorners,
  scaleDetections,
  postprocess,
  // Tests
  runAllTests as runAllPostprocessingTests,
  testCalculateIoU,
  testCenterToCorners,
  testParseYoloOutput,
} from "./postprocessing";

// ============================================================
// INFERENCE
// ============================================================

export {
  YoloInference,
  getDefaultYoloInference,
  testInference,
} from "./inference";

// ============================================================
// VISUALIZATION
// ============================================================

export {
  // Main function
  annotateImage,
  // Drawing functions
  drawBoundingBox,
  drawAllDetections,
  // Pure functions (testable)
  getClassColor,
  formatLabel,
  calculateLabelBackground,
  // Configuration
  CLASS_COLORS,
  DEFAULT_COLOR,
  DRAW_CONFIG,
  // Tests
  testVisualizationPure,
  testAnnotation,
  // Types
  type AnnotationResult,
} from "./visualization";

// ============================================================
// COMBINED TEST RUNNER
// ============================================================

/**
 * Run all module tests (pure function tests only)
 * Call this to verify all functions work correctly
 */
export function runAllYoloTests(): void {
  console.log("\n");
  console.log(
    "╔════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                   YOLO MODULE TESTS                        ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════╝"
  );
  console.log("\n");

  _runPreprocessTests();
  _runPostprocessTests();
  _testVizPure();

  console.log("\n");
  console.log(
    "╔════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                 ALL TESTS COMPLETE                          ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════╝"
  );
  console.log("\n");
}

/**
 * Run all tests including pipeline tests with real images
 * Requires device/emulator with model asset available
 *
 * @param testImageUris - Image URIs to test with
 */
export async function runAllYoloTestsWithImages(testImageUris: string[]): Promise<void> {
  console.log("\n");
  console.log(
    "╔════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║             YOLO MODULE TESTS (WITH IMAGES)                ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════╝"
  );
  console.log("\n");

  // Pure function tests
  _runPreprocessTests();
  _runPostprocessTests();
  _testVizPure();

  // Model load test
  console.log("\n🧪 Testing model load...\n");
  const modelOk = await _testModelLoad();

  if (modelOk && testImageUris.length > 0) {
    // Pipeline test with images
    console.log("\n🧪 Testing pipeline with images...\n");
    await _testPipeline(testImageUris);
  } else if (testImageUris.length === 0) {
    console.log("\n⚠️ No test images provided, skipping pipeline test\n");
  }

  console.log("\n");
  console.log(
    "╔════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║             ALL TESTS COMPLETE (WITH IMAGES)               ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════╝"
  );
  console.log("\n");
}
