/**
 * Offline Fallback for AI Assessment
 *
 * Provides on-device LLM fallback when:
 * - Device is offline
 * - Gemini API is unavailable
 * - Rate limits are hit
 *
 * Uses ExecuTorch with Qwen3 0.6B for fast, privacy-preserving
 * first-aid information generation from YOLO wound detections.
 */

import type { PipelineResult, Detection } from '@/utils/yolo/types';
import { formatPipelineResultForLLM, WOUND_ASSESSMENT_SYSTEM_PROMPT } from './woundContext';

const LOG_PREFIX = '[LLM:OfflineFallback]';

/**
 * Assessment input for offline generation
 */
export interface OfflineAssessmentInput {
  /** User's description of symptoms */
  description: string;
  /** Severity level (0-10) */
  severity: number;
  /** Duration of symptoms */
  duration?: string;
  /** Category of symptoms */
  category?: string;
  /** YOLO pipeline result (optional) */
  yoloResult?: PipelineResult | null;
  /** Individual detections (alternative to yoloResult) */
  detections?: Detection[];
  /** Body location of injury */
  bodyLocation?: string;
}

/**
 * Format assessment input for on-device LLM prompt
 *
 * Concise prompt for Qwen3 0.6B - direct facts only, no verbose instructions.
 * The system prompt handles output format.
 */
export function formatOfflinePrompt(input: OfflineAssessmentInput): string {
  const parts: string[] = [];

  // YOLO detections first (most important)
  if (input.yoloResult) {
    const classes = Object.keys(input.yoloResult.summary?.byClass || {});
    if (classes.length > 0) {
      parts.push(`Detected: ${classes.map(c => c.toUpperCase()).join(', ')}`);
    }
  } else if (input.detections && input.detections.length > 0) {
    const classes = [...new Set(input.detections.map(d => d.className.toUpperCase()))];
    parts.push(`Detected: ${classes.join(', ')}`);
  }

  // Key facts only
  if (input.bodyLocation) parts.push(`Location: ${input.bodyLocation}`);
  if (input.severity) parts.push(`Severity: ${input.severity}/10`);

  if (input.duration) {
    const durationMap: Record<string, string> = {
      today: 'today',
      yesterday: 'yesterday',
      '2-3_days': '2-3 days',
      '1_week': '1 week',
      '2_weeks_plus': '2+ weeks',
      ongoing: 'ongoing',
    };
    parts.push(`Duration: ${durationMap[input.duration] || input.duration}`);
  }

  if (input.description) {
    // Truncate long descriptions
    const desc = input.description.length > 100
      ? input.description.slice(0, 100) + '...'
      : input.description;
    parts.push(`Patient notes: ${desc}`);
  }

  return parts.join('\n');
}

/**
 * Build chat messages for offline LLM generation
 *
 * Returns Message array compatible with react-native-executorch useLLM
 */
export function buildOfflineMessages(input: OfflineAssessmentInput): {
  role: 'system' | 'user' | 'assistant';
  content: string;
}[] {
  return [
    {
      role: 'system' as const,
      content: WOUND_ASSESSMENT_SYSTEM_PROMPT,
    },
    {
      role: 'user' as const,
      content: formatOfflinePrompt(input),
    },
  ];
}

/**
 * Get severity-based urgency recommendation
 *
 * Used when LLM generation fails completely.
 * Uses headers matching renderAssessmentCards parser.
 * No special characters for TTS compatibility.
 */
export function getSeverityBasedGuidance(severity: number): string {
  if (severity >= 9) {
    return `Clinical Assessment
Critical severity level ${severity} out of 10. This may be a medical emergency.

Recommendations
- Call 911 immediately if experiencing difficulty breathing, chest pain, severe bleeding, or loss of consciousness
- If stable, call Health Link Alberta at 811 for urgent nursing guidance
- Do not wait to seek emergency care

Next Steps
- Get emergency medical attention now
- Have someone stay with you until help arrives
- Contact Health Link Alberta at 811 for professional guidance`;
  }

  if (severity >= 7) {
    return `Clinical Assessment
High severity level ${severity} out of 10. Prompt medical attention is needed.

Recommendations
- Contact Health Link Alberta at 811 for nursing guidance
- Consider visiting an urgent care clinic or emergency department
- Do not delay if symptoms are worsening

Next Steps
- Seek medical care today
- Monitor for worsening symptoms
- For emergencies call 911`;
  }

  if (severity >= 4) {
    return `Clinical Assessment
Moderate severity level ${severity} out of 10. Your symptoms warrant attention.

Recommendations
- Monitor your symptoms closely
- Apply appropriate first aid if applicable
- Contact Health Link Alberta at 811 for professional guidance

Next Steps
- Consider scheduling a same day or next day medical appointment
- Seek emergency care if symptoms worsen significantly
- Keep track of any changes in your condition`;
  }

  return `Clinical Assessment
Mild severity level ${severity} out of 10. Monitoring is still important.

Recommendations
- Rest and monitor your symptoms
- Apply basic first aid if applicable
- Contact Health Link Alberta at 811 if you have concerns

Next Steps
- Schedule a regular medical appointment if symptoms persist
- Watch for worsening or new symptoms
- Seek medical attention promptly if condition changes`;
}

/**
 * Strip thinking tags from LLM response
 *
 * Qwen3 models often include <think>...</think> reasoning blocks.
 * We strip these for cleaner user-facing output.
 *
 * If stripping would leave empty content, we keep the original
 * (model might have put useful content inside thinking tags).
 */
function stripThinkingTags(response: string): string {
  // Try to remove properly closed <think>...</think> blocks
  let cleaned = response.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // Clean up whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  // If stripping left us with empty/minimal content, the model put
  // all useful content inside thinking tags - extract it instead
  if (cleaned.length < 50) {
    // Extract content from inside thinking tags
    const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch && thinkMatch[1]) {
      cleaned = thinkMatch[1].trim();
    } else {
      // No thinking tags found or unclosed - use original
      cleaned = response.replace(/<\/?think>/gi, '').trim();
    }
  }

  // Remove any remaining orphaned tags
  cleaned = cleaned.replace(/<\/?think>/gi, '');

  return cleaned;
}

/**
 * Format offline assessment result for display
 *
 * Returns clean text suitable for:
 * 1. Card parsing by renderAssessmentCards
 * 2. TTS readability (no special characters)
 */
export function formatOfflineResult(
  llmResponse: string,
  input: OfflineAssessmentInput
): string {
  // Strip thinking/reasoning tags from model output
  let cleaned = stripThinkingTags(llmResponse);

  // Remove any markdown headers (## or ###) - convert to plain text headers
  cleaned = cleaned.replace(/^#{1,3}\s*/gm, '');

  // Remove any leftover decorative characters that hurt TTS
  cleaned = cleaned.replace(/[=]{3,}/g, '');
  cleaned = cleaned.replace(/[-]{3,}/g, '');
  cleaned = cleaned.replace(/[*]{2,}/g, '');

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

console.log(`${LOG_PREFIX} Offline fallback utilities loaded`);
