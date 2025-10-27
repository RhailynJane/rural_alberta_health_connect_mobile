module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Apply TS + decorators only to app code, not node_modules (prevents breaking expo-router parsing)
    overrides: [
      {
        test: [
          './app/**/*',
          './watermelon/**/*',
          './convex/**/*',
          './*.{js,jsx,ts,tsx}'
        ],
        exclude: /node_modules/,
        plugins: [
          ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          ['@babel/plugin-proposal-class-properties', { loose: true }],
        ],
      },
    ],
    plugins: [
      // Keep reanimated last as recommended
      'react-native-reanimated/plugin',
    ],
  };
};
