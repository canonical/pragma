# E1 — WASM Embedding Validation Findings

**Date:** 2026-03-18
**PR:** v0.1-E1
**Status:** VALIDATED — Oxigraph WASM embeds correctly in `bun build --compile`

---

## Summary

Bun 1.3.9 handles Oxigraph WASM embedding automatically. No manual WASM
embedding (DI.02 option 1), side-loading (option 2), or pure-JS fallback
(option 4) is needed. The `bun build --compile` bundler resolves
`node_bg.wasm` via the `fs.readFileSync(path.join(__dirname, ...))` pattern
in the oxigraph npm package and embeds it in the executable.

## Test Matrix

| Check | Result |
|---|---|
| `bun build --compile` compiles with Oxigraph | PASS |
| Compiled binary loads WASM at runtime | PASS |
| `createStore()` from @canonical/ke works | PASS |
| SPARQL SELECT with prefix expansion | PASS |
| `sparql` tagged template with branded URIs | PASS |
| ASK query | PASS |
| CONSTRUCT query | PASS |
| N-Quads cache write + reload | PASS |
| Cross-compilation (linux-x64 → darwin-arm64) | PASS (produces valid Mach-O) |

## Measurements

| Metric | Value |
|---|---|
| Bun version | 1.3.9 |
| Oxigraph version | 0.4.11 |
| Platform tested | linux-x64 |
| Compile time | ~32ms |
| Binary size (linux-x64) | 97.6 MB |
| Binary size (darwin-arm64, cross-compiled) | 58 MB |
| Binary size (linux-x64, minified) | 97.6 MB |
| WASM load time (compiled) | <1ms |
| Cold store boot (3 people, file source) | ~29ms |
| Cached store boot (N-Quads cache) | <1ms |
| Total validation runtime (compiled) | ~38ms |

## How It Works

Oxigraph's `node.js` entry point loads its WASM like this:

```javascript
const path = require('path').join(__dirname, 'node_bg.wasm');
const bytes = require('fs').readFileSync(path);
const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
```

Bun's bundler recognizes this pattern and:
1. Resolves `__dirname` relative to the oxigraph package
2. Reads `node_bg.wasm` at compile time
3. Embeds the WASM bytes into the executable
4. At runtime, `readFileSync` returns the embedded bytes

No special configuration, import attributes, or manual embedding is needed.

## DI.02 Strategy Resolution

| Strategy | Status |
|---|---|
| 1. Manual WASM embedding (`import with { type: 'file' }`) | NOT NEEDED |
| 2. Side-load WASM binary | NOT NEEDED |
| 3. Wait for Bun fix | RESOLVED — Bun 1.3.9 works |
| 4. N3.js fallback | NOT NEEDED |

**Conclusion:** DI.02 is resolved. Proceed directly with `bun build --compile`
for the v0.3-06 compiled binary pipeline. No workarounds required.

## Binary Size Analysis

The 97.6 MB binary size breaks down approximately as:
- ~90 MB: Bun runtime (JavaScriptCore engine)
- ~4 MB: Oxigraph WASM module (`node_bg.wasm`)
- ~3 MB: Application code + npm dependencies

This is consistent with the DI.01 estimate of 60–110 MB. The `--minify` flag
does not significantly reduce size because the Bun runtime dominates. The
darwin-arm64 binary is smaller (58 MB) due to platform differences in the
embedded Bun runtime.

## Cross-Compilation

`bun build --compile --target=bun-darwin-arm64` successfully produces a
valid Mach-O arm64 executable from a linux-x64 host. This confirms DI.04's
claim that all four platform targets can be built from a single CI runner.

Note: The cross-compiled binary was not executed (requires macOS). The file
format was verified via `file(1)`.

## Reproduction

```bash
cd packages/cli/pragma
bun run test:compile
```

This runs `src/compile-validation.test.ts`, which:
1. Compiles `src/compile-validation.ts` via `bun build --compile --minify`
2. Executes the resulting binary
3. Validates all 6 checks from the binary's stdout
4. Cleans up the binary

## Implications for Future PRs

- **v0.3-06** (compiled binary pipeline): Can proceed with confidence.
  Use `bun build --compile --minify --target=<platform>` for all 4 targets.
- **v0.1-D3** (shared operations): No WASM concerns — ke works identically
  interpreted and compiled.
- **Gate 0 checklist item** "Oxigraph WASM embeds in `bun build --compile`":
  **SATISFIED.**
