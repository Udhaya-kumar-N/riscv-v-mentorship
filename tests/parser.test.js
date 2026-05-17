/**
 * Tier 3 — Unit Tests
 * Tests parser, crossref, and graph logic.
 * Run with: npm test
 */

const assert = require('assert');
const { parseInstrDict } = require('../src/parser');
const {
  normalizeJsonExt, normalizeManualExt, isRealExtension,
  crossReference, extractExtensionsFromText
} = require('../src/crossref');
const { buildExtensionGraph, countSharedInstrs } = require('../src/graph');
const path = require('path');
const fs = require('fs');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); failed++; }
}

// ── Parser tests ──────────────────────────────────────────────────────────────
console.log('\n── Parser Tests ─────────────────────────────────────────');

test('normalizeJsonExt strips rv_ prefix', () => {
  assert.strictEqual(normalizeJsonExt('rv_zba'),   'zba');
  assert.strictEqual(normalizeJsonExt('rv64_zba'), 'zba');
  assert.strictEqual(normalizeJsonExt('rv32_zknd'),'zknd');
  assert.strictEqual(normalizeJsonExt('rv_i'),     'i');
});

test('normalizeManualExt lowercases and strips rv prefix', () => {
  assert.strictEqual(normalizeManualExt('Zba'),   'zba');
  assert.strictEqual(normalizeManualExt('RV64I'), 'i');
  assert.strictEqual(normalizeManualExt('Zicsr'), 'zicsr');
});

test('isRealExtension accepts valid extensions', () => {
  assert.ok(isRealExtension('i'));
  assert.ok(isRealExtension('zba'));
  assert.ok(isRealExtension('zicsr'));
  assert.ok(isRealExtension('smstateen'));
  assert.ok(isRealExtension('svnapot'));
  assert.ok(isRealExtension('sv39'));
  assert.ok(isRealExtension('svinval'));
});

test('isRealExtension rejects non-extensions', () => {
  assert.ok(!isRealExtension('hello'));
  assert.ok(!isRealExtension('12'));
  assert.ok(!isRealExtension(''));
});

test('parseInstrDict loads real instr_dict.json if present', () => {
  const instrPath = path.join(__dirname, '..', 'instr_dict.json');
  if (!fs.existsSync(instrPath)) { console.log('    (skipped — instr_dict.json not found)'); return; }
  const { instrDict, extMap, multiExtInstrs } = parseInstrDict(instrPath);
  assert.ok(Object.keys(instrDict).length > 100, 'should have >100 instructions');
  assert.ok(extMap.size > 10, 'should have >10 extensions');
  assert.ok(extMap.has('rv_i'), 'should have rv_i extension');
  assert.ok(multiExtInstrs.size > 0, 'should have multi-extension instructions');
});

// ── Crossref tests ────────────────────────────────────────────────────────────
console.log('\n── Cross-Reference Tests ────────────────────────────────');

test('extractExtensionsFromText finds Zba, Zicsr', () => {
  const text = 'The Zba extension provides address generation. See also Zicsr for CSR instructions.';
  const found = extractExtensionsFromText(text);
  assert.ok(found.has('zba'),   'should find zba');
  assert.ok(found.has('zicsr'), 'should find zicsr');
});

test('crossReference finds matched, json-only, manual-only', () => {
  const extMap = new Map([
    ['rv_zba',        ['sh1add']],
    ['rv_zbb',        ['andn', 'orn']],
    ['rv_xyz_custom', ['custom_instr']],
  ]);
  const manualExts = new Set(['zba', 'zbb', 'zicsr']);
  const { matched, jsonOnly, manualOnly } = crossReference(extMap, manualExts);
  assert.ok(matched.has('zba'),        'zba should match');
  assert.ok(matched.has('zbb'),        'zbb should match');
  assert.ok(jsonOnly.has('xyz_custom'),'xyz_custom should be json-only');
  assert.ok(manualOnly.has('zicsr'),   'zicsr should be manual-only');
});

// ── Graph tests ───────────────────────────────────────────────────────────────
console.log('\n── Graph Tests ──────────────────────────────────────────');

test('buildExtensionGraph connects extensions sharing instructions', () => {
  const extMap = new Map([
    ['rv_zbb', ['andn', 'orn']],
    ['rv_zkn', ['andn', 'clmul']],
    ['rv_zbc', ['clmul']],
  ]);
  const multiExt = new Map([
    ['andn',  ['rv_zbb', 'rv_zkn']],
    ['clmul', ['rv_zkn', 'rv_zbc']],
  ]);
  const graph = buildExtensionGraph(extMap, multiExt);
  assert.ok(graph.get('rv_zbb').has('rv_zkn'), 'zbb <-> zkn should be connected');
  assert.ok(graph.get('rv_zkn').has('rv_zbc'), 'zkn <-> zbc should be connected');
  assert.ok(!graph.get('rv_zbb').has('rv_zbc'),'zbb <-> zbc should NOT be connected');
});

test('countSharedInstrs returns correct count', () => {
  const multiExt = new Map([
    ['andn', ['rv_zbb', 'rv_zkn', 'rv_zbkb']],
    ['orn',  ['rv_zbb', 'rv_zkn']],
    ['xnor', ['rv_zbb', 'rv_zkn']],
  ]);
  assert.strictEqual(countSharedInstrs('rv_zbb', 'rv_zkn', multiExt), 3);
});

console.log(`\n── Results: ${passed} passed, ${failed} failed ──────────────────\n`);
if (failed > 0) process.exit(1);
