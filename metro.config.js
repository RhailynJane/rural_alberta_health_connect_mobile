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

// Enable SVG support via react-native-svg-transformer if available
try {
  const transformerPath = require.resolve('react-native-svg-transformer');
  config.transformer = {
    ...config.transformer,
    babelTransformerPath: transformerPath,
  };
  // Move 'svg' from assetExts to sourceExts
  config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
  config.resolver.sourceExts = [
    ...config.resolver.sourceExts,
    'svg',
  ];
  console.log("[Metro Config] SVG transformer enabled:", transformerPath);
} catch (e) {
  console.warn("[Metro Config] react-native-svg-transformer not installed. SVGs will be treated as assets.");
}

console.log("[Metro Config] Asset extensions:", config.resolver.assetExts);
console.log("[Metro Config] Source extensions:", config.resolver.sourceExts);

module.exports = config;
