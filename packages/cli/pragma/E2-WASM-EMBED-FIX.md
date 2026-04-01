# E2 — WASM Embedding Fix for Compiled CLI Binary

**Date:** 2026-04-01
**Branch:** chore/cli-fix
**Status:** FIXED — Oxigraph WASM correctly embedded via dynamic file import + `readFileSync` patching

---

## Problem

When `@canonical/pragma-cli` is installed on a machine other than the build
host, `pragma list` (and any store-requiring command) fails:

```
Error: Failed to initialize store. Failed to load oxigraph.
ENOENT: no such file or directory, open '/home/runner/work/pragma/pragma/node_modules/.bun/oxigraph@0.5.6/node_modules/oxigraph/node_bg.wasm'
```

The error path is the GitHub Actions CI runner path — baked into the compiled
binary at build time. Bare `pragma` (help) works because it does not boot
the ke store.

## Root Cause

Bun's `--compile` bundler does **not** automatically embed WASM files loaded
by npm dependencies. The E1 validation was a false positive: the test binary
happened to run on the same machine where the WASM file existed on disk, so
`readFileSync` succeeded from the filesystem rather than from embedded data.

Oxigraph's CJS entry point loads its WASM via:

```javascript
// oxigraph 0.5.0
const path = require('path').join(__dirname, 'node_bg.wasm');
const bytes = require('fs').readFileSync(path);
```

When bundled with `bun build --compile`:
1. `__dirname` is hardcoded to the **build-time** absolute path
2. `readFileSync` is **not** intercepted — it reads from the real filesystem
3. On any machine where that path doesn't exist, the binary crashes

This is true for all oxigraph versions. Version 0.5.1+ changed to a template
literal (`` `${__dirname}/node_bg.wasm` ``) but the behaviour is the same.

## Fix

`packages/cli/pragma/src/embedWasm.ts` — imported first in `bin.ts` and
`compile-validation.ts`:

1. **Embed** the WASM via `await import("oxigraph/node_bg.wasm", { with: { type: "file" } })`.
   This is the only mechanism bun supports for embedding arbitrary files
   into compiled binaries. It stores the bytes in bun's `$bunfs` virtual
   filesystem. A dynamic `import()` is used instead of a static `import`
   declaration so the module also works in interpreted/test contexts.
2. **Read** the embedded bytes at module init via `readFileSync(wasmPath)`.
3. **Patch** the CJS `require("fs").readFileSync` so that any call targeting
   `node_bg.wasm` returns the pre-read embedded bytes instead of hitting disk.

`oxigraph` is added as a direct dependency of `@canonical/pragma-cli` so
that `oxigraph/node_bg.wasm` resolves correctly regardless of hoisting.

In interpreted mode the dynamic import resolves to the real filesystem path.
The patch still runs but is a no-op (same bytes, just cached). In compiled
mode the WASM is served from `$bunfs`.

## Validation

Build the binary, remove the WASM from disk, run:

```bash
bun build --compile --minify src/compile-validation.ts --outfile dist/pragma-validate
mv node_modules/.bun/oxigraph@*/node_modules/oxigraph/node_bg.wasm /tmp/backup
./dist/pragma-validate   # ALL CHECKS PASSED
mv /tmp/backup node_modules/.bun/oxigraph@*/node_modules/oxigraph/node_bg.wasm
```

Binary size increased ~3.4 MB (the WASM payload) from ~102.4 MB to ~106.3 MB.

## E1 Correction

The E1 findings document concluded that "Bun 1.3.9 handles WASM embedding
automatically via its bundler." This was incorrect. The validation test ran
on the build machine where the WASM file was present on the filesystem. The
binary loaded the WASM from disk at the hardcoded path, not from embedded
data. The only way to verify true embedding is to remove the WASM file from
disk and confirm the binary still works — which E1 did not do.
