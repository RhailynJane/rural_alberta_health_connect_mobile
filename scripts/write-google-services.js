#!/usr/bin/env node

/**
 * Prebuild hook to write google-services.json from environment variable
 * This allows the file to be stored as an EAS secret instead of committing it to git
 */

const fs = require('fs');
const path = require('path');

const googleServicesJson = process.env.GOOGLE_SERVICES_JSON;

if (!googleServicesJson) {
  console.warn('⚠️  GOOGLE_SERVICES_JSON environment variable not set. Skipping write.');
  process.exit(0);
}

const outputPath = path.join(__dirname, '../android/app/google-services.json');

try {
  // Ensure the directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write the file
  fs.writeFileSync(outputPath, googleServicesJson, 'utf-8');
  console.log(`✅ Wrote google-services.json to ${outputPath}`);
} catch (error) {
  console.error('❌ Error writing google-services.json:', error);
  process.exit(1);
}
