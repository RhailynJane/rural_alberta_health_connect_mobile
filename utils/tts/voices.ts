import * as FileSystem from 'expo-file-system/legacy';

export interface VoiceInfo {
  name: string;
  language: string;
  gender: 'Female' | 'Male';
  traits?: string;
  targetQuality: string;
  overallGrade: string;
}

export const VOICES: Record<string, VoiceInfo> = Object.freeze({
  af_heart: {
    name: "Heart",
    language: "en-us",
    gender: "Female",
    traits: "Warm, Calm",
    targetQuality: "A",
    overallGrade: "A",
  },
  af_alloy: {
    name: "Alloy",
    language: "en-us",
    gender: "Female",
    targetQuality: "B",
    overallGrade: "C",
  },
  af_aoede: {
    name: "Aoede",
    language: "en-us",
    gender: "Female",
    targetQuality: "B",
    overallGrade: "C+",
  },
  af_bella: {
    name: "Bella",
    language: "en-us",
    gender: "Female",
    traits: "Clear, Friendly",
    targetQuality: "A",
    overallGrade: "A-",
  },
  af_jessica: {
    name: "Jessica",
    language: "en-us",
    gender: "Female",
    targetQuality: "C",
    overallGrade: "D",
  },
  af_kore: {
    name: "Kore",
    language: "en-us",
    gender: "Female",
    targetQuality: "B",
    overallGrade: "C+",
  },
  af_nicole: {
    name: "Nicole",
    language: "en-us",
    gender: "Female",
    traits: "Professional",
    targetQuality: "B",
    overallGrade: "B-",
  },
  af_nova: {
    name: "Nova",
    language: "en-us",
    gender: "Female",
    targetQuality: "B",
    overallGrade: "C",
  },
  af_river: {
    name: "River",
    language: "en-us",
    gender: "Female",
    targetQuality: "C",
    overallGrade: "D",
  },
  af_sarah: {
    name: "Sarah",
    language: "en-us",
    gender: "Female",
    targetQuality: "B",
    overallGrade: "C+",
  },
  af_sky: {
    name: "Sky",
    language: "en-us",
    gender: "Female",
    targetQuality: "B",
    overallGrade: "C-",
  },
  am_adam: {
    name: "Adam",
    language: "en-us",
    gender: "Male",
    targetQuality: "D",
    overallGrade: "F+",
  },
  am_echo: {
    name: "Echo",
    language: "en-us",
    gender: "Male",
    targetQuality: "C",
    overallGrade: "D",
  },
  am_eric: {
    name: "Eric",
    language: "en-us",
    gender: "Male",
    targetQuality: "C",
    overallGrade: "D",
  },
  am_fenrir: {
    name: "Fenrir",
    language: "en-us",
    gender: "Male",
    targetQuality: "B",
    overallGrade: "C+",
  },
  am_liam: {
    name: "Liam",
    language: "en-us",
    gender: "Male",
    targetQuality: "C",
    overallGrade: "D",
  },
  am_michael: {
    name: "Michael",
    language: "en-us",
    gender: "Male",
    targetQuality: "B",
    overallGrade: "C+",
  },
  am_onyx: {
    name: "Onyx",
    language: "en-us",
    gender: "Male",
    targetQuality: "C",
    overallGrade: "D",
  },
  am_puck: {
    name: "Puck",
    language: "en-us",
    gender: "Male",
    targetQuality: "B",
    overallGrade: "C+",
  },
  am_santa: {
    name: "Santa",
    language: "en-us",
    gender: "Male",
    targetQuality: "C",
    overallGrade: "D-",
  },
  bf_emma: {
    name: "Emma",
    language: "en-gb",
    gender: "Female",
    traits: "British",
    targetQuality: "B",
    overallGrade: "B-",
  },
  bf_isabella: {
    name: "Isabella",
    language: "en-gb",
    gender: "Female",
    targetQuality: "B",
    overallGrade: "C",
  },
  bm_george: {
    name: "George",
    language: "en-gb",
    gender: "Male",
    targetQuality: "B",
    overallGrade: "C",
  },
  bm_lewis: {
    name: "Lewis",
    language: "en-gb",
    gender: "Male",
    targetQuality: "C",
    overallGrade: "D+",
  },
  bf_alice: {
    name: "Alice",
    language: "en-gb",
    gender: "Female",
    traits: "British",
    targetQuality: "C",
    overallGrade: "D",
  },
  bf_lily: {
    name: "Lily",
    language: "en-gb",
    gender: "Female",
    traits: "British",
    targetQuality: "C",
    overallGrade: "D",
  },
  bm_daniel: {
    name: "Daniel",
    language: "en-gb",
    gender: "Male",
    traits: "British",
    targetQuality: "C",
    overallGrade: "D",
  },
  bm_fable: {
    name: "Fable",
    language: "en-gb",
    gender: "Male",
    traits: "British",
    targetQuality: "B",
    overallGrade: "C",
  },
});

export type VoiceId = keyof typeof VOICES;

// Default voice - warm and calming for healthcare
export const DEFAULT_VOICE_ID: VoiceId = 'af_heart';

// Recommended voices for healthcare (A and A- grades)
export const RECOMMENDED_VOICES: VoiceId[] = ['af_heart', 'af_bella'];

const VOICE_DATA_URL = "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices";

function _arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function _base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getVoiceFile(id: VoiceId): Promise<ArrayBuffer> {
  try {
    const filePath = `${FileSystem.documentDirectory}voices/${id}.bin`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    if (fileInfo.exists) {
      const base64Data = await FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.Base64 });
      return _base64ToArrayBuffer(base64Data);
    }
  } catch (e) {
    console.warn("Unable to read from local file system", e);
  }

  try {
    const url = `${VOICE_DATA_URL}/${id}.bin`;

    let cache: Cache | undefined;
    try {
      cache = await caches.open("kokoro-voices");
      const cachedResponse = await cache.match(url);
      if (cachedResponse) {
        return await cachedResponse.arrayBuffer();
      }
    } catch (e) {
      // Cache API not available on native
    }

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    // Save to local storage
    try {
      const dirPath = `${FileSystem.documentDirectory}voices`;
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }

      const base64Data = _arrayBufferToBase64(buffer);
      await FileSystem.writeAsStringAsync(
        `${dirPath}/${id}.bin`,
        base64Data,
        { encoding: FileSystem.EncodingType.Base64 }
      );
    } catch (e) {
      console.warn("Unable to save voice file to local storage", e);
    }

    return buffer;
  } catch (e) {
    console.error("Failed to fetch voice file", e);
    throw e;
  }
}

const VOICE_CACHE = new Map<VoiceId, Float32Array>();

export async function getVoiceData(voice: VoiceId): Promise<Float32Array> {
  if (VOICE_CACHE.has(voice)) {
    return VOICE_CACHE.get(voice)!;
  }

  const buffer = new Float32Array(await getVoiceFile(voice));
  VOICE_CACHE.set(voice, buffer);
  return buffer;
}

/**
 * Check if a voice is downloaded locally
 */
export async function isVoiceDownloaded(voiceId: VoiceId): Promise<boolean> {
  try {
    const filePath = `${FileSystem.documentDirectory}voices/${voiceId}.bin`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists;
  } catch {
    return false;
  }
}

/**
 * Get voice info
 */
export function getVoiceInfo(voiceId: VoiceId): VoiceInfo {
  return VOICES[voiceId];
}
