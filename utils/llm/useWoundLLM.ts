/**
 * useWoundLLM Hook
 *
 * Provides on-device LLM capabilities for wound assessment context generation.
 * Uses ExecuTorch with Qwen3 0.6B quantized model for fast, privacy-preserving
 * first-aid information generation.
 *
 * Key Features:
 * - Automatic model download and initialization
 * - Integration with YOLO detection results
 * - Offline-capable wound context generation
 * - Streaming response support
 *
 * Platform Support:
 * - Android: Full on-device LLM support via ExecuTorch
 * - iOS: Returns unavailable state (OpenCV conflict with YOLO preprocessing)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Detection, PipelineResult } from '@/utils/yolo/types';
import {
  formatDetectionsForLLM,
  buildWoundContextMessages,
  type WoundContextOptions,
  type WoundContextResult,
} from './woundContext';

// Conditionally import ExecuTorch only on Android
// On iOS, react-native-executorch is excluded from autolinking due to OpenCV conflict
let useLLMHook: typeof import('react-native-executorch').useLLM | null = null;
let QWEN3_0_6B_QUANTIZED_MODEL: typeof import('react-native-executorch').QWEN3_0_6B_QUANTIZED | null = null;

if (Platform.OS === 'android') {
  try {
    const executorch = require('react-native-executorch');
    useLLMHook = executorch.useLLM;
    QWEN3_0_6B_QUANTIZED_MODEL = executorch.QWEN3_0_6B_QUANTIZED;
  } catch (e) {
    console.warn('[LLM:useWoundLLM] Failed to load react-native-executorch:', e);
  }
}

const LOG_PREFIX = '[LLM:useWoundLLM]';

/**
 * Model options for on-device LLM
 * Default: Qwen3 0.6B (smallest, fastest, ~400MB)
 */
export type WoundLLMModel = typeof QWEN3_0_6B_QUANTIZED_MODEL;

/**
 * Hook configuration options
 */
export interface UseWoundLLMOptions {
  /** Model to use - defaults to Qwen3 0.6B quantized */
  model?: WoundLLMModel;
  /** Auto-initialize model on mount - defaults to true */
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

/**
 * Hook for on-device wound assessment LLM
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
export function useWoundLLM(options: UseWoundLLMOptions = {}): UseWoundLLMReturn {
  const { model = QWEN3_0_6B_QUANTIZED_MODEL, autoInit = true } = options;

  // Track download progress manually since the hook doesn't expose it directly
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  // Check if on-device LLM is available (Android only)
  const isAvailable = Platform.OS === 'android' && useLLMHook !== null && model !== null;

  // Initialize the LLM hook (only on Android)
  // On iOS, we return a mock object with unavailable state
  const llm = isAvailable && useLLMHook && model
    ? useLLMHook({ model })
    : {
        isReady: false,
        isGenerating: false,
        downloadProgress: 0,
        response: '',
        error: Platform.OS === 'ios'
          ? 'On-device LLM not available on iOS'
          : 'ExecuTorch module not loaded',
        messageHistory: [] as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
        configure: () => {},
        generate: async () => {},
        sendMessage: async () => {},
        deleteMessage: () => {},
        interrupt: () => {},
      };

  // Update download progress based on ready state
  useEffect(() => {
    if (llm.isReady) {
      setDownloadProgress(100);
      console.log(`${LOG_PREFIX} Model ready`);
    } else if (!llm.error) {
      // Model is loading
      console.log(`${LOG_PREFIX} Model loading...`);
    }
  }, [llm.isReady, llm.error]);

  // Configure LLM when ready
  useEffect(() => {
    if (llm.isReady) {
      try {
        llm.configure({
          generationConfig: {
            outputTokenBatchSize: 50, // Balance between speed and quality
          },
          chatConfig: {
            contextWindowLength: 2048, // Sufficient for wound assessment
            initialMessageHistory: [],
            systemPrompt: '',
          },
        });
        console.log(`${LOG_PREFIX} Model configured`);
      } catch (err) {
        console.warn(`${LOG_PREFIX} Configuration warning:`, err);
      }
    }
  }, [llm.isReady]);

  /**
   * Generate wound context from raw detections
   */
  const generateContext = useCallback(
    async (
      detections: Detection[],
      contextOptions?: WoundContextOptions
    ): Promise<WoundContextResult> => {
      const startTime = Date.now();
      setLocalError(null);

      console.log(
        `${LOG_PREFIX} Generating context for ${detections.length} detection(s)`
      );

      // Check readiness
      if (!llm.isReady) {
        const error = 'LLM model is not loaded yet';
        console.error(`${LOG_PREFIX} ${error}`);
        setLocalError(error);
        return { context: '', success: false, error };
      }

      // Check if already generating
      if (llm.isGenerating) {
        const error = 'LLM is busy with another request';
        console.error(`${LOG_PREFIX} ${error}`);
        setLocalError(error);
        return { context: '', success: false, error };
      }

      try {
        // Build messages
        const messages = buildWoundContextMessages(detections, contextOptions);

        console.log(`${LOG_PREFIX} Starting generation...`);

        // Generate response
        await llm.generate(messages);

        // Extract response - try messageHistory first (more reliable)
        let responseText = '';
        const lastMessage = llm.messageHistory[llm.messageHistory.length - 1];

        if (lastMessage?.role === 'assistant' && lastMessage.content) {
          responseText = lastMessage.content;
        } else if (llm.response?.trim()) {
          responseText = llm.response;
        }

        const generationTimeMs = Date.now() - startTime;
        console.log(
          `${LOG_PREFIX} Generation complete in ${generationTimeMs}ms, ` +
            `response length: ${responseText.length}`
        );

        if (!responseText.trim()) {
          const error = 'LLM generated empty response';
          console.error(`${LOG_PREFIX} ${error}`);
          setLocalError(error);
          return {
            context: '',
            success: false,
            error,
            generationTimeMs,
          };
        }

        return {
          context: responseText,
          success: true,
          generationTimeMs,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown generation error';
        console.error(`${LOG_PREFIX} Generation failed:`, errorMessage);
        setLocalError(errorMessage);

        return {
          context: '',
          success: false,
          error: errorMessage,
          generationTimeMs: Date.now() - startTime,
        };
      }
    },
    [llm]
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
    if (llm.isGenerating) {
      console.log(`${LOG_PREFIX} Interrupting generation`);
      llm.interrupt();
    }
  }, [llm]);

  /**
   * Clear message history
   */
  const clearHistory = useCallback(() => {
    console.log(`${LOG_PREFIX} Clearing message history`);
    while (llm.messageHistory.length > 0) {
      llm.deleteMessage(0);
    }
  }, [llm]);

  // Combine errors
  const combinedError = useMemo(() => {
    if (localError) return localError;
    if (llm.error) return String(llm.error);
    return null;
  }, [localError, llm.error]);

  return {
    isAvailable,
    isReady: llm.isReady,
    isLoading: isAvailable && !llm.isReady && !llm.error,
    isGenerating: llm.isGenerating,
    downloadProgress,
    response: llm.response,
    error: combinedError,
    generateContext,
    generateFromPipeline,
    interrupt,
    clearHistory,
  };
}

export default useWoundLLM;
