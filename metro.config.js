// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for .tflite files (TensorFlow Lite models)
config.resolver.assetExts.push("onnx");

// Fix @rnmapbox/maps module resolution to use native version
config.resolver.sourceExts = [
  'native.js',
  ...config.resolver.sourceExts,
];

console.log("[Metro Config] Asset extensions:", config.resolver.assetExts);
console.log("[Metro Config] Source extensions:", config.resolver.sourceExts);

module.exports = config;
