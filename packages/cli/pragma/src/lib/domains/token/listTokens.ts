/**
 * Operations that query the ke store for design token list data.
 */

import type { Store, URI } from "@canonical/ke";
import { buildQuery } from "../shared/buildQuery.js";
import type { TokenSummary } from "../shared/types.js";

/**
 * List all design tokens.
 *
 * Queries the ke store for ds:Token instances with their tokenId and
 * optional type label. Results are sorted alphabetically by tokenId.
 *
 * @note Impure — performs a SPARQL query against the ke store.
 */
export async function listTokens(store: Store): Promise<TokenSummary[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?token ?tokenId ?typeName
      WHERE {
        ?token a ds:Token ;
               ds:tokenId ?tokenId .
        OPTIONAL {
          ?token ds:tokenType ?type .
          ?type rdfs:label ?typeName .
        }
      }
      ORDER BY ?tokenId
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings.map((b) => ({
    uri: (b.token ?? "") as URI,
    name: b.tokenId ?? "",
    category: b.typeName ?? "",
  }));
}
