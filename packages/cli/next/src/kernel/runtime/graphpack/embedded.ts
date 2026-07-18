/**
 * The embedded fallback pack: a small, self-contained pack compiled into the
 * binary as inlined strings (`pack.generated.ts`, produced by
 * `scripts/genEmbedded.ts`). It is the store the CLI boots when no packages are
 * configured beyond the defaults and no lock has been written yet — so a fresh
 * install answers store-backed reads without a network round-trip.
 *
 * The inlined strings are materialized into the ordinary content-addressed pack
 * cache on first use and then read back through {@link readPack}, so the
 * embedded pack and a built pack share one boot path. Inlining as JS strings
 * (rather than file assets) guarantees the content survives `bun build
 * --compile` with no asset-embedding step.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { packDir, packsCacheDir } from "../paths.js";
import { dataNq, manifestJson, schemaJson } from "./embedded/pack.generated.js";
import { indexJson } from "./embedded/pack.index.generated.js";
import { packIsComplete } from "./manifest.js";
import {
  DATA_FILE,
  INDEX_FILE,
  MANIFEST_FILE,
  manifestSchema,
  SCHEMA_FILE,
} from "./types.js";

/** The embedded pack's content hash (its cache-directory name). */
export function embeddedContentHash(): string {
  return manifestSchema.parse(JSON.parse(manifestJson)).contentHash;
}

/**
 * Materialize the embedded pack into the pack cache and return its directory.
 *
 * Idempotent: if the content-addressed directory already holds a complete pack
 * (this or a previous run, or a build with identical sources), it is reused.
 *
 * @returns The pack directory, ready for {@link readPack}.
 * @note Impure — writes the inlined pack files into the cache.
 */
export function materializeEmbeddedPack(): string {
  const dir = packDir(embeddedContentHash());
  if (packIsComplete(dir)) return dir;

  mkdirSync(packsCacheDir(), { recursive: true });
  const temp = mkdtempSync(join(packsCacheDir(), ".embed-"));
  try {
    writeFileSync(join(temp, DATA_FILE), dataNq);
    writeFileSync(join(temp, SCHEMA_FILE), schemaJson);
    writeFileSync(join(temp, INDEX_FILE), indexJson);
    // Written last — the completeness marker.
    writeFileSync(join(temp, MANIFEST_FILE), manifestJson);
    if (!packIsComplete(dir)) {
      rmSync(dir, { recursive: true, force: true });
      renameSync(temp, dir);
    }
  } finally {
    if (existsSync(temp)) rmSync(temp, { recursive: true, force: true });
  }
  return dir;
}
