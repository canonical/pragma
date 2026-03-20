/**
 * List all code standards, optionally filtered by category or search term.
 *
 * Pure function: Store + filters → StandardSummary[].
 *
 * @see ST.05
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import type {
  StandardListFilters,
  StandardSummary,
} from "../../shared/types.js";

export default async function listStandards(
  store: Store,
  filters?: StandardListFilters,
): Promise<StandardSummary[]> {
  const filterClauses: string[] = [];

  if (filters?.category) {
    const escaped = escapeSparqlValue(filters.category.toLowerCase());
    filterClauses.push(
      `?standard cs:hasCategory ?filterCat . ?filterCat cs:slug ?catSlug . FILTER(?catSlug = ${escaped})`,
    );
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
        ?standard a cs:CodeStandard ;
                  cs:name ?name ;
                  cs:description ?description .
        OPTIONAL {
          ?standard cs:hasCategory ?cat .
          ?cat cs:slug ?categoryName .
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
