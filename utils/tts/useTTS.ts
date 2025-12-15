import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KokoroOnnx, { ChunkedStreamStatus } from './kokoroOnnx';
import { downloadModel, isModelDownloaded, DEFAULT_MODEL_ID, MODELS, ModelId } from './models';
import { DEFAULT_VOICE_ID, VoiceId } from './voices';

// Storage keys
const TTS_MODEL_DOWNLOADED_KEY = '@tts_model_downloaded';
const TTS_ENABLED_KEY = '@tts_enabled';

// Global TTS coordination - track which instance is playing so others can disable
type TTSStateListener = (isPlaying: boolean, instanceId: string | null) => void;
const ttsStateListeners = new Set<TTSStateListener>();
let currentPlayingInstance: string | null = null;

function notifyTTSStateChange(isPlaying: boolean, instanceId: string | null) {
  currentPlayingInstance = isPlaying ? instanceId : null;
  ttsStateListeners.forEach((listener) => listener(isPlaying, instanceId));
}

function subscribeTTSState(listener: TTSStateListener) {
  ttsStateListeners.add(listener);
  // Immediately notify of current state
  listener(currentPlayingInstance !== null, currentPlayingInstance);
  return () => ttsStateListeners.delete(listener);
}

function isAnotherTTSPlaying(instanceId: string): boolean {
  return currentPlayingInstance !== null && currentPlayingInstance !== instanceId;
}

export type TTSStatus =
  | 'checking'        // Checking availability
  | 'not_available'   // Platform doesn't support ONNX
  | 'not_downloaded'  // Model not yet downloaded
  | 'downloading'     // Download in progress
  | 'loading'         // Loading model into memory
  | 'ready'           // Ready to use
  | 'generating'      // Generating audio chunks
  | 'speaking'        // Currently playing audio
  | 'error';          // Error state

export type ChunkState = 'pending' | 'generating' | 'playing' | 'completed';

export interface UseTTSReturn {
  status: TTSStatus;
  downloadProgress: number;
  generationProgress: number; // 0-1 during generating phase
  error: string | null;
  speak: (text: string) => Promise<void>;
  stop: () => Promise<void>;
  download: () => Promise<boolean>;
  isAvailable: boolean;
  // Chunk info for visual highlighting
  chunks: string[];
  chunkStates: ChunkState[];
  currentChunk: number; // 1-indexed, 0 when not active
  // Track if audio has been played (for UI differentiation)
  hasPlayed: boolean;
  // True if another TTS instance is playing (disable this button)
  isOtherPlaying: boolean;
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
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  // Chunk state for visual highlighting
  const [chunks, setChunks] = useState<string[]>([]);
  const [chunkStates, setChunkStates] = useState<ChunkState[]>([]);
  const [currentChunk, setCurrentChunk] = useState(0);

  // Track if audio has been played at least once (for UI differentiation)
  const [hasPlayed, setHasPlayed] = useState(false);

  const isInitialized = useRef(false);
  const isMounted = useRef(true);

  // Unique ID for this TTS instance
  const instanceId = useRef(`tts-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // Track if another TTS instance is currently playing
  const [isOtherPlaying, setIsOtherPlaying] = useState(false);

  // Track screen focus for stopping TTS on navigation
  let isFocused = true;
  try {
    // useIsFocused may throw if not in a navigation context
    isFocused = useIsFocused();
  } catch {
    // Not in a navigation context, assume focused
    isFocused = true;
  }

  // Safe state setters that check if component is still mounted
  const safeSetStatus = useCallback((newStatus: TTSStatus) => {
    if (isMounted.current) setStatus(newStatus);
  }, []);

  const safeSetError = useCallback((err: string | null) => {
    if (isMounted.current) setError(err);
  }, []);

  // Subscribe to global TTS state to know if another instance is playing
  useEffect(() => {
    const unsubscribe = subscribeTTSState((isPlaying, playingId) => {
      if (isMounted.current) {
        // Another instance is playing if there's a playing instance that's not us
        setIsOtherPlaying(isPlaying && playingId !== instanceId.current);
      }
    });
    return unsubscribe;
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

        // Check if already pre-warmed (loaded at app startup)
        if (KokoroOnnx.isReady()) {
          console.log('[TTS] Model already pre-warmed, ready instantly');
          safeSetStatus('ready');
          return;
        }

        // Model is downloaded but not pre-warmed, load it now
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

    // Cleanup: stop TTS playback when component unmounts
    return () => {
      isMounted.current = false;
      // Stop any ongoing TTS playback
      KokoroOnnx.stopStreaming().catch((err) => {
        console.log('[TTS] Cleanup stop error (safe to ignore):', err);
      });
    };
  }, [modelId, autoLoad, safeSetStatus, safeSetError]);

  // Stop TTS when screen loses focus (tab navigation)
  useEffect(() => {
    if (!isFocused && (status === 'speaking' || status === 'generating')) {
      console.log('[TTS] Screen lost focus, stopping playback');
      KokoroOnnx.stopStreaming().catch(() => {});
      if (isMounted.current) {
        setStatus('ready');
        setChunks([]);
        setChunkStates([]);
        setCurrentChunk(0);
        setGenerationProgress(0);
      }
    }
  }, [isFocused, status]);

  // Stop TTS when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (status === 'speaking' || status === 'generating') {
          console.log('[TTS] App went to background, stopping playback');
          KokoroOnnx.stopStreaming().catch(() => {});
          if (isMounted.current) {
            setStatus('ready');
            setChunks([]);
            setChunkStates([]);
            setCurrentChunk(0);
            setGenerationProgress(0);
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [status]);

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

  // Speak text - uses chunked streaming for long text
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
      // Notify globally that this instance is now playing
      notifyTTSStateChange(true, instanceId.current);

      // Start in generating state
      setStatus('generating');
      setGenerationProgress(0);
      // Reset chunk state
      setChunks([]);
      setChunkStates([]);
      setCurrentChunk(0);

      // Use chunked streaming which handles long text automatically
      await KokoroOnnx.streamChunkedAudio(
        text,
        voiceId,
        speed,
        (streamStatus: ChunkedStreamStatus) => {
          if (!isMounted.current) return;

          // Update chunk info for visual highlighting
          if (streamStatus.chunks && streamStatus.chunks.length > 0) {
            setChunks(streamStatus.chunks);
            setChunkStates(streamStatus.chunkStates);
            setCurrentChunk(streamStatus.currentChunk);
          }

          // Update state based on phase
          if (streamStatus.phase === 'generating') {
            setStatus('generating');
            setGenerationProgress(streamStatus.generationProgress);
            console.log(`[TTS] Generating ${streamStatus.currentChunk}/${streamStatus.totalChunks} - ${Math.round(streamStatus.generationProgress * 100)}%`);
          } else if (streamStatus.phase === 'playing') {
            setStatus('speaking');
            setGenerationProgress(1);
            // Log playback progress
            if (streamStatus.totalChunks > 1) {
              console.log(`[TTS] Playing ${streamStatus.currentChunk}/${streamStatus.totalChunks} - ${Math.round(streamStatus.overallProgress * 100)}%`);
            }
          }

          // Audio finished when overall progress reaches 100%
          if (streamStatus.overallProgress >= 1) {
            notifyTTSStateChange(false, null); // Notify globally that we're done
            setStatus('ready');
            setGenerationProgress(0);
            setHasPlayed(true); // Mark as played for UI differentiation
            // Clear chunk state when done
            setChunks([]);
            setChunkStates([]);
            setCurrentChunk(0);
          }
        }
      );

      // Ensure status is set to ready after completion
      notifyTTSStateChange(false, null);
      if (isMounted.current) {
        setStatus('ready');
        setGenerationProgress(0);
        setHasPlayed(true); // Mark as played for UI differentiation
        setChunks([]);
        setChunkStates([]);
        setCurrentChunk(0);
      }
    } catch (err) {
      console.error('[TTS] Speak error:', err);
      notifyTTSStateChange(false, null); // Notify globally that we're done (on error)
      setError(err instanceof Error ? err.message : 'Speech failed');
      setStatus('ready');
      setGenerationProgress(0);
      setChunks([]);
      setChunkStates([]);
      setCurrentChunk(0);
    }
  }, [status, voiceId, speed]);

  // Stop speaking
  const stop = useCallback(async (): Promise<void> => {
    try {
      await KokoroOnnx.stopStreaming();
      if (isMounted.current) {
        if (status === 'speaking' || status === 'generating') {
          setStatus('ready');
        }
        // Reset chunk state
        setChunks([]);
        setChunkStates([]);
        setCurrentChunk(0);
        setGenerationProgress(0);
      }
    } catch (err) {
      console.error('[TTS] Stop error:', err);
    }
  }, [status]);

  return {
    status,
    downloadProgress,
    generationProgress,
    error,
    speak,
    stop,
    download,
    isAvailable,
    // Chunk info for visual highlighting
    chunks,
    chunkStates,
    currentChunk,
    // Track if audio has been played
    hasPlayed,
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
 * Check if text already has a time-based or action label prefix
 * e.g., "Today:", "Within 24-48 hours:", "If symptoms worsen:", "Follow-up:"
 */
function hasLabelPrefix(text: string): boolean {
  // Match patterns like "Today:", "Within 24-48 hours:", "If symptoms worsen:", etc.
  return /^[^:]{1,30}:\s*.+$/.test(text.trim());
}

/**
 * Prepare assessment next steps for TTS
 * Does NOT add step numbers if text already has label prefixes (e.g., "Today:", "Within 24 hours:")
 */
export function prepareNextStepsForTTS(nextSteps: string[]): string {
  if (!nextSteps.length) return '';

  const parts: string[] = ["Here's what you should do."];

  // Check if items already have labels (time-based prefixes)
  const hasExistingLabels = nextSteps.some(step => hasLabelPrefix(step));

  nextSteps.forEach((step, index) => {
    // Clean the step text
    const cleanStep = prepareTextForTTS(step);
    if (cleanStep) {
      // Only add "Step X:" if items don't already have labels
      if (hasExistingLabels) {
        parts.push(cleanStep);
      } else {
        parts.push(`Step ${index + 1}: ${cleanStep}`);
      }
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
