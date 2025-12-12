/**
 * useWoundLLM Hook
 *
 * Provides on-device LLM capabilities for wound assessment context generation.
 * Uses ExecuTorch with Qwen3 0.6B quantized model for fast, privacy-preserving
 * first-aid information generation.
 *
 * ARCHITECTURE (Singleton Pattern):
 * - The actual LLM model is managed by LLMSingleton + LLMHost
 * - LLMHost lives at app root level (outside tabs) - never unmounts on tab switch
 * - This hook subscribes to singleton state - no model re-initialization on mount
 * - Tab switching is now SAFE - no OOM from repeated model loading
 *
 * Key Features:
 * - Automatic model download and initialization (via LLMHost)
 * - Integration with YOLO detection results
 * - Offline-capable wound context generation
 * - Streaming response support
 *
 * Platform Support:
 * - Android: Full on-device LLM support via ExecuTorch
 * - iOS: Returns unavailable state (OpenCV conflict with YOLO preprocessing)
 */

import { useCallback, useSyncExternalStore } from 'react';
import type { Detection, PipelineResult } from '@/utils/yolo/types';
import { getLLMSingleton } from './LLMSingleton';
import type { WoundContextOptions, WoundContextResult } from './woundContext';

const LOG_PREFIX = '[LLM:useWoundLLM]';

/**
 * Hook configuration options
 */
export interface UseWoundLLMOptions {
  /** @deprecated Model is now managed by LLMHost singleton */
  model?: unknown;
  /** @deprecated Model auto-initializes via LLMHost */
  autoInit?: boolean;
}

/**
 * Hook return type
 */
export interface UseWoundLLMReturn {
  /** Whether on-device LLM is available on this platform (Android only) */
  isAvailable: boolean;
  /** Whether the model is ready for inference */
  isReady: boolean;
  /** Whether the model is currently loading/downloading */
  isLoading: boolean;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Current download/load progress (0-100) */
  downloadProgress: number;
  /** Current streaming response text */
  response: string;
  /** Error message if something went wrong */
  error: string | null;
  /** Generate wound context from detections */
  generateContext: (
    detections: Detection[],
    options?: WoundContextOptions
  ) => Promise<WoundContextResult>;
  /** Generate wound context from pipeline result */
  generateFromPipeline: (
    result: PipelineResult,
    options?: WoundContextOptions
  ) => Promise<WoundContextResult>;
  /** Interrupt ongoing generation */
  interrupt: () => void;
  /** Clear message history */
  clearHistory: () => void;
}

// Singleton instance (stable reference)
const singleton = getLLMSingleton();

// For useSyncExternalStore - single subscribe function for all selectors
const subscribe = (callback: () => void) => {
  return singleton.subscribe(() => callback());
};

// Individual selectors - these return primitives so React's Object.is comparison
// will correctly skip re-renders when the value hasn't changed.
// This is CRITICAL for performance: subscribing to the whole state object causes
// re-renders on EVERY token during streaming (response changes ~100+ times).
const getIsAvailable = () => singleton.getState().isAvailable;
const getIsReady = () => singleton.getState().isReady;
const getIsLoading = () => singleton.getState().isLoading;
const getIsGenerating = () => singleton.getState().isGenerating;
const getDownloadProgress = () => singleton.getState().downloadProgress;
const getResponse = () => singleton.getState().response;
const getError = () => singleton.getState().error;

/**
 * Hook for on-device wound assessment LLM
 *
 * Now uses singleton pattern - model persists across tab switches.
 * LLMHost component must be rendered at app root level.
 *
 * PERFORMANCE NOTE: This hook uses individual selectors for each state field.
 * This means components only re-render when the specific fields they USE change.
 * If you only use `isReady`, you won't re-render when `response` updates.
 *
 * @example
 * ```tsx
 * function WoundAssessmentScreen() {
 *   const { isReady, isGenerating, generateFromPipeline, response } = useWoundLLM();
 *   const [yoloResult, setYoloResult] = useState<PipelineResult | null>(null);
 *
 *   const handleAnalyze = async () => {
 *     if (!yoloResult || !isReady) return;
 *
 *     const result = await generateFromPipeline(yoloResult, {
 *       bodyLocation: 'left arm',
 *       injuryDuration: '2 hours ago',
 *     });
 *
 *     if (result.success) {
 *       console.log('First aid info:', result.context);
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       {!isReady && <Text>Loading AI model...</Text>}
 *       {isGenerating && <Text>Analyzing...</Text>}
 *       {response && <Text>{response}</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export function useWoundLLM(_options: UseWoundLLMOptions = {}): UseWoundLLMReturn {
  // Subscribe to individual state fields using separate useSyncExternalStore calls.
  // React uses Object.is comparison - primitives (boolean, number, string) only
  // trigger re-renders when their actual value changes, NOT on every state update.
  const isAvailable = useSyncExternalStore(subscribe, getIsAvailable, getIsAvailable);
  const isReady = useSyncExternalStore(subscribe, getIsReady, getIsReady);
  const isLoading = useSyncExternalStore(subscribe, getIsLoading, getIsLoading);
  const isGenerating = useSyncExternalStore(subscribe, getIsGenerating, getIsGenerating);
  const downloadProgress = useSyncExternalStore(subscribe, getDownloadProgress, getDownloadProgress);
  const response = useSyncExternalStore(subscribe, getResponse, getResponse);
  const error = useSyncExternalStore(subscribe, getError, getError);

  /**
   * Generate wound context from raw detections
   */
  const generateContext = useCallback(
    async (
      detections: Detection[],
      contextOptions?: WoundContextOptions
    ): Promise<WoundContextResult> => {
      return singleton.generateContext(detections, contextOptions);
    },
    []
  );

  /**
   * Generate wound context from pipeline result
   */
  const generateFromPipeline = useCallback(
    async (
      result: PipelineResult,
      contextOptions?: WoundContextOptions
    ): Promise<WoundContextResult> => {
      // Collect all detections across images
      const allDetections: Detection[] = [];
      result.results.forEach((imageResult) => {
        if (imageResult.success) {
          allDetections.push(...imageResult.detections);
        }
      });

      console.log(
        `${LOG_PREFIX} Generating from pipeline: ${result.totalDetections} total detection(s) from ${result.successfulImages} image(s)`
      );

      return generateContext(allDetections, contextOptions);
    },
    [generateContext]
  );

  /**
   * Interrupt ongoing generation
   */
  const interrupt = useCallback(() => {
    singleton.interrupt();
  }, []);

  /**
   * Clear message history
   */
  const clearHistory = useCallback(() => {
    singleton.clearHistory();
  }, []);

  return {
    isAvailable,
    isReady,
    isLoading,
    isGenerating,
    downloadProgress,
    response,
    error,
    generateContext,
    generateFromPipeline,
    interrupt,
    clearHistory,
  };
}

export default useWoundLLM;
