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
} from "../../shared/types/index.js";

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
                  ${P.cs}description ?description .
        OPTIONAL { ?standard ${P.cs}name ?name . }
        OPTIONAL {
          ?standard ${P.cs}hasCategory ?cat .
          ?cat ${P.cs}slug ?categoryName .
        }
        ${filterClauses.join("\n        ")}
      }
      ORDER BY ?standard
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings.map((b) => {
    const uri = (b.standard ?? "") as URI;
    return {
      uri,
      // `cs:name` is an optional display title; the IRI is the canonical
      // identifier. Fall back to the IRI's local name when no title is set,
      // otherwise standards without a title would be dropped entirely.
      name: b.name ?? deriveStandardName(uri),
      category: b.categoryName ?? "",
      description: b.description ?? "",
    };
  });
}

/**
 * Derive a display name from a standard's IRI local name.
 *
 * Takes the segment after the last `#`, `/`, or `:` and renders the
 * dot-separated hierarchy as slashes (e.g.
 * `…#react.component.props` → `react/component/props`).
 *
 * @param uri - The standard's IRI.
 * @returns A human-readable slash-separated name.
 */
function deriveStandardName(uri: string): string {
  const local = uri.split(/[#/:]/).at(-1) ?? uri;
  return local.replace(/\./g, "/");
}
