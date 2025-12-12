const { withAndroidManifest } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Plugin to ensure google-services.json exists before Expo tries to read it
 * This handles the case where the file is tracked in git but needs to be present during prebuild
 */
module.exports = function withGoogleServices(config) {
  return withAndroidManifest(config, async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const targetFile = path.join(projectRoot, "android/app/google-services.json");

    // Ensure the file exists (it should be tracked in git)
    if (!fs.existsSync(targetFile)) {
      console.warn(`⚠️  google-services.json not found at ${targetFile}`);
    } else {
      console.log(`✅ google-services.json found at ${targetFile}`);
    }

    return config;
  });
};
