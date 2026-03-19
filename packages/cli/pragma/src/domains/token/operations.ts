/**
 * Token shared operations.
 *
 * Pure functions: Store → typed data.
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { PragmaError } from "../../error/index.js";
import { buildQuery } from "../shared/buildQuery.js";
import type { TokenDetailed, TokenSummary } from "../shared/types.js";

/**
 * List all design tokens.
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

/**
 * Get detailed information for a single token.
 *
 * @throws PragmaError.notFound if the token does not exist.
 */
export async function getToken(
  store: Store,
  name: string,
): Promise<TokenDetailed> {
  const escaped = escapeSparqlValue(name);

  const result = await store.query(
    buildQuery(`
      SELECT ?token ?typeName ?valueLight ?valueDark
      WHERE {
        ?token a ds:Token ;
               ds:tokenId ${escaped} .
        OPTIONAL {
          ?token ds:tokenType ?type .
          ?type rdfs:label ?typeName .
        }
        OPTIONAL { ?token ds:valueLight ?valueLight }
        OPTIONAL { ?token ds:valueDark ?valueDark }
      }
      LIMIT 1
    `),
  );

  if (result.type !== "select" || result.bindings.length === 0) {
    throw PragmaError.notFound("token", name, {
      recovery: "Run `pragma token list` to see available tokens.",
    });
  }

  const b = result.bindings[0]!;

  const values: { theme: string; value: string }[] = [];
  if (b.valueLight) values.push({ theme: "light", value: b.valueLight });
  if (b.valueDark) values.push({ theme: "dark", value: b.valueDark });

  return {
    uri: (b.token ?? "") as URI,
    name,
    category: b.typeName ?? "",
    values,
  };
}
