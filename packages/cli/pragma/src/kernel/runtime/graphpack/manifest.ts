/**
 * Read a pack's `manifest.json`. Its presence is the completeness marker: a
 * directory without a valid manifest is a torn build (writes land in a temp
 * directory and the manifest is renamed in last), so an absent or invalid
 * manifest means "treat the pack as not there".
 *
 * ZOD-FREE BY CONSTRUCTION, and that is the point of {@link parseManifest}.
 * This module is on the BOOT DECISION: `resolveSources` calls
 * `packIsComplete`, which calls `readManifest`, and `resolveSources` is
 * value-reachable from `capabilities/index.ts` — so whatever validates a
 * manifest is evaluated when the command tree is built, `__complete` and
 * `--help` included. The schema used to live in `types.ts` and cost ~3–4 ms of
 * a ~25 ms fast path; the hand-written check below costs a JSON.parse it was
 * doing anyway plus a dozen `typeof`s.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DATA_FILE,
  INDEX_FILE,
  MANIFEST_FILE,
  type Manifest,
  SCHEMA_FILE,
  STORIES_FILE,
} from "./types.js";

/** Every value in `record` is a string (and `record` is a plain object). */
function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

/** An absent-or-number field: present means it must be a number. */
function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === "number";
}

/**
 * Structurally validate a parsed `manifest.json`.
 *
 * The SINGLE reader of the manifest grammar — `readManifest` (every built pack)
 * and `embeddedManifest` (the inlined snapshot) both go through it, so there is
 * no second writing to drift from. Deliberately structural rather than
 * schema-driven: see this module's docblock for the measurement.
 *
 * @param value - The result of `JSON.parse` on a manifest's bytes.
 * @returns The manifest, or `undefined` when the shape does not hold.
 */
export function parseManifest(value: unknown): Manifest | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const candidate = value as Record<string, unknown>;
  const strings = ["name", "version", "sourceRef", "contentHash", "createdAt"];
  if (strings.some((field) => typeof candidate[field] !== "string")) {
    return undefined;
  }
  if (!isStringRecord(candidate.prefixes)) return undefined;
  if (!isOptionalNumber(candidate.tripleCount)) return undefined;
  if (!isOptionalNumber(candidate.entityCount)) return undefined;
  return candidate as unknown as Manifest;
}

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
    return parseManifest(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return undefined;
  }
}

/** Whether a pack directory holds a complete pack: a valid manifest AND every
 * non-empty content artifact — the `data.nq` dump, the extracted `schema.json`,
 * the entity `index.json`, and the carried `stories.json`. The manifest alone is
 * not enough: an intact manifest beside a missing/truncated `data.nq` boots
 * EMPTY (a silent, then permanent, loss), and a torn or evicted
 * `schema.json`/`index.json` (manifest + dump intact) would be REUSED by
 * `buildPack` and then fail at BOOT as an internal error. `stories.json` is
 * gated for the same reason and unconditionally: it is written even when empty
 * (as `[]`, which is non-empty text), so a pack directory lacking it is one
 * whose content hash covers stories the directory does not hold — reusing it
 * would silently drop every package-declared noun. Requiring all four present +
 * non-empty makes `buildPack` rebuild a torn pack and makes the boot decision
 * surface STORE_UNAVAILABLE (the ordinary "not built" recovery) instead of a
 * "please report this" crash. */
export function packIsComplete(dir: string): boolean {
  if (readManifest(dir) === undefined) return false;
  for (const file of [DATA_FILE, SCHEMA_FILE, INDEX_FILE, STORIES_FILE]) {
    try {
      if (statSync(join(dir, file)).size <= 0) return false;
    } catch {
      return false;
    }
  }
  return true;
}
