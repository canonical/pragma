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
import type { PackRow, StoryOrigin } from "../types.js";

/**
 * True when a trusted, generated query failed because the store does not know a
 * prefix it used. Generated queries are composed from terms the distribution
 * declares and from a pack's own story text, never from user input — so an
 * unknown prefix is never a query bug. It means this store was not built from a
 * pack that binds that term: most often nothing was built at all, and otherwise
 * a store built from a pack whose vocabulary is simply different.
 *
 * Widening this any further would start hiding query bugs, which is the failure
 * this whole choke point exists to prevent.
 *
 * WHOSE fault it is depends on the query's {@link StoryOrigin}, which
 * {@link queryOrRemap} now has. For the DISTRIBUTION's own stories the store is
 * simply not built and `sources update` is the answer. For a story a package or
 * the user's config declared, the store is built and binds a different
 * vocabulary — `sources update` cannot help, and telling its author to run it
 * sends them to the wrong lever. `buildIndex`'s alt-name predicate already
 * treats the same condition as the ordinary third-party case and degrades
 * gracefully; only this path escalated.
 */
function isUnseededStoreError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /prefix/i.test(message) && /not\s+found/i.test(message);
}

/**
 * Run the facade query, remapping a store that cannot answer it. Returns the
 * inferred facade result type, so this module stays clear of a static
 * `@canonical/ke` import (the lazy-dispatch guard).
 *
 * The remap branches on WHO wrote the query:
 *
 * - `distribution` — its stories are compiled from terms this binary ships, so
 *   an unbound prefix means the store was never built from a pack that binds
 *   them: the first thing a fresh install hits. STORE_UNAVAILABLE with the
 *   canonical `sources update` recovery, instead of a raw SPARQL
 *   "Prefix not found" wrapped as INTERNAL_ERROR ("please report this issue").
 * - `config` / `package` — the store IS available; the story names a term it
 *   does not bind. That is a declaration error, so it is CONFIG_ERROR naming
 *   the story, with NO `sources update` hint — rebuilding cannot bind a prefix
 *   nothing declares.
 *
 * @note Impure — issues a SPARQL query against the live store through the query
 *   facade. {@link runSelect} below carries the same note for the same reason;
 *   the two are annotated together so the file does not read as if one of them
 *   were pure.
 */
async function queryOrRemap(
  rt: Pick<PragmaRuntime, "query">,
  query: string,
  origin: StoryOrigin,
) {
  try {
    return await rt.query.sparql(query);
  } catch (error) {
    if (error instanceof PragmaError) throw error;
    if (isUnseededStoreError(error)) {
      if (origin.kind === "distribution") {
        throw PragmaError.storeUnavailable(
          "The local store was not built from a pack that defines every term this read uses.",
          {
            recovery: cliRecovery(
              "sources update",
              "Build the local store from the configured packs.",
              // An agent recovers by calling the tool, then retrying (PR9 C1
              // cold-store retry makes the post-update retry succeed).
              { tool: "sources_update" },
            ),
          },
        );
      }
      throw PragmaError.configError(
        `Story in ${origin.label} uses a prefix the built store does not bind. ` +
          "Declare the prefix, or point the story at a term the configured packs define.",
      );
    }
    throw error;
  }
}

/**
 * @param rt - The runtime (its query facade over the lazy store).
 * @param query - SPARQL SELECT text (prefixes auto-applied by the store).
 * @param origin - Who authored the story, for attribution AND for deciding
 *   whether an unbound prefix is an unbuilt store or a bad declaration.
 * @returns One record per row, keyed by SELECT variable name.
 * @throws PragmaError CONFIG_ERROR when the query is not a SELECT, or when a
 *   config/package story names a prefix the built store does not bind;
 *   STORE_UNAVAILABLE (exit 3) when a DISTRIBUTION story hits an unseeded store.
 * @note Impure — queries the store through the facade.
 */
export async function runSelect(
  rt: Pick<PragmaRuntime, "query">,
  query: string,
  origin: StoryOrigin,
): Promise<PackRow[]> {
  const result = await queryOrRemap(rt, query, origin);
  if (result.type !== "select") {
    throw PragmaError.configError(
      `Story query in ${origin.label} must be a SELECT (got ${result.type}).`,
    );
  }
  return result.bindings as PackRow[];
}
