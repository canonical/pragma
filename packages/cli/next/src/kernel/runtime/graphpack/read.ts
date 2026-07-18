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
import { PragmaError } from "../../error/PragmaError.js";
import type { StoreSession } from "../types.js";
import { readManifest } from "./manifest.js";
import {
  DATA_FILE,
  INDEX_FILE,
  packIndexSchema,
  SCHEMA_FILE,
} from "./types.js";

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
    throw PragmaError.storeUnavailable(`The pack at ${dir} is incomplete.`, {
      recovery: { message: "Rebuild it with `pragma sources update`." },
    });
  }

  const store = await createStore({
    // Cache hit loads the n-quads dump directly — no sources are re-parsed.
    sources: [],
    prefixes: manifest.prefixes,
    cache: join(dir, DATA_FILE),
  });

  const compiled = compileFromExtraction(
    readFileSync(join(dir, SCHEMA_FILE), "utf-8"),
  );
  const index = packIndexSchema.parse(
    JSON.parse(readFileSync(join(dir, INDEX_FILE), "utf-8")),
  );

  return {
    store,
    schema: compiled.schema,
    createContext: compiled.createContext,
    prefixes: manifest.prefixes,
    index,
  };
}
