/**
 * Embed oxigraph WASM for `bun build --compile`.
 *
 * Bun's bundler does not automatically embed WASM files that an npm dependency
 * loads via `readFileSync(`${__dirname}/node_bg.wasm`)` — the `__dirname` is
 * frozen to the build-time path and `readFileSync` is not redirected to
 * embedded data at runtime. So the compiled `dist/pragma` binary, run on any
 * machine other than the CI runner it was built on, throws:
 *
 *   Failed to load oxigraph. Make sure it is installed:
 *   ENOENT … /oxigraph@x/node_modules/oxigraph/node_bg.wasm
 *
 * This module fixes that. Importing it (for its side effects) BEFORE any code
 * that loads oxigraph:
 *
 *   1. Dynamically imports the WASM with `{ type: "file" }`, the only mechanism
 *      bun supports for embedding an arbitrary file into the compiled binary's
 *      `$bunfs` virtual filesystem. In interpreted mode this resolves to the
 *      real on-disk path, so the patch below is a harmless no-op (same bytes).
 *   2. Reads the embedded bytes once, then patches CJS `require("fs").readFileSync`
 *      so oxigraph's `node.js` wrapper — which does exactly that — gets the
 *      pre-loaded bytes for `node_bg.wasm` instead of hitting a stale path.
 *
 * `oxigraph` is a direct dependency of `@canonical/pragma-cli` so
 * `oxigraph/node_bg.wasm` resolves regardless of workspace hoisting.
 *
 * Regression note: this was originally #584; it was dropped in the CLI rename
 * (#879) while its compile-smoke test (`wasmEmbed.test.ts`) survived. Restored
 * here. The test compiles a fresh binary and boots the store, so a future
 * removal fails loudly again.
 *
 * @note Impure — reads a file at module init and mutates the CJS `fs` module.
 */

import { readFileSync } from "node:fs";

// @ts-expect-error — bun-specific import attribute for file embedding.
const { default: wasmPath } = await import("oxigraph/node_bg.wasm", {
  with: { type: "file" },
});
const wasmBytes = readFileSync(wasmPath);

// Oxigraph's CJS wrapper loads the WASM via `require("fs").readFileSync(...)`.
// Patch the CJS `fs` module (mutable, unlike ESM bindings) so reads targeting
// `node_bg.wasm` return the pre-loaded bytes.
const cjsFs = import.meta.require("fs");
const origReadFileSync = cjsFs.readFileSync;

cjsFs.readFileSync = function patchedReadFileSync(
  path: string,
  ...args: unknown[]
) {
  if (typeof path === "string" && path.endsWith("/node_bg.wasm")) {
    return wasmBytes;
  }
  return origReadFileSync(path, ...args);
};
