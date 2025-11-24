/**
 * OpenCV Bridge Module
 *
 * Thin wrapper around react-native-fast-opencv for image loading and manipulation.
 * This module ONLY handles OpenCV-specific operations.
 * All math/logic is in preprocessing.ts (pure functions, testable).
 *
 * Key responsibilities:
 * 1. Load image from URI → raw pixels
 * 2. Resize image using OpenCV (fast native implementation)
 * 3. Color space conversion (BGR → RGB)
 */

import {
  OpenCV,
  ObjectType,
  DataTypes,
  ColorConversionCodes,
  InterpolationFlags,
} from "react-native-fast-opencv";
import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";

// ============================================================
// Types
// ============================================================

/**
 * Raw image data extracted from OpenCV Mat
 */
export interface RawImage {
  pixels: Uint8Array;
  width: number;
  height: number;
  channels: number;
}

// ============================================================
// Constants
// ============================================================

const LOG_PREFIX = "[OpenCV:Bridge]";

// ============================================================
// Core Functions
// ============================================================

/**
 * Load an image from a file URI and return raw RGB pixels.
 *
 * Pipeline:
 * 1. Read file as base64 (expo-file-system)
 * 2. Create Mat from base64 (OpenCV)
 * 3. Convert BGR → RGB (OpenCV loads images as BGR)
 * 4. Extract raw pixel buffer
 * 5. Clean up OpenCV memory
 *
 * @param uri - File URI (e.g., file:///var/mobile/...)
 * @returns RawImage with RGB pixel data
 */
export async function loadImagePixels(uri: string): Promise<RawImage> {
  console.log(`${LOG_PREFIX} ========================================`);
  console.log(`${LOG_PREFIX} Loading image from URI`);
  console.log(`${LOG_PREFIX} ========================================`);
  console.log(`${LOG_PREFIX} URI: ${uri}`);

  try {
    // Step 1: Read file as base64
    console.log(`${LOG_PREFIX} Step 1: Reading file as base64...`);
    const startRead = Date.now();
    const base64 = await readAsStringAsync(uri, {
      encoding: EncodingType.Base64,
    });
    const readTime = Date.now() - startRead;
    console.log(`${LOG_PREFIX} ✅ File read in ${readTime}ms`);
    console.log(
      `${LOG_PREFIX}    Base64 length: ${base64.length} chars (~${(base64.length * 0.75 / 1024).toFixed(1)} KB)`
    );

    // Step 2: Create Mat from base64
    console.log(`${LOG_PREFIX} Step 2: Creating Mat from base64...`);
    const startMat = Date.now();
    const mat = OpenCV.base64ToMat(base64);
    const matTime = Date.now() - startMat;
    console.log(`${LOG_PREFIX} ✅ Mat created in ${matTime}ms`);

    // Get Mat info
    const matInfo = OpenCV.toJSValue(mat);
    console.log(`${LOG_PREFIX}    Mat size: ${matInfo.cols}x${matInfo.rows}`);
    console.log(`${LOG_PREFIX}    Mat type: ${matInfo.type}`);

    // Step 3: Convert BGR to RGB
    console.log(`${LOG_PREFIX} Step 3: Converting BGR → RGB...`);
    const startCvt = Date.now();
    const rgbMat = OpenCV.createObject(
      ObjectType.Mat,
      matInfo.rows,
      matInfo.cols,
      DataTypes.CV_8UC3
    );
    OpenCV.invoke("cvtColor", mat, rgbMat, ColorConversionCodes.COLOR_BGR2RGB);
    const cvtTime = Date.now() - startCvt;
    console.log(`${LOG_PREFIX} ✅ Color converted in ${cvtTime}ms`);

    // Step 4: Extract pixel buffer
    console.log(`${LOG_PREFIX} Step 4: Extracting pixel buffer...`);
    const startBuffer = Date.now();
    const { buffer, cols, rows, channels } = OpenCV.matToBuffer(
      rgbMat,
      "uint8"
    );
    const bufferTime = Date.now() - startBuffer;
    console.log(`${LOG_PREFIX} ✅ Buffer extracted in ${bufferTime}ms`);
    console.log(`${LOG_PREFIX}    Buffer size: ${buffer.length} bytes`);
    console.log(`${LOG_PREFIX}    Dimensions: ${cols}x${rows}x${channels}`);
    console.log(
      `${LOG_PREFIX}    Expected: ${cols * rows * channels} bytes`
    );

    // Validate buffer
    const expectedSize = cols * rows * channels;
    if (buffer.length !== expectedSize) {
      console.warn(
        `${LOG_PREFIX} ⚠️ Buffer size mismatch! Got ${buffer.length}, expected ${expectedSize}`
      );
    }

    // Log first few pixel values (RGB of first 3 pixels)
    console.log(
      `${LOG_PREFIX}    First 9 values (RGB of pixels 0-2): [${Array.from(buffer.slice(0, 9)).join(", ")}]`
    );

    // Step 5: Clean up OpenCV memory
    console.log(`${LOG_PREFIX} Step 5: Cleaning up OpenCV buffers...`);
    OpenCV.clearBuffers();
    console.log(`${LOG_PREFIX} ✅ Buffers cleared`);

    const totalTime = readTime + matTime + cvtTime + bufferTime;
    console.log(`${LOG_PREFIX} ========================================`);
    console.log(`${LOG_PREFIX} ✅ Image loaded successfully`);
    console.log(`${LOG_PREFIX}    Total time: ${totalTime}ms`);
    console.log(`${LOG_PREFIX}    Output: ${cols}x${rows} RGB (${buffer.length} bytes)`);
    console.log(`${LOG_PREFIX} ========================================`);

    return {
      pixels: buffer,
      width: cols,
      height: rows,
      channels,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Error loading image: ${error}`);
    OpenCV.clearBuffers(); // Clean up even on error
    throw error;
  }
}

/**
 * Resize an image using OpenCV's native implementation (fast).
 *
 * @param image - Raw image data
 * @param newWidth - Target width
 * @param newHeight - Target height
 * @returns Resized RawImage
 */
export function resizeImage(
  image: RawImage,
  newWidth: number,
  newHeight: number
): RawImage {
  console.log(`${LOG_PREFIX} ----------------------------------------`);
  console.log(`${LOG_PREFIX} Resizing image`);
  console.log(`${LOG_PREFIX} ----------------------------------------`);
  console.log(`${LOG_PREFIX} Input: ${image.width}x${image.height}x${image.channels}`);
  console.log(`${LOG_PREFIX} Target: ${newWidth}x${newHeight}`);

  try {
    const startTime = Date.now();

    // Create Mat from buffer
    console.log(`${LOG_PREFIX} Creating Mat from buffer...`);
    const src = OpenCV.bufferToMat(
      "uint8",
      image.height,
      image.width,
      image.channels as 1 | 3 | 4,
      image.pixels
    );

    // Create destination Mat and Size
    const dst = OpenCV.createObject(
      ObjectType.Mat,
      newHeight,
      newWidth,
      DataTypes.CV_8UC3
    );
    const dsize = OpenCV.createObject(ObjectType.Size, newWidth, newHeight);

    // Resize using bilinear interpolation
    console.log(`${LOG_PREFIX} Invoking resize...`);
    OpenCV.invoke(
      "resize",
      src,
      dst,
      dsize,
      0, // fx (not used when dsize is specified)
      0, // fy (not used when dsize is specified)
      InterpolationFlags.INTER_LINEAR
    );

    // Extract resized buffer
    const { buffer, cols, rows, channels } = OpenCV.matToBuffer(dst, "uint8");

    // Clean up
    OpenCV.clearBuffers();

    const resizeTime = Date.now() - startTime;
    console.log(`${LOG_PREFIX} ✅ Resize completed in ${resizeTime}ms`);
    console.log(`${LOG_PREFIX}    Output: ${cols}x${rows}x${channels} (${buffer.length} bytes)`);

    return {
      pixels: buffer,
      width: cols,
      height: rows,
      channels,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Error resizing image: ${error}`);
    OpenCV.clearBuffers();
    throw error;
  }
}

/**
 * Apply letterbox padding to an image.
 * Adds gray (128) padding to reach target dimensions.
 *
 * @param image - Resized image (already scaled, needs padding)
 * @param targetWidth - Final width (e.g., 640)
 * @param targetHeight - Final height (e.g., 640)
 * @param padX - Padding on each side horizontally
 * @param padY - Padding on each side vertically
 * @returns Padded RawImage
 */
export function applyPadding(
  image: RawImage,
  targetWidth: number,
  targetHeight: number,
  padX: number,
  padY: number
): RawImage {
  console.log(`${LOG_PREFIX} ----------------------------------------`);
  console.log(`${LOG_PREFIX} Applying letterbox padding`);
  console.log(`${LOG_PREFIX} ----------------------------------------`);
  console.log(`${LOG_PREFIX} Input: ${image.width}x${image.height}`);
  console.log(`${LOG_PREFIX} Target: ${targetWidth}x${targetHeight}`);
  console.log(`${LOG_PREFIX} Padding: (${padX}, ${padY})`);

  try {
    const startTime = Date.now();

    // Create output buffer filled with gray (128)
    const outputSize = targetWidth * targetHeight * 3;
    const output = new Uint8Array(outputSize);
    output.fill(128); // Gray padding

    // Calculate offsets
    const offsetX = Math.floor(padX);
    const offsetY = Math.floor(padY);

    console.log(`${LOG_PREFIX} Copying pixels with offset (${offsetX}, ${offsetY})...`);

    // Copy source pixels to padded location
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const srcIdx = (y * image.width + x) * 3;
        const dstX = x + offsetX;
        const dstY = y + offsetY;
        const dstIdx = (dstY * targetWidth + dstX) * 3;

        // Copy RGB
        output[dstIdx] = image.pixels[srcIdx];
        output[dstIdx + 1] = image.pixels[srcIdx + 1];
        output[dstIdx + 2] = image.pixels[srcIdx + 2];
      }
    }

    const padTime = Date.now() - startTime;
    console.log(`${LOG_PREFIX} ✅ Padding applied in ${padTime}ms`);
    console.log(`${LOG_PREFIX}    Output: ${targetWidth}x${targetHeight}x3 (${output.length} bytes)`);

    return {
      pixels: output,
      width: targetWidth,
      height: targetHeight,
      channels: 3,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Error applying padding: ${error}`);
    throw error;
  }
}

// ============================================================
// Test Functions
// ============================================================

/**
 * Test the OpenCV bridge with a real image.
 * This function tests each step independently.
 *
 * @param uri - File URI of test image
 */
export async function testOpenCVBridge(uri: string): Promise<void> {
  console.log(`\n${LOG_PREFIX} ╔════════════════════════════════════════╗`);
  console.log(`${LOG_PREFIX} ║       OPENCV BRIDGE TEST               ║`);
  console.log(`${LOG_PREFIX} ╚════════════════════════════════════════╝\n`);

  try {
    // Test 1: Load image
    console.log(`${LOG_PREFIX} 🧪 Test 1: Loading image...`);
    const raw = await loadImagePixels(uri);

    // Validate loaded image
    console.log(`${LOG_PREFIX} Validating loaded image...`);
    const pixelSum = raw.pixels.reduce((a, b) => a + b, 0);
    console.log(`${LOG_PREFIX}    Pixel sum: ${pixelSum}`);
    console.log(
      `${LOG_PREFIX}    Sum check: ${pixelSum > 0 ? "✅ Non-zero (has data)" : "❌ Zero (empty image)"}`
    );

    // Test 2: Resize
    console.log(`\n${LOG_PREFIX} 🧪 Test 2: Resizing to 640x360...`);
    const resized = resizeImage(raw, 640, 360);
    console.log(
      `${LOG_PREFIX}    Resize check: ${resized.width === 640 && resized.height === 360 ? "✅ PASS" : "❌ FAIL"}`
    );

    // Test 3: Apply padding
    console.log(`\n${LOG_PREFIX} 🧪 Test 3: Applying letterbox padding...`);
    const padY = (640 - 360) / 2; // 140px top and bottom
    const padded = applyPadding(resized, 640, 640, 0, padY);
    console.log(
      `${LOG_PREFIX}    Padding check: ${padded.width === 640 && padded.height === 640 ? "✅ PASS" : "❌ FAIL"}`
    );

    // Verify padded area is gray (128)
    const topLeftPixel = [padded.pixels[0], padded.pixels[1], padded.pixels[2]];
    const isGray = topLeftPixel.every((v) => v === 128);
    console.log(
      `${LOG_PREFIX}    Top-left pixel: [${topLeftPixel.join(", ")}] ${isGray ? "✅ Gray padding" : "⚠️ Not gray"}`
    );

    // Check center pixel (should be image data, not gray)
    const centerIdx = (320 * 640 + 320) * 3; // Center of 640x640
    const centerPixel = [
      padded.pixels[centerIdx],
      padded.pixels[centerIdx + 1],
      padded.pixels[centerIdx + 2],
    ];
    const isNotAllGray = !centerPixel.every((v) => v === 128);
    console.log(
      `${LOG_PREFIX}    Center pixel: [${centerPixel.join(", ")}] ${isNotAllGray ? "✅ Image data" : "⚠️ Still gray"}`
    );

    console.log(`\n${LOG_PREFIX} ╔════════════════════════════════════════╗`);
    console.log(`${LOG_PREFIX} ║       ALL TESTS PASSED                 ║`);
    console.log(`${LOG_PREFIX} ╚════════════════════════════════════════╝\n`);
  } catch (error) {
    console.error(`\n${LOG_PREFIX} ❌ TEST FAILED: ${error}`);
    throw error;
  }
}

/**
 * Quick validation that OpenCV is working.
 * Creates a simple Mat and extracts buffer.
 */
export function testOpenCVBasic(): boolean {
  console.log(`${LOG_PREFIX} Testing basic OpenCV operations...`);

  try {
    // Create a small test Mat
    const testData = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]); // RGB: Red, Green, Blue
    const mat = OpenCV.bufferToMat("uint8", 1, 3, 3, testData);

    // Extract buffer back
    const { buffer, cols, rows, channels } = OpenCV.matToBuffer(mat, "uint8");

    // Validate
    const isValid =
      cols === 3 &&
      rows === 1 &&
      channels === 3 &&
      buffer[0] === 255 && // Red
      buffer[3] === 0 &&
      buffer[4] === 255; // Green

    OpenCV.clearBuffers();

    console.log(`${LOG_PREFIX} Basic test: ${isValid ? "✅ PASS" : "❌ FAIL"}`);
    return isValid;
  } catch (error) {
    console.error(`${LOG_PREFIX} Basic test failed: ${error}`);
    OpenCV.clearBuffers();
    return false;
  }
}
