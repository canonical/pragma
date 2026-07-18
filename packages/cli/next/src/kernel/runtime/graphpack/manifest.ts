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
  MANIFEST_FILE,
  type Manifest,
  manifestSchema,
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

/** Whether a pack directory holds a complete pack: a valid manifest AND a
 * non-empty `data.nq` dump. The manifest alone is not enough — an intact
 * manifest beside a missing or truncated `data.nq` is a corrupt pack (ke would
 * boot it EMPTY and rewrite an empty dump — a silent, then permanent, loss).
 * Requiring a non-empty dump here makes the boot decision surface
 * STORE_UNAVAILABLE and makes `buildPack` rebuild it instead of reusing the
 * ruin. */
export function packIsComplete(dir: string): boolean {
  if (readManifest(dir) === undefined) return false;
  try {
    return statSync(join(dir, DATA_FILE)).size > 0;
  } catch {
    return false;
  }
}
