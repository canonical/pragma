/**
 * Operations that query the ke store for standard category data.
 *
 * Returns categories with their associated standard counts, enabling
 * UIs to display category overviews.
 *
 * @note Impure — performs SPARQL queries against the ke store.
 */

import type { Store } from "@canonical/ke";
import { buildQuery } from "../shared/buildQuery.js";
import type { CategorySummary } from "../shared/types.js";

/**
 * List all standard categories with standard counts.
 *
 * Queries the ke store for distinct cso:Category instances, counts how many
 * standards belong to each, and returns sorted alphabetically by name.
 *
 * @note Impure — performs a SPARQL query against the ke store.
 */
export async function listCategories(store: Store): Promise<CategorySummary[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?categoryName (COUNT(?standard) AS ?count)
      WHERE {
        ?cat a cso:Category ;
             cso:categoryName ?categoryName .
        OPTIONAL {
          ?standard a cso:CodeStandard ;
                    cso:category ?cat .
        }
      }
      GROUP BY ?categoryName
      ORDER BY ?categoryName
    `),
  );

  if (result.type !== "select") return [];
  return result.bindings.map((b) => ({
    name: b.categoryName ?? "",
    standardCount: Number.parseInt(b.count ?? "0", 10) || 0,
  }));
}
