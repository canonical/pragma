/**
 * List all standard categories with standard counts.
 *
 * Pure function: Store → CategorySummary[].
 */

import type { Store } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { CategorySummary } from "../../shared/types.js";

export default async function listCategories(
  store: Store,
): Promise<CategorySummary[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?categoryName (COUNT(?standard) AS ?count)
      WHERE {
        ?cat a ${P.cs}Category ;
             ${P.cs}slug ?categoryName .
        OPTIONAL {
          ?standard a ${P.cs}CodeStandard ;
                    ${P.cs}hasCategory ?cat .
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
