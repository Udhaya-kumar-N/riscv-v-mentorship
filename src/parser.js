/**
 * parser.js — Tier 1: Instruction Set Parsing
 * Reads instr_dict.json, groups by extension, reports summary & multi-extension instructions.
 */

const fs = require('fs');
const path = require('path');

/**
 * Load and parse instr_dict.json
 * @param {string} filePath - path to instr_dict.json
 * @returns {{ instrDict: Object, extMap: Map, multiExtInstrs: Map }}
 */
function parseInstrDict(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const instrDict = JSON.parse(raw);

  const extMap = new Map();        // extension -> [mnemonic, ...]
  const multiExtInstrs = new Map(); // mnemonic -> [ext, ...]

  for (const [mnemonic, data] of Object.entries(instrDict)) {
    const extensions = data.extension || [];

    if (extensions.length > 1) {
      multiExtInstrs.set(mnemonic, extensions);
    }

    for (const ext of extensions) {
      if (!extMap.has(ext)) extMap.set(ext, []);
      extMap.get(ext).push(mnemonic);
    }
  }

  return { instrDict, extMap, multiExtInstrs };
}

/**
 * Print a formatted summary table for all extensions.
 */
function printSummaryTable(extMap) {
  const sorted = [...extMap.entries()].sort((a, b) => b[1].length - a[1].length);

  console.log('\n' + '='.repeat(62));
  console.log('  TIER 1 — Extension Summary Table');
  console.log('='.repeat(62));
  console.log(
    'Extension'.padEnd(30) +
    'Count'.padStart(6) +
    '  Example Mnemonic'
  );
  console.log('-'.repeat(62));

  for (const [ext, instrs] of sorted) {
    const example = instrs[0].toUpperCase();
    console.log(
      `${ext.padEnd(30)}${String(instrs.length).padStart(6)}  ${example}`
    );
  }
  console.log('-'.repeat(62));
  console.log(`  Total: ${extMap.size} extensions, ${
    [...extMap.values()].reduce((s, v) => s + v.length, 0)
  } total instruction-extension pairs`);
}

/**
 * Print instructions that belong to more than one extension.
 */
function printMultiExtInstructions(multiExtInstrs) {
  console.log('\n' + '='.repeat(62));
  console.log(`  TIER 1 — Multi-Extension Instructions (${multiExtInstrs.size} total)`);
  console.log('='.repeat(62));
  console.log('Instruction'.padEnd(26) + 'Extensions');
  console.log('-'.repeat(62));

  for (const [mnemonic, exts] of [...multiExtInstrs.entries()].sort()) {
    console.log(`  ${mnemonic.padEnd(24)}${exts.join(', ')}`);
  }
}

module.exports = { parseInstrDict, printSummaryTable, printMultiExtInstructions };
