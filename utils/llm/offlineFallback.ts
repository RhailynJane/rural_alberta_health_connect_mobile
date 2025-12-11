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
 * Creates a simplified prompt suitable for smaller models like Qwen3 0.6B
 * while still providing useful first-aid guidance.
 */
export function formatOfflinePrompt(input: OfflineAssessmentInput): string {
  const lines: string[] = [];

  lines.push('FIRST AID ASSESSMENT REQUEST');
  lines.push('============================');
  lines.push('');

  // Patient description
  if (input.description) {
    lines.push(`Patient Description: ${input.description}`);
  }

  // Severity
  lines.push(`Reported Severity: ${input.severity}/10`);

  // Duration
  if (input.duration) {
    const durationMap: Record<string, string> = {
      today: 'Started today',
      yesterday: 'Started yesterday',
      '2-3_days': '2-3 days ago',
      '1_week': '1 week ago',
      '2_weeks_plus': 'More than 2 weeks',
      ongoing: 'Ongoing condition',
    };
    lines.push(`Duration: ${durationMap[input.duration] || input.duration}`);
  }

  // Category
  if (input.category) {
    lines.push(`Category: ${input.category}`);
  }

  // Body location
  if (input.bodyLocation) {
    lines.push(`Location on body: ${input.bodyLocation}`);
  }

  lines.push('');

  // YOLO detections
  if (input.yoloResult) {
    const detectionText = formatPipelineResultForLLM(input.yoloResult);
    lines.push('WOUND DETECTION RESULTS:');
    lines.push(detectionText);
    lines.push('');
  } else if (input.detections && input.detections.length > 0) {
    lines.push('WOUND DETECTION RESULTS:');
    input.detections.forEach((d, i) => {
      const confidence = (d.confidence * 100).toFixed(0);
      lines.push(`${i + 1}. ${d.className.toUpperCase()} (${confidence}% confidence)`);
    });
    lines.push('');
  }

  // Request
  lines.push('Please provide:');
  lines.push('1. What this injury type typically involves');
  lines.push('2. Basic first-aid steps');
  lines.push('3. Warning signs to watch for');
  lines.push('4. When to seek professional medical care');

  return lines.join('\n');
}

/**
 * Build chat messages for offline LLM generation
 *
 * Returns Message array compatible with react-native-executorch useLLM
 */
export function buildOfflineMessages(input: OfflineAssessmentInput): Array<{
  role: 'system' | 'user' | 'assistant';
  content: string;
}> {
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
 * Format offline assessment result for display
 *
 * Structures the LLM response into sections matching the online format
 */
export function formatOfflineResult(
  llmResponse: string,
  input: OfflineAssessmentInput
): string {
  const lines: string[] = [];

  // Add offline indicator
  lines.push('📱 OFFLINE FIRST-AID ASSESSMENT');
  lines.push('================================');
  lines.push('(Generated on-device for privacy)');
  lines.push('');

  // Add LLM response
  lines.push(llmResponse);
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
