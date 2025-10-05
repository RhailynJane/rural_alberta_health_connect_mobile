const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .tflite as a valid asset extension for TensorFlow Lite models
config.resolver.assetExts.push('tflite');

module.exports = config;
