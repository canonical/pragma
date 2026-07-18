/**
 * Boot a {@link StoreSession} from a built pack directory — the perf keystone.
 *
 * The store loads from `data.nq` through ke's cache path (no TTL parse), and
 * the executable GraphQL schema is rebuilt from `schema.json` via ke-graphql's
 * `compileFromExtraction` — passes 2-7, pure JS, no store, no SPARQL. The live
 * 7-pass `compile` is NEVER called here; that only runs at build time. The
 * entity index is a plain `JSON.parse`. The result is an immutable session the
 * lazy store memoizes for the process's lifetime.
 *
 * Reached only behind a dynamic import (store boot), never on the storeless
 * fast path.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createStore } from "@canonical/ke";
import { compileFromExtraction } from "@canonical/ke-graphql";
import { RECOVERY_CLI_PREFIX } from "../../../constants.js";
import { PragmaError } from "../../error/PragmaError.js";
import { cliRecovery } from "../../error/recovery.js";
import type { StoreSession } from "../types.js";
import { readManifest } from "./manifest.js";
import {
  DATA_FILE,
  INDEX_FILE,
  packIndexSchema,
  SCHEMA_FILE,
} from "./types.js";

/** STORE_UNAVAILABLE with the single canonical `pragma sources update` recovery. */
function packUnavailable(reason: string): PragmaError {
  return PragmaError.storeUnavailable(reason, {
    recovery: cliRecovery(
      `${RECOVERY_CLI_PREFIX}sources update`,
      "Rebuild the local store from the configured packages.",
    ),
  });
}

/**
 * Read a pack directory into a bootable store session.
 *
 * @param dir - The pack directory (must hold a complete pack).
 * @returns The store session: store, schema, context factory, prefixes, index.
 * @throws PragmaError STORE_UNAVAILABLE when the pack is incomplete.
 * @note Impure — creates a store from the cached n-quads dump.
 */
export async function readPack(dir: string): Promise<StoreSession> {
  const manifest = readManifest(dir);
  if (!manifest) {
    throw packUnavailable(`The pack at ${dir} is incomplete.`);
  }

  const store = await createStore({
    // Cache hit loads the n-quads dump directly — no sources are re-parsed.
    sources: [],
    prefixes: manifest.prefixes,
    cache: join(dir, DATA_FILE),
  });

  // `loaderCache: "process"` shares the DataLoader caches across every context
  // for this immutable store's lifetime (the MCP p95 win) — sound because the
  // store never mutates between reloads. PR7 relies on it.
  const compiled = compileFromExtraction(
    readFileSync(join(dir, SCHEMA_FILE), "utf-8"),
    { loaderCache: "process" },
  );
  const index = packIndexSchema.parse(
    JSON.parse(readFileSync(join(dir, INDEX_FILE), "utf-8")),
  );

  // Guard against a corrupt/unparseable `data.nq` beside an intact manifest:
  // ke silently falls back to an EMPTY store (and rewrites an empty dump).
  // If the index says the pack is populated but the store booted with no
  // triples, the cache is ruined — surface STORE_UNAVAILABLE (and, via the
  // now-empty dump, `packIsComplete` turns false so recovery rebuilds) rather
  // than serve an empty graph as if it were the pack.
  if (index.entities.length > 0 && !(await storeHasTriples(store))) {
    store.dispose();
    throw packUnavailable(`The pack at ${dir} has a corrupt data cache.`);
  }

  return {
    store,
    schema: compiled.schema,
    createContext: compiled.createContext,
    prefixes: manifest.prefixes,
    index,
  };
}

/** Whether the booted store holds at least one triple (a cheap ASK probe). */
async function storeHasTriples(store: StoreSession["store"]): Promise<boolean> {
  const result = (await store.query("ASK { ?s ?p ?o }" as never)) as {
    result: boolean;
  };
  return result.result === true;
}
