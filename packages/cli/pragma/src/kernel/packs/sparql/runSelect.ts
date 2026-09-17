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

import { callRecovery, PragmaError } from "../../error/index.js";
import type { PragmaRuntime } from "../../runtime/index.js";
import type { PackRow, StorySource } from "../types.js";

/**
 * True when a trusted, generated query failed because the store does not know a
 * prefix it used. Generated queries are composed from terms the distribution
 * declares and from a pack's own story text, never from user input — so an
 * unknown prefix is never a query bug. It means this store was not built from a
 * pack that binds that term: most often nothing was built at all, and otherwise
 * a store built from a pack whose vocabulary is simply different.
 *
 * For a DISTRIBUTION story both are answered by the same lever
 * (`sources update`), so both are remapped to it; the message says which claim
 * it is actually making, and does NOT assert the store is unbuilt. Widening the
 * detection any further would start hiding query bugs, which is the failure this
 * whole choke point exists to prevent.
 *
 * A story from a package or a user's config is a different diagnosis, which is
 * why {@link runSelect} now takes the query's provenance: see
 * {@link unboundPrefixError}.
 */
function isUnseededStoreError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /prefix/i.test(message) && /not\s+found/i.test(message);
}

/**
 * The error for a generated query naming a prefix the graph does not bind,
 * diagnosed by WHO declared the story.
 *
 * A distribution story ships with the packs that bind its terms, so the honest
 * reading is "nothing is built yet" (or "what is built came from a pack with a
 * different vocabulary") — both fixed by `sources update`, so it keeps today's
 * STORE_UNAVAILABLE and that recovery.
 *
 * A config or package story is the author's own: they named a prefix the graph
 * does not bind, and `sources update` cannot help them — `buildIndex` already
 * treats the same condition as the ordinary third-party case and degrades
 * gracefully, while this path escalated it. It is a CONFIG_ERROR naming the
 * story, which is the module's own precedent for a declaration that cannot be
 * served (ruling R3).
 */
function unboundPrefixError(source: StorySource): PragmaError {
  if (source.origin !== "distribution") {
    return PragmaError.configError(
      `Story query in ${source.label} uses a prefix the graph does not bind. ` +
        `Declare it under \`prefixes\`, or use a term the configured packs define.`,
    );
  }
  return PragmaError.storeUnavailable(
    "The local store was not built from a pack that defines every term this read uses.",
    {
      recovery: callRecovery(
        { verb: "sources update" },
        "Build the local store from the configured packs.",
      ),
    },
  );
}

/**
 * Run the facade query, remapping a store that cannot answer it. A generated
 * query hitting an unknown prefix surfaces an actionable error — chosen by the
 * story's provenance, see {@link unboundPrefixError} — instead of a raw SPARQL
 * "Prefix not found" wrapped as INTERNAL_ERROR ("report this issue").
 * Returns the inferred facade result type, so this module stays clear of a
 * static `@canonical/ke` import (the lazy-dispatch guard).
 */
async function queryOrRemap(
  rt: Pick<PragmaRuntime, "query">,
  query: string,
  source: StorySource,
  degradeOnUnboundPrefix: boolean,
) {
  try {
    return await rt.query.sparql(query);
  } catch (error) {
    if (error instanceof PragmaError) throw error;
    if (isUnseededStoreError(error)) {
      if (degradeOnUnboundPrefix) return undefined;
      throw unboundPrefixError(source);
    }
    throw error;
  }
}

/** How one generated read wants an unbound prefix handled. */
export interface RunSelectOptions {
  /**
   * Answer NO ROWS, rather than raising, when the store binds none of the
   * vocabulary this query names.
   *
   * For the read that IS the answer — a list, a name resolve, a lookup's own
   * fields — raising is right: the caller asked for something this store
   * cannot speak about, and a silent empty result is the "empty ≠ silence"
   * defect. For ONE SECTION of a lookup it is not. A section's vocabulary can
   * come from a different pack than the entity's: a block is `ds:`, and the
   * style key and state of the tokens it consumes are the anatomy DSL's. A
   * store built without that pack answers every OTHER section correctly, and
   * taking the whole entity down over one absent section would make
   * `block lookup` fail outright on a graph it can very nearly fully describe.
   *
   * Degrading is what the lookup's other lane already does with the same
   * condition — a GraphQL document omits a name the compiled schema has no
   * field for, the way an OPTIONAL omits an unbound variable — so this keeps
   * one contract across both lanes rather than two.
   *
   * It cannot hide an unbuilt store: by the time a section is read, the base
   * resolve has already answered from this store, so an unbound prefix here
   * can only mean this pack's vocabulary is narrower than the story's.
   */
  readonly degradeOnUnboundPrefix?: true;
}

/**
 * @param rt - The runtime (its query facade over the lazy store).
 * @param query - SPARQL SELECT text (prefixes auto-applied by the store).
 * @param source - The story's provenance: its label for attribution, and the
 *   layer that declared it, which decides how an unbound prefix is diagnosed.
 * @param options - See {@link RunSelectOptions}; defaults to raising.
 * @returns One record per row, keyed by SELECT variable name.
 * @throws PragmaError CONFIG_ERROR when the query is not a SELECT, or when a
 *   config/package story names a prefix the graph does not bind;
 *   STORE_UNAVAILABLE (exit 3) when a distribution story finds one.
 * @note Impure — queries the store through the facade.
 */
export async function runSelect(
  rt: Pick<PragmaRuntime, "query">,
  query: string,
  source: StorySource,
  options: RunSelectOptions = {},
): Promise<PackRow[]> {
  const result = await queryOrRemap(
    rt,
    query,
    source,
    options.degradeOnUnboundPrefix === true,
  );
  if (result === undefined) return [];
  if (result.type !== "select") {
    throw PragmaError.configError(
      `Story query in ${source.label} must be a SELECT (got ${result.type}).`,
    );
  }
  return result.bindings as PackRow[];
}
