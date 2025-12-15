// TTS Module - On-device Text-to-Speech using Kokoro ONNX
//
// Usage:
// import { useTTS, prepareNextStepsForTTS } from '@/utils/tts';
//
// const { status, speak, stop, download } = useTTS();
// await speak("Hello world");

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
  type UseTTSOptions
} from './useTTS';
