import * as FileSystem from 'expo-file-system/legacy';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { Audio } from 'expo-av';
import { VOICES, getVoiceData } from './voices';
import { Platform } from 'react-native';
import { MODELS } from './models';

// CMU Pronouncing Dictionary (124,926 words with IPA phonemes)
import CMU_DICTIONARY from './cmuDictionary.min.json';

// Constants
const SAMPLE_RATE = 24000;
const STYLE_DIM = 256;
const MAX_PHONEME_LENGTH = 510;
// Optimal chunk size - balance between quality and inference calls
// Smaller chunks = faster first audio, more inference calls
const OPTIMAL_CHUNK_CHAR_LENGTH = 180; // ~1-2 sentences per chunk for faster first audio
// First chunk is smaller for faster initial audio response
const FIRST_CHUNK_CHAR_LENGTH = 90; // ~50% of optimal, ~1 sentence for quick first audio
// Maximum characters per chunk (phoneme limit safety)
const MAX_CHUNK_CHAR_LENGTH = 250;

// Voice data URL
const VOICE_DATA_URL = "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices";

// Complete vocabulary from Python code
const VOCAB: Record<string, number> = (() => {
  const _pad = "$";
  const _punctuation = ';:,.!?¡¿—…"«»"" ';
  const _letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const _letters_ipa = "ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘'̩'ᵻ";

  const symbols = [_pad, ..._punctuation.split(''), ..._letters.split(''), ..._letters_ipa.split('')];
  const dicts: Record<string, number> = {};

  for (let i = 0; i < symbols.length; i++) {
    dicts[symbols[i]] = i;
  }

  return dicts;
})();

// Common English phoneme mappings for basic phonemization
const ENGLISH_PHONEME_MAP: Record<string, string> = {
  'a': 'ə',
  'e': 'ɛ',
  'i': 'ɪ',
  'o': 'oʊ',
  'u': 'ʌ',
  'th': 'θ',
  'sh': 'ʃ',
  'ch': 'tʃ',
  'ng': 'ŋ',
  'j': 'dʒ',
  'r': 'ɹ',
  'er': 'ɜɹ',
  'ar': 'ɑɹ',
  'or': 'ɔɹ',
  'ir': 'ɪɹ',
  'ur': 'ʊɹ',
};

// Alphabet letter pronunciations (for spelled-out acronyms like "A I")
const LETTER_PHONEMES: Record<string, string> = {
  'A': 'ˈeɪ',      // "ay"
  'B': 'bˈiː',     // "bee"
  'C': 'sˈiː',     // "see"
  'D': 'dˈiː',     // "dee"
  'E': 'ˈiː',      // "ee"
  'F': 'ˈɛf',      // "eff"
  'G': 'dʒˈiː',    // "jee"
  'H': 'ˈeɪtʃ',    // "aych"
  'I': 'ˈaɪ',      // "eye"
  'J': 'dʒˈeɪ',    // "jay"
  'K': 'kˈeɪ',     // "kay"
  'L': 'ˈɛl',      // "el"
  'M': 'ˈɛm',      // "em"
  'N': 'ˈɛn',      // "en"
  'O': 'ˈoʊ',      // "oh"
  'P': 'pˈiː',     // "pee"
  'Q': 'kjˈuː',    // "cue"
  'R': 'ˈɑːɹ',     // "ar"
  'S': 'ˈɛs',      // "es"
  'T': 'tˈiː',     // "tee"
  'U': 'jˈuː',     // "you"
  'V': 'vˈiː',     // "vee"
  'W': 'dˈʌbəljuː', // "double-you"
  'X': 'ˈɛks',     // "ex"
  'Y': 'wˈaɪ',     // "why"
  'Z': 'zˈiː',     // "zee"
};

// Common word to phoneme mappings
const COMMON_WORD_PHONEMES: Record<string, string> = {
  'hello': 'hɛˈloʊ',
  'world': 'wˈɜɹld',
  'this': 'ðˈɪs',
  'is': 'ˈɪz',
  'a': 'ə',
  'test': 'tˈɛst',
  'of': 'ʌv',
  'the': 'ðə',
  'kokoro': 'kˈoʊkəɹoʊ',
  'text': 'tˈɛkst',
  'to': 'tə',
  'speech': 'spˈiːtʃ',
  'system': 'sˈɪstəm',
  'running': 'ɹˈʌnɪŋ',
  'on': 'ˈɑːn',
  'expo': 'ˈɛkspoʊ',
  'with': 'wˈɪð',
  'onnx': 'ˈɑːnɛks',
  'runtime': 'ɹˈʌntaɪm',
  // Healthcare-specific words (using ɜɹ instead of ɝ for better Kokoro compatibility)
  'wound': 'wˈuːnd',
  'burn': 'bˈɜɹn',
  'burns': 'bˈɜɹnz',
  'burned': 'bˈɜɹnd',
  'burning': 'bˈɜɹnɪŋ',
  'injury': 'ˈɪndʒəɹi',
  'injuries': 'ˈɪndʒəɹiz',
  'clean': 'klˈiːn',
  'water': 'wˈɔːtəɹ',
  'bandage': 'bˈændɪdʒ',
  'doctor': 'dˈɑːktəɹ',
  'medical': 'mˈɛdɪkəl',
  'care': 'kˈɛɹ',
  'seek': 'sˈiːk',
  'monitor': 'mˈɑːnɪtəɹ',
  'fever': 'fˈiːvəɹ',
  'pain': 'pˈeɪn',
  'swelling': 'swˈɛlɪŋ',
  'redness': 'ɹˈɛdnəs',
  'infection': 'ɪnfˈɛkʃən',
  'symptoms': 'sˈɪmptəmz',
  'treatment': 'tɹˈiːtmənt',
  'apply': 'əplˈaɪ',
  'cold': 'kˈoʊld',
  'warm': 'wˈɔːɹm',
  'area': 'ˈɛɹiə',
  'affected': 'əfˈɛktɪd',
  'minutes': 'mˈɪnɪts',
  'hours': 'ˈaʊəɹz',
  'day': 'dˈeɪ',
  'days': 'dˈeɪz',
  'step': 'stˈɛp',
  'first': 'fˈɜɹst',
  'second': 'sˈɛkənd',
  'next': 'nˈɛkst',
  'immediately': 'ɪmˈiːdiətli',
  'gently': 'dʒˈɛntli',
  'keep': 'kˈiːp',
  'avoid': 'əvˈɔɪd',
  'contact': 'kˈɑːntækt',
  'healthcare': 'hˈɛlθkɛɹ',
  'provider': 'pɹəvˈaɪdəɹ',
  'emergency': 'ɪmˈɜɹdʒənsi',
  // Additional common words
  'heat': 'hˈiːt',
  'assessment': 'əsˈɛsmənt',
  'and': 'ænd',
  'the': 'ðə',
  'your': 'jˈɔːɹ',
  'you': 'juː',
  'should': 'ʃˈʊd',
  'call': 'kˈɔːl',
  'help': 'hˈɛlp',
  'severe': 'səvˈɪəɹ',
  'mild': 'mˈaɪld',
  'moderate': 'mˈɑːdəɹət',
  'timeframe': 'tˈaɪmfɹeɪm',
  'timeframes': 'tˈaɪmfɹeɪmz',
  'alberta': 'ɑlbˈɜːɹtə',
  'detailed': 'dˈiːteɪld',
};

export interface StreamStatus {
  progress: number;
  tokensPerSecond: number;
  timeToFirstToken: number;
  position: number;
  duration: number;
  phonemes: string;
}

export interface ChunkedStreamStatus extends StreamStatus {
  currentChunk: number;
  totalChunks: number;
  overallProgress: number;
  phase: 'generating' | 'playing';
  generationProgress: number; // 0-1 during generation phase
  chunks: string[]; // Array of text chunks for UI highlighting
  chunkStates: ('pending' | 'generating' | 'playing' | 'completed')[]; // State of each chunk
}

/**
 * Split text into optimized chunks for TTS processing
 * First chunk is smaller for faster initial audio response
 * Subsequent chunks combine multiple sentences to reduce inference calls
 */
export function splitTextIntoChunks(text: string): string[] {
  if (!text) {
    return [];
  }

  // Clean and normalize text
  const cleanText = text.trim().replace(/\s+/g, ' ');

  // If text is short enough, return as single chunk
  if (cleanText.length <= FIRST_CHUNK_CHAR_LENGTH) {
    return [cleanText];
  }

  // Split by sentence boundaries (., !, ?)
  const sentences = cleanText.split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Combine sentences into chunks - first chunk smaller for faster first audio
  const chunks: string[] = [];
  let currentChunk = '';
  let isFirstChunk = true;

  for (const sentence of sentences) {
    // Use smaller target for first chunk, normal for subsequent
    const targetSize = isFirstChunk ? FIRST_CHUNK_CHAR_LENGTH : OPTIMAL_CHUNK_CHAR_LENGTH;

    // If adding this sentence would exceed max, start a new chunk
    if (currentChunk.length + sentence.length + 1 > MAX_CHUNK_CHAR_LENGTH) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        isFirstChunk = false;
      }
      // If single sentence is too long, split it further
      if (sentence.length > MAX_CHUNK_CHAR_LENGTH) {
        // Split long sentence by clauses (commas, semicolons)
        const clauses = sentence.split(/(?<=[,;])\s+/);
        let clauseChunk = '';
        for (const clause of clauses) {
          if (clauseChunk.length + clause.length + 1 > MAX_CHUNK_CHAR_LENGTH) {
            if (clauseChunk) {
              chunks.push(clauseChunk.trim());
              isFirstChunk = false;
            }
            clauseChunk = clause;
          } else {
            clauseChunk = clauseChunk ? `${clauseChunk} ${clause}` : clause;
          }
        }
        if (clauseChunk) currentChunk = clauseChunk;
      } else {
        currentChunk = sentence;
      }
    } else {
      // Add sentence to current chunk
      currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    }

    // If we've reached target size, consider starting new chunk at next sentence
    if (currentChunk.length >= targetSize) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
      isFirstChunk = false;
    }
  }

  // Don't forget the last chunk
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [cleanText];
}

// Simple hash function for caching
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

class KokoroOnnx {
  private session: InferenceSession | null = null;
  private isModelLoaded: boolean = false;
  private isModelLoading: boolean = false; // Prevent concurrent loads
  private voiceCache: Map<string, Float32Array> = new Map();
  private isOnnxAvailable: boolean = true;
  private currentModelId: string | null = null;
  private isStreaming: boolean = false;
  private streamingSound: Audio.Sound | null = null;
  private streamingStartTime: number | null = null;
  private tokensProcessed: number = 0;
  private _tokensPerSecond: number = 0;
  private _timeToFirstToken: number = 0;
  private streamingTokens: number[] = [];
  private streamingPhonemes: string = "";
  private streamingCallback: ((status: StreamStatus) => void) | null = null;
  // Audio cache: key = hash(text + voiceId + speed), value = cached audio data
  // Supports progressive caching - chunks are saved as they're generated
  private audioCache: Map<string, {
    chunks: string[];      // Text chunks (for verification)
    uris: string[];        // Generated audio URIs (filled progressively)
    complete: boolean;     // True when all chunks have been generated
  }> = new Map();
  // Pre-warmed state
  private isPreWarmed: boolean = false;
  private preWarmPromise: Promise<boolean> | null = null;

  constructor() {
    // Initialize
  }

  /**
   * Pre-warm the TTS engine for faster first response
   * Call this at app startup to load model and default voice in background
   */
  async preWarm(modelId: string = 'model_q8f16.onnx', voiceId: string = 'af_bella'): Promise<boolean> {
    // If already pre-warming, return the existing promise
    if (this.preWarmPromise) {
      return this.preWarmPromise;
    }

    // If already pre-warmed with same model, skip
    if (this.isPreWarmed && this.currentModelId === modelId) {
      console.log('[TTS] Already pre-warmed');
      return true;
    }

    this.preWarmPromise = this._doPreWarm(modelId, voiceId);
    return this.preWarmPromise;
  }

  private async _doPreWarm(modelId: string, voiceId: string): Promise<boolean> {
    console.log('[TTS] Pre-warming TTS engine...');
    const startTime = Date.now();

    try {
      // 1. Load model
      const modelLoaded = await this.loadModel(modelId);
      if (!modelLoaded) {
        console.error('[TTS] Pre-warm failed: could not load model');
        return false;
      }

      // 2. Pre-load default voice
      await this.downloadVoice(voiceId);
      await getVoiceData(voiceId);

      this.isPreWarmed = true;
      const elapsed = Date.now() - startTime;
      console.log(`[TTS] Pre-warm complete in ${elapsed}ms`);

      return true;
    } catch (error) {
      console.error('[TTS] Pre-warm failed:', error);
      return false;
    } finally {
      this.preWarmPromise = null;
    }
  }

  /**
   * Check if TTS is pre-warmed and ready for immediate use
   */
  isReady(): boolean {
    return this.isPreWarmed && this.isModelLoaded && this.session !== null;
  }

  /**
   * Check if ONNX runtime is available on this platform
   */
  checkOnnxAvailability(): boolean {
    try {
      if (typeof InferenceSession === 'undefined' || typeof InferenceSession.create !== 'function') {
        console.error('ONNX Runtime is not properly initialized');
        this.isOnnxAvailable = false;
        return false;
      }

      if (Platform.OS === 'web') {
        console.warn('ONNX Runtime may not be fully supported on web platform');
      }

      this.isOnnxAvailable = true;
      return true;
    } catch (error) {
      console.error('Error checking ONNX availability:', error);
      this.isOnnxAvailable = false;
      return false;
    }
  }

  /**
   * Load a specific ONNX model
   * Prevents concurrent loads and skips if same model is already loaded
   */
  async loadModel(modelId: string = 'model_q8f16.onnx'): Promise<boolean> {
    // Skip if already loaded with same model
    if (this.isModelLoaded && this.currentModelId === modelId && this.session) {
      console.log(`[TTS] Model ${modelId} already loaded, skipping`);
      return true;
    }

    // Prevent concurrent loads
    if (this.isModelLoading) {
      console.log('[TTS] Model is already loading, waiting...');
      // Wait for the current load to complete
      while (this.isModelLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isModelLoaded;
    }

    this.isModelLoading = true;

    try {
      if (!this.checkOnnxAvailability()) {
        console.error('[TTS] ONNX Runtime is not available on this platform');
        return false;
      }

      const modelPath = FileSystem.cacheDirectory + modelId;
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      if (!fileInfo.exists) {
        console.error('[TTS] Model file not found at', modelPath);
        return false;
      }

      console.log('[TTS] Creating inference session with model at:', modelPath);
      const loadStartTime = Date.now();

      const options: InferenceSession.SessionOptions = {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      };

      try {
        this.session = await InferenceSession.create(modelPath, options);
      } catch (optionsError) {
        console.warn('[TTS] Failed to create session with options, trying without options:', optionsError);
        this.session = await InferenceSession.create(modelPath);
      }

      if (!this.session) {
        console.error('[TTS] Failed to create inference session');
        return false;
      }

      this.isModelLoaded = true;
      this.currentModelId = modelId;
      const loadTime = Date.now() - loadStartTime;
      console.log(`[TTS] Model loaded successfully: ${modelId} in ${loadTime}ms`);
      return true;
    } catch (error) {
      console.error('[TTS] Error loading model:', error);

      if (error instanceof Error && error.message.includes('binding')) {
        console.error('[TTS] ONNX Runtime binding error. This may be due to incompatibility with the current platform.');
      }

      return false;
    } finally {
      this.isModelLoading = false;
    }
  }

  getCurrentModelId(): string | null {
    return this.currentModelId;
  }

  getTokensPerSecond(): number {
    return this._tokensPerSecond;
  }

  getTimeToFirstToken(): number {
    return this._timeToFirstToken;
  }

  isAudioStreaming(): boolean {
    return this.isStreaming;
  }

  getStreamingPhonemes(): string {
    return this.streamingPhonemes;
  }

  getIsModelLoaded(): boolean {
    return this.isModelLoaded;
  }

  async stopStreaming(): Promise<void> {
    if (this.streamingSound) {
      try {
        // Check if sound is actually loaded before trying to stop
        const status = await this.streamingSound.getStatusAsync();
        if (status.isLoaded) {
          await this.streamingSound.stopAsync();
          await this.streamingSound.unloadAsync();
        }
      } catch (error) {
        // Silently ignore - sound may have already been unloaded
        // This is expected when switching tabs during playback
      }
      this.streamingSound = null;
    }
    this.isStreaming = false;
    this.streamingStartTime = null;
    this.tokensProcessed = 0;
    this._tokensPerSecond = 0;
    this._timeToFirstToken = 0;
    this.streamingTokens = [];
    this.streamingPhonemes = "";
    this.streamingCallback = null;
  }

  async downloadVoice(voiceId: string): Promise<boolean> {
    try {
      const voiceDirPath = `${FileSystem.documentDirectory}voices`;
      const dirInfo = await FileSystem.getInfoAsync(voiceDirPath);

      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(voiceDirPath, { intermediates: true });
      }

      const voiceFilePath = `${voiceDirPath}/${voiceId}.bin`;
      const fileInfo = await FileSystem.getInfoAsync(voiceFilePath);

      if (fileInfo.exists) {
        console.log(`Voice ${voiceId} already exists locally`);
        return true;
      }

      const voiceUrl = `${VOICE_DATA_URL}/${voiceId}.bin`;
      console.log(`Downloading voice from ${voiceUrl}`);

      const downloadResult = await FileSystem.downloadAsync(
        voiceUrl,
        voiceFilePath
      );

      if (downloadResult.status === 200) {
        console.log(`Voice ${voiceId} downloaded successfully`);
        return true;
      } else {
        console.error(`Failed to download voice ${voiceId}: ${downloadResult.status}`);
        return false;
      }
    } catch (error) {
      console.error(`Error downloading voice ${voiceId}:`, error);
      return false;
    }
  }

  normalizeText(text: string): string {
    text = text.trim();
    text = text.replace(/\s+/g, ' ');
    text = text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    text = text.replace(/…/g, '...');

    // Remove parentheses and brackets (keep content)
    text = text.replace(/[()[\]{}]/g, '');

    // Handle prefix words that should JOIN together (hyphen removed, no space)
    text = text.replace(/\bre-([a-z])/gi, 're$1');  // re-apply → reapply
    text = text.replace(/\banti-([a-z])/gi, 'anti$1');  // anti-bacterial → antibacterial
    text = text.replace(/\bnon-([a-z])/gi, 'non$1');  // non-stick → nonstick
    text = text.replace(/\bpre-([a-z])/gi, 'pre$1');  // pre-existing → preexisting
    text = text.replace(/\bco-([a-z])/gi, 'co$1');  // co-worker → coworker

    // Handle common acronyms - spell them out
    text = text.replace(/\bAI\b/g, 'A I');
    text = text.replace(/\bUI\b/g, 'U I');
    text = text.replace(/\bAPI\b/g, 'A P I');
    text = text.replace(/\bURL\b/g, 'U R L');
    text = text.replace(/\bER\b/g, 'E R');  // Emergency Room
    text = text.replace(/\bICU\b/g, 'I C U');
    text = text.replace(/\bCPR\b/g, 'C P R');
    text = text.replace(/\bEMS\b/g, 'E M S');
    text = text.replace(/\bMD\b/g, 'M D');
    text = text.replace(/\bRN\b/g, 'R N');
    text = text.replace(/\bOTC\b/g, 'O T C');  // Over the counter
    text = text.replace(/\bBP\b/g, 'B P');  // Blood pressure
    text = text.replace(/\bHR\b/g, 'H R');  // Heart rate

    // Handle rating fractions like "1/10", "5/10", "10/10"
    text = text.replace(/(\d+)\/10\b/g, (_, num) => {
      return `${this.numberToWords(parseInt(num))} out of ten`;
    });

    // Handle other fractions like "1/2", "3/4"
    text = text.replace(/(\d+)\/(\d+)/g, (_, num, denom) => {
      return `${this.numberToWords(parseInt(num))} over ${this.numberToWords(parseInt(denom))}`;
    });

    // Handle emergency/special numbers (spell digit by digit)
    text = text.replace(/\b911\b/g, 'nine one one');
    text = text.replace(/\b811\b/g, 'eight one one');
    text = text.replace(/\b411\b/g, 'four one one');
    text = text.replace(/\b311\b/g, 'three one one');
    text = text.replace(/\b111\b/g, 'one one one');

    // Handle percentages
    text = text.replace(/(\d+)%/g, (_, num) => {
      return `${this.numberToWords(parseInt(num))} percent`;
    });

    // Handle temperatures (e.g., "98.6°F", "37°C")
    text = text.replace(/(\d+\.?\d*)°F/g, (_, num) => {
      return `${this.numberToWords(parseFloat(num))} degrees fahrenheit`;
    });
    text = text.replace(/(\d+\.?\d*)°C/g, (_, num) => {
      return `${this.numberToWords(parseFloat(num))} degrees celsius`;
    });

    // Handle time expressions (e.g., "2:30", "14:00")
    text = text.replace(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/g, (_, hours, minutes, ampm) => {
      const h = parseInt(hours);
      const m = parseInt(minutes);
      let result = this.numberToWords(h);
      if (m > 0) {
        result += m < 10 ? ` oh ${this.numberToWords(m)}` : ` ${this.numberToWords(m)}`;
      }
      if (ampm) {
        result += ` ${ampm.toLowerCase() === 'am' ? 'A M' : 'P M'}`;
      }
      return result;
    });

    // Handle ordinals (1st, 2nd, 3rd, etc.)
    text = text.replace(/(\d+)(st|nd|rd|th)\b/gi, (_, num) => {
      return this.numberToOrdinal(parseInt(num));
    });

    // Handle number ranges like "24-48" -> "24 to 48" (before standalone number conversion)
    text = text.replace(/(\d+)\s*[-–—]\s*(\d+)/g, (_, num1, num2) => {
      return `${num1} to ${num2}`;
    });

    // General fallback: convert ALL remaining hyphens/dashes between letters to spaces
    // Handles: ice-cold → ice cold, well-known → well known, over-the-counter → over the counter
    // Must come AFTER number ranges (24-48) and prefix joins (re-apply → reapply)
    text = text.replace(/([a-zA-Z])[-–—]([a-zA-Z])/g, '$1 $2');

    // Handle remaining standalone numbers
    text = text.replace(/\b(\d+\.?\d*)\b/g, (_, num) => {
      return this.numberToWords(parseFloat(num));
    });

    // Handle forward slash (used as "or")
    text = text.replace(/\//g, ' or ');

    // Handle other symbols
    text = text.replace(/&/g, ' and ');
    text = text.replace(/@/g, ' at ');
    text = text.replace(/#/g, ' number ');
    text = text.replace(/\+/g, ' plus ');
    text = text.replace(/=/g, ' equals ');
    text = text.replace(/</g, ' less than ');
    text = text.replace(/>/g, ' greater than ');
    text = text.replace(/\*/g, '');  // Remove asterisks
    text = text.replace(/_/g, ' ');  // Replace underscores with space
    text = text.replace(/\|/g, ' ');  // Replace pipes with space

    // Clean up multiple spaces
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  // Convert number to words
  private numberToWords(num: number): string {
    if (num === 0) return 'zero';
    if (isNaN(num)) return '';

    // Handle decimals
    if (num % 1 !== 0) {
      const parts = num.toString().split('.');
      const wholePart = parseInt(parts[0]);
      const decimalPart = parts[1];
      let result = wholePart === 0 ? 'zero' : this.numberToWords(wholePart);
      result += ' point';
      // Read decimal digits individually
      for (const digit of decimalPart) {
        result += ` ${this.digitToWord(parseInt(digit))}`;
      }
      return result;
    }

    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
                  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
                  'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (num < 0) return 'negative ' + this.numberToWords(-num);
    if (num < 20) return ones[num];
    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    }
    if (num < 1000) {
      return ones[Math.floor(num / 100)] + ' hundred' + (num % 100 ? ' ' + this.numberToWords(num % 100) : '');
    }
    if (num < 1000000) {
      return this.numberToWords(Math.floor(num / 1000)) + ' thousand' + (num % 1000 ? ' ' + this.numberToWords(num % 1000) : '');
    }
    if (num < 1000000000) {
      return this.numberToWords(Math.floor(num / 1000000)) + ' million' + (num % 1000000 ? ' ' + this.numberToWords(num % 1000000) : '');
    }
    return this.numberToWords(Math.floor(num / 1000000000)) + ' billion' + (num % 1000000000 ? ' ' + this.numberToWords(num % 1000000000) : '');
  }

  private digitToWord(digit: number): string {
    const digits = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    return digits[digit] || '';
  }

  private numberToOrdinal(num: number): string {
    const ordinals: Record<number, string> = {
      1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth',
      6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth',
      11: 'eleventh', 12: 'twelfth', 13: 'thirteenth', 14: 'fourteenth', 15: 'fifteenth',
      16: 'sixteenth', 17: 'seventeenth', 18: 'eighteenth', 19: 'nineteenth', 20: 'twentieth',
      21: 'twenty first', 22: 'twenty second', 23: 'twenty third', 24: 'twenty fourth',
      30: 'thirtieth', 40: 'fortieth', 50: 'fiftieth', 60: 'sixtieth', 70: 'seventieth',
      80: 'eightieth', 90: 'ninetieth', 100: 'one hundredth'
    };

    if (ordinals[num]) return ordinals[num];

    // Handle numbers like 31st, 42nd, etc.
    if (num > 20 && num < 100) {
      const tensDigit = Math.floor(num / 10) * 10;
      const onesDigit = num % 10;
      if (onesDigit === 0) {
        return ordinals[tensDigit] || `${this.numberToWords(num)}th`;
      }
      const tensWord = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'][Math.floor(num / 10)];
      return `${tensWord} ${ordinals[onesDigit] || this.numberToWords(onesDigit) + 'th'}`;
    }

    // Fallback
    return this.numberToWords(num) + 'th';
  }

  phonemize(text: string): string {
    text = this.normalizeText(text);
    const words = text.split(/\s+/);

    const phonemizedWords = words.map(word => {
      // Extract punctuation from the word
      const punctMatch = word.match(/^([.,!?;:'"]*)(.*?)([.,!?;:'"']*)$/);
      const leadingPunct = punctMatch?.[1] || '';
      const coreWord = punctMatch?.[2] || word;
      const trailingPunct = punctMatch?.[3] || '';

      // 1. First check for single uppercase letters (spelled-out acronyms like "A I")
      if (coreWord.length === 1 && /[A-Z]/.test(coreWord)) {
        const letterPhoneme = LETTER_PHONEMES[coreWord];
        if (letterPhoneme) {
          return leadingPunct + letterPhoneme + trailingPunct;
        }
      }

      const lowerWord = coreWord.toLowerCase();

      // 2. First try curated overrides (healthcare-specific, known good pronunciations)
      if (COMMON_WORD_PHONEMES[lowerWord]) {
        return leadingPunct + COMMON_WORD_PHONEMES[lowerWord] + trailingPunct;
      }

      // 3. Then try CMU Dictionary (124,926 words)
      let cmuPhonemes = (CMU_DICTIONARY as Record<string, string>)[lowerWord];
      if (cmuPhonemes) {
        // Fix rhotic vowels for better Kokoro compatibility
        cmuPhonemes = cmuPhonemes.replace(/ɝ/g, 'ɜɹ').replace(/ɚ/g, 'əɹ');
        return leadingPunct + cmuPhonemes + trailingPunct;
      }

      // 4. Fallback: character-by-character phonemization
      let phonemes = '';
      let i = 0;

      while (i < coreWord.length) {
        if (i < coreWord.length - 1) {
          const digraph = coreWord.substring(i, i + 2).toLowerCase();
          if (ENGLISH_PHONEME_MAP[digraph]) {
            phonemes += ENGLISH_PHONEME_MAP[digraph];
            i += 2;
            continue;
          }
        }

        const char = coreWord[i].toLowerCase();
        if (ENGLISH_PHONEME_MAP[char]) {
          phonemes += ENGLISH_PHONEME_MAP[char];
        } else if (/[a-z]/.test(char)) {
          phonemes += char;
        } else if (/[.,!?;:'"]/g.test(char)) {
          phonemes += char;
        }

        i++;
      }

      // Add stress marker for unknown words
      if (phonemes.length > 2 && !/[.,!?;:'"]/g.test(phonemes)) {
        const firstVowelMatch = phonemes.match(/[ɑɐɒæəɘɚɛɜɝɞɨɪʊʌɔoeiuaɑː]/);
        if (firstVowelMatch && firstVowelMatch.index !== undefined) {
          const vowelIndex = firstVowelMatch.index;
          phonemes = phonemes.substring(0, vowelIndex) + 'ˈ' + phonemes.substring(vowelIndex);
        }
      }

      return leadingPunct + phonemes + trailingPunct;
    });

    return phonemizedWords.join(' ');
  }

  tokenize(phonemes: string): number[] {
    if (!/[ɑɐɒæəɘɚɛɜɝɞɨɪʊʌɔˈˌː]/.test(phonemes)) {
      phonemes = this.phonemize(phonemes);
    }

    console.log('Phonemized text:', phonemes);
    this.streamingPhonemes = phonemes;

    const tokens: number[] = [];
    tokens.push(0);

    for (const char of phonemes) {
      if (VOCAB[char] !== undefined) {
        tokens.push(VOCAB[char]);
      } else {
        console.warn(`Character not in vocabulary: "${char}" (code: ${char.charCodeAt(0)})`);
      }
    }

    tokens.push(0);
    return tokens;
  }

  async generateAudio(text: string, voiceId: string = 'af_heart', speed: number = 1.0): Promise<Audio.Sound> {
    if (!this.isOnnxAvailable) {
      throw new Error('ONNX Runtime is not available on this platform');
    }

    if (!this.isModelLoaded || !this.session) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    try {
      await this.downloadVoice(voiceId);

      const tokens = this.tokenize(text);
      const numTokens = Math.min(Math.max(tokens.length - 2, 0), 509);

      const voiceData = await getVoiceData(voiceId);
      const offset = numTokens * STYLE_DIM;
      const styleData = voiceData.slice(offset, offset + STYLE_DIM);

      const inputs: Record<string, Tensor> = {};

      try {
        inputs['input_ids'] = new Tensor('int64', new Int32Array(tokens), [1, tokens.length]);
      } catch (error) {
        inputs['input_ids'] = new Tensor('int64', tokens, [1, tokens.length]);
      }

      inputs['style'] = new Tensor('float32', new Float32Array(styleData), [1, STYLE_DIM]);
      inputs['speed'] = new Tensor('float32', new Float32Array([speed]), [1]);

      console.log('Running inference with inputs:', {
        tokens_length: tokens.length,
        style_length: styleData.length,
        speed
      });

      const outputs = await this.session.run(inputs);

      if (!outputs || !outputs['waveform'] || !outputs['waveform'].data) {
        throw new Error('Invalid output from model inference');
      }

      const waveform = outputs['waveform'].data as Float32Array;
      console.log('Generated waveform with length:', waveform.length);

      const audioUri = await this._floatArrayToAudioFile(waveform);

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false }
      );

      return sound;
    } catch (error) {
      console.error('Error generating audio:', error);
      throw error;
    }
  }

  async streamAudio(
    text: string,
    voiceId: string = 'af_heart',
    speed: number = 1.0,
    onProgress: ((status: StreamStatus) => void) | null = null
  ): Promise<{ tokensPerSecond: number; timeToFirstToken: number; totalTokens: number }> {
    if (this.isStreaming) {
      await this.stopStreaming();
    }

    if (!this.isOnnxAvailable) {
      throw new Error('ONNX Runtime is not available on this platform');
    }

    if (!this.isModelLoaded || !this.session) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    try {
      this.isStreaming = true;
      this.streamingStartTime = Date.now();
      this.tokensProcessed = 0;
      this._timeToFirstToken = 0;
      this.streamingTokens = [];
      this.streamingPhonemes = "";
      this.streamingCallback = onProgress;

      await this.downloadVoice(voiceId);

      const tokens = this.tokenize(text);
      this.streamingTokens = tokens;
      const numTokens = Math.min(Math.max(tokens.length - 2, 0), 509);
      this.tokensProcessed = numTokens;

      const voiceData = await getVoiceData(voiceId);
      const offset = numTokens * STYLE_DIM;
      const styleData = voiceData.slice(offset, offset + STYLE_DIM);

      const inputs: Record<string, Tensor> = {};

      try {
        inputs['input_ids'] = new Tensor('int64', new Int32Array(tokens), [1, tokens.length]);
      } catch (error) {
        inputs['input_ids'] = new Tensor('int64', tokens, [1, tokens.length]);
      }

      inputs['style'] = new Tensor('float32', new Float32Array(styleData), [1, STYLE_DIM]);
      inputs['speed'] = new Tensor('float32', new Float32Array([speed]), [1]);

      const inferenceStartTime = Date.now();
      const outputs = await this.session.run(inputs);

      this._timeToFirstToken = Date.now() - inferenceStartTime;

      const inferenceEndTime = Date.now();
      const inferenceTimeSeconds = (inferenceEndTime - inferenceStartTime) / 1000;
      this._tokensPerSecond = inferenceTimeSeconds > 0 ? numTokens / inferenceTimeSeconds : 0;

      if (!outputs || !outputs['waveform'] || !outputs['waveform'].data) {
        throw new Error('Invalid output from model inference');
      }

      const waveform = outputs['waveform'].data as Float32Array;
      const audioUri = await this._floatArrayToAudioFile(waveform);

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        (status) => {
          if (onProgress && status.isLoaded) {
            const progress = status.positionMillis / (status.durationMillis || 1);
            onProgress({
              progress,
              tokensPerSecond: this._tokensPerSecond,
              timeToFirstToken: this._timeToFirstToken,
              position: status.positionMillis,
              duration: status.durationMillis || 0,
              phonemes: this.streamingPhonemes
            });
          }

          if (status.isLoaded && status.didJustFinish) {
            this.isStreaming = false;
            this.streamingSound = null;
          }
        }
      );

      this.streamingSound = sound;

      return {
        tokensPerSecond: this._tokensPerSecond,
        timeToFirstToken: this._timeToFirstToken,
        totalTokens: numTokens
      };
    } catch (error) {
      this.isStreaming = false;
      console.error('Error streaming audio:', error);
      throw error;
    }
  }

  /**
   * Generate audio for a single chunk (internal helper)
   */
  private async _generateChunkAudio(
    chunk: string,
    voiceId: string,
    speed: number
  ): Promise<{ audioUri: string; numTokens: number; inferenceTime: number }> {
    const tokens = this.tokenize(chunk);
    const numTokens = Math.min(Math.max(tokens.length - 2, 0), 509);

    const voiceData = await getVoiceData(voiceId);
    const offset = numTokens * STYLE_DIM;
    const styleData = voiceData.slice(offset, offset + STYLE_DIM);

    const inputs: Record<string, Tensor> = {};

    try {
      inputs['input_ids'] = new Tensor('int64', new Int32Array(tokens), [1, tokens.length]);
    } catch (error) {
      inputs['input_ids'] = new Tensor('int64', tokens, [1, tokens.length]);
    }

    inputs['style'] = new Tensor('float32', new Float32Array(styleData), [1, STYLE_DIM]);
    inputs['speed'] = new Tensor('float32', new Float32Array([speed]), [1]);

    const inferenceStartTime = Date.now();
    const outputs = await this.session!.run(inputs);
    const inferenceTime = Date.now() - inferenceStartTime;

    if (!outputs || !outputs['waveform'] || !outputs['waveform'].data) {
      throw new Error('Invalid output from model inference');
    }

    const waveform = outputs['waveform'].data as Float32Array;
    const audioUri = await this._floatArrayToAudioFile(waveform);

    return { audioUri, numTokens, inferenceTime };
  }

  /**
   * Stream audio from chunked text with TRUE PIPELINE pattern:
   * - While chunk N plays, chunk N+1 generates in parallel
   * - Guarantees maximum overlap between playback and generation
   * - Uses 1-chunk lookahead buffer for seamless playback
   *
   * Timeline example (3 chunks):
   * t=0:    Generate chunk 1 (blocking)
   * t=G1:   Start generating chunk 2 (async) + Start playing chunk 1
   * t=G1+?: Chunk 2 ready (while chunk 1 still playing)
   * t=G1+P1: Chunk 1 finishes → Start generating chunk 3 (async) + Start playing chunk 2
   * t=...:  Chunk 3 ready (while chunk 2 still playing)
   * t=...:  Chunk 2 finishes → Start playing chunk 3
   */
  async streamChunkedAudio(
    text: string,
    voiceId: string = 'af_heart',
    speed: number = 1.0,
    onProgress: ((status: ChunkedStreamStatus) => void) | null = null
  ): Promise<{ tokensPerSecond: number; timeToFirstToken: number; totalTokens: number; totalChunks: number }> {
    if (this.isStreaming) {
      await this.stopStreaming();
    }

    if (!this.isOnnxAvailable) {
      throw new Error('ONNX Runtime is not available on this platform');
    }

    if (!this.isModelLoaded || !this.session) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    // Split text into optimized chunks (fewer, larger chunks)
    const chunks = splitTextIntoChunks(text);
    const totalChunks = chunks.length;

    console.log(`[TTS] Split text into ${totalChunks} chunks (optimized)`);
    chunks.forEach((c, i) => console.log(`[TTS]   Chunk ${i + 1}: ${c.length} chars`));

    if (totalChunks === 0) {
      return { tokensPerSecond: 0, timeToFirstToken: 0, totalTokens: 0, totalChunks: 0 };
    }

    this.isStreaming = true;
    let totalTokensProcessed = 0;
    let totalInferenceTime = 0;
    let firstChunkTimeToFirstToken = 0;

    // Create cache key
    const cacheKey = simpleHash(`${text}|${voiceId}|${speed}`);

    try {
      await this.downloadVoice(voiceId);

      // Check if we have COMPLETE cached audio - if so, just play it (instant playback)
      const existingCache = this.audioCache.get(cacheKey);
      if (existingCache?.complete && existingCache.uris.length === totalChunks) {
        console.log('[TTS] Using fully cached audio (instant playback)');
        const cachedChunkStates: ('pending' | 'generating' | 'playing' | 'completed')[] =
          chunks.map(() => 'pending');

        for (let i = 0; i < existingCache.uris.length; i++) {
          if (!this.isStreaming) break;
          await this._playChunk(existingCache.uris[i], i, totalChunks, onProgress, 0, 0, chunks, cachedChunkStates);
        }

        this.isStreaming = false;
        return { tokensPerSecond: 0, timeToFirstToken: 0, totalTokens: 0, totalChunks };
      }

      // Initialize or reuse partial cache - supports resuming from where we left off
      let cacheEntry = existingCache;
      if (!cacheEntry || cacheEntry.chunks.join('') !== chunks.join('')) {
        // No cache or chunks changed - start fresh
        cacheEntry = { chunks: [...chunks], uris: [], complete: false };
        this.audioCache.set(cacheKey, cacheEntry);
        console.log('[TTS] Starting fresh cache entry');
      } else {
        console.log(`[TTS] Found partial cache with ${cacheEntry.uris.length}/${totalChunks} chunks`);
      }

      // ═══════════════════════════════════════════════════════════════
      // TRUE PIPELINE: Generate N+1 while playing N
      // ═══════════════════════════════════════════════════════════════

      const firstChunkStartTime = Date.now();
      console.log(`[TTS] Pipeline mode: generate while playing...`);

      // Initialize chunk states - all pending except first which is generating
      const chunkStates: ('pending' | 'generating' | 'playing' | 'completed')[] =
        chunks.map((_, i) => i === 0 ? 'generating' : 'pending');

      // Report initial generating state
      if (onProgress) {
        onProgress({
          progress: 0, tokensPerSecond: 0, timeToFirstToken: 0,
          position: 0, duration: 0, phonemes: '',
          currentChunk: 1, totalChunks, overallProgress: 0,
          phase: 'generating', generationProgress: 0,
          chunks, chunkStates: [...chunkStates],
        });
      }

      // Helper: Get or generate chunk audio (uses cache if available)
      const getOrGenerateChunk = async (chunkIndex: number): Promise<{ audioUri: string; numTokens: number; inferenceTime: number; fromCache: boolean }> => {
        // Check if this chunk is already cached
        if (cacheEntry.uris[chunkIndex]) {
          console.log(`[TTS] Using cached chunk ${chunkIndex + 1}/${totalChunks}`);
          return { audioUri: cacheEntry.uris[chunkIndex], numTokens: 0, inferenceTime: 0, fromCache: true };
        }

        // Generate the chunk
        const result = await this._generateChunkAudio(chunks[chunkIndex], voiceId, speed);

        // PROGRESSIVE CACHING: Save immediately after generation
        cacheEntry.uris[chunkIndex] = result.audioUri;
        console.log(`[TTS] Chunk ${chunkIndex + 1} cached (progressive)`);

        return { ...result, fromCache: false };
      };

      // Generate first chunk (must wait for this before any playback)
      console.log(`[TTS] Getting chunk 1/${totalChunks}...`);
      let currentAudio = await getOrGenerateChunk(0);
      if (!currentAudio.fromCache) {
        totalTokensProcessed += currentAudio.numTokens;
        totalInferenceTime += currentAudio.inferenceTime;
        firstChunkTimeToFirstToken = currentAudio.inferenceTime;
      }

      console.log(`[TTS] Chunk 1 ready ${currentAudio.fromCache ? '(from cache)' : `in ${currentAudio.inferenceTime}ms`}`);

      // Lookahead: start generating/fetching next chunk BEFORE playing current
      type GenResult = { audioUri: string; numTokens: number; inferenceTime: number; fromCache: boolean };
      let nextChunkPromise: Promise<GenResult> | null = null;

      // Start getting chunk 2 (if exists) before playing chunk 1
      if (totalChunks > 1) {
        console.log(`[TTS] Starting lookahead: chunk 2/${totalChunks}...`);
        nextChunkPromise = getOrGenerateChunk(1);
      }

      // Now play chunks in a pipeline: play N while N+1 generates
      for (let i = 0; i < totalChunks; i++) {
        if (!this.isStreaming) break;

        const avgTokensPerSecond = totalInferenceTime > 0
          ? totalTokensProcessed / (totalInferenceTime / 1000)
          : 0;

        console.log(`[TTS] Playing chunk ${i + 1}/${totalChunks} (${nextChunkPromise ? 'next generating' : 'last chunk'})...`);

        // Update state: next chunk starts generating (if applicable)
        if (i + 1 < totalChunks && chunkStates[i + 1] === 'pending') {
          chunkStates[i + 1] = 'generating';
        }

        // Play current chunk (while next chunk generates in parallel on JS event loop)
        await this._playChunk(
          currentAudio.audioUri,
          i,
          totalChunks,
          onProgress,
          avgTokensPerSecond,
          firstChunkTimeToFirstToken,
          chunks,
          chunkStates
        );

        // Prepare for next iteration
        if (i + 1 < totalChunks) {
          // Wait for the lookahead chunk (should be ready or almost ready)
          if (nextChunkPromise) {
            // Send callback showing we're waiting for next chunk (generating state visible)
            // At this point: current chunk is 'completed', next chunk is 'generating'
            if (onProgress) {
              const avgTokensPerSecond = totalInferenceTime > 0
                ? totalTokensProcessed / (totalInferenceTime / 1000)
                : 0;
              onProgress({
                progress: 0,
                status: 'generating',
                position: 0,
                duration: 0,
                phonemes: '',
                avgTokensPerSecond,
                timeToFirstToken: firstChunkTimeToFirstToken,
                currentChunk: i + 2, // Next chunk (1-indexed)
                totalChunks,
                overallProgress: (i + 1) / totalChunks,
                phase: 'generating',
                generationProgress: 0.5, // Indeterminate progress
                chunks,
                chunkStates: [...chunkStates],
              });
            }

            const nextResult = await nextChunkPromise;
            if (!nextResult.fromCache) {
              totalTokensProcessed += nextResult.numTokens;
              totalInferenceTime += nextResult.inferenceTime;
            }
            currentAudio = nextResult;

            console.log(`[TTS] Chunk ${i + 2} ready ${nextResult.fromCache ? '(from cache)' : `(${nextResult.inferenceTime}ms inference)`}`);
          }

          // Start getting the chunk AFTER next (lookahead for next iteration)
          // This ensures chunk N+2 generates while chunk N+1 plays
          if (i + 2 < totalChunks) {
            console.log(`[TTS] Starting lookahead: chunk ${i + 3}/${totalChunks}...`);
            nextChunkPromise = getOrGenerateChunk(i + 2);
          } else {
            nextChunkPromise = null;
          }
        }
      }

      // Mark cache as complete if all chunks were generated
      if (cacheEntry.uris.length === totalChunks && cacheEntry.uris.every(uri => uri)) {
        cacheEntry.complete = true;
        console.log('[TTS] Cache marked complete for future instant playback');
      }

      this.isStreaming = false;

      const totalTime = Date.now() - firstChunkStartTime;
      const avgTokensPerSecond = totalInferenceTime > 0
        ? totalTokensProcessed / (totalInferenceTime / 1000)
        : 0;

      console.log(`[TTS] Complete in ${totalTime}ms (first audio at ${firstChunkTimeToFirstToken}ms, avg ${avgTokensPerSecond.toFixed(1)} tok/s)`);

      return {
        tokensPerSecond: avgTokensPerSecond,
        timeToFirstToken: firstChunkTimeToFirstToken,
        totalTokens: totalTokensProcessed,
        totalChunks,
      };
    } catch (error) {
      this.isStreaming = false;
      console.error('[TTS] Error streaming chunked audio:', error);
      throw error;
    }
  }

  /**
   * Play a single audio chunk (internal helper)
   */
  private async _playChunk(
    audioUri: string,
    chunkIndex: number,
    totalChunks: number,
    onProgress: ((status: ChunkedStreamStatus) => void) | null,
    tokensPerSecond: number,
    timeToFirstToken: number,
    chunks: string[],
    chunkStates: ('pending' | 'generating' | 'playing' | 'completed')[]
  ): Promise<void> {
    // Update state: current chunk is now playing
    chunkStates[chunkIndex] = 'playing';

    // Stop any existing sound BEFORE creating new one to prevent overlap
    if (this.streamingSound) {
      try {
        await this.streamingSound.stopAsync();
        await this.streamingSound.unloadAsync();
      } catch {
        // Ignore cleanup errors
      }
      this.streamingSound = null;
    }

    // Create sound WITHOUT auto-play first, so we can store reference before playing
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: false }
    );

    // Store reference BEFORE starting playback (fixes race condition)
    this.streamingSound = sound;

    // Use Promise that resolves when playback finishes (via status callback)
    await new Promise<void>((resolve) => {
      let resolved = false;

      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      // Set up status callback - this is the proper way to detect playback completion
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!this.isStreaming) {
          // Playback was stopped externally
          safeResolve();
          return;
        }

        if (status.isLoaded) {
          const chunkProgress = status.positionMillis / (status.durationMillis || 1);
          const overallProgress = (chunkIndex + chunkProgress) / totalChunks;

          if (onProgress) {
            onProgress({
              progress: chunkProgress,
              tokensPerSecond,
              timeToFirstToken,
              position: status.positionMillis,
              duration: status.durationMillis || 0,
              phonemes: this.streamingPhonemes,
              currentChunk: chunkIndex + 1,
              totalChunks,
              overallProgress,
              phase: 'playing',
              generationProgress: 1,
              chunks,
              chunkStates: [...chunkStates],
            });
          }

          // Check if playback finished
          if (status.didJustFinish) {
            // Mark chunk as completed
            chunkStates[chunkIndex] = 'completed';

            // Send final callback with completed state
            if (onProgress) {
              onProgress({
                progress: 1,
                tokensPerSecond,
                timeToFirstToken,
                position: status.positionMillis || 0,
                duration: status.durationMillis || 0,
                phonemes: '',
                currentChunk: chunkIndex + 1,
                totalChunks,
                overallProgress: (chunkIndex + 1) / totalChunks,
                phase: 'playing',
                generationProgress: 1,
                chunks,
                chunkStates: [...chunkStates],
              });
            }

            safeResolve();
          }
        } else if (!status.isLoaded) {
          // Sound was unloaded (stopped externally)
          safeResolve();
        }
      });

      // Start playback
      sound.playAsync().catch(() => {
        safeResolve();
      });
    });

    // Cleanup after playback
    if (this.streamingSound === sound) {
      try {
        await sound.unloadAsync();
      } catch {
        // Ignore cleanup errors
      }
      this.streamingSound = null;
    }
  }

  /**
   * Clear the audio cache
   */
  clearAudioCache(): void {
    this.audioCache.clear();
    console.log('[TTS] Audio cache cleared');
  }

  /**
   * Get cache key for a text/voice/speed combination
   */
  getCacheKey(text: string, voiceId: string, speed: number): string {
    return simpleHash(`${text}|${voiceId}|${speed}`);
  }

  /**
   * Check if audio is already cached and ready for instant playback
   */
  isAudioCached(text: string, voiceId: string, speed: number): boolean {
    const cacheKey = this.getCacheKey(text, voiceId, speed);
    const cached = this.audioCache.get(cacheKey);
    return cached?.complete === true;
  }

  /**
   * Check if audio has partial cache (some chunks generated)
   */
  hasPartialCache(text: string, voiceId: string, speed: number): { hasPartial: boolean; cachedChunks: number; totalChunks: number } {
    const cacheKey = this.getCacheKey(text, voiceId, speed);
    const cached = this.audioCache.get(cacheKey);
    if (!cached) {
      return { hasPartial: false, cachedChunks: 0, totalChunks: 0 };
    }
    const cachedChunks = cached.uris.filter(uri => uri).length;
    return {
      hasPartial: cachedChunks > 0 && !cached.complete,
      cachedChunks,
      totalChunks: cached.chunks.length,
    };
  }

  /**
   * Pre-generate audio in the background without playing it.
   * Audio is cached for instant playback when speak() is called later.
   *
   * @param text - Text to generate audio for
   * @param voiceId - Voice to use
   * @param speed - Speech speed
   * @param onProgress - Optional progress callback
   * @returns Promise that resolves when generation is complete
   *
   * @example
   * // Pre-generate audio in background
   * await kokoroOnnx.preGenerateAudio("Hello world", "af_bella", 0.9);
   *
   * // Later, playback will be instant because audio is cached
   * await kokoroOnnx.streamChunkedAudio("Hello world", "af_bella", 0.9);
   */
  async preGenerateAudio(
    text: string,
    voiceId: string = 'af_bella',
    speed: number = 1.0,
    onProgress?: (progress: number, currentChunk: number, totalChunks: number) => void
  ): Promise<{ cached: boolean; totalChunks: number }> {
    if (!text.trim()) {
      return { cached: false, totalChunks: 0 };
    }

    const cacheKey = this.getCacheKey(text, voiceId, speed);

    // Already fully cached - skip generation
    const existingCache = this.audioCache.get(cacheKey);
    if (existingCache?.complete) {
      console.log('[TTS] Audio already cached, skipping pre-generation');
      return { cached: true, totalChunks: existingCache.uris.length };
    }

    // Ensure model is loaded
    if (!this.isModelLoaded || !this.session) {
      console.warn('[TTS] Cannot pre-generate: model not loaded');
      return { cached: false, totalChunks: 0 };
    }

    try {
      await this.downloadVoice(voiceId);

      // Split text into chunks
      const chunks = splitTextIntoChunks(text);
      const totalChunks = chunks.length;

      if (totalChunks === 0) {
        return { cached: false, totalChunks: 0 };
      }

      // Initialize or reuse cache entry
      let cacheEntry = existingCache;
      if (!cacheEntry || cacheEntry.chunks.join('') !== chunks.join('')) {
        cacheEntry = { chunks: [...chunks], uris: [], complete: false };
        this.audioCache.set(cacheKey, cacheEntry);
      }

      console.log(`[TTS] Pre-generating ${totalChunks} chunks in background...`);

      // Generate all chunks sequentially (no playback)
      for (let i = 0; i < totalChunks; i++) {
        // Skip if already cached
        if (cacheEntry.uris[i]) {
          console.log(`[TTS] Chunk ${i + 1}/${totalChunks} already cached, skipping`);
          continue;
        }

        // Check if we should abort (e.g., if streaming started)
        if (this.isStreaming) {
          console.log('[TTS] Pre-generation aborted: streaming started');
          return { cached: false, totalChunks: 0 };
        }

        const result = await this._generateChunkAudio(chunks[i], voiceId, speed);
        cacheEntry.uris[i] = result.audioUri;

        if (onProgress) {
          onProgress((i + 1) / totalChunks, i + 1, totalChunks);
        }

        console.log(`[TTS] Pre-generated chunk ${i + 1}/${totalChunks}`);
      }

      // Mark as complete
      cacheEntry.complete = true;
      console.log(`[TTS] Pre-generation complete: ${totalChunks} chunks cached`);

      return { cached: true, totalChunks };
    } catch (error) {
      console.error('[TTS] Pre-generation error:', error);
      return { cached: false, totalChunks: 0 };
    }
  }

  /**
   * Play cached audio instantly (for use after preGenerateAudio)
   * If not cached, falls back to streamChunkedAudio
   */
  async playCachedAudio(
    text: string,
    voiceId: string = 'af_bella',
    speed: number = 1.0,
    onProgress: ((status: ChunkedStreamStatus) => void) | null = null
  ): Promise<boolean> {
    const cacheKey = this.getCacheKey(text, voiceId, speed);
    const cached = this.audioCache.get(cacheKey);

    // If not fully cached, fall back to streaming (which will use partial cache if available)
    if (!cached?.complete) {
      console.log('[TTS] Audio not fully cached, falling back to streaming');
      await this.streamChunkedAudio(text, voiceId, speed, onProgress);
      return false;
    }

    if (this.isStreaming) {
      await this.stopStreaming();
    }

    this.isStreaming = true;
    const cachedUris = cached.uris;
    const totalChunks = cachedUris.length;

    // Use cached chunks for UI highlighting
    const chunks = cached.chunks;
    const chunkStates: ('pending' | 'generating' | 'playing' | 'completed')[] =
      chunks.map(() => 'pending');

    console.log(`[TTS] Playing cached audio instantly (${totalChunks} chunks)`);

    try {
      for (let i = 0; i < totalChunks; i++) {
        if (!this.isStreaming) break;
        await this._playChunk(cachedUris[i], i, totalChunks, onProgress, 0, 0, chunks, chunkStates);
      }

      this.isStreaming = false;
      return true;
    } catch (error) {
      this.isStreaming = false;
      console.error('[TTS] Error playing cached audio:', error);
      throw error;
    }
  }

  private async _floatArrayToAudioFile(floatArray: Float32Array): Promise<string> {
    try {
      const wavBuffer = this._floatArrayToWav(floatArray, SAMPLE_RATE);
      const base64Data = this._arrayBufferToBase64(wavBuffer);

      const tempFilePath = `${FileSystem.cacheDirectory}temp_audio_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(
        tempFilePath,
        base64Data,
        { encoding: FileSystem.EncodingType.Base64 }
      );

      console.log('Audio saved to:', tempFilePath);
      return tempFilePath;
    } catch (error) {
      console.error('Error converting float array to audio file:', error);
      throw error;
    }
  }

  private _arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private _floatArrayToWav(floatArray: Float32Array, sampleRate: number): ArrayBuffer {
    const numSamples = floatArray.length;
    const int16Array = new Int16Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      int16Array[i] = Math.max(-32768, Math.min(32767, Math.floor(floatArray[i] * 32767)));
    }

    const headerLength = 44;
    const dataLength = int16Array.length * 2;
    const buffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(buffer);

    // RIFF header
    view.setUint8(0, 'R'.charCodeAt(0));
    view.setUint8(1, 'I'.charCodeAt(0));
    view.setUint8(2, 'F'.charCodeAt(0));
    view.setUint8(3, 'F'.charCodeAt(0));
    view.setUint32(4, 36 + dataLength, true);

    // WAVE format
    view.setUint8(8, 'W'.charCodeAt(0));
    view.setUint8(9, 'A'.charCodeAt(0));
    view.setUint8(10, 'V'.charCodeAt(0));
    view.setUint8(11, 'E'.charCodeAt(0));

    // fmt subchunk
    view.setUint8(12, 'f'.charCodeAt(0));
    view.setUint8(13, 'm'.charCodeAt(0));
    view.setUint8(14, 't'.charCodeAt(0));
    view.setUint8(15, ' '.charCodeAt(0));
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    // data subchunk
    view.setUint8(36, 'd'.charCodeAt(0));
    view.setUint8(37, 'a'.charCodeAt(0));
    view.setUint8(38, 't'.charCodeAt(0));
    view.setUint8(39, 'a'.charCodeAt(0));
    view.setUint32(40, dataLength, true);

    for (let i = 0; i < numSamples; i++) {
      view.setInt16(headerLength + i * 2, int16Array[i], true);
    }

    return buffer;
  }
}

// Create a singleton instance
const kokoroInstance = new KokoroOnnx();

export default kokoroInstance;
