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

/** STORE_UNAVAILABLE with the canonical `pragma sources update` recovery (CLI + MCP). */
function packUnavailable(reason: string): PragmaError {
  return PragmaError.storeUnavailable(reason, {
    recovery: cliRecovery(
      `${RECOVERY_CLI_PREFIX}sources update`,
      "Rebuild the local store from the configured packages.",
      // An agent recovers by calling the tool, then retrying (PR9 C1 cold-store
      // retry makes the post-update retry succeed).
      { tool: "sources_update" },
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

  // Guard against a corrupt or TRUNCATED `data.nq` beside an intact manifest:
  // ke silently serves whatever loaded (falling back to an EMPTY store on a
  // parse failure, and rewriting an empty dump). When the manifest records the
  // build-time triple count (A9), require the booted store to hold AT LEAST it:
  // a SHORTFALL means the dump was truncated (fewer triples than were built) —
  // it passes the mere size>0 completeness gate yet would serve a partial graph
  // silently, so it must surface STORE_UNAVAILABLE here. A benign SUPERSET (more
  // triples than recorded — e.g. a future ke counting change) is TOLERATED
  // rather than treated as corruption, so such a change can't trip a fleet-wide
  // false STORE_UNAVAILABLE. Older packs without the count fall back to the
  // "populated index but empty store" check (via the now-empty dump,
  // `packIsComplete` turns false so recovery rebuilds) rather than serving an
  // empty graph as the pack.
  const actualTriples = await countTriples(store);
  if (manifest.tripleCount !== undefined) {
    if (actualTriples < manifest.tripleCount) {
      store.dispose();
      throw packUnavailable(
        `The pack at ${dir} has a corrupt data cache (expected at least ${manifest.tripleCount} triples, loaded ${actualTriples}).`,
      );
    }
  } else if (index.entities.length > 0 && actualTriples === 0) {
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

/** Count the booted store's triples (a cheap aggregate over the union graph). */
async function countTriples(store: StoreSession["store"]): Promise<number> {
  const result = (await store.query(
    "SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }" as never,
  )) as import("@canonical/ke").SelectResult;
  return Number(result.bindings.at(0)?.n ?? 0);
}
