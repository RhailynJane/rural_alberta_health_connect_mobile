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
