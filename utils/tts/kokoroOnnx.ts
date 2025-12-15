import * as FileSystem from 'expo-file-system/legacy';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { Audio } from 'expo-av';
import { VOICES, getVoiceData } from './voices';
import { Platform } from 'react-native';
import { MODELS } from './models';

// Constants
const SAMPLE_RATE = 24000;
const STYLE_DIM = 256;
const MAX_PHONEME_LENGTH = 510;

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
  'er': 'ɝ',
  'ar': 'ɑɹ',
  'or': 'ɔɹ',
  'ir': 'ɪɹ',
  'ur': 'ʊɹ',
};

// Common word to phoneme mappings
const COMMON_WORD_PHONEMES: Record<string, string> = {
  'hello': 'hɛˈloʊ',
  'world': 'wˈɝld',
  'this': 'ðˈɪs',
  'is': 'ˈɪz',
  'a': 'ə',
  'test': 'tˈɛst',
  'of': 'ʌv',
  'the': 'ðə',
  'kokoro': 'kˈoʊkəɹoʊ',
  'text': 'tˈɛkst',
  'to': 'tˈuː',
  'speech': 'spˈiːtʃ',
  'system': 'sˈɪstəm',
  'running': 'ɹˈʌnɪŋ',
  'on': 'ˈɑːn',
  'expo': 'ˈɛkspoʊ',
  'with': 'wˈɪð',
  'onnx': 'ˈɑːnɛks',
  'runtime': 'ɹˈʌntaɪm',
  // Healthcare-specific words
  'wound': 'wˈuːnd',
  'burn': 'bˈɝn',
  'injury': 'ˈɪndʒəɹi',
  'clean': 'klˈiːn',
  'water': 'wˈɔːtɝ',
  'bandage': 'bˈændɪdʒ',
  'doctor': 'dˈɑːktɝ',
  'medical': 'mˈɛdɪkəl',
  'care': 'kˈɛɹ',
  'seek': 'sˈiːk',
  'monitor': 'mˈɑːnɪtɝ',
  'fever': 'fˈiːvɝ',
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
  'hours': 'ˈaʊɝz',
  'day': 'dˈeɪ',
  'days': 'dˈeɪz',
  'step': 'stˈɛp',
  'first': 'fˈɝst',
  'second': 'sˈɛkənd',
  'next': 'nˈɛkst',
  'immediately': 'ɪmˈiːdiətli',
  'gently': 'dʒˈɛntli',
  'keep': 'kˈiːp',
  'avoid': 'əvˈɔɪd',
  'contact': 'kˈɑːntækt',
  'healthcare': 'hˈɛlθkɛɹ',
  'provider': 'pɹəvˈaɪdɝ',
  'emergency': 'ɪmˈɝdʒənsi',
};

export interface StreamStatus {
  progress: number;
  tokensPerSecond: number;
  timeToFirstToken: number;
  position: number;
  duration: number;
  phonemes: string;
}

class KokoroOnnx {
  private session: InferenceSession | null = null;
  private isModelLoaded: boolean = false;
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

  constructor() {
    // Initialize
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
   */
  async loadModel(modelId: string = 'model_q8f16.onnx'): Promise<boolean> {
    try {
      if (!this.checkOnnxAvailability()) {
        console.error('ONNX Runtime is not available on this platform');
        return false;
      }

      const modelPath = FileSystem.cacheDirectory + modelId;
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      if (!fileInfo.exists) {
        console.error('Model file not found at', modelPath);
        return false;
      }

      console.log('Creating inference session with model at:', modelPath);

      const options: InferenceSession.SessionOptions = {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      };

      try {
        this.session = await InferenceSession.create(modelPath, options);
      } catch (optionsError) {
        console.warn('Failed to create session with options, trying without options:', optionsError);
        this.session = await InferenceSession.create(modelPath);
      }

      if (!this.session) {
        console.error('Failed to create inference session');
        return false;
      }

      this.isModelLoaded = true;
      this.currentModelId = modelId;
      console.log('Model loaded successfully:', modelId);
      return true;
    } catch (error) {
      console.error('Error loading model:', error);

      if (error instanceof Error && error.message.includes('binding')) {
        console.error('ONNX Runtime binding error. This may be due to incompatibility with the current platform.');
      }

      return false;
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
        await this.streamingSound.stopAsync();
        await this.streamingSound.unloadAsync();
      } catch (error) {
        console.error('Error stopping streaming audio:', error);
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
    return text;
  }

  phonemize(text: string): string {
    text = this.normalizeText(text);
    const words = text.split(/\s+/);

    const phonemizedWords = words.map(word => {
      const lowerWord = word.toLowerCase().replace(/[.,!?;:'"]/g, '');
      if (COMMON_WORD_PHONEMES[lowerWord]) {
        return COMMON_WORD_PHONEMES[lowerWord];
      }

      let phonemes = '';
      let i = 0;

      while (i < word.length) {
        if (i < word.length - 1) {
          const digraph = word.substring(i, i + 2).toLowerCase();
          if (ENGLISH_PHONEME_MAP[digraph]) {
            phonemes += ENGLISH_PHONEME_MAP[digraph];
            i += 2;
            continue;
          }
        }

        const char = word[i].toLowerCase();
        if (ENGLISH_PHONEME_MAP[char]) {
          phonemes += ENGLISH_PHONEME_MAP[char];
        } else if (/[a-z]/.test(char)) {
          phonemes += char;
        } else if (/[.,!?;:'"]/g.test(char)) {
          phonemes += char;
        }

        i++;
      }

      if (phonemes.length > 2 && !/[.,!?;:'"]/g.test(phonemes)) {
        const firstVowelMatch = phonemes.match(/[ɑɐɒæəɘɚɛɜɝɞɨɪʊʌɔoeiuaɑː]/);
        if (firstVowelMatch && firstVowelMatch.index !== undefined) {
          const vowelIndex = firstVowelMatch.index;
          phonemes = phonemes.substring(0, vowelIndex) + 'ˈ' + phonemes.substring(vowelIndex);
        }
      }

      return phonemes;
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
