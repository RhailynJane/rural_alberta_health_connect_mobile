/**
 * Expo Config Plugin to properly register onnxruntime-react-native
 *
 * The official onnxruntime-react-native expo plugin only adds the Gradle dependency
 * but doesn't register the native module package. This plugin fixes that.
 *
 * Problem: The native module OnnxruntimePackage is not registered with React Native,
 * causing "Cannot read property 'install' of null" errors.
 *
 * Solution: This plugin modifies MainApplication.kt during prebuild to add:
 * 1. Import statement for OnnxruntimePackage
 * 2. Package registration in getPackages()
 *
 * Usage in app.json:
 * {
 *   "plugins": [
 *     "onnxruntime-react-native",
 *     "./plugins/withOnnxRuntime"
 *   ]
 * }
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ONNX_IMPORT = 'import ai.onnxruntime.reactnative.OnnxruntimePackage';
const ONNX_PACKAGE = 'add(OnnxruntimePackage())';

function withOnnxRuntime(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      // Get package name from config and convert to path
      const packageName = config.android?.package || 'com.app';
      const packagePath = packageName.replace(/\./g, '/');

      const mainApplicationPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java',
        packagePath,
        'MainApplication.kt'
      );

      // Try direct path first, then search if not found
      let filePath = mainApplicationPath;
      if (!fs.existsSync(filePath)) {
        // Try to find MainApplication.kt
        const javaDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/java');
        filePath = findFile(javaDir, 'MainApplication.kt');
      }

      if (!filePath || !fs.existsSync(filePath)) {
        console.warn('withOnnxRuntime: Could not find MainApplication.kt');
        return config;
      }

      let contents = fs.readFileSync(filePath, 'utf-8');

      // Add import if not present
      if (!contents.includes(ONNX_IMPORT)) {
        // Find the last import line and add after it
        const importRegex = /^import .+$/gm;
        let lastImportMatch;
        let match;
        while ((match = importRegex.exec(contents)) !== null) {
          lastImportMatch = match;
        }

        if (lastImportMatch) {
          const insertPosition = lastImportMatch.index + lastImportMatch[0].length;
          contents =
            contents.slice(0, insertPosition) +
            '\n\n// ONNX Runtime - must be manually registered due to Expo autolinking gap\n' +
            ONNX_IMPORT +
            contents.slice(insertPosition);
        }
      }

      // Add package registration if not present
      if (!contents.includes(ONNX_PACKAGE)) {
        // Find the getPackages function and add to the apply block
        const packagesRegex = /PackageList\(this\)\.packages\.apply\s*\{([^}]*)\}/;
        const packagesMatch = contents.match(packagesRegex);

        if (packagesMatch) {
          const applyBlockContent = packagesMatch[1];
          const newApplyContent = applyBlockContent.trimEnd() +
            (applyBlockContent.trim() ? '\n              ' : '\n              ') +
            ONNX_PACKAGE + '\n            ';

          contents = contents.replace(
            packagesRegex,
            `PackageList(this).packages.apply {${newApplyContent}}`
          );
        }
      }

      fs.writeFileSync(filePath, contents);
      return config;
    },
  ]);
}

// Helper function to recursively find a file
function findFile(dir, filename) {
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const found = findFile(filePath, filename);
      if (found) return found;
    } else if (file === filename) {
      return filePath;
    }
  }
  return null;
}

module.exports = withOnnxRuntime;
