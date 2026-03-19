/**
 * Operations that query the ke store for code standard list data.
 *
 * Supports optional filtering by category name and free-text search
 * across standard names and descriptions.
 *
 * @note Impure — performs SPARQL queries against the ke store.
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { buildQuery } from "../shared/buildQuery.js";
import type { StandardListFilters, StandardSummary } from "../shared/types.js";

/**
 * List all code standards, optionally filtered by category or search term.
 *
 * When `filters.category` is provided, only standards in that category are
 * returned (exact match on category name). When `filters.search` is provided,
 * results are filtered to standards whose name or description contains the
 * search term (case-insensitive).
 *
 * @note Impure — performs a SPARQL query against the ke store.
 */
export async function listStandards(
  store: Store,
  filters?: StandardListFilters,
): Promise<StandardSummary[]> {
  const filterClauses: string[] = [];

  if (filters?.category) {
    const escaped = escapeSparqlValue(filters.category);
    filterClauses.push(`FILTER(?categoryName = ${escaped})`);
  }

  if (filters?.search) {
    const escaped = escapeSparqlValue(filters.search.toLowerCase());
    filterClauses.push(
      `FILTER(CONTAINS(LCASE(?name), ${escaped}) || CONTAINS(LCASE(?description), ${escaped}))`,
    );
  }

  const result = await store.query(
    buildQuery(`
      SELECT ?standard ?name ?categoryName ?description
      WHERE {
        ?standard a cso:CodeStandard ;
                  cso:name ?name ;
                  cso:description ?description .
        OPTIONAL {
          ?standard cso:category ?cat .
          ?cat cso:categoryName ?categoryName .
        }
        ${filterClauses.join("\n        ")}
      }
      ORDER BY ?name
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings.map((b) => ({
    uri: (b.standard ?? "") as URI,
    name: b.name ?? "",
    category: b.categoryName ?? "",
    description: b.description ?? "",
  }));
}
