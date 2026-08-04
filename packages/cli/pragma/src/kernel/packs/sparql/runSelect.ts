/**
 * Run a pack story's SELECT through the query facade and return its rows.
 *
 * The store rejects non-read queries at the engine level; this guards the result
 * shape so a pack whose query is not a SELECT fails with a recoverable config
 * error instead of a shape mismatch downstream. The facade boots the store
 * lazily and auto-applies the pack's prefixes, so generated queries use prefixed
 * terms directly. This is the single choke point for every TRUSTED, generated
 * SPARQL read (list stories, lookup name→URI resolves, expands) — user SPARQL
 * (`graph query`) goes through the facade directly and stays INVALID_INPUT.
 */

import { PragmaError } from "../../error/PragmaError.js";
import { cliRecovery } from "../../error/recovery.js";
import type { PragmaRuntime } from "../../runtime/types.js";
import type { PackRow } from "../types.js";

/**
 * True when a trusted, generated query failed because the store does not know a
 * prefix it used. Generated queries are composed from terms the distribution
 * declares and from a pack's own story text, never from user input — so an
 * unknown prefix is never a query bug. It means this store was not built from a
 * pack that binds that term: most often nothing was built at all, and otherwise
 * a store built from a pack whose vocabulary is simply different.
 *
 * Both are answered by the same lever (`sources update`), so both are remapped;
 * the message says which claim it is actually making, and does NOT assert the
 * store is unbuilt. Widening this any further would start hiding query bugs,
 * which is the failure this whole choke point exists to prevent.
 *
 * KNOWN GAP, since stories may now arrive from a package or a user's config: a
 * third-party author's typo lands here too, and `sources update` cannot help
 * them. Distinguishing that from an unbuilt store needs the query's provenance
 * at the failure site, which this function is not given. Left for the tranche
 * that threads it.
 */
function isUnseededStoreError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /prefix/i.test(message) && /not\s+found/i.test(message);
}

/**
 * Run the facade query, remapping a store that cannot answer it. A generated
 * query hitting an unknown prefix is answered by building the store (the first
 * thing a fresh install hits) — surface the actionable STORE_UNAVAILABLE with
 * the canonical `sources update` recovery instead of a raw SPARQL "Prefix not
 * found" wrapped as INTERNAL_ERROR ("please report this issue"). Returns the
 * inferred facade result type, so this module stays clear of a static
 * `@canonical/ke` import (the lazy-dispatch guard).
 */
async function queryOrRemap(rt: Pick<PragmaRuntime, "query">, query: string) {
  try {
    return await rt.query.sparql(query);
  } catch (error) {
    if (error instanceof PragmaError) throw error;
    if (isUnseededStoreError(error)) {
      throw PragmaError.storeUnavailable(
        "The local store was not built from a pack that defines every term this read uses.",
        {
          recovery: cliRecovery(
            "sources update",
            "Build the local store from the configured packs.",
            // An agent recovers by calling the tool, then retrying (PR9 C1 cold-
            // store retry makes the post-update retry succeed).
            { tool: "sources_update" },
          ),
        },
      );
    }
    throw error;
  }
}

/**
 * @param rt - The runtime (its query facade over the lazy store).
 * @param query - SPARQL SELECT text (prefixes auto-applied by the store).
 * @param source - The pack source, for error attribution.
 * @returns One record per row, keyed by SELECT variable name.
 * @throws PragmaError CONFIG_ERROR when the query is not a SELECT;
 *   STORE_UNAVAILABLE (exit 3) when the store is unseeded.
 * @note Impure — queries the store through the facade.
 */
export async function runSelect(
  rt: Pick<PragmaRuntime, "query">,
  query: string,
  source: string,
): Promise<PackRow[]> {
  const result = await queryOrRemap(rt, query);
  if (result.type !== "select") {
    throw PragmaError.configError(
      `Story query in ${source} must be a SELECT (got ${result.type}).`,
    );
  }
  return result.bindings as PackRow[];
}
