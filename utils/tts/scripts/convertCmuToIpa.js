/**
 * Script to convert CMU Pronouncing Dictionary (ARPAbet) to IPA format
 * Run with: node convertCmuToIpa.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ARPAbet to IPA mapping
const ARPABET_TO_IPA = {
  // Vowels
  'AA': 'ɑ',   // odd
  'AE': 'æ',   // at
  'AH': 'ʌ',   // hut (stressed) / ə (unstressed)
  'AO': 'ɔ',   // ought
  'AW': 'aʊ',  // cow
  'AY': 'aɪ',  // hide
  'EH': 'ɛ',   // ed
  'ER': 'ɝ',   // hurt (stressed) / ɚ (unstressed)
  'EY': 'eɪ',  // ate
  'IH': 'ɪ',   // it
  'IY': 'i',   // eat
  'OW': 'oʊ',  // oat
  'OY': 'ɔɪ',  // toy
  'UH': 'ʊ',   // hood
  'UW': 'u',   // two

  // Consonants
  'B': 'b',
  'CH': 'tʃ',  // cheese
  'D': 'd',
  'DH': 'ð',   // thee
  'F': 'f',
  'G': 'ɡ',
  'HH': 'h',
  'JH': 'dʒ',  // jee
  'K': 'k',
  'L': 'l',
  'M': 'm',
  'N': 'n',
  'NG': 'ŋ',   // sing
  'P': 'p',
  'R': 'ɹ',
  'S': 's',
  'SH': 'ʃ',   // she
  'T': 't',
  'TH': 'θ',   // thin
  'V': 'v',
  'W': 'w',
  'Y': 'j',
  'Z': 'z',
  'ZH': 'ʒ',   // pleasure
};

// Special handling for unstressed vowels
const UNSTRESSED_VOWELS = {
  'AH': 'ə',
  'ER': 'ɚ',
};

/**
 * Convert ARPAbet phoneme string to IPA
 * @param {string} arpaPhonemes - Space-separated ARPAbet phonemes
 * @returns {string} IPA string
 */
function convertToIpa(arpaPhonemes) {
  const phonemes = arpaPhonemes.split(' ');
  let ipa = '';

  for (const phoneme of phonemes) {
    // Extract base phoneme and stress
    const match = phoneme.match(/^([A-Z]+)(\d)?$/);
    if (!match) continue;

    const [, base, stress] = match;

    // Get IPA equivalent
    let ipaChar;
    if (stress === '0' && UNSTRESSED_VOWELS[base]) {
      ipaChar = UNSTRESSED_VOWELS[base];
    } else {
      ipaChar = ARPABET_TO_IPA[base];
    }

    if (!ipaChar) {
      console.warn(`Unknown phoneme: ${phoneme}`);
      continue;
    }

    // Add stress marker before the vowel
    if (stress === '1') {
      ipa += 'ˈ' + ipaChar;
    } else if (stress === '2') {
      ipa += 'ˌ' + ipaChar;
    } else {
      ipa += ipaChar;
    }
  }

  return ipa;
}

/**
 * Download and convert CMU dictionary
 */
async function downloadAndConvert() {
  const CMU_URL = 'https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict';

  console.log('Downloading CMU dictionary...');

  return new Promise((resolve, reject) => {
    https.get(CMU_URL, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        console.log('Download complete. Converting...');

        const dictionary = {};
        const lines = data.split('\n');
        let processedCount = 0;
        let skippedCount = 0;

        for (const line of lines) {
          // Skip empty lines and comments
          if (!line.trim() || line.startsWith(';;;')) continue;

          // Parse line: word phonemes
          const firstSpace = line.indexOf(' ');
          if (firstSpace === -1) continue;

          let word = line.substring(0, firstSpace).toLowerCase();
          const phonemes = line.substring(firstSpace + 1).trim();

          // Skip alternate pronunciations like "word(2)"
          if (word.includes('(')) {
            word = word.replace(/\(\d+\)$/, '');
            // Keep first pronunciation only
            if (dictionary[word]) {
              skippedCount++;
              continue;
            }
          }

          // Skip words with special characters (except apostrophe)
          if (/[^a-z']/.test(word)) {
            skippedCount++;
            continue;
          }

          // Convert to IPA
          const ipa = convertToIpa(phonemes);
          if (ipa) {
            dictionary[word] = ipa;
            processedCount++;
          }
        }

        console.log(`Processed: ${processedCount} words`);
        console.log(`Skipped: ${skippedCount} entries`);

        // Save as JSON
        const outputPath = path.join(__dirname, '..', 'cmuDictionary.json');
        fs.writeFileSync(outputPath, JSON.stringify(dictionary, null, 0));

        // Also create a minified version
        const minifiedPath = path.join(__dirname, '..', 'cmuDictionary.min.json');
        fs.writeFileSync(minifiedPath, JSON.stringify(dictionary));

        const stats = fs.statSync(minifiedPath);
        console.log(`Dictionary saved to: ${outputPath}`);
        console.log(`Minified size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

        resolve(dictionary);
      });

      response.on('error', reject);
    }).on('error', reject);
  });
}

// Run the conversion
downloadAndConvert()
  .then(() => console.log('Done!'))
  .catch((err) => console.error('Error:', err));
