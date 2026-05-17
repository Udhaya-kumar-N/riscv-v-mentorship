/**
 * crossref.js — Tier 2: Cross-Reference with ISA Manual
 * Scans AsciiDoc source files and compares extensions against instr_dict.json.
 */

const fs = require('fs');
const path = require('path');

/**
 * Normalize an extension name from instr_dict.json.
 * Strips rv_/rv32_/rv64_ prefix. e.g. "rv64_zba" -> "zba", "rv_i" -> "i"
 */
function normalizeJsonExt(ext) {
  return ext.toLowerCase().replace(/^rv(32|64)?_/, '').replace(/^rv(32|64)?/, '');
}

/**
 * Normalize an extension name found in manual text.
 * Lowercases and strips leading "rv"/"rv32"/"rv64".
 */
function normalizeManualExt(ext) {
  return ext.toLowerCase().replace(/^rv(32|64)?/, '');
}

/**
 * Determine if a normalized token looks like a real RISC-V extension name.
 */
function isRealExtension(token) {
  if (/^[imafdqcvhbpng]$/.test(token)) return true;         // single-letter ISA base/std
  if (/^z[a-z][a-z0-9]*$/.test(token)) return true;         // Z-extensions: zba, zicsr
  if (/^sm[a-z][a-z0-9]*$/.test(token)) return true;        // Sm*: smstateen, smepmp
  if (/^ss[a-z][a-z0-9]*$/.test(token)) return true;        // Ss*: sstc, sscofpmf
  if (/^sv[0-9a-z][a-z0-9]*$/.test(token)) return true;     // Sv*: svinval, svnapot, sv39
  if (/^sh[a-z][a-z0-9]*$/.test(token)) return true;        // Sh* hypervisor profiles
  if (/^s[a-z][a-z0-9]+$/.test(token)) return true;         // other S-extensions
  return false;
}

// Words that match the regex but are NOT extensions
const EXCLUDE_WORDS = new Set([
  'sail', 'same', 'sample', 'sampling', 'sanitizer', 'save', 'shadow', 'shall',
  'shangmi', 'shannon', 'shared', 'shift', 'shiftrows', 'shifted', 'short', 'shot',
  'small', 'sm', 'ss', 'sv', 'za', 'zb', 'zbk', 'zc', 'zero', 'zeros',
  'zext', 'zvkb', 'zve32', 'intro', 'machine', 'supervisor', 'csrs', 'crypto',
]);

/**
 * Scan all .adoc files in a directory (recursively) and extract extension mentions.
 * @param {string} dirPath - directory containing .adoc files
 * @returns {Set<string>} normalized extension names found in the manual
 */
function scanAdocFiles(dirPath) {
  const mentions = new Set();
  const adocPattern = /^(.+?)(?:-st-ext)?\.adoc$/;

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.adoc')) {
        // Filename-based detection (very reliable)
        const match = entry.name.match(adocPattern);
        if (match) {
          const norm = normalizeManualExt(match[1]);
          if (isRealExtension(norm) && !EXCLUDE_WORDS.has(norm)) {
            mentions.add(norm);
          }
        }
        // Content-based detection
        const text = fs.readFileSync(fullPath, 'utf8');
        extractExtensionsFromText(text, mentions);
      }
    }
  }

  walk(dirPath);
  return mentions;
}

/**
 * Extract extension names from adoc text content using multiple patterns.
 */
function extractExtensionsFromText(text, mentions = new Set()) {
  // Capitalized Z/S/Sm/Ss/Sv names: Zba, Zicsr, Smstateen, Svnapot, etc.
  const capPattern = /\b(Z[a-zA-Z][a-zA-Z0-9_]*|S[mshva][a-zA-Z0-9_]*|Sm[a-zA-Z0-9_]+|Ss[a-zA-Z0-9_]+|Sv[a-zA-Z0-9_]+|RV(?:32|64)?[A-Z][a-zA-Z0-9]*)\b/g;
  for (const [, ext] of text.matchAll(capPattern)) {
    const norm = normalizeManualExt(ext);
    if (isRealExtension(norm) && !EXCLUDE_WORDS.has(norm) && norm.length >= 2) {
      mentions.add(norm);
    }
  }

  // Single-letter extensions: "the M extension", "RV32I", "RVI"
  const singleLetter = /\b(?:RV(?:32|64)?([IMAFDQCVHBPNG])\b|the\s+([IMAFDQCVHBPNG])\s+[Ee]xtension)/g;
  for (const [, a, b] of text.matchAll(singleLetter)) {
    mentions.add((a || b).toLowerCase());
  }

  return mentions;
}

/**
 * Cross-reference extensions from JSON against those found in the manual.
 * @param {Map} extMap - extension map from parseInstrDict
 * @param {Set} manualExts - normalized extensions from adoc scan
 * @returns {{ matched, jsonOnly, manualOnly, jsonNormMap }}
 */
function crossReference(extMap, manualExts) {
  const jsonNormMap = new Map();
  for (const ext of extMap.keys()) {
    const norm = normalizeJsonExt(ext);
    if (!jsonNormMap.has(norm)) jsonNormMap.set(norm, []);
    jsonNormMap.get(norm).push(ext);
  }

  const jsonNormSet = new Set(jsonNormMap.keys());
  const matched   = new Set([...jsonNormSet].filter(x => manualExts.has(x)));
  const jsonOnly  = new Set([...jsonNormSet].filter(x => !manualExts.has(x)));
  const manualOnly = new Set([...manualExts].filter(x => !jsonNormSet.has(x)));

  return { matched, jsonOnly, manualOnly, jsonNormMap };
}

/**
 * Print the cross-reference report.
 */
function printCrossRefReport(extMap, manualExts) {
  const { matched, jsonOnly, manualOnly, jsonNormMap } = crossReference(extMap, manualExts);

  console.log('\n' + '='.repeat(62));
  console.log('  TIER 2 — Cross-Reference: instr_dict.json vs ISA Manual');
  console.log('='.repeat(62));
  console.log(`  ${matched.size} matched, ${jsonOnly.size} in JSON only, ${manualOnly.size} in manual only`);

  console.log(`\n── Extensions in JSON but NOT in ISA manual (${jsonOnly.size}) ──`);
  for (const norm of [...jsonOnly].sort()) {
    const originals = jsonNormMap.get(norm).join(', ');
    const count = jsonNormMap.get(norm).reduce((s, e) => s + (extMap.get(e)?.length || 0), 0);
    console.log(`  ${originals.padEnd(36)} (${count} instrs)`);
  }

  console.log(`\n── Extensions in ISA manual but NOT in JSON (${manualOnly.size}) ──`);
  for (const ext of [...manualOnly].sort()) console.log(`  ${ext}`);

  console.log(`\n── Matched extensions (${matched.size}) ──`);
  const matchedArr = [...matched].sort();
  for (let i = 0; i < matchedArr.length; i += 4) {
    console.log('  ' + matchedArr.slice(i, i + 4).map(e => e.padEnd(14)).join(''));
  }

  return { matched, jsonOnly, manualOnly };
}

module.exports = {
  normalizeJsonExt, normalizeManualExt, isRealExtension,
  scanAdocFiles, extractExtensionsFromText,
  crossReference, printCrossRefReport
};
