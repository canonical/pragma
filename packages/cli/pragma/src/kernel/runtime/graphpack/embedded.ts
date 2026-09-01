/**
 * The embedded pack: the distribution's own graph, compiled from the packs
 * `pragma.conf.ts` declares and inlined into the source as escaped strings
 * (`pack.generated.ts`, produced by `scripts/bundle.ts`). It is the store the
 * CLI boots when the user has not pinned their own packs and has not built
 * anything yet — so a fresh install answers real store-backed reads with no
 * network, no cache, and no git credentials.
 *
 * It is a SNAPSHOT, not a substitute for `sources update`: the manifest records
 * which upstream revisions it was compiled from, and both `sources status` and
 * `doctor` report that rather than claiming the store is up to date. A project
 * that declares its own packs and has not built them is never served this graph:
 * every read, `info`, `sources status`, `doctor` and the MCP prompt/resource
 * surfaces take {@link resolveSources}' answer and refuse. The one exception is
 * the shell-completion fast path, which cannot read config at all (see
 * `kernel/completion/entitySource.ts`) and so still offers this graph's names as
 * completion candidates — candidates, never content.
 *
 * The inlined strings are materialized into the ordinary content-addressed pack
 * cache on first use and then read back through {@link readPack}, so the
 * embedded pack and a built pack share one boot path. The story records, the
 * index and the MANIFEST each live in their own generated module: every one of
 * them is read on a path that does not need the n-quads, and leaving any of
 * them beside `pack.generated.ts` would load its ~2.1 MB with them — a measured
 * +28 ms on every invocation for the stories, and ~370 ms per CLI invocation
 * for the manifest at a 30,340-triple pack. Inlining as JS strings
 * (rather than file assets) means the pack travels with the emitted modules —
 * it needs no asset step in any build, and no file lookup at run time.
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
import { indexJson } from "./embedded/pack.index.generated.js";
import { manifestJson } from "./embedded/pack.manifest.generated.js";
import { storiesJson } from "./embedded/pack.stories.generated.js";
import { packIsComplete } from "./manifest.js";
import { manifestSchema } from "./schemas.js";
import {
  DATA_FILE,
  INDEX_FILE,
  MANIFEST_FILE,
  type Manifest,
  SCHEMA_FILE,
  STORIES_FILE,
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
export async function materializeEmbeddedPack(): Promise<string> {
  const dir = packDir(embeddedManifest().contentHash);
  if (packIsComplete(dir)) return dir;

  // Loaded HERE, not at module scope: this is the only branch that needs the
  // payload, and it is the branch that does NOT run once the pack is cached.
  // A static import would parse ~2.1 MB of inlined n-quads on every boot to
  // reach a return statement six lines above.
  const { dataNq, schemaJson } = await import("./embedded/pack.generated.js");

  mkdirSync(packsCacheDir(), { recursive: true });
  const temp = mkdtempSync(join(packsCacheDir(), ".embed-"));
  try {
    writeFileSync(join(temp, DATA_FILE), dataNq);
    writeFileSync(join(temp, SCHEMA_FILE), schemaJson);
    writeFileSync(join(temp, INDEX_FILE), indexJson);
    writeFileSync(join(temp, STORIES_FILE), storiesJson);
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
