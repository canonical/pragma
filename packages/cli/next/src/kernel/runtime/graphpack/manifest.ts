/**
 * Read a pack's `manifest.json`. Its presence is the completeness marker: a
 * directory without a valid manifest is a torn build (writes land in a temp
 * directory and the manifest is renamed in last), so an absent or invalid
 * manifest means "treat the pack as not there".
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DATA_FILE,
  INDEX_FILE,
  MANIFEST_FILE,
  type Manifest,
  manifestSchema,
  SCHEMA_FILE,
} from "./types.js";

/**
 * Read and validate a pack directory's manifest.
 *
 * @param dir - The pack directory.
 * @returns The parsed manifest, or `undefined` when absent or invalid.
 * @note Impure — reads from disk.
 */
export function readManifest(dir: string): Manifest | undefined {
  const path = join(dir, MANIFEST_FILE);
  if (!existsSync(path)) return undefined;
  try {
    return manifestSchema.parse(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return undefined;
  }
}

/** Whether a pack directory holds a complete pack: a valid manifest AND every
 * non-empty query artifact — the `data.nq` dump, the extracted `schema.json`,
 * and the entity `index.json`. The manifest alone is not enough: an intact
 * manifest beside a missing/truncated `data.nq` boots EMPTY (a silent, then
 * permanent, loss), and a torn or evicted `schema.json`/`index.json` (manifest +
 * dump intact) would be REUSED by `buildPack` and then fail at BOOT as an
 * internal error. Requiring all three present + non-empty makes `buildPack`
 * rebuild a torn pack and makes the boot decision surface STORE_UNAVAILABLE
 * (the ordinary "not built" recovery) instead of a "please report this" crash. */
export function packIsComplete(dir: string): boolean {
  if (readManifest(dir) === undefined) return false;
  for (const file of [DATA_FILE, SCHEMA_FILE, INDEX_FILE]) {
    try {
      if (statSync(join(dir, file)).size <= 0) return false;
    } catch {
      return false;
    }
  }
  return true;
}
