/**
 * YOLO Inference Module
 *
 * Wraps ONNX Runtime for model loading and inference.
 * Handles tensor creation and output extraction.
 */

// Lazy load ONNX runtime to prevent crashes if native module not available
let InferenceSession: any = null;
let Tensor: any = null;
let onnxAvailable = false;

try {
  const onnx = require('onnxruntime-react-native');
  InferenceSession = onnx.InferenceSession;
  Tensor = onnx.Tensor;
  onnxAvailable = true;
  console.log('✅ ONNX Runtime loaded successfully');
} catch (error) {
  console.warn('⚠️ ONNX Runtime not available - AI features will be disabled', error);
  onnxAvailable = false;
}

import { LOG_PREFIX, MODEL_CONFIG, YOLO_OUTPUT_INFO } from './constants';
import type { ModelConfig } from './types';

/**
 * YOLO Inference Session Manager
 *
 * Usage:
 * ```typescript
 * const yolo = new YoloInference();
 * await yolo.loadModel(modelUri);
 * const output = await yolo.runInference(inputTensor);
 * ```
 */
export class YoloInference {
  private session: InferenceSession | null = null;
  private config: ModelConfig;
  private inputName: string = '';
  private outputName: string = '';

  constructor(config: ModelConfig = MODEL_CONFIG) {
    this.config = config;
    
    if (!onnxAvailable) {
      console.error(`${LOG_PREFIX.INFERENCE} ONNX Runtime not available - YoloInference will not function`);
      return;
    }
    
    console.log(`${LOG_PREFIX.INFERENCE} YoloInference instance created`);
    console.log(`${LOG_PREFIX.INFERENCE}   Input size: ${config.inputWidth}x${config.inputHeight}`);
    console.log(`${LOG_PREFIX.INFERENCE}   Classes: ${config.classNames.join(', ')}`);
  }

  /**
   * Check if model is loaded and ready for inference
   */
  isModelLoaded(): boolean {
    return this.session !== null;
  }

  /**
   * Get input tensor name (after model is loaded)
   */
  getInputName(): string {
    return this.inputName;
  }

  /**
   * Get output tensor name (after model is loaded)
   */
  getOutputName(): string {
    return this.outputName;
  }

  /**
   * Load ONNX model from URI
   *
   * @param modelUri - Local file URI to the .onnx model
   * @throws Error if model fails to load
   *
   * @example
   * const assets = await Asset.loadAsync(require('@/assets/weights.onnx'));
   * await yolo.loadModel(assets[0].localUri);
   */
  async loadModel(modelUri: string): Promise<void> {
    if (!onnxAvailable || !InferenceSession) {
      throw new Error('ONNX Runtime is not available. Please rebuild the app with native dependencies.');
    }
    
    console.log(`${LOG_PREFIX.INFERENCE} ========================================`);
    console.log(`${LOG_PREFIX.INFERENCE} Loading ONNX model`);
    console.log(`${LOG_PREFIX.INFERENCE} ========================================`);
    console.log(`${LOG_PREFIX.INFERENCE} Model URI: ${modelUri}`);

    const startTime = Date.now();

    try {
      this.session = await InferenceSession.create(modelUri);

      const loadTime = Date.now() - startTime;
      console.log(`${LOG_PREFIX.INFERENCE} ✅ Model loaded in ${loadTime}ms`);

      // Extract input/output names
      this.inputName = this.session.inputNames[0];
      this.outputName = this.session.outputNames[0];

      console.log(`${LOG_PREFIX.INFERENCE} Model details:`);
      console.log(`${LOG_PREFIX.INFERENCE}   Input names: ${JSON.stringify(this.session.inputNames)}`);
      console.log(`${LOG_PREFIX.INFERENCE}   Output names: ${JSON.stringify(this.session.outputNames)}`);
      console.log(`${LOG_PREFIX.INFERENCE}   Primary input: "${this.inputName}"`);
      console.log(`${LOG_PREFIX.INFERENCE}   Primary output: "${this.outputName}"`);
    } catch (error) {
      console.error(`${LOG_PREFIX.INFERENCE} ❌ Failed to load model:`, error);
      throw new Error(`Failed to load ONNX model: ${error}`);
    }
  }

  /**
   * Run inference on preprocessed input tensor
   *
   * @param inputTensor - Float32Array of shape [1, 3, 640, 640] flattened
   * @returns Float32Array of shape [1, 7, 8400] flattened
   * @throws Error if model not loaded or inference fails
   *
   * @example
   * const input = new Float32Array(1 * 3 * 640 * 640);
   * // ... fill input with preprocessed image data ...
   * const output = await yolo.runInference(input);
   */
  async runInference(inputTensor: Float32Array): Promise<Float32Array> {
    if (!this.session) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    const { inputWidth, inputHeight } = this.config;
    const expectedInputLength = 1 * 3 * inputWidth * inputHeight;

    console.log(`${LOG_PREFIX.INFERENCE} ========================================`);
    console.log(`${LOG_PREFIX.INFERENCE} Running inference`);
    console.log(`${LOG_PREFIX.INFERENCE} ========================================`);
    console.log(`${LOG_PREFIX.INFERENCE} Input tensor length: ${inputTensor.length}`);
    console.log(`${LOG_PREFIX.INFERENCE} Expected length: ${expectedInputLength}`);

    if (inputTensor.length !== expectedInputLength) {
      throw new Error(
        `Input tensor size mismatch. Got ${inputTensor.length}, expected ${expectedInputLength}`
      );
    }

    // Log input stats for debugging
    let min = Infinity, max = -Infinity, sum = 0;
    for (let i = 0; i < inputTensor.length; i++) {
      const v = inputTensor[i];
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
    }
    const mean = sum / inputTensor.length;

    console.log(`${LOG_PREFIX.INFERENCE} Input stats:`);
    console.log(`${LOG_PREFIX.INFERENCE}   Min: ${min.toFixed(4)}`);
    console.log(`${LOG_PREFIX.INFERENCE}   Max: ${max.toFixed(4)}`);
    console.log(`${LOG_PREFIX.INFERENCE}   Mean: ${mean.toFixed(4)}`);
    console.log(`${LOG_PREFIX.INFERENCE}   First 5 values: [${Array.from(inputTensor.slice(0, 5)).map(v => v.toFixed(4)).join(', ')}]`);

    // Create ONNX tensor
    console.log(`${LOG_PREFIX.INFERENCE} Creating ONNX tensor with shape [1, 3, ${inputHeight}, ${inputWidth}]`);
    const tensor = new Tensor(inputTensor, [1, 3, inputHeight, inputWidth]);

    // Prepare feeds
    const feeds: Record<string, Tensor> = {};
    feeds[this.inputName] = tensor;

    // Run inference
    console.log(`${LOG_PREFIX.INFERENCE} Running model.run()...`);
    const startTime = Date.now();

    const results = await this.session.run(feeds);

    const inferenceTime = Date.now() - startTime;
    console.log(`${LOG_PREFIX.INFERENCE} ✅ Inference completed in ${inferenceTime}ms`);

    // Extract output
    const output = results[this.outputName];

    if (!output) {
      throw new Error(`Failed to get output tensor "${this.outputName}"`);
    }

    console.log(`${LOG_PREFIX.INFERENCE} Output details:`);
    console.log(`${LOG_PREFIX.INFERENCE}   Type: ${output.type}`);
    console.log(`${LOG_PREFIX.INFERENCE}   Shape: [${output.dims.join(', ')}]`);
    console.log(`${LOG_PREFIX.INFERENCE}   Data length: ${output.data.length}`);

    // Validate output shape
    const expectedShape = [1, YOLO_OUTPUT_INFO.numFeatures, YOLO_OUTPUT_INFO.numPredictions];
    const actualShape = output.dims;

    if (
      actualShape[0] !== expectedShape[0] ||
      actualShape[1] !== expectedShape[1] ||
      actualShape[2] !== expectedShape[2]
    ) {
      console.warn(`${LOG_PREFIX.INFERENCE} ⚠️ Output shape mismatch!`);
      console.warn(`${LOG_PREFIX.INFERENCE}   Expected: [${expectedShape.join(', ')}]`);
      console.warn(`${LOG_PREFIX.INFERENCE}   Got: [${actualShape.join(', ')}]`);
    }

    // Log output stats
    const outputData = output.data as Float32Array;
    let oMin = Infinity, oMax = -Infinity;
    for (let i = 0; i < outputData.length; i++) {
      if (outputData[i] < oMin) oMin = outputData[i];
      if (outputData[i] > oMax) oMax = outputData[i];
    }

    console.log(`${LOG_PREFIX.INFERENCE} Output stats:`);
    console.log(`${LOG_PREFIX.INFERENCE}   Min: ${oMin.toFixed(4)}`);
    console.log(`${LOG_PREFIX.INFERENCE}   Max: ${oMax.toFixed(4)}`);
    console.log(`${LOG_PREFIX.INFERENCE}   First 10 values: [${Array.from(outputData.slice(0, 10)).map(v => v.toFixed(4)).join(', ')}]`);

    return outputData;
  }

  /**
   * Create a dummy input tensor for testing
   * Useful to verify model loads and runs without real image preprocessing
   *
   * @returns Float32Array filled with random values [0, 1]
   */
  createDummyInput(): Float32Array {
    const { inputWidth, inputHeight } = this.config;
    const size = 1 * 3 * inputWidth * inputHeight;

    console.log(`${LOG_PREFIX.INFERENCE} Creating dummy input tensor`);
    console.log(`${LOG_PREFIX.INFERENCE}   Shape: [1, 3, ${inputHeight}, ${inputWidth}]`);
    console.log(`${LOG_PREFIX.INFERENCE}   Size: ${size} floats`);

    const tensor = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      tensor[i] = Math.random();
    }

    return tensor;
  }

  /**
   * Dispose of the inference session and free resources
   */
  dispose(): void {
    if (this.session) {
      console.log(`${LOG_PREFIX.INFERENCE} Disposing inference session`);
      this.session = null;
    }
  }
}

/**
 * Singleton instance for convenience
 * Use this if you only need one model loaded at a time
 */
let defaultInstance: YoloInference | null = null;

export function getDefaultYoloInference(): YoloInference {
  if (!defaultInstance) {
    defaultInstance = new YoloInference();
  }
  return defaultInstance;
}

/**
 * Test function to verify inference works with dummy data
 */
export async function testInference(modelUri: string): Promise<void> {
  console.log('\n🧪 Testing YOLO Inference...\n');

  const yolo = new YoloInference();

  try {
    // Load model
    await yolo.loadModel(modelUri);
    console.log('✅ Model loaded successfully\n');

    // Create dummy input
    const input = yolo.createDummyInput();
    console.log('✅ Dummy input created\n');

    // Run inference
    const output = await yolo.runInference(input);
    console.log('✅ Inference completed\n');

    // Verify output shape
    const expectedLength = YOLO_OUTPUT_INFO.numFeatures * YOLO_OUTPUT_INFO.numPredictions;
    if (output.length === expectedLength) {
      console.log(`✅ Output shape correct: ${output.length} = 7 * 8400`);
    } else {
      console.log(`❌ Output shape incorrect: ${output.length} (expected ${expectedLength})`);
    }

    console.log('\n🧪 Inference test complete!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    yolo.dispose();
  }
}
