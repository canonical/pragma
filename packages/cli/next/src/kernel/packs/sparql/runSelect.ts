/**
 * Run a pack story's SELECT through the query facade and return its rows.
 *
 * The store rejects non-read queries at the engine level; this guards the result
 * shape so a pack whose query is not a SELECT fails with a recoverable config
 * error instead of a shape mismatch downstream. The facade boots the store
 * lazily and auto-applies the pack's prefixes, so generated queries use prefixed
 * terms directly.
 */

import { PragmaError } from "../../error/PragmaError.js";
import type { PragmaRuntime } from "../../runtime/types.js";
import type { PackRow } from "../types.js";

/**
 * @param rt - The runtime (its query facade over the lazy store).
 * @param query - SPARQL SELECT text (prefixes auto-applied by the store).
 * @param source - The pack source, for error attribution.
 * @returns One record per row, keyed by SELECT variable name.
 * @throws PragmaError CONFIG_ERROR when the query is not a SELECT.
 * @note Impure — queries the store through the facade.
 */
export async function runSelect(
  rt: Pick<PragmaRuntime, "query">,
  query: string,
  source: string,
): Promise<PackRow[]> {
  const result = await rt.query.sparql(query);
  if (result.type !== "select") {
    throw PragmaError.configError(
      `Story query in ${source} must be a SELECT (got ${result.type}).`,
    );
  }
  return result.bindings as PackRow[];
}
