import type { Store } from "@canonical/ke";
import { PragmaError } from "#error";
import { buildQuery } from "../../buildQuery.js";

/**
 * Run a pack story's SELECT and return its binding rows.
 *
 * The store rejects non-read queries at the engine level; this guards the
 * result shape so a pack whose query is not a SELECT fails with a
 * recoverable config error instead of a shape mismatch downstream.
 *
 * @param store - The ke store to query.
 * @param query - SPARQL SELECT text (the store injects PREFIX declarations).
 * @param source - The pack source, for error attribution.
 * @returns One record per row, keyed by SELECT variable name.
 * @throws PragmaError with code `CONFIG_ERROR` when the query is not a SELECT.
 * @note Impure — queries the ke store.
 */
export default async function runSelectQuery(
  store: Store,
  query: string,
  source: string,
): Promise<Record<string, string>[]> {
  const result = await store.query(buildQuery(query));
  if (result.type !== "select") {
    throw PragmaError.configError(
      `Story query in ${source} must be a SELECT (got ${result.type}).`,
    );
  }
  return result.bindings;
}
