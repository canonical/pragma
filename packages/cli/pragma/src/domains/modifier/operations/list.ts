/**
 * Lists all modifier families with their allowed values, ordered by name.
 *
 * @param store - ke store to query
 * @returns array of modifier families, empty when none exist
 * @note Queries ke store
 */

import type { Store, URI } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { ModifierFamily } from "../../shared/types/index.js";

export default async function listModifiers(
  store: Store,
): Promise<ModifierFamily[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?family ?name (GROUP_CONCAT(DISTINCT ?valueName; separator="|") AS ?values)
      WHERE {
        ?family a ${P.ds}ModifierFamily ;
                ${P.ds}name ?name .
        OPTIONAL {
          ?mod a ${P.ds}Modifier ;
               ${P.ds}modifierFamily ?family ;
               ${P.ds}name ?valueName .
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
