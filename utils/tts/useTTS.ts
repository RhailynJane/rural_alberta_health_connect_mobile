import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KokoroOnnx, { ChunkedStreamStatus } from './kokoroOnnx';
import { downloadModel, isModelDownloaded, DEFAULT_MODEL_ID, MODELS, ModelId } from './models';
import { DEFAULT_VOICE_ID, VoiceId } from './voices';

// Storage keys
const TTS_MODEL_DOWNLOADED_KEY = '@tts_model_downloaded';
const TTS_ENABLED_KEY = '@tts_enabled';

export type TTSStatus =
  | 'checking'        // Checking availability
  | 'not_available'   // Platform doesn't support ONNX
  | 'not_downloaded'  // Model not yet downloaded
  | 'downloading'     // Download in progress
  | 'loading'         // Loading model into memory
  | 'ready'           // Ready to use
  | 'speaking'        // Currently playing audio
  | 'error';          // Error state

export interface UseTTSReturn {
  status: TTSStatus;
  downloadProgress: number;
  error: string | null;
  speak: (text: string) => Promise<void>;
  stop: () => Promise<void>;
  download: () => Promise<boolean>;
  isAvailable: boolean;
}

export interface UseTTSOptions {
  voiceId?: VoiceId;
  speed?: number;
  modelId?: ModelId;
  autoLoad?: boolean;
}

/**
 * Hook for Text-to-Speech functionality using on-device Kokoro ONNX model
 *
 * @example
 * ```tsx
 * const { status, speak, stop, download } = useTTS();
 *
 * // First time: download the model
 * if (status === 'not_downloaded') {
 *   await download();
 * }
 *
 * // Speak text
 * await speak("Hello, this is a test");
 * ```
 */
export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const {
    voiceId = DEFAULT_VOICE_ID,
    speed = 0.9, // Slightly slower for healthcare content clarity
    modelId = DEFAULT_MODEL_ID,
    autoLoad = true,
  } = options;

  const [status, setStatus] = useState<TTSStatus>('checking');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  const isInitialized = useRef(false);
  const isMounted = useRef(true);

  // Safe state setters that check if component is still mounted
  const safeSetStatus = useCallback((newStatus: TTSStatus) => {
    if (isMounted.current) setStatus(newStatus);
  }, []);

  const safeSetError = useCallback((err: string | null) => {
    if (isMounted.current) setError(err);
  }, []);

  // Check availability and load model on mount
  useEffect(() => {
    isMounted.current = true;

    const initialize = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      try {
        // Check platform support
        if (Platform.OS === 'web') {
          console.log('[TTS] Web platform not fully supported');
          safeSetStatus('not_available');
          setIsAvailable(false);
          return;
        }

        // Check ONNX availability
        const onnxAvailable = KokoroOnnx.checkOnnxAvailability();
        if (!onnxAvailable) {
          console.log('[TTS] ONNX runtime not available');
          safeSetStatus('not_available');
          setIsAvailable(false);
          return;
        }

        setIsAvailable(true);

        // Check if model is already downloaded
        const downloaded = await isModelDownloaded(modelId);

        if (!downloaded) {
          console.log('[TTS] Model not downloaded');
          safeSetStatus('not_downloaded');
          return;
        }

        // Model is downloaded, try to load it
        if (autoLoad) {
          safeSetStatus('loading');

          const loaded = await KokoroOnnx.loadModel(modelId);
          if (loaded) {
            console.log('[TTS] Model loaded successfully');
            safeSetStatus('ready');
          } else {
            console.error('[TTS] Failed to load model');
            safeSetError('Failed to load TTS model');
            safeSetStatus('error');
          }
        } else {
          safeSetStatus('not_downloaded');
        }
      } catch (err) {
        console.error('[TTS] Initialization error:', err);
        safeSetError(err instanceof Error ? err.message : 'Unknown error');
        safeSetStatus('error');
      }
    };

    initialize();

    return () => {
      isMounted.current = false;
    };
  }, [modelId, autoLoad, safeSetStatus, safeSetError]);

  // Download model
  const download = useCallback(async (): Promise<boolean> => {
    if (status === 'downloading') return false;

    try {
      setError(null);
      setStatus('downloading');
      setDownloadProgress(0);

      console.log(`[TTS] Starting download of ${modelId} (${MODELS[modelId].size})`);

      const success = await downloadModel(modelId, (progress) => {
        if (isMounted.current) {
          setDownloadProgress(progress);
        }
      });

      if (!success) {
        setError('Download failed');
        setStatus('not_downloaded');
        return false;
      }

      console.log('[TTS] Download complete, loading model...');
      setStatus('loading');

      const loaded = await KokoroOnnx.loadModel(modelId);
      if (loaded) {
        console.log('[TTS] Model loaded successfully');
        await AsyncStorage.setItem(TTS_MODEL_DOWNLOADED_KEY, 'true');
        setStatus('ready');
        return true;
      } else {
        setError('Failed to load model after download');
        setStatus('error');
        return false;
      }
    } catch (err) {
      console.error('[TTS] Download error:', err);
      setError(err instanceof Error ? err.message : 'Download failed');
      setStatus('not_downloaded');
      return false;
    }
  }, [status, modelId]);

  // Speak text
  const speak = useCallback(async (text: string): Promise<void> => {
    if (status !== 'ready') {
      console.warn('[TTS] Cannot speak: status is', status);
      return;
    }

    if (!text.trim()) {
      console.warn('[TTS] Cannot speak: empty text');
      return;
    }

    try {
      setStatus('speaking');

      await KokoroOnnx.streamAudio(
        text,
        voiceId,
        speed,
        (streamStatus: StreamStatus) => {
          // Audio finished
          if (streamStatus.progress >= 1) {
            if (isMounted.current) {
              setStatus('ready');
            }
          }
        }
      );
    } catch (err) {
      console.error('[TTS] Speak error:', err);
      setError(err instanceof Error ? err.message : 'Speech failed');
      setStatus('ready');
    }
  }, [status, voiceId, speed]);

  // Stop speaking
  const stop = useCallback(async (): Promise<void> => {
    try {
      await KokoroOnnx.stopStreaming();
      if (isMounted.current && status === 'speaking') {
        setStatus('ready');
      }
    } catch (err) {
      console.error('[TTS] Stop error:', err);
    }
  }, [status]);

  return {
    status,
    downloadProgress,
    error,
    speak,
    stop,
    download,
    isAvailable,
  };
}

/**
 * Prepare text for TTS - clean and format for better speech output
 */
export function prepareTextForTTS(text: string): string {
  return text
    // Remove markdown formatting
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#+ /g, '')
    .replace(/`/g, '')
    // Replace bullet points with "next"
    .replace(/^[-•] /gm, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    // Remove URLs
    .replace(/https?:\/\/\S+/g, '')
    // Trim
    .trim();
}

/**
 * Prepare assessment next steps for TTS
 */
export function prepareNextStepsForTTS(nextSteps: string[]): string {
  if (!nextSteps.length) return '';

  const parts: string[] = ["Here's what you should do."];

  nextSteps.forEach((step, index) => {
    // Clean the step text
    const cleanStep = prepareTextForTTS(step);
    if (cleanStep) {
      parts.push(`Step ${index + 1}: ${cleanStep}`);
    }
  });

  return parts.join(' ');
}

/**
 * Prepare recommendations for TTS
 */
export function prepareRecommendationsForTTS(recommendations: string[], maxItems: number = 3): string {
  if (!recommendations.length) return '';

  const parts: string[] = ["Additional recommendations:"];

  recommendations.slice(0, maxItems).forEach((rec) => {
    const cleanRec = prepareTextForTTS(rec);
    if (cleanRec) {
      parts.push(cleanRec);
    }
  });

  return parts.join(' ');
}

export default useTTS;
