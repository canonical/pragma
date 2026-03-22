/**
 * Lists all design tokens, optionally filtered by category (token type name).
 *
 * @param store - ke store to query
 * @param filters - optional category filter
 * @returns array of token summaries ordered by token ID, empty when none match
 * @note Queries ke store
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { TokenSummary } from "../../shared/types.js";

/** Optional filters for the token list operation. */
export interface TokenListFilters {
  readonly category?: string;
}

export default async function listTokens(
  store: Store,
  filters?: TokenListFilters,
): Promise<TokenSummary[]> {
  const categoryFilter = filters?.category
    ? `FILTER(LCASE(?typeName) = LCASE(${escapeSparqlValue(filters.category)}))`
    : "";

  const result = await store.query(
    buildQuery(`
      SELECT ?token ?tokenId ?typeName
      WHERE {
        ?token a ${P.ds}Token ;
               ${P.ds}tokenId ?tokenId .
        OPTIONAL {
          ?token ${P.ds}tokenType ?type .
          ?type ${P.rdfs}label ?typeName .
        }
        ${categoryFilter}
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
