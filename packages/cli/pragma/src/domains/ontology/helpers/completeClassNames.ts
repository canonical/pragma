import type { Store } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import extractLocalName from "../../shared/extractLocalName.js";
import { P } from "../../shared/prefixes.js";

/**
 * Tab-completion candidates for the `--class` parameter of
 * `ontology show`: the local names of every `owl:Class` in the store,
 * filtered by the typed partial (case-insensitive prefix match).
 *
 * Completion runs before the prefix positional is resolvable from the
 * completion context, so candidates span all namespaces — the operation
 * scopes the actual lookup to the requested namespace. Results are capped
 * at `limit` so a huge graph cannot flood the shell; an empty partial
 * still completes (class sets are small and the query is one indexed
 * type-scan).
 *
 * @note Queries ke store
 */
export default async function completeClassNames(
  store: Store,
  partial: string,
  limit = 50,
): Promise<string[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?class
      WHERE { ?class a ${P.owl}Class }
    `),
  );

  if (result.type !== "select") return [];

  const needle = partial.toLowerCase();
  const names = new Set<string>();
  for (const b of result.bindings) {
    if (!b.class) continue;
    const local = extractLocalName(b.class);
    if (local.toLowerCase().startsWith(needle)) names.add(local);
  }

  return [...names].sort().slice(0, limit);
}
