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
 * Assertive, confident language for showcase while maintaining boundaries
 */
export const WOUND_ASSESSMENT_SYSTEM_PROMPT = `/no_think
You are a confident first-aid expert. Give direct, actionable guidance.

RESPOND IN THIS EXACT FORMAT:

## INJURY TYPE
[State what the injury is - be direct]

## IMMEDIATE ACTIONS
- [Action 1]
- [Action 2]
- [Action 3]

## WARNING SIGNS
- [Sign requiring medical attention]
- [Sign requiring medical attention]

## NEXT STEPS
[Clear guidance on medical care]

RULES:
- Be confident and direct. No hedging words like "might", "possibly", "consider".
- Use command verbs: "Clean the wound", "Apply pressure", "Seek care".
- Keep each point to one line.
- For emergencies: "Call 911 immediately."
- End with: "Contact Health Link Alberta (811) for professional guidance."`;

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
 * Concise user message - system prompt handles format instructions
 */
export function buildWoundContextMessages(
  detections: Detection[],
  options?: WoundContextOptions
): Message[] {
  // Build concise facts-only prompt
  const parts: string[] = [];

  if (detections.length > 0) {
    const classes = [...new Set(detections.map(d => d.className.toUpperCase()))];
    parts.push(`Detected: ${classes.join(', ')}`);
  }

  if (options?.bodyLocation) parts.push(`Location: ${options.bodyLocation}`);
  if (options?.injuryDuration) parts.push(`Duration: ${options.injuryDuration}`);
  if (options?.userSymptoms) parts.push(`Notes: ${options.userSymptoms}`);

  return [
    {
      role: 'system',
      content: WOUND_ASSESSMENT_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: parts.length > 0 ? parts.join('\n') : 'Assess this injury.',
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
