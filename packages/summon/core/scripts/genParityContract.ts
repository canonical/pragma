/**
 * Regenerate `docs/parity-contract.md` from the projection.
 *
 * Write-when-changed: byte-equal content leaves the file untouched, so the
 * script is safe to run in any state and its exit is always the fresh truth.
 * The byte-drift test (`src/projection/parityContract.test.ts`) holds the
 * committed file to the emitter; this script is the fix for a red drift test.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import emitParityContract from "../src/projection/emitParityContract.js";

const target = fileURLToPath(
  new URL("../docs/parity-contract.md", import.meta.url),
);
const next = emitParityContract();

let current: string | undefined;
try {
  current = readFileSync(target, "utf-8");
} catch {
  current = undefined;
}

if (current === next) {
  console.log("docs/parity-contract.md unchanged");
} else {
  writeFileSync(target, next);
  console.log("Wrote docs/parity-contract.md");
}
