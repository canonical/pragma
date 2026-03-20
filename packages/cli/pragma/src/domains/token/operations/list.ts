/**
 * List all design tokens.
 */

import type { Store, URI } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import type { TokenSummary } from "../../shared/types.js";

export default async function listTokens(
  store: Store,
): Promise<TokenSummary[]> {
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
