/**
 * Embed oxigraph WASM for `bun build --compile`.
 *
 * Bun's bundler does not automatically embed WASM files loaded via
 * `readFileSync(path.join(__dirname, 'node_bg.wasm'))` or template literal
 * equivalents — the `__dirname` is hardcoded to the build-time path and
 * `readFileSync` is not intercepted for embedded data at runtime.
 *
 * Using `import ... with { type: "file" }`, bun embeds the WASM bytes
 * into the compiled binary and maps the path to its internal `$bunfs`
 * virtual filesystem. We then patch `readFileSync` to intercept calls
 * for `node_bg.wasm` and return the embedded bytes.
 *
 * This module MUST be imported before any code that loads oxigraph.
 *
 * @note Only affects compiled binaries. In interpreted mode, the WASM
 * file exists on disk and `readFileSync` works normally.
 */

import { readFileSync } from "node:fs";
// @ts-expect-error — bun import attribute for file embedding
import embeddedWasmPath from "oxigraph/node_bg.wasm" with { type: "file" };

const wasmBytes = readFileSync(embeddedWasmPath);

// Oxigraph's CJS wrapper uses require("fs").readFileSync(...) to load the
// WASM. We patch the CJS fs module object (mutable, unlike ESM bindings)
// so that reads targeting node_bg.wasm return the embedded bytes.
// eslint-disable-next-line @typescript-eslint/no-require-imports
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
