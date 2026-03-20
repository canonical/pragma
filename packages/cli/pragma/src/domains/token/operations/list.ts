/**
 * List all design tokens, optionally filtered by category (token type name).
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import type { TokenSummary } from "../../shared/types.js";

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
        ?token a dso:Token ;
               dso:tokenId ?tokenId .
        OPTIONAL {
          ?token dso:tokenType ?type .
          ?type rdfs:label ?typeName .
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
