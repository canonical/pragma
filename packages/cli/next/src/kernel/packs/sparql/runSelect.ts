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

import { RECOVERY_CLI_PREFIX } from "../../../constants.js";
import { PragmaError } from "../../error/PragmaError.js";
import { cliRecovery } from "../../error/recovery.js";
import type { PragmaRuntime } from "../../runtime/types.js";
import type { PackRow } from "../types.js";

/**
 * True when a trusted, generated query failed because the store does not know a
 * prefix it used. A generated pack query only references the pack's own
 * ontology prefixes (`ds:`/`cs:`), so a "prefix not found" means the store is
 * unseeded — the fresh-install embedded fallback carries no design-system
 * ontology — rather than a query bug.
 */
function isUnseededStoreError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /prefix/i.test(message) && /not\s+found/i.test(message);
}

/**
 * Run the facade query, remapping an unseeded-store failure. A generated pack
 * query hitting an unknown prefix means the store was never built for this
 * design system (the first thing a fresh install hits) — surface the actionable
 * STORE_UNAVAILABLE with the canonical `pragma sources update` recovery instead
 * of a raw SPARQL "Prefix not found" wrapped as INTERNAL_ERROR ("please report
 * this issue"). Returns the inferred facade result type, so this module stays
 * clear of a static `@canonical/ke` import (the lazy-dispatch guard).
 */
async function queryOrRemap(rt: Pick<PragmaRuntime, "query">, query: string) {
  try {
    return await rt.query.sparql(query);
  } catch (error) {
    if (error instanceof PragmaError) throw error;
    if (isUnseededStoreError(error)) {
      throw PragmaError.storeUnavailable(
        "The store has not been built for this project yet.",
        {
          recovery: cliRecovery(
            `${RECOVERY_CLI_PREFIX}sources update`,
            "Build the local store from the configured design-system packages.",
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
