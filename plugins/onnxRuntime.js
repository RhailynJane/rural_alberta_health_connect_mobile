const configPlugin = require("@expo/config-plugins");
const generateCode = require("@expo/config-plugins/build/utils/generateCode");
const pkg = { name: "onnxruntime-react-native", version: "1.0.0" };
// override since package itself doesn't expose plugin

const withOrt = (config) => {
  // ---- Android Gradle patch ----
  config = configPlugin.withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      config.modResults.contents = generateCode.mergeContents({
        src: config.modResults.contents,
        newSrc: "    implementation project(':onnxruntime-react-native')",
        tag: "onnxruntime-react-native",
        anchor: /^dependencies[ \t]*\{$/,
        offset: 1,
      }).contents;
    }
    return config;
  });

  // ---- iOS Podfile patch ----
  config = configPlugin.withDangerousMod(config, [
    "ios",
    (config) => {
      const fs = require("fs");
      const path = require("path");

      const podFilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      const contents = fs.readFileSync(podFilePath, "utf-8");

      const updated = generateCode.mergeContents({
        src: contents,
        newSrc:
          "  pod 'onnxruntime-react-native', :path => '../node_modules/onnxruntime-react-native'",
        tag: "onnxruntime-react-native",
        anchor: /^target.+do$/,
        offset: 1,
      }).contents;

      fs.writeFileSync(podFilePath, updated);
      return config;
    },
  ]);

  return config;
};

module.exports = configPlugin.createRunOncePlugin(
  withOrt,
  "onnxruntime-expo-plugin",
  "1.0.0"
);
