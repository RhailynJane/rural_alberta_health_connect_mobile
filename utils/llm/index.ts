/**
 * LLM Module Exports
 *
 * Architecture (Singleton Pattern):
 * - LLMHost: Must be rendered at app root level (outside tabs)
 * - LLMSingleton: Manages single model instance across app lifecycle
 * - useWoundLLM: Hook that subscribes to singleton state (safe for tabs)
 */

// Host component - render at app root level
export { LLMHost } from './LLMHost';

// Singleton manager
export { getLLMSingleton, type LLMState } from './LLMSingleton';

// Hook for components (subscribes to singleton)
export { useWoundLLM, useWoundLLMStatic, type UseWoundLLMOptions, type UseWoundLLMReturn } from './useWoundLLM';

// Test component
export { LLMTest } from './LLMTest';

// Context and utilities
export * from './woundContext';
export * from './offlineFallback';
