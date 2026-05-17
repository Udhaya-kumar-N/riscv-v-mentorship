#!/usr/bin/env node
/**
 * RISC-V Instruction Set Explorer — Entry Point
 * Mentorship Coding Challenge: Tier 1 & Tier 2
 *
 * Usage:
 *   node src/index.js [--instr <path>] [--isa-src <dir>]
 *
 * Defaults:
 *   --instr     ./instr_dict.json
 *   --isa-src   ./data/src          (ISA manual adoc sources)
 */

const path = require('path');
const fs   = require('fs');
const { parseInstrDict, printSummaryTable, printMultiExtInstructions } = require('./parser');
const { scanAdocFiles, printCrossRefReport } = require('./crossref');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag, def) {
  const i = args.indexOf(flag);
  return (i !== -1 && args[i + 1]) ? args[i + 1] : def;
}

const instrPath = getArg('--instr',   path.join(__dirname, '..', 'instr_dict.json'));
const isaSrcDir = getArg('--isa-src', path.join(__dirname, '..', 'data', 'src'));

// ── Tier 1 ────────────────────────────────────────────────────────────────────
console.log(`\nLoading: ${instrPath}`);
if (!fs.existsSync(instrPath)) {
  console.error(`ERROR: instr_dict.json not found at ${instrPath}`);
  process.exit(1);
}

const { instrDict, extMap, multiExtInstrs } = parseInstrDict(instrPath);
console.log(`  → Parsed ${Object.keys(instrDict).length} instructions across ${extMap.size} extensions`);

printSummaryTable(extMap);
printMultiExtInstructions(multiExtInstrs);

// ── Tier 2 ────────────────────────────────────────────────────────────────────
console.log(`\nScanning ISA manual sources: ${isaSrcDir}`);
if (!fs.existsSync(isaSrcDir)) {
  console.warn(`  ⚠  ISA source directory not found — skipping Tier 2.`);
  console.warn(`  To enable: git clone https://github.com/riscv/riscv-isa-manual && mkdir -p data && cp -r riscv-isa-manual/src data/`);
} else {
  const manualExts = scanAdocFiles(isaSrcDir);
  console.log(`  → Found ${manualExts.size} extension references in manual`);
  printCrossRefReport(extMap, manualExts);
}

console.log('\n✅ Done.\n');
