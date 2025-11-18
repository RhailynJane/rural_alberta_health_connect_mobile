const fs = require('fs');
const path = require('path');

function checkAndroid() {
  const apks = fs.existsSync('android/app/build/outputs/apk/debug');
  const soPath = path.join('android', 'app', 'build', 'intermediates', 'merged_native_libs', 'debug', 'out', 'lib', 'arm64-v8a', 'libdummy-detector.so');
  return fs.existsSync(soPath) || apks;
}

function checkiOS() {
  const libPath = path.join('ios', 'build');
  return fs.existsSync(libPath);
}

if (process.argv.includes('--ios')) {
  process.exit(checkiOS() ? 0 : 2);
} else {
  process.exit(checkAndroid() ? 0 : 2);
}
