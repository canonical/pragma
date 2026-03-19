/**
 * Tier shared operations.
 *
 * Pure functions: Store → typed data.
 */

import type { Store, URI } from "@canonical/ke";
import { buildQuery } from "../shared/buildQuery.js";
import type { TierEntry } from "../shared/types.js";

/**
 * List all tiers from the ontology.
 */
export async function listTiers(store: Store): Promise<TierEntry[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?tier ?path ?parentPath ?depth
      WHERE {
        ?tier a ds:Tier ;
              ds:tierPath ?path ;
              ds:depth ?depth .
        OPTIONAL {
          ?tier ds:parentTier ?parent .
          ?parent ds:tierPath ?parentPath .
        }
      }
      ORDER BY ?depth ?path
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings.map((b) => ({
    uri: (b.tier ?? "") as URI,
    path: b.path ?? "",
    parent: b.parentPath,
    depth: Number.parseInt(b.depth ?? "0", 10) || 0,
  }));
}
