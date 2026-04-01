/**
 * Embed oxigraph WASM for `bun build --compile`.
 *
 * Bun's bundler does not automatically embed WASM files loaded via
 * `readFileSync(path.join(__dirname, 'node_bg.wasm'))` — the `__dirname`
 * is hardcoded to the build-time path and `readFileSync` is not
 * intercepted for embedded data at runtime.
 *
 * This module dynamically imports the WASM file with `{ type: "file" }`,
 * which bun embeds into the compiled binary's `$bunfs` virtual filesystem.
 * It then patches CJS `readFileSync` so that oxigraph's WASM loader
 * returns the pre-loaded bytes instead of reading from a stale path.
 *
 * In interpreted mode the dynamic import resolves to the real filesystem
 * path and the patch is effectively a no-op (reads the same bytes).
 *
 * This module MUST be imported before any code that loads oxigraph.
 */

import { readFileSync } from "node:fs";

// @ts-expect-error — bun-specific import attribute for file embedding
const { default: wasmPath } = await import("oxigraph/node_bg.wasm", {
  with: { type: "file" },
});
const wasmBytes = readFileSync(wasmPath);

// Oxigraph's CJS wrapper uses require("fs").readFileSync(...) to load
// the WASM. Patch the CJS fs module (mutable, unlike ESM bindings) so
// reads targeting node_bg.wasm return the pre-loaded bytes.
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
