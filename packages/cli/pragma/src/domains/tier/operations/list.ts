/**
 * List all tiers from the ontology.
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
        ?tier a ${P.dso}Tier ;
              ${P.dso}name ?name .
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
