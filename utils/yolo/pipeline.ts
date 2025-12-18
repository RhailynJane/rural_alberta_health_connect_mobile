/**
 * YOLO Pipeline Module
 *
 * Orchestrates the complete YOLO detection pipeline for multiple images.
 * This is the main entry point for running wound detection on user photos.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         PIPELINE FLOW                                   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                          │
 * │  Input: imageUris[]                                                      │
 * │         │                                                                │
 * │         ▼                                                                │
 * │  ┌─────────────────┐                                                     │
 * │  │  ensureModel()  │ ← Loads model if not already loaded (singleton)    │
 * │  └────────┬────────┘                                                     │
 * │           │                                                              │
 * │           ▼                                                              │
 * │  ┌─────────────────────────────────────────────────────────────────┐    │
 * │  │  FOR EACH IMAGE:                                                 │    │
 * │  │    1. preprocessImage() → tensor                                │    │
 * │  │    2. yolo.runInference(tensor) → rawOutput                     │    │
 * │  │    3. postprocess(rawOutput) → detections[]                     │    │
 * │  │    4. annotateImage() → base64 with boxes                       │    │
 * │  └─────────────────────────────────────────────────────────────────┘    │
 * │           │                                                              │
 * │           ▼                                                              │
 * │  ┌─────────────────┐                                                     │
 * │  │ aggregateResults│ ← Combines all results + summary                   │
 * │  └────────┬────────┘                                                     │
 * │           │                                                              │
 * │           ▼                                                              │
 * │  Output: PipelineResult                                                  │
 * │                                                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Usage:
 * ```typescript
 * import { runPipeline } from '@/utils/yolo/pipeline';
 *
 * const result = await runPipeline(['file://photo1.jpg', 'file://photo2.jpg']);
 * console.log(`Found ${result.totalDetections} detections`);
 * ```
 */

import { Asset } from 'expo-asset';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MODEL_ASSET = require('@/assets/weights.onnx');

import { MODEL_CONFIG, LOG_PREFIX, PIPELINE_CONFIG } from './constants';
import { YoloInference } from './inference';
import { postprocess } from './postprocessing';
import { preprocessImage } from './preprocessing';
import type {
  Detection,
  DetectionSummary,
  ImageDetectionResult,
  PipelineOptions,
  PipelineProgress,
  PipelineProgressCallback,
  PipelineResult,
  PreprocessResult,
} from './types';
import { annotateImage } from './visualization';

// ============================================================
// MODULE STATE (Singleton pattern for model)
// ============================================================

/** Singleton YOLO inference instance */
let yoloInstance: YoloInference | null = null;

/** Whether model is currently loading (prevents duplicate loads) */
let isModelLoading = false;

/** Promise that resolves when model loading completes */
let modelLoadPromise: Promise<void> | null = null;

/** Time taken to load the model (for metrics) */
let lastModelLoadTimeMs = 0;

// ============================================================
// LOGGING UTILITIES
// ============================================================

const P = LOG_PREFIX.PIPELINE;

/**
 * Generate a unique run ID for log tracing
 */
function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Log a pipeline stage header
 */
function logHeader(runId: string, title: string): void {
  console.log(`${P} ════════════════════════════════════════════════════════`);
  console.log(`${P} [${runId}] ${title}`);
  console.log(`${P} ════════════════════════════════════════════════════════`);
}

/**
 * Log a pipeline stage divider
 */
function logDivider(runId: string): void {
  console.log(`${P} [${runId}] ────────────────────────────────────────────────`);
}

/**
 * Log a key-value pair with consistent formatting
 */
function logKV(runId: string, key: string, value: string | number | boolean): void {
  console.log(`${P} [${runId}]   ${key}: ${value}`);
}

/**
 * Format milliseconds to human-readable string
 */
function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================================
// MODEL MANAGEMENT
// ============================================================

/**
 * Ensure YOLO model is loaded (singleton pattern)
 * Safe to call multiple times - will only load once
 *
 * @returns Time taken to load model (0 if already loaded)
 */
async function ensureModelLoaded(runId: string): Promise<number> {
  console.log(`${P} [${runId}] Checking model status...`);

  // If already loaded, return immediately
  if (yoloInstance?.isModelLoaded()) {
    console.log(`${P} [${runId}] ✅ Model already loaded (cached)`);
    return 0;
  }

  // If currently loading, wait for existing load to complete
  if (isModelLoading && modelLoadPromise) {
    console.log(`${P} [${runId}] ⏳ Model loading in progress, waiting...`);
    await modelLoadPromise;
    console.log(`${P} [${runId}] ✅ Model loaded (waited for existing load)`);
    return lastModelLoadTimeMs;
  }

  // Need to load model
  console.log(`${P} [${runId}] Model not loaded, starting load...`);
  isModelLoading = true;
  const startTime = Date.now();

  modelLoadPromise = (async () => {
    try {
      // Load model asset
      console.log(`${P} [${runId}] Loading model asset from @/assets/weights.onnx...`);
      const assets = await Asset.loadAsync(MODEL_ASSET);

      if (!assets[0]?.localUri) {
        throw new Error('Failed to load model asset - localUri is null');
      }

      console.log(`${P} [${runId}] Model asset loaded: ${assets[0].localUri}`);

      // Create inference instance and load model
      yoloInstance = new YoloInference(MODEL_CONFIG);
      await yoloInstance.loadModel(assets[0].localUri);

      lastModelLoadTimeMs = Date.now() - startTime;
      console.log(`${P} [${runId}] ✅ Model loaded successfully in ${formatMs(lastModelLoadTimeMs)}`);
    } catch (error) {
      console.error(`${P} [${runId}] ❌ Failed to load model:`, error);
      yoloInstance = null;
      throw error;
    } finally {
      isModelLoading = false;
    }
  })();

  await modelLoadPromise;
  return lastModelLoadTimeMs;
}

/**
 * Check if model is currently loaded
 */
export function isModelReady(): boolean {
  return yoloInstance?.isModelLoaded() ?? false;
}

/**
 * Unload model and free resources
 * Call this when you're done with detection
 */
export function unloadModel(): void {
  console.log(`${P} Unloading model...`);
  if (yoloInstance) {
    yoloInstance.dispose();
    yoloInstance = null;
  }
  lastModelLoadTimeMs = 0;
  console.log(`${P} Model unloaded`);
}

// ============================================================
// SINGLE IMAGE PROCESSING
// ============================================================

/**
 * Process a single image through the complete pipeline
 *
 * Steps:
 * 1. Preprocess image (resize, normalize, transpose)
 * 2. Run YOLO inference
 * 3. Post-process output (parse, NMS, scale to original)
 * 4. Annotate image with bounding boxes
 *
 * @param imageUri - URI to the image file
 * @param imageIndex - Index of this image (for logging)
 * @param totalImages - Total number of images (for logging)
 * @param runId - Pipeline run ID (for log tracing)
 * @param options - Pipeline options
 * @returns ImageDetectionResult with detections and annotated image
 */
async function processOneImage(
  imageUri: string,
  imageIndex: number,
  totalImages: number,
  runId: string,
  options: PipelineOptions = {}
): Promise<ImageDetectionResult> {
  const imageLabel = `Image ${imageIndex + 1}/${totalImages}`;
  console.log(`${P} [${runId}] ┌─────────────────────────────────────────────`);
  console.log(`${P} [${runId}] │ Processing ${imageLabel}`);
  console.log(`${P} [${runId}] │ URI: ${imageUri.substring(0, 60)}...`);
  console.log(`${P} [${runId}] └─────────────────────────────────────────────`);

  const timings = {
    preprocessMs: 0,
    inferenceMs: 0,
    postprocessMs: 0,
    visualizationMs: 0,
    totalMs: 0,
  };

  const totalStartTime = Date.now();

  try {
    // Step 1: Preprocessing
    console.log(`${P} [${runId}] [${imageLabel}] Step 1/4: Preprocessing...`);
    const preprocessStart = Date.now();
    let preprocessResult: PreprocessResult;

    try {
      preprocessResult = await preprocessImage(imageUri);
      timings.preprocessMs = Date.now() - preprocessStart;
      console.log(`${P} [${runId}] [${imageLabel}] ✅ Preprocessing: ${formatMs(timings.preprocessMs)}`);
      logKV(runId, `  Original size`, `${preprocessResult.originalWidth}x${preprocessResult.originalHeight}`);
      logKV(runId, `  Scale factor`, preprocessResult.scale.toFixed(4));
      logKV(runId, `  Padding`, `(${preprocessResult.padX.toFixed(1)}, ${preprocessResult.padY.toFixed(1)})`);
    } catch (error) {
      console.error(`${P} [${runId}] [${imageLabel}] ❌ Preprocessing failed:`, error);
      throw new Error(`Preprocessing failed: ${error}`);
    }

    // Step 2: Inference
    console.log(`${P} [${runId}] [${imageLabel}] Step 2/4: Running inference...`);
    const inferenceStart = Date.now();
    let rawOutput: Float32Array;

    if (!yoloInstance) {
      throw new Error('Model not loaded');
    }

    try {
      rawOutput = await yoloInstance.runInference(preprocessResult.tensor);
      timings.inferenceMs = Date.now() - inferenceStart;
      console.log(`${P} [${runId}] [${imageLabel}] ✅ Inference: ${formatMs(timings.inferenceMs)}`);
      logKV(runId, `  Output length`, rawOutput.length);
    } catch (error) {
      console.error(`${P} [${runId}] [${imageLabel}] ❌ Inference failed:`, error);
      throw new Error(`Inference failed: ${error}`);
    }

    // Step 3: Post-processing
    console.log(`${P} [${runId}] [${imageLabel}] Step 3/4: Post-processing...`);
    const postprocessStart = Date.now();
    let detections: Detection[];

    try {
      // Apply custom thresholds if provided
      const configOverride = {
        ...MODEL_CONFIG,
        confidenceThreshold: options.confidenceThreshold ?? MODEL_CONFIG.confidenceThreshold,
        iouThreshold: options.iouThreshold ?? MODEL_CONFIG.iouThreshold,
      };

      detections = postprocess(rawOutput, preprocessResult, configOverride);
      timings.postprocessMs = Date.now() - postprocessStart;
      console.log(`${P} [${runId}] [${imageLabel}] ✅ Post-processing: ${formatMs(timings.postprocessMs)}`);
      logKV(runId, `  Detections found`, detections.length);

      // Log each detection
      detections.forEach((det, idx) => {
        console.log(
          `${P} [${runId}] [${imageLabel}]   Detection ${idx + 1}: ${det.className} (${(det.confidence * 100).toFixed(1)}%)`
        );
      });
    } catch (error) {
      console.error(`${P} [${runId}] [${imageLabel}] ❌ Post-processing failed:`, error);
      throw new Error(`Post-processing failed: ${error}`);
    }

    // Step 4: Visualization (unless skipped)
    let annotatedImageBase64 = '';
    let annotatedImageWidth = preprocessResult.originalWidth;
    let annotatedImageHeight = preprocessResult.originalHeight;

    if (!options.skipVisualization) {
      console.log(`${P} [${runId}] [${imageLabel}] Step 4/4: Annotating image...`);
      const vizStart = Date.now();

      try {
        const annotationResult = await annotateImage(imageUri, detections);
        annotatedImageBase64 = annotationResult.base64;
        annotatedImageWidth = annotationResult.width;
        annotatedImageHeight = annotationResult.height;
        timings.visualizationMs = Date.now() - vizStart;
        console.log(`${P} [${runId}] [${imageLabel}] ✅ Visualization: ${formatMs(timings.visualizationMs)}`);
        logKV(runId, `  Annotated size`, `${annotatedImageWidth}x${annotatedImageHeight}`);
        logKV(runId, `  Base64 length`, annotatedImageBase64.length);
      } catch (error) {
        console.error(`${P} [${runId}] [${imageLabel}] ❌ Visualization failed:`, error);
        // Visualization failure is non-fatal - we still have detections
        console.log(`${P} [${runId}] [${imageLabel}] ⚠️ Continuing without annotated image`);
        timings.visualizationMs = Date.now() - vizStart;
      }
    } else {
      console.log(`${P} [${runId}] [${imageLabel}] Step 4/4: Skipped (skipVisualization=true)`);
    }

    timings.totalMs = Date.now() - totalStartTime;

    // Log summary for this image
    console.log(`${P} [${runId}] [${imageLabel}] ═══════════════════════════════════════`);
    console.log(`${P} [${runId}] [${imageLabel}] SUMMARY`);
    console.log(`${P} [${runId}] [${imageLabel}]   Total time: ${formatMs(timings.totalMs)}`);
    console.log(`${P} [${runId}] [${imageLabel}]   Detections: ${detections.length}`);
    if (detections.length > 0) {
      const classes = detections.map((d) => d.className).join(', ');
      console.log(`${P} [${runId}] [${imageLabel}]   Classes: ${classes}`);
    }
    console.log(`${P} [${runId}] [${imageLabel}] ═══════════════════════════════════════`);

    return {
      originalImageUri: imageUri,
      annotatedImageBase64,
      annotatedImageWidth,
      annotatedImageHeight,
      detections,
      timing: timings,
      success: true,
    };
  } catch (error) {
    timings.totalMs = Date.now() - totalStartTime;

    console.error(`${P} [${runId}] [${imageLabel}] ═══════════════════════════════════════`);
    console.error(`${P} [${runId}] [${imageLabel}] FAILED`);
    console.error(`${P} [${runId}] [${imageLabel}]   Error: ${error}`);
    console.error(`${P} [${runId}] [${imageLabel}]   Time before failure: ${formatMs(timings.totalMs)}`);
    console.error(`${P} [${runId}] [${imageLabel}] ═══════════════════════════════════════`);

    return {
      originalImageUri: imageUri,
      annotatedImageBase64: '',
      annotatedImageWidth: 0,
      annotatedImageHeight: 0,
      detections: [],
      timing: timings,
      success: false,
      error: String(error),
    };
  }
}

// ============================================================
// RESULT AGGREGATION
// ============================================================

/**
 * Aggregate results from multiple images into a summary
 *
 * @param results - Array of individual image results
 * @returns Aggregated detection summary
 */
function aggregateResults(results: ImageDetectionResult[]): DetectionSummary {
  const byClass: Record<string, number> = {};
  let totalCount = 0;
  let highestConfidence: Detection | null = null;
  let highestConfidenceImageIndex: number | null = null;
  let confidenceSum = 0;

  results.forEach((result, imageIndex) => {
    result.detections.forEach((detection) => {
      // Count by class
      byClass[detection.className] = (byClass[detection.className] || 0) + 1;
      totalCount++;
      confidenceSum += detection.confidence;

      // Track highest confidence
      if (!highestConfidence || detection.confidence > highestConfidence.confidence) {
        highestConfidence = detection;
        highestConfidenceImageIndex = imageIndex;
      }
    });
  });

  return {
    byClass,
    totalCount,
    highestConfidence,
    highestConfidenceImageIndex,
    averageConfidence: totalCount > 0 ? confidenceSum / totalCount : 0,
  };
}

// ============================================================
// MAIN PIPELINE ENTRY POINT
// ============================================================

/**
 * Run the complete YOLO detection pipeline on multiple images
 *
 * This is the main entry point for wound detection. It:
 * 1. Loads the model (if not already loaded)
 * 2. Processes each image through detection + annotation
 * 3. Aggregates results into a summary
 *
 * @param imageUris - Array of image URIs to process
 * @param options - Optional configuration
 * @param onProgress - Optional callback for progress updates
 * @returns Complete pipeline result with all detections and annotated images
 *
 * @example
 * ```typescript
 * const result = await runPipeline(
 *   ['file://photo1.jpg', 'file://photo2.jpg'],
 *   { confidenceThreshold: 0.6 },
 *   (progress) => console.log(`${progress.percentComplete}%`)
 * );
 * ```
 */
export async function runPipeline(
  imageUris: string[],
  options: PipelineOptions = {},
  onProgress?: PipelineProgressCallback
): Promise<PipelineResult> {
  const runId = options.logPrefix || generateRunId();
  const startedAt = new Date().toISOString();
  const pipelineStartTime = Date.now();

  // Emit progress helper
  const emitProgress = (
    stage: PipelineProgress['stage'],
    currentImageIndex: number,
    message: string
  ) => {
    if (onProgress) {
      const percentComplete =
        stage === 'loading_model'
          ? 5
          : stage === 'complete'
            ? 100
            : stage === 'error'
              ? 0
              : Math.round(10 + (currentImageIndex / imageUris.length) * 85);

      onProgress({
        stage,
        currentImageIndex,
        totalImages: imageUris.length,
        percentComplete,
        message,
      });
    }
  };

  logHeader(runId, 'YOLO DETECTION PIPELINE STARTED');
  logKV(runId, 'Input images', imageUris.length);
  logKV(runId, 'Confidence threshold', options.confidenceThreshold ?? MODEL_CONFIG.confidenceThreshold);
  logKV(runId, 'IoU threshold', options.iouThreshold ?? MODEL_CONFIG.iouThreshold);
  logKV(runId, 'Skip visualization', options.skipVisualization ?? false);
  logKV(runId, 'Continue on error', options.continueOnError ?? PIPELINE_CONFIG.CONTINUE_ON_ERROR);

  // Validate input
  if (!imageUris || imageUris.length === 0) {
    console.error(`${P} [${runId}] ❌ No images provided`);
    emitProgress('error', 0, 'No images provided');
    throw new Error('No images provided to pipeline');
  }

  if (imageUris.length > PIPELINE_CONFIG.MAX_IMAGES) {
    console.warn(
      `${P} [${runId}] ⚠️ Too many images (${imageUris.length}), limiting to ${PIPELINE_CONFIG.MAX_IMAGES}`
    );
    imageUris = imageUris.slice(0, PIPELINE_CONFIG.MAX_IMAGES);
  }

  // Log all input URIs
  console.log(`${P} [${runId}] Input images:`);
  imageUris.forEach((uri, idx) => {
    console.log(`${P} [${runId}]   ${idx + 1}. ${uri.substring(0, 60)}...`);
  });

  try {
    // Step 1: Load model
    logDivider(runId);
    console.log(`${P} [${runId}] STEP 1: Loading model...`);
    emitProgress('loading_model', 0, 'Loading YOLO model...');

    const modelLoadTimeMs = await ensureModelLoaded(runId);
    console.log(`${P} [${runId}] Model ready (load time: ${formatMs(modelLoadTimeMs)})`);

    // Step 2: Process each image
    logDivider(runId);
    console.log(`${P} [${runId}] STEP 2: Processing ${imageUris.length} image(s)...`);

    const results: ImageDetectionResult[] = [];
    const continueOnError = options.continueOnError ?? PIPELINE_CONFIG.CONTINUE_ON_ERROR;

    for (let i = 0; i < imageUris.length; i++) {
      emitProgress('processing_image', i, `Processing image ${i + 1} of ${imageUris.length}...`);

      const result = await processOneImage(imageUris[i], i, imageUris.length, runId, options);
      results.push(result);

      // Check if we should stop on error
      if (!result.success && !continueOnError) {
        console.error(`${P} [${runId}] Stopping pipeline due to error (continueOnError=false)`);
        break;
      }
    }

    // Step 3: Aggregate results
    logDivider(runId);
    console.log(`${P} [${runId}] STEP 3: Aggregating results...`);

    const summary = aggregateResults(results);
    const totalProcessingTimeMs = Date.now() - pipelineStartTime;
    const completedAt = new Date().toISOString();

    // Count successes/failures
    const successfulImages = results.filter((r) => r.success).length;
    const failedImages = results.filter((r) => !r.success).length;

    // Build final result
    const pipelineResult: PipelineResult = {
      results,
      totalDetections: summary.totalCount,
      successfulImages,
      failedImages,
      totalProcessingTimeMs,
      modelLoadTimeMs,
      summary,
      metadata: {
        startedAt,
        completedAt,
        inputImageCount: imageUris.length,
        modelConfig: {
          inputSize: MODEL_CONFIG.inputWidth,
          confidenceThreshold: options.confidenceThreshold ?? MODEL_CONFIG.confidenceThreshold,
          iouThreshold: options.iouThreshold ?? MODEL_CONFIG.iouThreshold,
          classes: MODEL_CONFIG.classNames,
        },
      },
    };

    // Log final summary
    logHeader(runId, 'YOLO DETECTION PIPELINE COMPLETE');
    logKV(runId, 'Total time', formatMs(totalProcessingTimeMs));
    logKV(runId, 'Model load time', formatMs(modelLoadTimeMs));
    logKV(runId, 'Images processed', `${successfulImages}/${imageUris.length} successful`);
    if (failedImages > 0) {
      logKV(runId, 'Failed images', failedImages);
    }
    logKV(runId, 'Total detections', summary.totalCount);

    if (summary.totalCount > 0) {
      console.log(`${P} [${runId}] Detections by class:`);
      Object.entries(summary.byClass).forEach(([className, count]) => {
        console.log(`${P} [${runId}]   - ${className}: ${count}`);
      });
      logKV(runId, 'Average confidence', `${(summary.averageConfidence * 100).toFixed(1)}%`);
      if (summary.highestConfidence) {
        logKV(
          runId,
          'Highest confidence',
          `${summary.highestConfidence.className} (${(summary.highestConfidence.confidence * 100).toFixed(1)}%) in image ${(summary.highestConfidenceImageIndex ?? 0) + 1}`
        );
      }
    }

    emitProgress('complete', imageUris.length, 'Detection complete');
    return pipelineResult;
  } catch (error) {
    console.error(`${P} [${runId}] ════════════════════════════════════════════════════════`);
    console.error(`${P} [${runId}] PIPELINE FAILED`);
    console.error(`${P} [${runId}]   Error: ${error}`);
    console.error(`${P} [${runId}] ════════════════════════════════════════════════════════`);

    emitProgress('error', 0, `Pipeline failed: ${error}`);
    throw error;
  }
}

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

/**
 * Process a single image (convenience wrapper around runPipeline)
 *
 * @param imageUri - URI to the image file
 * @param options - Optional configuration
 * @returns Single image detection result
 */
export async function processImage(
  imageUri: string,
  options: PipelineOptions = {}
): Promise<ImageDetectionResult> {
  const result = await runPipeline([imageUri], options);
  return result.results[0];
}

/**
 * Quick check if any wounds are detected in an image
 * Does not generate annotated image (faster)
 *
 * @param imageUri - URI to the image file
 * @returns True if any detections found
 */
export async function hasDetections(imageUri: string): Promise<boolean> {
  const result = await runPipeline([imageUri], { skipVisualization: true });
  return result.totalDetections > 0;
}

// ============================================================
// TESTING UTILITIES
// ============================================================

/**
 * Test the pipeline with provided images
 *
 * @param imageUris - Array of image URIs to test with
 */
export async function testPipeline(imageUris: string[]): Promise<void> {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    PIPELINE TEST                               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    console.log(`🧪 Testing pipeline with ${imageUris.length} image(s)...`);
    console.log('\n');

    const result = await runPipeline(imageUris, {
      logPrefix: 'TEST',
    });

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST RESULTS                                ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ Total detections: ${result.totalDetections.toString().padEnd(44)}║`);
    console.log(`║ Successful images: ${result.successfulImages}/${result.results.length}`.padEnd(65) + '║');
    console.log(`║ Total time: ${formatMs(result.totalProcessingTimeMs).padEnd(52)}║`);
    console.log('╠════════════════════════════════════════════════════════════════╣');

    if (result.totalDetections > 0) {
      console.log('║ Detections by class:'.padEnd(65) + '║');
      Object.entries(result.summary.byClass).forEach(([cls, count]) => {
        console.log(`║   - ${cls}: ${count}`.padEnd(65) + '║');
      });
    } else {
      console.log('║ No detections found'.padEnd(65) + '║');
    }

    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║ Per-image results:'.padEnd(65) + '║');

    result.results.forEach((r, idx) => {
      const status = r.success ? '✅' : '❌';
      const detCount = r.detections.length;
      const time = formatMs(r.timing.totalMs);
      console.log(`║   ${status} Image ${idx + 1}: ${detCount} detection(s) in ${time}`.padEnd(64) + '║');

      if (r.detections.length > 0) {
        r.detections.forEach((det) => {
          const conf = (det.confidence * 100).toFixed(1);
          console.log(`║      - ${det.className}: ${conf}%`.padEnd(64) + '║');
        });
      }
    });

    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log('✅ Pipeline test complete!\n');
  } catch (error) {
    console.error('\n');
    console.error('╔════════════════════════════════════════════════════════════════╗');
    console.error('║                    TEST FAILED                                 ║');
    console.error('╚════════════════════════════════════════════════════════════════╝');
    console.error(`\n❌ Error: ${error}\n`);
    throw error;
  }
}

/**
 * Test that model loads correctly
 */
export async function testModelLoad(): Promise<boolean> {
  console.log('\n🧪 Testing model load...\n');

  try {
    const loadTime = await ensureModelLoaded('MODEL_TEST');
    console.log(`✅ Model loaded successfully in ${formatMs(loadTime)}`);
    return true;
  } catch (error) {
    console.error(`❌ Model load failed: ${error}`);
    return false;
  }
}
