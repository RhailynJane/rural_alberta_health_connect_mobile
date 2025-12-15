import * as FileSystem from 'expo-file-system';

// Base URL for model downloads
const MODEL_BASE_URL = 'https://huggingface.co/onnx-community/Kokoro-82M-ONNX/resolve/main/onnx';

// Model options with their sizes and descriptions
export const MODELS = Object.freeze({
  'model.onnx': {
    name: 'Full Precision',
    size: '326 MB',
    sizeBytes: 326 * 1024 * 1024,
    description: 'Highest quality, largest size',
    url: `${MODEL_BASE_URL}/model.onnx`,
  },
  'model_fp16.onnx': {
    name: 'FP16',
    size: '163 MB',
    sizeBytes: 163 * 1024 * 1024,
    description: 'High quality, reduced size',
    url: `${MODEL_BASE_URL}/model_fp16.onnx`,
  },
  'model_q4.onnx': {
    name: 'Q4',
    size: '305 MB',
    sizeBytes: 305 * 1024 * 1024,
    description: 'Good quality, slightly reduced size',
    url: `${MODEL_BASE_URL}/model_q4.onnx`,
  },
  'model_q4f16.onnx': {
    name: 'Q4F16',
    size: '154 MB',
    sizeBytes: 154 * 1024 * 1024,
    description: 'Good quality, smaller size',
    url: `${MODEL_BASE_URL}/model_q4f16.onnx`,
  },
  'model_q8f16.onnx': {
    name: 'Q8F16 (Recommended)',
    size: '86 MB',
    sizeBytes: 86 * 1024 * 1024,
    description: 'Balanced quality and size',
    url: `${MODEL_BASE_URL}/model_q8f16.onnx`,
  },
  'model_quantized.onnx': {
    name: 'Quantized',
    size: '92.4 MB',
    sizeBytes: 92.4 * 1024 * 1024,
    description: 'Reduced quality, smaller size',
    url: `${MODEL_BASE_URL}/model_quantized.onnx`,
  },
  'model_uint8.onnx': {
    name: 'UINT8',
    size: '177 MB',
    sizeBytes: 177 * 1024 * 1024,
    description: 'Lower quality, reduced size',
    url: `${MODEL_BASE_URL}/model_uint8.onnx`,
  },
  'model_uint8f16.onnx': {
    name: 'UINT8F16',
    size: '177 MB',
    sizeBytes: 177 * 1024 * 1024,
    description: 'Lower quality, reduced size',
    url: `${MODEL_BASE_URL}/model_uint8f16.onnx`,
  },
});

export type ModelId = keyof typeof MODELS;

// Default model to use
export const DEFAULT_MODEL_ID: ModelId = 'model_q8f16.onnx';

/**
 * Check if a model is downloaded
 */
export const isModelDownloaded = async (modelId: ModelId): Promise<boolean> => {
  try {
    const modelPath = FileSystem.cacheDirectory + modelId;
    const fileInfo = await FileSystem.getInfoAsync(modelPath);
    return fileInfo.exists;
  } catch (error) {
    console.error('Error checking if model exists:', error);
    return false;
  }
};

/**
 * Get a list of downloaded models
 */
export const getDownloadedModels = async (): Promise<ModelId[]> => {
  try {
    const downloadedModels: ModelId[] = [];

    for (const modelId of Object.keys(MODELS) as ModelId[]) {
      const isDownloaded = await isModelDownloaded(modelId);
      if (isDownloaded) {
        downloadedModels.push(modelId);
      }
    }

    return downloadedModels;
  } catch (error) {
    console.error('Error getting downloaded models:', error);
    return [];
  }
};

/**
 * Download a model with progress callback
 */
export const downloadModel = async (
  modelId: ModelId,
  progressCallback: ((progress: number) => void) | null = null
): Promise<boolean> => {
  try {
    const model = MODELS[modelId];
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const modelPath = FileSystem.cacheDirectory + modelId;

    // Create download resumable
    const downloadResumable = FileSystem.createDownloadResumable(
      model.url,
      modelPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (progressCallback) {
          progressCallback(progress);
        }
      }
    );

    // Start download
    const result = await downloadResumable.downloadAsync();

    return !!result?.uri;
  } catch (error) {
    console.error('Error downloading model:', error);
    return false;
  }
};

/**
 * Delete a model
 */
export const deleteModel = async (modelId: ModelId): Promise<boolean> => {
  try {
    const modelPath = FileSystem.cacheDirectory + modelId;
    await FileSystem.deleteAsync(modelPath);
    return true;
  } catch (error) {
    console.error('Error deleting model:', error);
    return false;
  }
};

/**
 * Get model info
 */
export const getModelInfo = (modelId: ModelId) => {
  return MODELS[modelId];
};
