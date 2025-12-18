/**
 * Gemini Context Formatter
 *
 * Formats YOLO detection results into text for Gemini prompt injection.
 * Keeps it simple: confidence + type. Honest about no detections.
 */

import type { Detection, PipelineResult } from './types';

const LOG_PREFIX = '[YOLO:GeminiContext]';

/**
 * Format a single detection for Gemini
 */
function formatDetection(detection: Detection): string {
  const confidence = (detection.confidence * 100).toFixed(0);
  return `${detection.className.toUpperCase()} (${confidence}% confidence)`;
}

/**
 * Format detections for a single image
 */
function formatImageDetections(
  detections: Detection[],
  imageIndex: number,
  totalImages: number
): string {
  const imageLabel = totalImages > 1 ? `Image ${imageIndex + 1}` : 'Uploaded image';

  if (detections.length === 0) {
    return `${imageLabel}: No wounds detected`;
  }

  const detectionStrings = detections.map(d => `- ${formatDetection(d)}`);
  return `${imageLabel}:\n${detectionStrings.join('\n')}`;
}

/**
 * Format the overall summary
 */
function formatSummary(result: PipelineResult): string {
  const { summary, totalDetections } = result;

  if (totalDetections === 0) {
    return 'No wounds were detected in any of the provided images.';
  }

  // Build class breakdown
  const classBreakdown = Object.entries(summary.byClass)
    .map(([className, count]) => `${count} ${className}${count > 1 ? 's' : ''}`)
    .join(', ');

  // Highest confidence
  const highestConf = summary.highestConfidence
    ? `${summary.highestConfidence.className.toUpperCase()} at ${(summary.highestConfidence.confidence * 100).toFixed(0)}%`
    : 'N/A';

  return `Total: ${totalDetections} wound(s) detected (${classBreakdown}). Highest confidence: ${highestConf}.`;
}

/**
 * Format YOLO pipeline results for injection into Gemini prompt
 *
 * Output is concise:
 * - Lists detections by image with confidence and type
 * - Provides summary
 * - Honest when nothing is detected
 *
 * @param result - PipelineResult from runPipeline()
 * @returns Formatted string for Gemini prompt
 */
export function formatForGemini(result: PipelineResult): string {
  console.log(`${LOG_PREFIX} Formatting ${result.totalDetections} detection(s) for Gemini`);

  const lines: string[] = [];

  lines.push('ON-DEVICE WOUND DETECTION RESULTS');
  lines.push('==================================');
  lines.push('');

  // If no images were processed successfully
  if (result.successfulImages === 0) {
    lines.push('Unable to analyze images with wound detection model.');
    lines.push('');
    console.log(`${LOG_PREFIX} No images were processed successfully`);
    return lines.join('\n');
  }

  // If no detections at all
  if (result.totalDetections === 0) {
    lines.push('The wound detection model analyzed the provided image(s) but did not detect any injuries (burns, rashes, abrasions, bruises, cuts, or frostbite).');
    lines.push('');
    lines.push('This does not mean no injury exists - it means the model did not identify any with sufficient confidence.');
    lines.push('Please assess the images clinically.');
    lines.push('');
    console.log(`${LOG_PREFIX} No detections found - being honest`);
    return lines.join('\n');
  }

  // We have detections - format them
  lines.push('An automated wound detection model has analyzed the patient\'s photos.');
  lines.push('The model detects: 1st/2nd/3rd degree burns, rashes, abrasions, bruises, cuts, and frostbite.');
  lines.push('');

  // Per-image results
  result.results.forEach((imageResult, index) => {
    if (imageResult.success) {
      lines.push(formatImageDetections(imageResult.detections, index, result.results.length));
      lines.push('');
    }
  });

  // Summary
  lines.push('SUMMARY:');
  lines.push(formatSummary(result));
  lines.push('');
  lines.push('Please incorporate these findings into your clinical assessment.');

  const output = lines.join('\n');
  console.log(`${LOG_PREFIX} Generated context (${output.length} chars):`);
  console.log(`${LOG_PREFIX} ---`);
  console.log(output);
  console.log(`${LOG_PREFIX} ---`);

  return output;
}

/**
 * Check if we have meaningful detections worth sending to Gemini
 */
export function hasDetectionsForGemini(result: PipelineResult | null): boolean {
  if (!result) return false;
  return result.successfulImages > 0;
}

// ============================================================
// TESTS
// ============================================================

/**
 * Test the Gemini context formatter
 */
export function testGeminiContext(): void {
  console.log('\n🧪 Testing Gemini Context Formatter...\n');

  // Test 1: With detections
  const mockResultWithDetections: PipelineResult = {
    results: [
      {
        originalImageUri: 'file://photo1.jpg',
        annotatedImageBase64: 'base64...',
        annotatedImageWidth: 640,
        annotatedImageHeight: 480,
        detections: [
          {
            box: { x: 320, y: 240, width: 100, height: 80 },
            boxCorners: { x1: 270, y1: 200, x2: 370, y2: 280 },
            classId: 2,
            className: 'cut',
            confidence: 0.92,
          },
          {
            box: { x: 100, y: 100, width: 60, height: 60 },
            boxCorners: { x1: 70, y1: 70, x2: 130, y2: 130 },
            classId: 1,
            className: 'bruise',
            confidence: 0.78,
          },
        ],
        timing: { preprocessMs: 50, inferenceMs: 100, postprocessMs: 20, visualizationMs: 30, totalMs: 200 },
        success: true,
      },
    ],
    totalDetections: 2,
    successfulImages: 1,
    failedImages: 0,
    totalProcessingTimeMs: 200,
    modelLoadTimeMs: 300,
    summary: {
      byClass: { cut: 1, bruise: 1 },
      totalCount: 2,
      highestConfidence: {
        box: { x: 320, y: 240, width: 100, height: 80 },
        boxCorners: { x1: 270, y1: 200, x2: 370, y2: 280 },
        classId: 2,
        className: 'cut',
        confidence: 0.92,
      },
      highestConfidenceImageIndex: 0,
      averageConfidence: 0.85,
    },
    metadata: {
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      inputImageCount: 1,
      modelConfig: { inputSize: 640, confidenceThreshold: 0.5, iouThreshold: 0.45, classes: ['1st degree burn', '2nd degree burn', '3rd degree burn', 'Rashes', 'abrasion', 'bruise', 'cut', 'frostbite'] },
    },
  };

  console.log('Test 1: With detections');
  console.log('========================');
  const output1 = formatForGemini(mockResultWithDetections);
  console.log(output1);

  // Test 2: No detections
  const mockResultNoDetections: PipelineResult = {
    ...mockResultWithDetections,
    results: [
      {
        ...mockResultWithDetections.results[0],
        detections: [],
      },
    ],
    totalDetections: 0,
    summary: {
      byClass: {},
      totalCount: 0,
      highestConfidence: null,
      highestConfidenceImageIndex: null,
      averageConfidence: 0,
    },
  };

  console.log('\nTest 2: No detections');
  console.log('=====================');
  const output2 = formatForGemini(mockResultNoDetections);
  console.log(output2);

  console.log('\n✅ Gemini context tests complete!\n');
}
