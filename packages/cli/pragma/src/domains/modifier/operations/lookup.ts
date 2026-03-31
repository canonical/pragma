/**
 * Look up a single modifier family by name, including its allowed values.
 *
 * @param store - ke store to query
 * @param name - modifier family name (e.g. "importance")
 * @returns the modifier family with its value list
 * @throws PragmaError.notFound if the modifier family does not exist
 * @note Queries ke store
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { PragmaError } from "#error";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { ModifierFamily } from "../../shared/types/index.js";

export default async function lookupModifier(
  store: Store,
  name: string,
): Promise<ModifierFamily> {
  const escaped = escapeSparqlValue(name.toLowerCase());

  const result = await store.query(
    buildQuery(`
      SELECT ?family (GROUP_CONCAT(DISTINCT ?valueName; separator="|") AS ?values)
      WHERE {
        ?family a ${P.ds}ModifierFamily ;
                ${P.ds}name ?familyName .
        FILTER(LCASE(STR(?familyName)) = ${escaped})
        OPTIONAL {
          ?mod a ${P.ds}Modifier ;
               ${P.ds}modifierFamily ?family ;
               ${P.ds}name ?valueName .
        }
      }
      GROUP BY ?family
    `),
  );

  if (result.type !== "select" || result.bindings.length === 0) {
    throw PragmaError.notFound("modifier", name, {
      recovery: {
        message: "List available modifiers.",
        cli: "pragma modifier list",
        mcp: { tool: "modifier_list" },
      },
    });
  }

  // Safe: length check above guarantees bindings[0] exists
  const b = result.bindings[0] as (typeof result.bindings)[number];
  return {
    uri: (b.family ?? "") as URI,
    name,
    values: b.values ? b.values.split("|").filter(Boolean) : [],
  };
}
