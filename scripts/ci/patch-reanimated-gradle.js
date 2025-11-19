const fs = require('fs');
const path = require('path');

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`[patch] File not found, skipping: ${filePath}`);
    return false;
    }

  let src = fs.readFileSync(filePath, 'utf8');
  let orig = src;

  // 1) Replace deprecated Groovy space-assignment with equals in key places
  // lintOptions { abortOnError false } -> lint { abortOnError = false }
  src = src.replace(/\blintOptions\s*\{/g, 'lint {');
  src = src.replace(/\babortOnError\s+(true|false)\b/g, 'abortOnError = $1');

  // 2) buildFeatures { prefab true ... } -> buildFeatures { prefab = true ... }
  src = src.replace(/\b(buildFeatures\s*\{[\s\S]*?\})/g, (block) => {
    return block
      .replace(/\b(prefab|prefabPublishing|buildConfig)\s+(true|false)\b/g, '$1 = $2');
  });

  // 3) prefab { reanimated { headers <value> } } -> headers = <value>
  src = src.replace(/\b(headers)\s+([^\s}]+)\b/g, '$1 = $2');

  if (src !== orig) {
    fs.writeFileSync(filePath, src, 'utf8');
    console.log(`[patch] Updated: ${filePath}`);
    return true;
  }
  console.log(`[patch] No changes needed: ${filePath}`);
  return false;
}

const target = path.join(process.cwd(), 'node_modules', 'react-native-reanimated', 'android', 'build.gradle');
patchFile(target);
