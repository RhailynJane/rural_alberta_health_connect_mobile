/**
 * YOLO Detection Types
 * All TypeScript interfaces for the YOLO detection pipeline
 */

/**
 * Bounding box in center format (YOLO native format)
 */
export interface BoundingBox {
  x: number;      // center x
  y: number;      // center y
  width: number;  // box width
  height: number; // box height
}

/**
 * Bounding box in corner format (for drawing)
 */
export interface BoundingBoxCorners {
  x1: number; // top-left x
  y1: number; // top-left y
  x2: number; // bottom-right x
  y2: number; // bottom-right y
}

/**
 * Single detection result
 */
export interface Detection {
  box: BoundingBox;
  boxCorners: BoundingBoxCorners;
  classId: number;
  className: string;
  confidence: number;
}

/**
 * Result from image preprocessing
 * Contains tensor data and info needed to scale boxes back to original image
 */
export interface PreprocessResult {
  tensor: Float32Array;      // Preprocessed image data [1, 3, 640, 640] flattened
  originalWidth: number;     // Original image width
  originalHeight: number;    // Original image height
  scale: number;             // Scale factor used for letterbox
  padX: number;              // Horizontal padding added (letterbox)
  padY: number;              // Vertical padding added (letterbox)
}

/**
 * Model configuration
 */
export interface ModelConfig {
  inputWidth: number;           // Model input width (640)
  inputHeight: number;          // Model input height (640)
  numClasses: number;           // Number of classes (3)
  classNames: string[];         // Class names ['abrasion', 'bruise', 'cut']
  confidenceThreshold: number;  // Min confidence to keep detection
  iouThreshold: number;         // IoU threshold for NMS
}

/**
 * Raw YOLO output info
 */
export interface YoloOutputInfo {
  batchSize: number;      // Always 1
  numFeatures: number;    // 7 (4 box + 3 classes)
  numPredictions: number; // 8400 anchor boxes
}

/**
 * Inference timing info for performance tracking
 */
export interface InferenceTiming {
  preprocessMs: number;
  inferenceMs: number;
  postprocessMs: number;
  totalMs: number;
}

/**
 * Complete detection result with timing
 */
export interface DetectionResult {
  detections: Detection[];
  timing: InferenceTiming;
  imageWidth: number;
  imageHeight: number;
}

// ============================================================
// PIPELINE TYPES (Multi-image processing)
// ============================================================

/**
 * Result of processing a single image through the YOLO pipeline
 * Contains both the annotated image and detection details
 */
export interface ImageDetectionResult {
  /** Original image URI (input) */
  originalImageUri: string;
  /** Base64-encoded annotated image with bounding boxes drawn */
  annotatedImageBase64: string;
  /** Width of the annotated image */
  annotatedImageWidth: number;
  /** Height of the annotated image */
  annotatedImageHeight: number;
  /** All detections found in this image */
  detections: Detection[];
  /** Processing time breakdown for this image */
  timing: {
    preprocessMs: number;
    inferenceMs: number;
    postprocessMs: number;
    visualizationMs: number;
    totalMs: number;
  };
  /** Whether processing succeeded */
  success: boolean;
  /** Error message if processing failed */
  error?: string;
}

/**
 * Aggregated summary of detections across all images
 */
export interface DetectionSummary {
  /** Count of detections per class (e.g., { cut: 2, bruise: 1 }) */
  byClass: Record<string, number>;
  /** Total number of detections across all images */
  totalCount: number;
  /** Detection with highest confidence (null if no detections) */
  highestConfidence: Detection | null;
  /** Image index containing the highest confidence detection */
  highestConfidenceImageIndex: number | null;
  /** Average confidence across all detections */
  averageConfidence: number;
}

/**
 * Complete result of running the YOLO pipeline on multiple images
 */
export interface PipelineResult {
  /** Results for each input image (same order as input) */
  results: ImageDetectionResult[];
  /** Total number of detections across all images */
  totalDetections: number;
  /** Number of images successfully processed */
  successfulImages: number;
  /** Number of images that failed processing */
  failedImages: number;
  /** Total processing time for all images */
  totalProcessingTimeMs: number;
  /** Time to load the model (0 if already cached) */
  modelLoadTimeMs: number;
  /** Aggregated detection summary */
  summary: DetectionSummary;
  /** Pipeline execution metadata */
  metadata: {
    /** Timestamp when pipeline started */
    startedAt: string;
    /** Timestamp when pipeline completed */
    completedAt: string;
    /** Number of input images */
    inputImageCount: number;
    /** Model configuration used */
    modelConfig: {
      inputSize: number;
      confidenceThreshold: number;
      iouThreshold: number;
      classes: string[];
    };
  };
}

/**
 * Options for configuring pipeline execution
 */
export interface PipelineOptions {
  /** Override confidence threshold (default: from MODEL_CONFIG) */
  confidenceThreshold?: number;
  /** Override IoU threshold for NMS (default: from MODEL_CONFIG) */
  iouThreshold?: number;
  /** Whether to skip visualization (faster, no annotated images) */
  skipVisualization?: boolean;
  /** Whether to continue processing remaining images if one fails */
  continueOnError?: boolean;
  /** Custom log prefix for identifying this pipeline run */
  logPrefix?: string;
}

/**
 * Status updates during pipeline execution (for progress tracking)
 */
export interface PipelineProgress {
  /** Current stage of processing */
  stage: 'loading_model' | 'processing_image' | 'complete' | 'error';
  /** Index of current image being processed (0-based) */
  currentImageIndex: number;
  /** Total number of images to process */
  totalImages: number;
  /** Percentage complete (0-100) */
  percentComplete: number;
  /** Human-readable status message */
  message: string;
}

/**
 * Callback for receiving pipeline progress updates
 */
export type PipelineProgressCallback = (progress: PipelineProgress) => void;
