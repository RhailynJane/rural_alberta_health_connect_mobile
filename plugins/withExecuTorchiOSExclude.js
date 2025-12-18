/**
 * Expo Config Plugin: Exclude react-native-executorch from iOS builds
 *
 * react-native-executorch includes opencv-rne which conflicts with
 * react-native-fast-opencv's FastOpenCV-iOS on iOS. Since we primarily
 * target Android for on-device LLM, this plugin excludes ExecuTorch
 * from iOS autolinking while keeping it enabled for Android.
 */

const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withExecuTorchIOSExclude(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const expoAutolinkingConfigPath = path.join(
        projectRoot,
        'node_modules',
        'react-native-executorch',
        'expo-module.config.json'
      );

      // Check if the expo-module.config.json exists
      if (fs.existsSync(expoAutolinkingConfigPath)) {
        try {
          const moduleConfig = JSON.parse(
            fs.readFileSync(expoAutolinkingConfigPath, 'utf8')
          );

          // Add platforms exclusion for iOS
          moduleConfig.platforms = moduleConfig.platforms || [];
          if (!moduleConfig.platforms.includes('android')) {
            moduleConfig.platforms = ['android'];
          }

          fs.writeFileSync(
            expoAutolinkingConfigPath,
            JSON.stringify(moduleConfig, null, 2)
          );

          console.log('[withExecuTorchiOSExclude] Excluded react-native-executorch from iOS');
        } catch (e) {
          console.warn('[withExecuTorchiOSExclude] Failed to modify expo-module.config.json:', e.message);
        }
      } else {
        console.log('[withExecuTorchiOSExclude] No expo-module.config.json found, skipping');
      }

      return config;
    },
  ]);
}

module.exports = withExecuTorchIOSExclude;
