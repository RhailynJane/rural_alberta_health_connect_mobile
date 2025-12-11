/**
 * React Native Configuration
 *
 * This file configures autolinking behavior for native modules.
 * react-native-executorch is excluded from iOS due to OpenCV conflict
 * with react-native-fast-opencv. The on-device LLM will only work on Android.
 */

module.exports = {
  dependencies: {
    'react-native-executorch': {
      platforms: {
        ios: null, // Disable autolinking on iOS due to opencv2.xcframework conflict
      },
    },
  },
};
