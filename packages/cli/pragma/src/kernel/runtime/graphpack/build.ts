/**
 * Build a content-addressed pack from RDF source inputs.
 *
 * This is the ONE place the live ke-graphql 7-pass `compile` runs (~210 ms):
 * building is when we can afford it. The store is created once (parsing the
 * TTL and writing the `data.nq` n-quads dump via ke's cache), the schema is
 * extracted and serialized, the entity index is built, and a manifest is
 * written LAST so the directory is only ever observed complete. Writes go to a
 * temp directory and are atomically renamed into `packs/<contentHash>/`, so a
 * crashed build never leaves a half-written pack; a hash whose directory is
 * already complete is reused untouched.
 *
 * Reached only behind a dynamic import (`sources update`), never on the
 * storeless fast path.
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
import { createStore } from "@canonical/ke";
import {
  compile,
  createStoreQueryFn,
  serializeExtraction,
} from "@canonical/ke-graphql";
import { packDir, packsCacheDir } from "../paths.js";
import { buildIndex } from "./buildIndex.js";
import { contentHash, hashSources } from "./hash.js";
import { packIsComplete, readManifest } from "./manifest.js";
import {
  DATA_FILE,
  INDEX_FILE,
  MANIFEST_FILE,
  type Manifest,
  SCHEMA_FILE,
} from "./types.js";

/** One RDF source to build into a pack. */
export interface BuildPackInput {
  /** Stable path label — part of the content hash. */
  readonly path: string;
  /** Raw RDF content. */
  readonly content: string;
}

/** Provenance and options for a pack build. */
export interface BuildPackOptions {
  readonly name: string;
  readonly version: string;
  /** The config `packages` ref (verbatim) or a label. */
  readonly sourceRef: string;
  /** Prefixes the store (and every query) is built with. */
  readonly prefixes?: Readonly<Record<string, string>>;
}

/** The outcome of a pack build (or cache hit). */
export interface BuildPackResult {
  readonly dir: string;
  readonly contentHash: string;
  readonly manifest: Manifest;
  /** True when an already-complete pack was reused rather than rebuilt. */
  readonly reused: boolean;
}

/**
 * Build (or reuse) the pack for a set of source inputs.
 *
 * @param inputs - The RDF sources (path + content).
 * @param options - Provenance and the prefixes to build with.
 * @returns The pack directory, its content hash, and whether it was reused.
 * @note Impure — creates a store, compiles the schema, writes the pack.
 */
export async function buildPack(
  inputs: readonly BuildPackInput[],
  options: BuildPackOptions,
): Promise<BuildPackResult> {
  const hash = await contentHash(
    inputs.map((input) => ({ path: input.path, content: input.content })),
  );
  const dir = packDir(hash);

  // Reuse only a COMPLETE pack (manifest + non-empty dump). A corrupt cache
  // (intact manifest, ruined `data.nq`) must rebuild, not be reused — otherwise
  // an emptied dump would be permanent.
  if (packIsComplete(dir)) {
    const cached = readManifest(dir);
    if (cached)
      return { dir, contentHash: hash, manifest: cached, reused: true };
  }

  mkdirSync(packsCacheDir(), { recursive: true });
  const temp = mkdtempSync(
    join(packsCacheDir(), `.build-${hash.slice(0, 12)}-`),
  );
  try {
    const prefixes = options.prefixes ?? {};
    const store = await createStore({
      sources: inputs.map((input) => ({
        content: input.content,
        path: input.path,
      })),
      prefixes,
      // ke writes the n-quads dump here after loading — our `data.nq`.
      cache: join(temp, DATA_FILE),
    });

    try {
      const compiled = await compile(createStoreQueryFn(store), store.prefixes);
      const sourcesHash = hashSources(inputs.map((input) => input.content));
      writeFileSync(
        join(temp, SCHEMA_FILE),
        serializeExtraction(compiled.extraction, sourcesHash),
      );

      const index = await buildIndex(store, store.prefixes, hash);
      writeFileSync(join(temp, INDEX_FILE), JSON.stringify(index));

      const tripleCount = await countTriples(store);
      // Distinct abox subjects — the same figure `entityTotal` reports (A10),
      // so `sources status` reads it from the manifest without parsing the
      // whole index.json. Keep this in sync with `entityTotal` in entitySource.
      const entityCount = new Set(
        index.entities
          .filter((entity) => entity.box === "abox")
          .map((entity) => entity.uri ?? entity.name),
      ).size;

      const manifest: Manifest = {
        name: options.name,
        version: options.version,
        sourceRef: options.sourceRef,
        contentHash: hash,
        prefixes: { ...store.prefixes },
        createdAt: new Date().toISOString(),
        tripleCount,
        entityCount,
      };
      // Written LAST — the completeness marker for the directory.
      writeFileSync(join(temp, MANIFEST_FILE), JSON.stringify(manifest));

      // Publish atomically. A concurrent builder may have won the race — its
      // pack is content-identical, so keep it and drop ours.
      if (!packIsComplete(dir)) {
        rmSync(dir, { recursive: true, force: true });
        renameSync(temp, dir);
      }
      return { dir, contentHash: hash, manifest, reused: false };
    } finally {
      store.dispose();
    }
  } finally {
    if (existsSync(temp)) rmSync(temp, { recursive: true, force: true });
  }
}

/**
 * Count a store's triples (a cheap aggregate over the union graph).
 *
 * @param store - The booted store.
 * @returns The number of triples.
 * @note Impure — runs a COUNT query against the store.
 */
async function countTriples(
  store: Awaited<ReturnType<typeof createStore>>,
): Promise<number> {
  const result = (await store.query(
    "SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }" as never,
  )) as import("@canonical/ke").SelectResult;
  return Number(result.bindings.at(0)?.n ?? 0);
}
