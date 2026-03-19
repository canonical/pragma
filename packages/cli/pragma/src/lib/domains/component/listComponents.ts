/**
 * Operations that query the ke store for component list data.
 */

import type { Store, URI } from "@canonical/ke";
import { buildFilters } from "../filters/buildFilters.js";
import { buildQuery } from "../shared/buildQuery.js";
import type { ComponentSummary, FilterConfig } from "../shared/types.js";
import { extractLocalName } from "./extractLocalName.js";

/**
 * List all components visible under the given tier and channel filters.
 *
 * Queries the ke store for ds:Component instances, applies tier visibility
 * (parent chain) and channel release filters, aggregates modifier names
 * and token/node counts per component.
 *
 * @note Impure — performs SPARQL queries against the ke store.
 */
export async function listComponents(
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
        ?component a ds:Component ;
                   ds:name ?name ;
                   ds:tier ?tier .
        ${filterClauses}
        OPTIONAL { ?component ds:modifier ?mod . ?mod ds:modifierName ?modName }
        OPTIONAL { ?component ds:anatomyNode ?node }
        OPTIONAL { ?component ds:usesToken ?token }
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
