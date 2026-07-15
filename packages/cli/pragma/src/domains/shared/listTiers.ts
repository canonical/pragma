/**
 * List the tiers defined in the loaded ontology, ordered by name.
 *
 * Shared operation: the `tier list` CLI/MCP surface is served by the bundled
 * `tier` story pack, but `config tier` validation still needs the tier set
 * programmatically, and this stays part of the package's public API. Kept in
 * the shared layer so it has no dependency on any DS-specific domain module.
 *
 * @param store - ke store to query.
 * @returns Array of tier entries, empty when none exist.
 * @note Impure — queries the ke store.
 */

import type { Store, URI } from "@canonical/ke";
import { buildQuery } from "./buildQuery.js";
import { P } from "./prefixes.js";
import type { TierEntry } from "./types/index.js";

export async function listTiers(store: Store): Promise<TierEntry[]> {
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

export default listTiers;
