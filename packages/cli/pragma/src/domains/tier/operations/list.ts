/**
 * Lists all tiers defined in the design system ontology, ordered by name.
 *
 * @param store - ke store to query
 * @returns array of tier entries, empty when none exist
 * @note Queries ke store
 */

import type { Store, URI } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { TierEntry } from "../../shared/types.js";

export default async function listTiers(store: Store): Promise<TierEntry[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?tier ?name
      WHERE {
        ?tier a ${P.ds}Tier ;
              ${P.ds}name ?name .
      }
      ORDER BY ?name
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings.map((b) => ({
    uri: (b.tier ?? "") as URI,
    path: b.name ?? "",
    depth: 0,
  }));
}
