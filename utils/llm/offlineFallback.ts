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
 * Used when LLM generation fails completely
 */
export function getSeverityBasedGuidance(severity: number): string {
  if (severity >= 9) {
    return `⚠️ CRITICAL SEVERITY (${severity}/10)

Your reported severity level indicates this may be a medical emergency.

IMMEDIATE ACTION REQUIRED:
• Call 911 immediately if experiencing:
  - Difficulty breathing
  - Chest pain
  - Severe bleeding
  - Loss of consciousness
  - Signs of shock

• If stable, call Health Link Alberta at 811 for urgent nursing guidance

Do NOT wait - seek emergency care immediately.`;
  }

  if (severity >= 7) {
    return `⚠️ HIGH SEVERITY (${severity}/10)

Your reported severity level suggests prompt medical attention is needed.

RECOMMENDED ACTIONS:
• Contact Health Link Alberta at 811 for nursing guidance
• Consider visiting an urgent care clinic or emergency department
• Do not delay if symptoms are worsening

For emergencies (difficulty breathing, severe bleeding, chest pain), call 911.`;
  }

  if (severity >= 4) {
    return `MODERATE SEVERITY (${severity}/10)

Your symptoms warrant attention but may not require immediate emergency care.

RECOMMENDED ACTIONS:
• Monitor your symptoms closely
• Contact Health Link Alberta at 811 for professional guidance
• Consider scheduling a same-day or next-day medical appointment
• Apply appropriate first aid if applicable

Seek emergency care immediately if symptoms worsen significantly.`;
  }

  return `MILD SEVERITY (${severity}/10)

Your symptoms appear to be mild, but monitoring is still important.

RECOMMENDED ACTIONS:
• Rest and monitor your symptoms
• Apply basic first aid if applicable
• Contact Health Link Alberta at 811 if you have concerns
• Schedule a regular medical appointment if symptoms persist

Note: If symptoms worsen or new concerning symptoms develop, seek medical attention promptly.`;
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
 * Structures the LLM response into sections matching the online format
 */
export function formatOfflineResult(
  llmResponse: string,
  input: OfflineAssessmentInput
): string {
  const lines: string[] = [];

  // Strip thinking/reasoning tags from model output
  const cleanedResponse = stripThinkingTags(llmResponse);

  // Add offline indicator
  lines.push('📱 OFFLINE FIRST-AID ASSESSMENT');
  lines.push('================================');
  lines.push('(Generated on-device for privacy)');
  lines.push('');

  // Add LLM response (cleaned)
  lines.push(cleanedResponse);
  lines.push('');

  // Add standard disclaimers
  lines.push('---');
  lines.push('');
  lines.push('⚠️ IMPORTANT DISCLAIMER');
  lines.push('This is general first-aid information only.');
  lines.push('This is NOT a medical diagnosis.');
  lines.push('Always consult a healthcare professional for proper medical advice.');
  lines.push('');
  lines.push('📞 Health Link Alberta: 811 (24/7 nursing advice)');
  lines.push('🚨 Emergency: Call 911');

  return lines.join('\n');
}

console.log(`${LOG_PREFIX} Offline fallback utilities loaded`);
