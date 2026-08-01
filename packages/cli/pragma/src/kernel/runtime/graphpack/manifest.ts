/**
 * Read a pack's `manifest.json`. Its presence is the completeness marker: a
 * directory without a valid manifest is a torn build (writes land in a temp
 * directory and the manifest is renamed in last), so an absent or invalid
 * manifest means "treat the pack as not there".
 *
 * This module is on the storeless FAST PATH (`resolveSources` → `packIsComplete`
 * → here, while `__complete` builds the command tree), so it validates the ~1 KB
 * manifest structurally instead of importing zod to do it — that import was
 * ~3–4 ms of a ~30 ms budget. {@link validateManifest} is held to the schema's
 * behaviour by `graphpack.test.ts`, which pins the two to accept the same inputs
 * in both directions; `schemas.ts` remains the executable specification.
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

/** Whether `value` is a plain object of strings — the `prefixes` map's shape. */
function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

/**
 * Validate a parsed `manifest.json` payload structurally.
 *
 * Mirrors `manifestSchema` exactly, including its STRIP semantics: a valid
 * manifest is reconstructed field by field, so an unknown key in the file is
 * dropped rather than carried into the returned object (zod's `z.object`
 * default, which several callers rely on when they re-serialize a manifest).
 *
 * @param value - The `JSON.parse` result to validate.
 * @returns The manifest, or `undefined` when the payload does not conform.
 */
export function validateManifest(value: unknown): Manifest | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  const { tripleCount, entityCount } = raw;
  if (
    typeof raw.name !== "string" ||
    typeof raw.version !== "string" ||
    typeof raw.sourceRef !== "string" ||
    typeof raw.contentHash !== "string" ||
    typeof raw.createdAt !== "string" ||
    !isStringRecord(raw.prefixes) ||
    (tripleCount !== undefined && typeof tripleCount !== "number") ||
    (entityCount !== undefined && typeof entityCount !== "number")
  ) {
    return undefined;
  }
  return {
    name: raw.name,
    version: raw.version,
    sourceRef: raw.sourceRef,
    contentHash: raw.contentHash,
    prefixes: raw.prefixes,
    createdAt: raw.createdAt,
    ...(tripleCount === undefined ? {} : { tripleCount }),
    ...(entityCount === undefined ? {} : { entityCount }),
  };
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
    return validateManifest(JSON.parse(readFileSync(path, "utf-8")));
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
 * "please report this" crash. `stories.json` is additionally gated on its SHAPE
 * — see {@link storiesAreReadable} for why it, and only it, is parsed here. */
export function packIsComplete(dir: string): boolean {
  if (readManifest(dir) === undefined) return false;
  for (const file of [DATA_FILE, SCHEMA_FILE, INDEX_FILE, STORIES_FILE]) {
    try {
      if (statSync(join(dir, file)).size <= 0) return false;
    } catch {
      return false;
    }
  }
  return storiesAreReadable(dir);
}

/**
 * Whether `stories.json` holds what its reader expects: a JSON ARRAY.
 *
 * Size alone was not enough, and stories are the one artifact where that gap is
 * SILENT. A non-empty but non-array `stories.json` passed the size gate, so
 * `buildPack` REUSED the directory and every package-declared noun vanished
 * while `sources update` reported success — with `parseRecords`' fix, without
 * even an error line to attribute. Parsing it turns that into an incomplete
 * pack: the boot decision reports the ordinary STORE_UNAVAILABLE and the next
 * `buildPack` rebuilds, which is the recovery the other three artifacts already
 * get.
 *
 * SHAPE ONLY, deliberately: `Array.isArray`, not a check of the records inside.
 * A malformed or schema-invalid RECORD is the one guard in
 * `packs/collect.validateStories`, which names it on stderr and under `doctor`
 * — a story a third party got wrong must not make the whole pack unreadable.
 *
 * `data.nq` and `schema.json` stay SIZE-gated on purpose. A truncated `data.nq`
 * is caught downstream by `readPack`'s A9 triple-count cross-check, which is
 * stronger than any parse here; a corrupt `schema.json` still surfaces
 * unclassified, and that gap is pinned separately rather than absorbed into this
 * one — this is the fast path, and it parses only the artifact whose failure is
 * otherwise invisible.
 *
 * @param dir - The pack directory.
 * @returns Whether the stories artifact parses as an array.
 * @note Impure — reads from disk.
 */
function storiesAreReadable(dir: string): boolean {
  try {
    return Array.isArray(
      JSON.parse(readFileSync(join(dir, STORIES_FILE), "utf-8")),
    );
  } catch {
    return false;
  }
}
