/**
 * Lists all blocks visible under the given tier and channel filters.
 *
 * Returns summary-level data (name, tier, modifiers, node/token counts)
 * for each matching block, ordered alphabetically by name.
 *
 * @param store - ke store to query
 * @param filters - tier and channel filter configuration
 * @returns array of block summaries, empty when none match
 * @note Queries ke store
 */

import type { Store, URI } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import extractLocalName from "../../shared/extractLocalName.js";
import { buildFilters } from "../../shared/filters/buildFilters.js";
import { P } from "../../shared/prefixes.js";
import type { BlockSummary, FilterConfig } from "../../shared/types/index.js";

function normalizeBlockType(value: string | undefined): BlockSummary["type"] {
  const localName = extractLocalName(value ?? "").toLowerCase();

  switch (localName) {
    case "pattern":
    case "layout":
    case "subcomponent":
      return localName;
    default:
      return "component";
  }
}

export default async function listBlocks(
  store: Store,
  filters: FilterConfig,
): Promise<BlockSummary[]> {
  const filterClauses = buildFilters(filters);

  const result = await store.query(
    buildQuery(`
      SELECT ?component ?type ?name ?tier
             (GROUP_CONCAT(DISTINCT ?modName; separator="|") AS ?modifiers)
             (COUNT(DISTINCT ?node) AS ?nodeCount)
             (COUNT(DISTINCT ?token) AS ?tokenCount)
      WHERE {
        VALUES ?type { ${P.ds}Component ${P.ds}Pattern ${P.ds}Layout ${P.ds}Subcomponent }
        ?component a ?type ;
                   ${P.ds}name ?name ;
                   ${P.ds}tier ?tier .
        ${filterClauses}
        OPTIONAL { ?component ${P.ds}hasModifierFamily ?mod . ?mod ${P.ds}name ?modName }
        OPTIONAL { ?component ${P.ds}anatomyNode ?node }
        OPTIONAL { ?component ${P.ds}usesToken ?token }
      }
      GROUP BY ?component ?type ?name ?tier
      ORDER BY ?name
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings.map((b) => ({
    uri: (b.component ?? "") as URI,
    name: b.name ?? "",
    type: normalizeBlockType(b.type),
    tier: extractLocalName(b.tier ?? ""),
    modifiers: b.modifiers ? b.modifiers.split("|").filter(Boolean) : [],
    implementations: [],
    nodeCount: Number.parseInt(b.nodeCount ?? "0", 10) || 0,
    tokenCount: Number.parseInt(b.tokenCount ?? "0", 10) || 0,
  }));
}
