// TTS Module - On-device Text-to-Speech using Kokoro ONNX
//
// Usage:
// import { useTTS, prepareNextStepsForTTS, preWarmTTS } from '@/utils/tts';
//
// // Pre-warm at app startup for instant TTS:
// preWarmTTS();
//
// const { status, speak, stop, download } = useTTS();
// await speak("Hello world");

import KokoroOnnxInstance from './kokoroOnnx';
import { DEFAULT_MODEL_ID } from './models';
import { DEFAULT_VOICE_ID } from './voices';

/**
 * Pre-warm the TTS engine at app startup for instant audio playback.
 * Call this in your root layout/provider to eliminate loading delay on first TTS use.
 *
 * @returns Promise<boolean> - true if pre-warm was successful
 *
 * @example
 * // In app/_layout.tsx:
 * useEffect(() => {
 *   preWarmTTS().then(success => {
 *     console.log('TTS pre-warm:', success ? 'ready' : 'failed');
 *   });
 * }, []);
 */
export async function preWarmTTS(
  modelId: string = DEFAULT_MODEL_ID,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<boolean> {
  return KokoroOnnxInstance.preWarm(modelId, voiceId);
}

/**
 * Check if TTS is pre-warmed and ready for instant use
 */
export function isTTSReady(): boolean {
  return KokoroOnnxInstance.isReady();
}

export {
  default as KokoroOnnx,
  splitTextIntoChunks,
  type StreamStatus,
  type ChunkedStreamStatus
} from './kokoroOnnx';
export {
  MODELS,
  DEFAULT_MODEL_ID,
  isModelDownloaded,
  getDownloadedModels,
  downloadModel,
  deleteModel,
  getModelInfo,
  type ModelId
} from './models';
export {
  VOICES,
  DEFAULT_VOICE_ID,
  RECOMMENDED_VOICES,
  getVoiceData,
  isVoiceDownloaded,
  getVoiceInfo,
  type VoiceId,
  type VoiceInfo
} from './voices';
export {
  useTTS,
  prepareTextForTTS,
  prepareNextStepsForTTS,
  prepareRecommendationsForTTS,
  type TTSStatus,
  type UseTTSReturn,
  type UseTTSOptions,
  type ChunkState
} from './useTTS';
