/**
 * Get detailed information for a single token.
 *
 * @throws PragmaError.notFound if the token does not exist.
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { PragmaError } from "../../../error/index.js";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { TokenDetailed } from "../../shared/types.js";

export default async function getToken(
  store: Store,
  name: string,
): Promise<TokenDetailed> {
  const escaped = escapeSparqlValue(name);

  const result = await store.query(
    buildQuery(`
      SELECT ?token ?typeName ?valueLight ?valueDark
      WHERE {
        ?token a ${P.dso}Token ;
               ${P.dso}tokenId ${escaped} .
        OPTIONAL {
          ?token ${P.dso}tokenType ?type .
          ?type ${P.rdfs}label ?typeName .
        }
        OPTIONAL { ?token ${P.dso}valueLight ?valueLight }
        OPTIONAL { ?token ${P.dso}valueDark ?valueDark }
      }
      LIMIT 1
    `),
  );

  if (result.type !== "select" || result.bindings.length === 0) {
    throw PragmaError.notFound("token", name, {
      recovery: "Run `pragma token list` to see available tokens.",
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
