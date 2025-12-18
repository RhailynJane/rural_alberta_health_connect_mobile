/**
 * Expo Config Plugin to fix AndroidX/Support Library conflicts
 *
 * Problem: Some dependencies pull in old Android Support libraries that conflict
 * with AndroidX, causing manifest merger failures and META-INF conflicts.
 *
 * Solution:
 * 1. Exclude the old support libraries from all configurations
 * 2. Add META-INF packaging options to handle duplicate files
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

function withAndroidXFix(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Part 1: Add configuration exclusions for old support libraries
    const androidXExclusions = `
// @generated begin androidx-fix - expo prebuild (DO NOT MODIFY)
// Exclude obsolete support libraries that conflict with AndroidX
configurations.all {
    exclude group: 'com.android.support', module: 'support-compat'
    exclude group: 'com.android.support', module: 'support-core-utils'
    exclude group: 'com.android.support', module: 'support-core-ui'
    exclude group: 'com.android.support', module: 'support-fragment'
    exclude group: 'com.android.support', module: 'animated-vector-drawable'
    exclude group: 'com.android.support', module: 'support-vector-drawable'
    exclude group: 'com.android.support', module: 'versionedparcelable'
    exclude group: 'com.android.support', module: 'appcompat-v7'
}
// @generated end androidx-fix
`;

    if (!contents.includes('@generated begin androidx-fix')) {
      const dependenciesIndex = contents.indexOf('dependencies {');
      if (dependenciesIndex !== -1) {
        contents = contents.slice(0, dependenciesIndex) +
          androidXExclusions + '\n' +
          contents.slice(dependenciesIndex);
      } else {
        contents += '\n' + androidXExclusions;
      }
    }

    // Part 2: Add META-INF packaging exclusions inside android { } block
    const metaInfExclusions = `
// @generated begin meta-inf-fix - expo prebuild (DO NOT MODIFY)
    packagingOptions {
        resources {
            pickFirsts += ['META-INF/*']
            excludes += [
                'META-INF/androidx.appcompat_appcompat.version',
                'META-INF/androidx.localbroadcastmanager_localbroadcastmanager.version'
            ]
        }
    }
// @generated end meta-inf-fix`;

    if (!contents.includes('@generated begin meta-inf-fix')) {
      // Find the closing of android { } block - look for the androidResources block and insert after it
      const androidResourcesMatch = contents.match(/androidResources\s*\{[^}]*\}/);
      if (androidResourcesMatch) {
        const insertPos = androidResourcesMatch.index + androidResourcesMatch[0].length;
        contents = contents.slice(0, insertPos) +
          '\n' + metaInfExclusions +
          contents.slice(insertPos);
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidXFix;
