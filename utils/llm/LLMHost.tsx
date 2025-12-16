/**
 * LLM Host Component
 *
 * This component MUST be rendered at the app root level (outside of tab navigation)
 * to ensure the LLM model persists across tab switches without re-initialization.
 *
 * It acts as a "bridge" between React's hook system and the singleton manager:
 * - Calls useLLM hook (which requires React context)
 * - Syncs state to the singleton manager
 * - Handles cleanup on app unmount
 *
 * Usage in app/_layout.tsx:
 *   import { LLMHost } from '@/utils/llm/LLMHost';
 *
 *   export default function RootLayout() {
 *     return (
 *       <ConvexAuthProvider>
 *         <LLMHost />
 *         <Stack>...</Stack>
 *       </ConvexAuthProvider>
 *     );
 *   }
 */

import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
    getLLMSingleton,
    QWEN3_0_6B_QUANTIZED_MODEL,
    useLLMHook,
} from './LLMSingleton';

const LOG_PREFIX = '[LLM:Host]';

/**
 * Android-specific host that uses the actual useLLM hook
 */
function LLMHostAndroid(): null {
  const singleton = getLLMSingleton();
  const hasInitialized = useRef(false);

  // useLLMHook is guaranteed to exist on Android (checked in parent)
  const llm = useLLMHook!({ model: QWEN3_0_6B_QUANTIZED_MODEL! });

  // Initialize singleton with hook instance (once)
  useEffect(() => {
    if (!hasInitialized.current) {
      console.log(`${LOG_PREFIX} Initializing singleton with hook`);
      singleton.initializeWithHook(llm);
      hasInitialized.current = true;
    }
  }, [llm, singleton]);

  // Sync hook state to singleton on every update
  useEffect(() => {
    singleton.syncFromHook({
      isReady: llm.isReady,
      isGenerating: llm.isGenerating,
      downloadProgress: llm.downloadProgress ?? 0,
      response: llm.response,
      error: llm.error ? String(llm.error) : null,
    });
  }, [
    llm.isReady,
    llm.isGenerating,
    llm.downloadProgress,
    llm.response,
    llm.error,
    singleton,
  ]);

  // Configure model when ready
  useEffect(() => {
    if (llm.isReady) {
      console.log(`${LOG_PREFIX} Model ready, configuring...`);
      singleton.configure();
    }
  }, [llm.isReady, singleton]);

  // Cleanup: interrupt generation before unmount (app close)
  useEffect(() => {
    const interruptFn = llm.interrupt;
    const isGeneratingFn = () => llm.isGenerating;

    return () => {
      try {
        if (isGeneratingFn() && interruptFn) {
          console.log(`${LOG_PREFIX} Interrupting generation before app unmount`);
          interruptFn();
        }
      } catch (e) {
        // Silently ignore cleanup errors (hook may be tearing down)
        console.debug(`${LOG_PREFIX} Cleanup error (safe to ignore):`, e);
      }
    };
  }, [llm.interrupt, llm.isGenerating]);

  return null;
}

/**
 * Main LLMHost component
 *
 * Renders nothing visually - just manages the LLM lifecycle.
 * Only initializes on Android where ExecuTorch is available.
 */
export function LLMHost(): null {
  // Check platform and module availability at render time (not conditionally calling hooks)
  const isAvailable = Platform.OS === 'android' &&
    useLLMHook !== null &&
    QWEN3_0_6B_QUANTIZED_MODEL !== null;

  // Early return for non-Android platforms - no hooks called
  if (!isAvailable) {
    return null;
  }

  // Render the Android-specific component that uses the hook
  // This is safe because the condition is stable (platform doesn't change)
  return <LLMHostAndroid />;
}

export default LLMHost;
