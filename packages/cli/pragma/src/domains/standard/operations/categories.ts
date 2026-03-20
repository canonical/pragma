/**
 * List all standard categories with standard counts.
 *
 * Pure function: Store → CategorySummary[].
 *
 * @see ST.05
 */

import type { Store } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import type { CategorySummary } from "../../shared/types.js";

export default async function listCategories(
  store: Store,
): Promise<CategorySummary[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?categoryName (COUNT(?standard) AS ?count)
      WHERE {
        ?cat a cs:Category ;
             cs:slug ?categoryName .
        OPTIONAL {
          ?standard a cs:CodeStandard ;
                    cs:hasCategory ?cat .
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
