import type { Store } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import { buildFilters } from "../../shared/filters/buildFilters.js";
import { P } from "../../shared/prefixes.js";
import type { FilterConfig } from "../../shared/types/index.js";
import type { EntityCounts } from "../types.js";

/**
 * Run a `COUNT` query and parse its single `?count` binding.
 *
 * SPARQL `COUNT` yields a typed literal serialized as a string, so the
 * value is parsed defensively and falls back to `0` when the query does
 * not resolve to a select result.
 *
 * @param store - The ke store to query.
 * @param query - A `SELECT (COUNT(...) AS ?count)` query string.
 * @returns The parsed count, or `0` when unavailable.
 * @note Queries ke store
 */
async function countRows(store: Store, query: string): Promise<number> {
  const result = await store.query(buildQuery(query));
  if (result.type !== "select") return 0;
  const first = result.bindings[0];
  return first ? Number.parseInt(first.count ?? "0", 10) || 0 : 0;
}

/**
 * Count blocks, standards, modifier families, and tokens for the
 * `pragma llm` orientation summary.
 *
 * Each `COUNT` reproduces the row cardinality of the matching leaf list
 * operation, so the results equal `(await listX(...)).length` exactly:
 *
 * - **blocks** count the distinct `(?component, ?type, ?name, ?tier)` groups
 *   `listBlocks` emits via `GROUP BY ?component ?type ?name ?tier`, so a
 *   `COUNT(*)` over a `SELECT DISTINCT` of that exact grain (incl.
 *   `buildFilters` for identical tier/channel scoping). This stays exact even
 *   for a block asserted as several types or tiers, which would fan a
 *   single-variable `COUNT(DISTINCT ?component)` short of the grouped rows.
 * - **modifier families** count the distinct `(?family, ?name)` groups
 *   `listModifiers` emits via `GROUP BY ?family ?name`, so a `COUNT(*)` over a
 *   `SELECT DISTINCT` of that grain — exact even for a family with two names.
 * - **standards** and **tokens** have no `GROUP BY` and an `OPTIONAL` that
 *   fans rows out, so `COUNT(*)` over the identical `WHERE` matches row for
 *   row (including the fan-out).
 *
 * @note Queries ke store
 *
 * @param store - The ke store to query.
 * @param config - Filter config providing tier and channel settings.
 * @returns Entity counts matching the four leaf list operations' lengths.
 */
async function collectEntityCounts(
  store: Store,
  config: FilterConfig,
): Promise<EntityCounts> {
  const filterClauses = buildFilters(config);

  const [blocks, standards, modifierFamilies, tokens] = await Promise.all([
    countRows(
      store,
      `
      SELECT (COUNT(*) AS ?count)
      WHERE {
        SELECT DISTINCT ?component ?type ?name ?tier
        WHERE {
          VALUES ?type { ${P.ds}Component ${P.ds}Pattern ${P.ds}Layout ${P.ds}Subcomponent }
          ?component a ?type ;
                     ${P.ds}name ?name ;
                     ${P.ds}tier ?tier .
          ${filterClauses}
        }
      }
    `,
    ),
    countRows(
      store,
      `
      SELECT (COUNT(*) AS ?count)
      WHERE {
        ?standard a ${P.cs}CodeStandard ;
                  ${P.cs}name ?name ;
                  ${P.cs}description ?description .
        OPTIONAL {
          ?standard ${P.cs}hasCategory ?cat .
          ?cat ${P.cs}slug ?categoryName .
        }
      }
    `,
    ),
    countRows(
      store,
      `
      SELECT (COUNT(*) AS ?count)
      WHERE {
        SELECT DISTINCT ?family ?name
        WHERE {
          ?family a ${P.ds}ModifierFamily ;
                  ${P.ds}name ?name .
        }
      }
    `,
    ),
    countRows(
      store,
      `
      SELECT (COUNT(*) AS ?count)
      WHERE {
        ?token a ${P.ds}Token ;
               ${P.ds}tokenId ?tokenId .
        OPTIONAL {
          ?token ${P.ds}tokenType ?type .
          ?type ${P.rdfs}label ?typeName .
        }
      }
    `,
    ),
  ]);

  return { blocks, standards, modifierFamilies, tokens };
}

export { collectEntityCounts };
