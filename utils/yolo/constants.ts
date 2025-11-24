/**
 * YOLO Model Configuration
 * Centralized configuration for easy modification
 */

import type { ModelConfig, YoloOutputInfo } from "./types";

/**
 * Model configuration for your trained YOLO model
 * Modify these values if your model changes
 */
export const MODEL_CONFIG: ModelConfig = {
  inputWidth: 640,
  inputHeight: 640,
  numClasses: 3,
  classNames: ["abrasion", "bruise", "cut"],
  confidenceThreshold: 0.5, // Production threshold
  iouThreshold: 0.45,
};

/**
 * Expected YOLO output shape info
 * Output: [1, 7, 8400]
 * - 1: batch size
 * - 7: features (x, y, w, h, class1_prob, class2_prob, class3_prob)
 * - 8400: total predictions (80*80 + 40*40 + 20*20 = 8400)
 */
export const YOLO_OUTPUT_INFO: YoloOutputInfo = {
  batchSize: 1,
  numFeatures: 4 + MODEL_CONFIG.numClasses, // 4 box coords + num classes = 7
  numPredictions: 8400,
};

/**
 * Feature indices in the YOLO output
 * For output shape [1, 7, 8400]:
 * - Index 0: x_center
 * - Index 1: y_center
 * - Index 2: width
 * - Index 3: height
 * - Index 4+: class probabilities
 */
export const FEATURE_INDICES = {
  X_CENTER: 0,
  Y_CENTER: 1,
  WIDTH: 2,
  HEIGHT: 3,
  CLASS_PROBS_START: 4,
} as const;

/**
 * Logging prefix for consistent log formatting
 */
export const LOG_PREFIX = {
  PREPROCESS: "[YOLO:Preprocess]",
  INFERENCE: "[YOLO:Inference]",
  POSTPROCESS: "[YOLO:Postprocess]",
  NMS: "[YOLO:NMS]",
  PIPELINE: "[YOLO:Pipeline]",
  VISUALIZATION: "[YOLO:Viz]",
  MODEL: "[YOLO:Model]",
} as const;

/**
 * Pipeline configuration defaults
 */
export const PIPELINE_CONFIG = {
  /** Default timeout for single image processing (ms) */
  IMAGE_TIMEOUT_MS: 30000,
  /** Maximum number of images to process in a single pipeline run */
  MAX_IMAGES: 10,
  /** Whether to continue processing if one image fails */
  CONTINUE_ON_ERROR: true,
} as const;

/**
 * Box styling for different severity levels
 * Used to color boxes based on detection confidence
 */
export const CONFIDENCE_COLORS = {
  HIGH: [0, 255, 0],    // Green (BGR) for confidence >= 0.8
  MEDIUM: [0, 165, 255], // Orange (BGR) for confidence >= 0.5
  LOW: [0, 0, 255],      // Red (BGR) for confidence < 0.5
} as const;
