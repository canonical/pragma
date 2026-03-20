/**
 * List all modifier families with their values.
 */

import type { Store, URI } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { ModifierFamily } from "../../shared/types.js";

export default async function listModifiers(
  store: Store,
): Promise<ModifierFamily[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?family ?name (GROUP_CONCAT(DISTINCT ?valueName; separator="|") AS ?values)
      WHERE {
        ?family a ${P.dso}ModifierFamily ;
                ${P.dso}name ?name .
        OPTIONAL {
          ?mod a ${P.dso}Modifier ;
               ${P.dso}modifierFamily ?family ;
               ${P.dso}name ?valueName .
        }
      }
      GROUP BY ?family ?name
      ORDER BY ?name
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings.map((b) => ({
    uri: (b.family ?? "") as URI,
    name: b.name ?? "",
    values: b.values ? b.values.split("|").filter(Boolean) : [],
  }));
}
