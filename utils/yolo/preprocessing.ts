/**
 * YOLO Preprocessing Module
 *
 * Handles image preprocessing for YOLO inference.
 * This module contains PURE FUNCTIONS that are easily testable.
 *
 * OpenCV-specific operations are delegated to opencv-bridge.ts
 *
 * Pipeline:
 * 1. Load image from URI (opencv-bridge)
 * 2. Calculate letterbox parameters (pure math)
 * 3. Resize image (opencv-bridge)
 * 4. Apply letterbox padding (opencv-bridge)
 * 5. Normalize pixel values [0-255] -> [0-1] (pure math)
 * 6. Transpose HWC -> CHW (pure math)
 */

import type { PreprocessResult } from "./types";
import { MODEL_CONFIG, LOG_PREFIX } from "./constants";
import {
  loadImagePixels,
  resizeImage,
  applyPadding,
  testOpenCVBridge,
  testOpenCVBasic,
} from "./opencv-bridge";

// ============================================================
// PURE FUNCTIONS (Testable without OpenCV)
// ============================================================

/**
 * Calculate letterbox parameters for resizing
 *
 * @param srcWidth - Original image width
 * @param srcHeight - Original image height
 * @param targetSize - Target size (640)
 * @returns Object with scale and padding info
 */
export function calculateLetterboxParams(
  srcWidth: number,
  srcHeight: number,
  targetSize: number = MODEL_CONFIG.inputWidth
): {
  scale: number;
  padX: number;
  padY: number;
  newWidth: number;
  newHeight: number;
} {
  console.log(`${LOG_PREFIX.PREPROCESS} Calculating letterbox params`);
  console.log(`${LOG_PREFIX.PREPROCESS}   Source: ${srcWidth}x${srcHeight}`);
  console.log(`${LOG_PREFIX.PREPROCESS}   Target: ${targetSize}x${targetSize}`);

  // Calculate scale factor (fit within target while preserving aspect ratio)
  const scale = Math.min(targetSize / srcWidth, targetSize / srcHeight);

  // Calculate new dimensions
  const newWidth = Math.round(srcWidth * scale);
  const newHeight = Math.round(srcHeight * scale);

  // Calculate padding needed
  const padX = (targetSize - newWidth) / 2;
  const padY = (targetSize - newHeight) / 2;

  console.log(`${LOG_PREFIX.PREPROCESS}   Scale: ${scale.toFixed(4)}`);
  console.log(`${LOG_PREFIX.PREPROCESS}   New size: ${newWidth}x${newHeight}`);
  console.log(
    `${LOG_PREFIX.PREPROCESS}   Padding: (${padX.toFixed(1)}, ${padY.toFixed(1)})`
  );

  return { scale, padX, padY, newWidth, newHeight };
}

/**
 * Normalize pixel values from [0-255] to [0-1]
 *
 * @param data - Uint8Array of pixel values [0-255]
 * @returns Float32Array of normalized values [0-1]
 */
export function normalizePixels(data: Uint8Array): Float32Array {
  console.log(`${LOG_PREFIX.PREPROCESS} Normalizing ${data.length} pixels`);

  const normalized = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    normalized[i] = data[i] / 255.0;
  }

  // Log stats
  let min = Infinity,
    max = -Infinity;
  for (let i = 0; i < Math.min(1000, normalized.length); i++) {
    if (normalized[i] < min) min = normalized[i];
    if (normalized[i] > max) max = normalized[i];
  }

  console.log(
    `${LOG_PREFIX.PREPROCESS}   Output range: [${min.toFixed(4)}, ${max.toFixed(4)}]`
  );

  return normalized;
}

/**
 * Transpose image from HWC (Height, Width, Channels) to CHW (Channels, Height, Width)
 * This is required because YOLO expects CHW format
 *
 * @param data - Float32Array in HWC format [H*W*C]
 * @param height - Image height
 * @param width - Image width
 * @param channels - Number of channels (3 for RGB)
 * @returns Float32Array in CHW format [C*H*W]
 *
 * @example
 * // Input HWC: pixel[y][x][c] = data[y * width * channels + x * channels + c]
 * // Output CHW: pixel[c][y][x] = data[c * height * width + y * width + x]
 */
export function hwcToChw(
  data: Float32Array,
  height: number,
  width: number,
  channels: number
): Float32Array {
  console.log(
    `${LOG_PREFIX.PREPROCESS} Transposing HWC [${height}, ${width}, ${channels}] -> CHW [${channels}, ${height}, ${width}]`
  );

  const chwData = new Float32Array(channels * height * width);

  for (let c = 0; c < channels; c++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const hwcIndex = y * width * channels + x * channels + c;
        const chwIndex = c * height * width + y * width + x;
        chwData[chwIndex] = data[hwcIndex];
      }
    }
  }

  console.log(`${LOG_PREFIX.PREPROCESS}   Output length: ${chwData.length}`);

  return chwData;
}

// ============================================================
// MAIN PREPROCESSING PIPELINE
// ============================================================

/**
 * Preprocess image for YOLO inference
 *
 * Full pipeline:
 * 1. Load image from URI (OpenCV bridge)
 * 2. Calculate letterbox parameters (pure math)
 * 3. Resize image (OpenCV bridge)
 * 4. Apply letterbox padding (OpenCV bridge)
 * 5. Normalize pixels [0-255] -> [0-1] (pure math)
 * 6. Transpose HWC -> CHW (pure math)
 *
 * @param imageUri - URI to the image file
 * @param targetSize - Target size (default 640)
 * @returns PreprocessResult with tensor and scaling info
 */
export async function preprocessImage(
  imageUri: string,
  targetSize: number = MODEL_CONFIG.inputWidth
): Promise<PreprocessResult> {
  console.log(`${LOG_PREFIX.PREPROCESS} ========================================`);
  console.log(`${LOG_PREFIX.PREPROCESS} Starting FULL image preprocessing`);
  console.log(`${LOG_PREFIX.PREPROCESS} ========================================`);
  console.log(`${LOG_PREFIX.PREPROCESS} Image URI: ${imageUri}`);
  console.log(`${LOG_PREFIX.PREPROCESS} Target size: ${targetSize}x${targetSize}`);

  const startTime = Date.now();

  try {
    // Step 1: Load image from URI using OpenCV bridge
    console.log(`\n${LOG_PREFIX.PREPROCESS} ▶ Step 1: Loading image...`);
    const raw = await loadImagePixels(imageUri);
    console.log(
      `${LOG_PREFIX.PREPROCESS} ✅ Loaded: ${raw.width}x${raw.height}x${raw.channels}`
    );

    const originalWidth = raw.width;
    const originalHeight = raw.height;

    // Step 2: Calculate letterbox parameters
    console.log(`\n${LOG_PREFIX.PREPROCESS} ▶ Step 2: Calculating letterbox params...`);
    const { scale, padX, padY, newWidth, newHeight } = calculateLetterboxParams(
      originalWidth,
      originalHeight,
      targetSize
    );

    // Step 3: Resize image
    console.log(`\n${LOG_PREFIX.PREPROCESS} ▶ Step 3: Resizing image...`);
    const resized = resizeImage(raw, newWidth, newHeight);
    console.log(
      `${LOG_PREFIX.PREPROCESS} ✅ Resized: ${resized.width}x${resized.height}`
    );

    // Step 4: Apply letterbox padding
    console.log(`\n${LOG_PREFIX.PREPROCESS} ▶ Step 4: Applying letterbox padding...`);
    const padded = applyPadding(resized, targetSize, targetSize, padX, padY);
    console.log(
      `${LOG_PREFIX.PREPROCESS} ✅ Padded: ${padded.width}x${padded.height}`
    );

    // Step 5: Normalize pixels [0-255] -> [0-1]
    console.log(`\n${LOG_PREFIX.PREPROCESS} ▶ Step 5: Normalizing pixels...`);
    const normalized = normalizePixels(padded.pixels);
    console.log(`${LOG_PREFIX.PREPROCESS} ✅ Normalized: ${normalized.length} values`);

    // Step 6: Transpose HWC -> CHW
    console.log(`\n${LOG_PREFIX.PREPROCESS} ▶ Step 6: Transposing HWC -> CHW...`);
    const tensor = hwcToChw(normalized, targetSize, targetSize, 3);
    console.log(`${LOG_PREFIX.PREPROCESS} ✅ Transposed: ${tensor.length} values`);

    // Validate tensor
    const expectedSize = 1 * 3 * targetSize * targetSize;
    if (tensor.length !== expectedSize) {
      console.warn(
        `${LOG_PREFIX.PREPROCESS} ⚠️ Tensor size mismatch! Got ${tensor.length}, expected ${expectedSize}`
      );
    }

    // Log tensor stats
    let min = Infinity,
      max = -Infinity,
      sum = 0;
    for (let i = 0; i < tensor.length; i++) {
      if (tensor[i] < min) min = tensor[i];
      if (tensor[i] > max) max = tensor[i];
      sum += tensor[i];
    }
    const mean = sum / tensor.length;

    console.log(`\n${LOG_PREFIX.PREPROCESS} 📊 Tensor stats:`);
    console.log(`${LOG_PREFIX.PREPROCESS}    Shape: [1, 3, ${targetSize}, ${targetSize}]`);
    console.log(`${LOG_PREFIX.PREPROCESS}    Size: ${tensor.length} floats`);
    console.log(`${LOG_PREFIX.PREPROCESS}    Min: ${min.toFixed(4)}`);
    console.log(`${LOG_PREFIX.PREPROCESS}    Max: ${max.toFixed(4)}`);
    console.log(`${LOG_PREFIX.PREPROCESS}    Mean: ${mean.toFixed(4)}`);
    console.log(
      `${LOG_PREFIX.PREPROCESS}    First 5: [${Array.from(tensor.slice(0, 5)).map((v) => v.toFixed(4)).join(", ")}]`
    );

    const elapsed = Date.now() - startTime;

    console.log(`\n${LOG_PREFIX.PREPROCESS} ========================================`);
    console.log(`${LOG_PREFIX.PREPROCESS} ✅ Preprocessing COMPLETE`);
    console.log(`${LOG_PREFIX.PREPROCESS}    Total time: ${elapsed}ms`);
    console.log(`${LOG_PREFIX.PREPROCESS}    Original: ${originalWidth}x${originalHeight}`);
    console.log(`${LOG_PREFIX.PREPROCESS}    Output: [1, 3, ${targetSize}, ${targetSize}]`);
    console.log(`${LOG_PREFIX.PREPROCESS}    Scale: ${scale.toFixed(4)}`);
    console.log(`${LOG_PREFIX.PREPROCESS}    Padding: (${padX.toFixed(1)}, ${padY.toFixed(1)})`);
    console.log(`${LOG_PREFIX.PREPROCESS} ========================================`);

    return {
      tensor,
      originalWidth,
      originalHeight,
      scale,
      padX,
      padY,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX.PREPROCESS} ❌ Preprocessing failed: ${error}`);
    throw error;
  }
}

/**
 * Create a dummy preprocessed tensor for testing
 * Useful to test inference pipeline without real preprocessing
 *
 * @param targetSize - Target size (640)
 * @returns PreprocessResult with random tensor data
 */
export function createDummyPreprocessResult(
  targetSize: number = MODEL_CONFIG.inputWidth
): PreprocessResult {
  console.log(`${LOG_PREFIX.PREPROCESS} Creating dummy preprocess result`);

  const tensorSize = 1 * 3 * targetSize * targetSize;
  const tensor = new Float32Array(tensorSize);

  // Fill with random values [0, 1]
  for (let i = 0; i < tensorSize; i++) {
    tensor[i] = Math.random();
  }

  return {
    tensor,
    originalWidth: targetSize,
    originalHeight: targetSize,
    scale: 1,
    padX: 0,
    padY: 0,
  };
}

// ============================================================
// TESTING UTILITIES
// ============================================================

/**
 * Test letterbox calculation
 */
export function testLetterboxCalculation(): void {
  console.log("\n========== Testing Letterbox Calculation ==========");

  // Test 1: Landscape image (1920x1080 -> 640x640)
  const result1 = calculateLetterboxParams(1920, 1080, 640);
  console.log(`\nTest 1: 1920x1080 -> 640x640`);
  console.log(`  Scale: ${result1.scale.toFixed(4)} (expected: 0.3333)`);
  console.log(
    `  New size: ${result1.newWidth}x${result1.newHeight} (expected: 640x360)`
  );
  console.log(`  Pad: (${result1.padX}, ${result1.padY}) (expected: 0, 140)`);

  // Test 2: Portrait image (1080x1920 -> 640x640)
  const result2 = calculateLetterboxParams(1080, 1920, 640);
  console.log(`\nTest 2: 1080x1920 -> 640x640`);
  console.log(`  Scale: ${result2.scale.toFixed(4)} (expected: 0.3333)`);
  console.log(
    `  New size: ${result2.newWidth}x${result2.newHeight} (expected: 360x640)`
  );
  console.log(`  Pad: (${result2.padX}, ${result2.padY}) (expected: 140, 0)`);

  // Test 3: Square image (1000x1000 -> 640x640)
  const result3 = calculateLetterboxParams(1000, 1000, 640);
  console.log(`\nTest 3: 1000x1000 -> 640x640`);
  console.log(`  Scale: ${result3.scale.toFixed(4)} (expected: 0.64)`);
  console.log(
    `  New size: ${result3.newWidth}x${result3.newHeight} (expected: 640x640)`
  );
  console.log(`  Pad: (${result3.padX}, ${result3.padY}) (expected: 0, 0)`);

  console.log("\n===================================================\n");
}

/**
 * Test HWC to CHW transpose
 */
export function testHwcToChw(): void {
  console.log("\n========== Testing HWC to CHW Transpose ==========");

  // Create small test data: 2x2 RGB image
  // HWC layout: [R00, G00, B00, R01, G01, B01, R10, G10, B10, R11, G11, B11]
  const hwcData = new Float32Array([
    1,
    2,
    3, // Pixel (0,0): R=1, G=2, B=3
    4,
    5,
    6, // Pixel (0,1): R=4, G=5, B=6
    7,
    8,
    9, // Pixel (1,0): R=7, G=8, B=9
    10,
    11,
    12, // Pixel (1,1): R=10, G=11, B=12
  ]);

  const chwData = hwcToChw(hwcData, 2, 2, 3);

  // Expected CHW layout:
  // Channel R: [1, 4, 7, 10]
  // Channel G: [2, 5, 8, 11]
  // Channel B: [3, 6, 9, 12]
  const expected = new Float32Array([1, 4, 7, 10, 2, 5, 8, 11, 3, 6, 9, 12]);

  console.log(`Input HWC: [${Array.from(hwcData).join(", ")}]`);
  console.log(`Output CHW: [${Array.from(chwData).join(", ")}]`);
  console.log(`Expected:   [${Array.from(expected).join(", ")}]`);

  let match = true;
  for (let i = 0; i < expected.length; i++) {
    if (chwData[i] !== expected[i]) {
      match = false;
      break;
    }
  }

  console.log(`Result: ${match ? "✅ PASS" : "❌ FAIL"}`);
  console.log("===================================================\n");
}

/**
 * Test normalize pixels
 */
export function testNormalizePixels(): void {
  console.log("\n========== Testing Normalize Pixels ==========");

  const input = new Uint8Array([0, 128, 255]);
  const output = normalizePixels(input);

  console.log(`Input: [${Array.from(input).join(", ")}]`);
  console.log(
    `Output: [${Array.from(output)
      .map((v) => v.toFixed(4))
      .join(", ")}]`
  );
  console.log(`Expected: [0.0000, 0.5020, 1.0000]`);

  const pass =
    Math.abs(output[0] - 0) < 0.001 &&
    Math.abs(output[1] - 0.502) < 0.001 &&
    Math.abs(output[2] - 1) < 0.001;

  console.log(`Result: ${pass ? "✅ PASS" : "❌ FAIL"}`);
  console.log("===============================================\n");
}

/**
 * Test the full preprocessing pipeline with a real image
 */
export async function testPreprocessingWithImage(
  imageUri: string
): Promise<void> {
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║         FULL PREPROCESSING PIPELINE TEST               ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  try {
    // First, test basic OpenCV
    console.log("🧪 Test 0: Basic OpenCV functionality...");
    const basicOk = testOpenCVBasic();
    if (!basicOk) {
      throw new Error("Basic OpenCV test failed");
    }
    console.log("✅ Basic OpenCV working\n");

    // Test OpenCV bridge
    console.log("🧪 Test 1: OpenCV Bridge...");
    await testOpenCVBridge(imageUri);
    console.log("✅ OpenCV Bridge working\n");

    // Test full pipeline
    console.log("🧪 Test 2: Full preprocessing pipeline...");
    const result = await preprocessImage(imageUri);

    console.log("\n📊 Pipeline output validation:");
    console.log(`   Tensor length: ${result.tensor.length}`);
    console.log(
      `   Expected: ${3 * 640 * 640} = ${3 * 640 * 640 === result.tensor.length ? "✅" : "❌"}`
    );
    console.log(`   Original size: ${result.originalWidth}x${result.originalHeight}`);
    console.log(`   Scale: ${result.scale.toFixed(4)}`);
    console.log(`   Padding: (${result.padX.toFixed(1)}, ${result.padY.toFixed(1)})`);

    // Validate tensor values
    let hasNaN = false;
    let hasInf = false;
    let outOfRange = false;
    for (let i = 0; i < result.tensor.length; i++) {
      if (isNaN(result.tensor[i])) hasNaN = true;
      if (!isFinite(result.tensor[i])) hasInf = true;
      if (result.tensor[i] < 0 || result.tensor[i] > 1) outOfRange = true;
    }

    console.log(`   No NaN values: ${!hasNaN ? "✅" : "❌"}`);
    console.log(`   No Inf values: ${!hasInf ? "✅" : "❌"}`);
    console.log(`   Values in [0,1]: ${!outOfRange ? "✅" : "❌"}`);

    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║         ALL PREPROCESSING TESTS PASSED                 ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
  } catch (error) {
    console.error(`\n❌ Preprocessing test failed: ${error}`);
    throw error;
  }
}

/**
 * Run all preprocessing tests (pure function tests only)
 */
export function runAllPreprocessingTests(): void {
  console.log("\n🧪 Running Preprocessing Tests...\n");
  testLetterboxCalculation();
  testNormalizePixels();
  testHwcToChw();
  console.log("🧪 All preprocessing tests complete!\n");
}
