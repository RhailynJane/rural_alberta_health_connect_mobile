/**
 * LLM Singleton Manager
 *
 * Manages a single instance of the ExecuTorch LLM model outside of React's
 * component lifecycle. This prevents OOM issues caused by multiple model
 * instances being created when tab navigation mounts/unmounts components.
 *
 * Architecture:
 * - Model initialization happens ONCE per app session
 * - State is broadcast via EventEmitter to React hooks
 * - Tab switching does NOT re-initialize the model
 *
 * Platform Support:
 * - Android: Full on-device LLM support via ExecuTorch
 * - iOS: Returns unavailable state (OpenCV conflict with YOLO preprocessing)
 */

import { Platform } from 'react-native';
import { EventEmitter, type EventsMap } from 'expo-modules-core';
import type { Detection } from '@/utils/yolo/types';
import {
  buildWoundContextMessages,
  type WoundContextOptions,
  type WoundContextResult,
} from './woundContext';

const LOG_PREFIX = '[LLM:Singleton]';

// Conditionally import ExecuTorch only on Android
let useLLMHook: typeof import('react-native-executorch').useLLM | null = null;
let QWEN3_0_6B_QUANTIZED_MODEL: typeof import('react-native-executorch').QWEN3_0_6B_QUANTIZED | null = null;

if (Platform.OS === 'android') {
  try {
    const executorch = require('react-native-executorch');
    useLLMHook = executorch.useLLM;
    QWEN3_0_6B_QUANTIZED_MODEL = executorch.QWEN3_0_6B_QUANTIZED;
  } catch (e) {
    console.warn(`${LOG_PREFIX} Failed to load react-native-executorch:`, e);
  }
}

/**
 * LLM State interface - broadcast to subscribers
 */
export interface LLMState {
  isAvailable: boolean;
  isReady: boolean;
  isLoading: boolean;
  isGenerating: boolean;
  downloadProgress: number;
  response: string;
  error: string | null;
}

/**
 * LLM Singleton Manager
 *
 * Ensures only ONE model instance exists across the entire app lifecycle.
 * React components subscribe to state changes via events.
 */
// Events map for type-safe event emitter
interface LLMEventsMap extends EventsMap {
  stateChange: (state: LLMState) => void;
}

class LLMSingletonManager {
  private static instance: LLMSingletonManager | null = null;

  private emitter: EventEmitter<LLMEventsMap>;
  private state: LLMState;
  private llmInstance: ReturnType<typeof useLLMHook> | null = null;
  private isInitialized: boolean = false;
  private responseRef: string = '';
  private isGeneratingRef: boolean = false;

  private constructor() {
    this.emitter = new EventEmitter<LLMEventsMap>();

    const isAvailable = Platform.OS === 'android' && useLLMHook !== null && QWEN3_0_6B_QUANTIZED_MODEL !== null;

    this.state = {
      isAvailable,
      isReady: false,
      isLoading: false,
      isGenerating: false,
      downloadProgress: 0,
      response: '',
      error: isAvailable ? null : (Platform.OS === 'ios'
        ? 'On-device LLM not available on iOS'
        : 'ExecuTorch module not loaded'),
    };

    console.log(`${LOG_PREFIX} Manager created, isAvailable: ${isAvailable}`);
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): LLMSingletonManager {
    if (!LLMSingletonManager.instance) {
      LLMSingletonManager.instance = new LLMSingletonManager();
    }
    return LLMSingletonManager.instance;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: LLMState) => void): () => void {
    const subscription = this.emitter.addListener('stateChange', callback);
    // Immediately emit current state
    callback(this.state);

    return () => {
      subscription.remove();
    };
  }

  /**
   * Update state and notify subscribers
   */
  private updateState(partialState: Partial<LLMState>) {
    this.state = { ...this.state, ...partialState };
    this.emitter.emit('stateChange', this.state);
  }

  /**
   * Get current state (for useSyncExternalStore)
   * Returns direct reference - state is immutable (replaced on each update)
   */
  getState(): LLMState {
    return this.state;
  }

  /**
   * Initialize/update the LLM model reference
   *
   * Note: This must be called from within a React component because
   * useLLM is a React hook. The llm object from useLLM changes when
   * the model loads, so we must always accept the latest reference.
   */
  initializeWithHook(llm: ReturnType<typeof useLLMHook>): void {
    // Always update the llmInstance reference - it changes when model loads
    this.llmInstance = llm;

    if (!this.isInitialized) {
      console.log(`${LOG_PREFIX} First initialization with hook instance`);
      this.isInitialized = true;
      this.updateState({
        isLoading: true,
      });
    }
  }

  /**
   * Sync state from the React hook
   * Called by the host component on every render
   */
  syncFromHook(llm: {
    isReady: boolean;
    isGenerating: boolean;
    downloadProgress: number;
    response: string;
    error: string | null;
  }): void {
    // Track response in ref for generation completion
    if (llm.response) {
      this.responseRef = llm.response;
    }
    this.isGeneratingRef = llm.isGenerating;

    // Update state
    const newState: Partial<LLMState> = {
      isReady: llm.isReady,
      isGenerating: llm.isGenerating,
      downloadProgress: llm.isReady ? 100 : (llm.downloadProgress ?? 0),
      response: llm.response,
      isLoading: !llm.isReady && !llm.error,
    };

    if (llm.error) {
      newState.error = String(llm.error);
    }

    this.updateState(newState);
  }

  /**
   * Configure the LLM when ready
   */
  configure(): void {
    if (!this.llmInstance || !this.state.isReady) {
      console.warn(`${LOG_PREFIX} Cannot configure - model not ready`);
      return;
    }

    try {
      this.llmInstance.configure({
        generationConfig: {
          outputTokenBatchSize: 50,
        },
        chatConfig: {
          contextWindowLength: 2048,
          initialMessageHistory: [],
          systemPrompt: '',
        },
      });
      console.log(`${LOG_PREFIX} Model configured`);
    } catch (err) {
      console.warn(`${LOG_PREFIX} Configuration warning:`, err);
    }
  }

  /**
   * Generate wound context from detections
   */
  async generateContext(
    detections: Detection[],
    contextOptions?: WoundContextOptions
  ): Promise<WoundContextResult> {
    const startTime = Date.now();

    console.log(
      `${LOG_PREFIX} Generating context for ${detections.length} detection(s)`
    );

    if (!this.llmInstance) {
      const error = 'LLM instance not initialized';
      console.error(`${LOG_PREFIX} ${error}`);
      return { context: '', success: false, error };
    }

    if (!this.state.isReady) {
      const error = 'LLM model is not loaded yet';
      console.error(`${LOG_PREFIX} ${error}`);
      return { context: '', success: false, error };
    }

    if (this.state.isGenerating) {
      const error = 'LLM is busy with another request';
      console.error(`${LOG_PREFIX} ${error}`);
      return { context: '', success: false, error };
    }

    try {
      const messages = buildWoundContextMessages(detections, contextOptions);

      console.log(`${LOG_PREFIX} Starting generation...`);
      this.responseRef = '';

      await this.llmInstance.generate(messages);

      const responseText = this.responseRef;
      const generationTimeMs = Date.now() - startTime;

      console.log(
        `${LOG_PREFIX} Generation complete in ${generationTimeMs}ms, ` +
          `response length: ${responseText.length}`
      );

      return {
        context: responseText,
        success: true,
        generationTimeMs,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown generation error';
      console.error(`${LOG_PREFIX} Generation failed:`, errorMessage);

      return {
        context: '',
        success: false,
        error: errorMessage,
        generationTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Interrupt ongoing generation
   */
  interrupt(): void {
    if (this.llmInstance && this.isGeneratingRef) {
      console.log(`${LOG_PREFIX} Interrupting generation`);
      this.llmInstance.interrupt();
    }
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    if (!this.llmInstance) return;

    console.log(`${LOG_PREFIX} Clearing message history`);
    while (this.llmInstance.messageHistory.length > 0) {
      this.llmInstance.deleteMessage(0);
    }
  }

  /**
   * Check if initialized
   */
  isModelInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton getter
export const getLLMSingleton = () => LLMSingletonManager.getInstance();

// Export for use in host component
export { useLLMHook, QWEN3_0_6B_QUANTIZED_MODEL };
