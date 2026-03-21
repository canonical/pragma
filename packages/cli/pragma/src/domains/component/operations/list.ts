/**
 * List all components visible under the given filters.
 *
 * Pure function: Store + FilterConfig → ComponentSummary[].
 * Consumed by CLI commands and MCP adapter.
 */

import type { Store, URI } from "@canonical/ke";
import { buildFilters } from "../../filters/buildFilters.js";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { ComponentSummary, FilterConfig } from "../../shared/types.js";
import extractLocalName from "../helpers/extractLocalName.js";

export default async function listComponents(
  store: Store,
  filters: FilterConfig,
): Promise<ComponentSummary[]> {
  const filterClauses = buildFilters(filters);

  const result = await store.query(
    buildQuery(`
      SELECT ?component ?name ?tier
             (GROUP_CONCAT(DISTINCT ?modName; separator="|") AS ?modifiers)
             (COUNT(DISTINCT ?node) AS ?nodeCount)
             (COUNT(DISTINCT ?token) AS ?tokenCount)
      WHERE {
        ?component a ${P.ds}Component ;
                   ${P.ds}name ?name ;
                   ${P.ds}tier ?tier .
        ${filterClauses}
        OPTIONAL { ?component ${P.ds}hasModifierFamily ?mod . ?mod ${P.ds}name ?modName }
        OPTIONAL { ?component ${P.ds}anatomyNode ?node }
        OPTIONAL { ?component ${P.ds}usesToken ?token }
      }
      GROUP BY ?component ?name ?tier
      ORDER BY ?name
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings.map((b) => ({
    uri: (b.component ?? "") as URI,
    name: b.name ?? "",
    tier: extractLocalName(b.tier ?? ""),
    modifiers: b.modifiers ? b.modifiers.split("|").filter(Boolean) : [],
    implementations: [],
    nodeCount: Number.parseInt(b.nodeCount ?? "0", 10) || 0,
    tokenCount: Number.parseInt(b.tokenCount ?? "0", 10) || 0,
  }));
}
