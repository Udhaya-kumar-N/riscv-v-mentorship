# RISC-V Instruction Set Explorer

A JavaScript solution for the RISC-V Mentorship Coding Challenge — **Tier 1 & Tier 2** implemented.

## Features

| Tier | Description |
|------|-------------|
| **Tier 1** | Parse `instr_dict.json`, group instructions by extension, print summary table, list multi-extension instructions |
| **Tier 2** | Scan ISA manual AsciiDoc sources, normalize extension names (`rv_zba` ↔ `Zba`), cross-reference and report matches/mismatches |

---

## Prerequisites

- **Node.js 14+**
- **Git**

---

## Installation

```bash
git clone https://github.com/Udhaya-kumar-N/riscv-v-mentorship.git
cd riscv-v-mentorship
# No external npm dependencies required — pure Node.js
```

---

## Setup: ISA Manual Sources (required for Tier 2)

```bash
git clone https://github.com/riscv/riscv-isa-manual
mkdir -p data
cp -r riscv-isa-manual/src data/
```

---

## Running

```bash
# Run both tiers with defaults
node src/index.js

# Custom paths
node src/index.js --instr ./instr_dict.json --isa-src ./data/src
```

---

## Sample Output

```
Loading: ./instr_dict.json
  → Parsed 1188 instructions across 114 extensions

==============================================================
  TIER 1 — Extension Summary Table
==============================================================
Extension                      Count  Example Mnemonic
rv_v                             627  VAADD_VV
rv_i                              37  ADD
rv_q                              30  FADD_Q
rv_d                              26  FADD_D
...

==============================================================
  TIER 1 — Multi-Extension Instructions (73 total)
==============================================================
  aes32dsi    rv32_zknd, rv32_zk, rv32_zkn
  andn        rv_zbb, rv_zkn, rv_zks, rv_zk, rv_zbkb
  clmul       rv_zbc, rv_zkn, rv_zks, rv_zk, rv_zbkc
  ...

==============================================================
  TIER 2 — Cross-Reference: instr_dict.json vs ISA Manual
==============================================================
  49 matched, 36 in JSON only, 62 in manual only

── Extensions in JSON but NOT in ISA manual (36) ──
  rv_zalasr    (8 instrs)
  rv_zibi      (2 instrs)
  ...

── Extensions in ISA manual but NOT in JSON (62) ──
  smcdeleg
  svnapot
  zmmul
  ...

── Matched extensions (49) ──
  a   c   d   f   i   m   q   v
  zba zbb zbc zbkb zbkc zbkx zbs
  zicsr zifencei zicond ...

✅ Done.
```

---

## Project Structure

```
riscv-v-mentorship/
├── instr_dict.json              ← source instruction data
├── data/
│   └── src/                    ← ISA manual adoc files (clone separately, see Setup)
├── src/
│   ├── index.js                ← entry point (runs Tier 1 & Tier 2)
│   ├── parser.js               ← Tier 1: parse & group instructions
│   └── crossref.js             ← Tier 2: adoc scan & cross-reference
└── package.json
```

---

## Design Decisions

- **Normalization**: JSON extensions use `rv[32|64]_<name>` format; manual uses capitalized `Zba`/`Zicsr` style. Both sides are stripped to bare lowercase (e.g., `rv64_zba` → `zba`, `Zba` → `zba`) for comparison.
- **Composite extension keys**: Names like `rv_zfh_zfa` (combining two sub-extensions) are treated as a single JSON-only entry since no exact manual equivalent exists.
- **adoc scanning**: Uses both filename-based detection (reliable) and regex content scanning (for mentions inside documents) to maximize recall while filtering common English words.
- **No external dependencies**: All logic uses only Node.js built-ins (`fs`, `path`).

---

## External Resources

- [RISC-V Extensions Landscape](https://github.com/rpsene/riscv-extensions-landscape)
- [Official RISC-V ISA Manual](https://github.com/riscv/riscv-isa-manual)
- [RISC-V Foundation](https://riscv.org/)

---

## License

MIT — see [LICENSE](LICENSE)

---

**Status**: ✅ Tier 1 & Tier 2 Complete  
**Last Updated**: 2026-05-17
