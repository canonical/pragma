/**
 * The embedded pack: the distribution's own graph, compiled from the packs
 * `pragma.conf.ts` declares and inlined into the binary as escaped strings
 * (`pack.generated.ts`, produced by `scripts/bundle.ts`). It is the store the
 * CLI boots when the user has not pinned their own packs and has not built
 * anything yet — so a fresh install answers real store-backed reads with no
 * network, no cache, and no git credentials.
 *
 * It is a SNAPSHOT, not a substitute for `sources update`: the manifest records
 * which upstream revisions it was compiled from, and both `sources status` and
 * `doctor` report that rather than claiming the store is up to date. A project
 * that declares its own packs is never served this graph.
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
  type Manifest,
  manifestSchema,
  SCHEMA_FILE,
} from "./types.js";

/**
 * The embedded pack's manifest, parsed from the inlined string.
 *
 * Carries the provenance `sources status` and `doctor` report — `sourceRef`
 * (which upstream revisions the snapshot was compiled from), `createdAt`, the
 * counts — plus the `contentHash` that names its cache directory. Reading it
 * costs one `JSON.parse` of a ~1 KB string, so neither surface has to
 * materialize the 1.9 MB pack just to describe it.
 */
export function embeddedManifest(): Manifest {
  return manifestSchema.parse(JSON.parse(manifestJson));
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
  const dir = packDir(embeddedManifest().contentHash);
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
