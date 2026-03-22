import type { Store } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import type { StoreSummary } from "../types.js";

/**
 * Queries the ke store for total triple count and named graph URIs.
 *
 * @note Queries ke store
 *
 * @param store - The ke store to query.
 * @returns A {@link StoreSummary} with `tripleCount` and `graphNames`.
 */
async function collectStoreSummary(store: Store): Promise<StoreSummary> {
  const countResult = await store.query(
    buildQuery("SELECT (COUNT(*) AS ?count) WHERE { ?s ?p ?o }"),
  );

  let tripleCount = 0;
  if (countResult.type === "select") {
    const first = countResult.bindings[0];
    if (first) {
      tripleCount = Number.parseInt(first.count ?? "0", 10) || 0;
    }
  }

  const graphResult = await store.query(
    buildQuery(
      "SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o } } ORDER BY ?g",
    ),
  );

  const graphNames: string[] = [];
  if (graphResult.type === "select") {
    for (const binding of graphResult.bindings) {
      if (binding.g) graphNames.push(binding.g);
    }
  }

  return { tripleCount, graphNames };
}

export { collectStoreSummary };
