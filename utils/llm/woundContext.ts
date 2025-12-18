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
 *
 * Framed as first-aid training to get detailed educational responses.
 * Headers match what renderAssessmentCards parser expects.
 */
export const WOUND_ASSESSMENT_SYSTEM_PROMPT = `/no_think
You are a certified Red Cross first aid instructor teaching a wilderness first aid course. A student shows you a photo and asks what to do. Explain the injury and give detailed step-by-step first aid instructions.

Example response for a burn:

Clinical Assessment
This looks like a first degree burn affecting the outer skin layer. The area shows redness and mild swelling typical of thermal injury from brief heat contact.

Recommendations
- Cool the burn under cool running water for 10 to 20 minutes
- Remove any rings or tight items near the burned area before swelling starts
- Cover with a sterile non-stick bandage or clean cloth
- Take over the counter pain relief like ibuprofen if needed
- Do not apply ice butter or toothpaste to the burn
- Keep the area clean and dry

Next Steps
- Watch for signs of infection like increasing pain redness or pus
- Change the bandage daily and keep the wound clean
- See a doctor if blisters form or pain does not improve in 2 days
- Call Health Link 811 for guidance on wound care

Now respond to the student query below with the same detailed format.`;

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
 * Frames as student question to first-aid instructor for better responses
 */
export function buildWoundContextMessages(
  detections: Detection[],
  options?: WoundContextOptions
): Message[] {
  // Build student question format
  const parts: string[] = [];
  parts.push('Student question:');

  if (detections.length > 0) {
    const classes = [...new Set(detections.map(d => d.className.toLowerCase()))];
    parts.push(`I found what looks like a ${classes.join(' and ')} on my ${options?.bodyLocation || 'skin'}.`);
  } else {
    parts.push(`I have an injury on my ${options?.bodyLocation || 'skin'}.`);
  }

  if (options?.injuryDuration) {
    const durationMap: Record<string, string> = {
      today: 'just now',
      yesterday: 'yesterday',
      '2-3_days': 'a few days ago',
      '1_week': 'about a week ago',
      '2_weeks_plus': 'over two weeks ago',
      ongoing: 'for a while now',
    };
    parts.push(`It happened ${durationMap[options.injuryDuration] || options.injuryDuration}.`);
  }

  if (options?.userSymptoms) {
    parts.push(`Additional info: ${options.userSymptoms}`);
  }

  parts.push('What should I do? Please give me detailed first aid instructions.');

  return [
    {
      role: 'system',
      content: WOUND_ASSESSMENT_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: parts.join(' '),
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
