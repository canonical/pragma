/**
 * Look up detailed information for a single design token by name.
 *
 * Queries the token URI, type, and per-theme values (light/dark).
 *
 * @param store - ke store to query
 * @param name - token name (e.g. "color.primary")
 * @returns full token detail including theme values
 * @throws PragmaError.notFound if the token does not exist
 * @note Queries ke store
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { PragmaError } from "#error";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { TokenDetailed } from "../../shared/types.js";

export default async function lookupToken(
  store: Store,
  name: string,
): Promise<TokenDetailed> {
  const escaped = escapeSparqlValue(name);

  const result = await store.query(
    buildQuery(`
      SELECT ?token ?typeName ?valueLight ?valueDark
      WHERE {
        ?token a ${P.ds}Token ;
               ${P.ds}tokenId ${escaped} .
        OPTIONAL {
          ?token ${P.ds}tokenType ?type .
          ?type ${P.rdfs}label ?typeName .
        }
        OPTIONAL { ?token ${P.ds}valueLight ?valueLight }
        OPTIONAL { ?token ${P.ds}valueDark ?valueDark }
      }
      LIMIT 1
    `),
  );

  if (result.type !== "select" || result.bindings.length === 0) {
    throw PragmaError.notFound("token", name, {
      recovery: {
        message: "List available tokens.",
        cli: "pragma token list",
        mcp: { tool: "token_list" },
      },
    });
  }

  // Safe: length check above guarantees bindings[0] exists
  const b = result.bindings[0] as (typeof result.bindings)[number];

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
