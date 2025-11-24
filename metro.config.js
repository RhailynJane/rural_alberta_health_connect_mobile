// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for .tflite files (TensorFlow Lite models)
config.resolver.assetExts.push("tflite");
config.resolver.assetExts.push("onnx");

console.log("[Metro Config] Asset extensions:", config.resolver.assetExts);

module.exports = config;
