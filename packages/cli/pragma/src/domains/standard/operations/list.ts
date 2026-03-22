/**
 * Lists all code standards, optionally filtered by category or search term.
 *
 * @param store - ke store to query
 * @param filters - optional category and/or search text filters
 * @returns array of standard summaries ordered by name, empty when none match
 * @note Queries ke store
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
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
      `?standard ${P.cs}hasCategory ?filterCat . ?filterCat ${P.cs}slug ?catSlug . FILTER(?catSlug = ${escaped})`,
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
        ?standard a ${P.cs}CodeStandard ;
                  ${P.cs}name ?name ;
                  ${P.cs}description ?description .
        OPTIONAL {
          ?standard ${P.cs}hasCategory ?cat .
          ?cat ${P.cs}slug ?categoryName .
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
