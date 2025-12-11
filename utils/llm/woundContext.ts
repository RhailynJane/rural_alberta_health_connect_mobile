/**
 * Wound Context Generation for LLM
 *
 * Formats YOLO detection results and generates medical context
 * using the on-device LLM.
 */

import type { Detection, PipelineResult } from '@/utils/yolo/types';
import type { Message } from 'react-native-executorch';

const LOG_PREFIX = '[LLM:WoundContext]';

/**
 * System prompt for wound assessment
 * Emphasizes first-aid information only, not diagnosis
 */
export const WOUND_ASSESSMENT_SYSTEM_PROMPT = `You are a first-aid information assistant for a rural health app in Alberta, Canada.

IMPORTANT DISCLAIMERS:
- You do NOT provide medical diagnoses
- You provide general first-aid information only
- Always recommend consulting a healthcare professional
- In emergencies, direct users to call 911

When given wound detection results from an AI vision model:
1. Explain what type of injury this appears to be in simple terms
2. Provide basic first-aid steps appropriate for that injury type
3. List warning signs that require immediate medical attention
4. Suggest when to seek professional medical care

Be concise, clear, and helpful. Use bullet points for readability.`;

/**
 * Options for generating wound context
 */
export interface WoundContextOptions {
  /** Additional symptoms reported by the user */
  userSymptoms?: string;
  /** Location on body where injury occurred */
  bodyLocation?: string;
  /** How long ago the injury occurred */
  injuryDuration?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
}

/**
 * Result of wound context generation
 */
export interface WoundContextResult {
  /** Generated context text */
  context: string;
  /** Whether generation completed successfully */
  success: boolean;
  /** Error message if generation failed */
  error?: string;
  /** Time taken to generate in milliseconds */
  generationTimeMs?: number;
}

/**
 * Format detections into a concise string for LLM prompt
 */
export function formatDetectionsForLLM(
  detections: Detection[],
  options?: WoundContextOptions
): string {
  if (detections.length === 0) {
    return 'No wounds were detected by the automated system.';
  }

  const lines: string[] = [];

  // List detections
  lines.push('Automated wound detection found:');
  detections.forEach((d, i) => {
    const confidence = (d.confidence * 100).toFixed(0);
    lines.push(`${i + 1}. ${d.className.toUpperCase()} (${confidence}% confidence)`);
  });

  // Add user-provided context if available
  if (options?.bodyLocation) {
    lines.push(`\nLocation: ${options.bodyLocation}`);
  }
  if (options?.injuryDuration) {
    lines.push(`Duration: ${options.injuryDuration}`);
  }
  if (options?.userSymptoms) {
    lines.push(`\nAdditional symptoms: ${options.userSymptoms}`);
  }

  return lines.join('\n');
}

/**
 * Format pipeline result for LLM
 */
export function formatPipelineResultForLLM(
  result: PipelineResult,
  options?: WoundContextOptions
): string {
  // Collect all detections across images
  const allDetections: Detection[] = [];
  result.results.forEach(imageResult => {
    if (imageResult.success) {
      allDetections.push(...imageResult.detections);
    }
  });

  return formatDetectionsForLLM(allDetections, options);
}

/**
 * Build the chat messages for wound context generation
 */
export function buildWoundContextMessages(
  detections: Detection[],
  options?: WoundContextOptions
): Message[] {
  const detectionText = formatDetectionsForLLM(detections, options);

  return [
    {
      role: 'system',
      content: WOUND_ASSESSMENT_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Based on the following wound detection results, please provide first-aid information:

${detectionText}

Please provide:
1. What this injury type typically involves
2. Recommended first-aid steps
3. Warning signs to watch for
4. When to seek professional medical care`,
    },
  ];
}

/**
 * Generate wound context using the LLM
 *
 * This is the main entry point - use with useLLM hook:
 *
 * ```typescript
 * const llm = useLLM({ model: QWEN3_0_6B_QUANTIZED });
 *
 * const context = await generateWoundContext(
 *   llm,
 *   detections,
 *   { bodyLocation: 'left arm' }
 * );
 * ```
 */
export async function generateWoundContext(
  llm: {
    generate: (messages: Message[]) => Promise<void>;
    response: string;
    isReady: boolean;
    isGenerating: boolean;
  },
  detections: Detection[],
  options?: WoundContextOptions
): Promise<WoundContextResult> {
  const startTime = Date.now();

  console.log(`${LOG_PREFIX} Starting wound context generation for ${detections.length} detection(s)`);

  // Check if LLM is ready
  if (!llm.isReady) {
    console.error(`${LOG_PREFIX} LLM is not ready`);
    return {
      context: '',
      success: false,
      error: 'LLM model is not loaded yet',
    };
  }

  // Check if already generating
  if (llm.isGenerating) {
    console.error(`${LOG_PREFIX} LLM is already generating`);
    return {
      context: '',
      success: false,
      error: 'LLM is busy with another request',
    };
  }

  try {
    // Build messages
    const messages = buildWoundContextMessages(detections, options);

    console.log(`${LOG_PREFIX} Generating with ${messages.length} message(s)...`);

    // Generate response
    await llm.generate(messages);

    const generationTimeMs = Date.now() - startTime;
    console.log(`${LOG_PREFIX} Generation complete in ${generationTimeMs}ms`);

    return {
      context: llm.response,
      success: true,
      generationTimeMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during generation';
    console.error(`${LOG_PREFIX} Generation failed:`, errorMessage);

    return {
      context: '',
      success: false,
      error: errorMessage,
      generationTimeMs: Date.now() - startTime,
    };
  }
}
