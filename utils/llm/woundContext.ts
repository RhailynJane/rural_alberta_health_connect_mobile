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
 * Professional first-aid guidance format.
 * Headers match what renderAssessmentCards parser expects.
 * NOTE: Small on-device LLMs copy bracketed text literally, so use only the example.
 */
export const WOUND_ASSESSMENT_SYSTEM_PROMPT = `/no_think
You are a medical first aid expert. Provide clear assessments and treatment instructions.

Use this exact format:

Clinical Assessment
This is a first degree burn affecting the epidermis. The redness and mild swelling indicate thermal injury from brief heat exposure. First degree burns heal within 7-10 days with proper care.

Recommendations
- Cool the burn immediately under cool running water for 10 to 20 minutes
- Remove rings or tight items near the area before swelling occurs
- Apply aloe vera gel or burn cream to soothe the skin
- Cover with a sterile non-stick bandage
- Take ibuprofen or acetaminophen for pain relief
- Do not apply ice, butter, or toothpaste

Next Steps
- Change the bandage daily and keep the area clean and dry
- Monitor for infection signs: increasing pain, redness spreading, pus, or fever
- Seek medical attention if blisters develop or pain persists beyond 48 hours
- Contact Health Link 811 for additional wound care guidance

Now assess the following injury:`;

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
  const parts: string[] = [];

  // State the injury type directly
  if (detections.length > 0) {
    const classes = [...new Set(detections.map(d => d.className.toLowerCase()))];
    parts.push(`Injury detected: ${classes.join(', ')}.`);
  }

  // Add location
  if (options?.bodyLocation) {
    parts.push(`Location: ${options.bodyLocation}.`);
  }

  // Add duration with clinical phrasing
  if (options?.injuryDuration) {
    const durationMap: Record<string, string> = {
      today: 'Onset: within the last few hours',
      yesterday: 'Onset: approximately 24 hours ago',
      '2-3_days': 'Onset: 2-3 days ago',
      '1_week': 'Onset: approximately 1 week ago',
      '2_weeks_plus': 'Onset: more than 2 weeks ago',
      ongoing: 'Chronic/ongoing condition',
    };
    parts.push(`${durationMap[options.injuryDuration] || `Duration: ${options.injuryDuration}`}.`);
  }

  // Add symptoms
  if (options?.userSymptoms) {
    parts.push(`Additional symptoms: ${options.userSymptoms}.`);
  }

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
