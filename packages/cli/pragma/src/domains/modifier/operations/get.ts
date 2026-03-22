/**
 * Get a single modifier family by name.
 *
 * @throws PragmaError.notFound if the modifier family does not exist.
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { PragmaError } from "#error";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { ModifierFamily } from "../../shared/types.js";

export default async function getModifier(
  store: Store,
  name: string,
): Promise<ModifierFamily> {
  const escaped = escapeSparqlValue(name);

  const result = await store.query(
    buildQuery(`
      SELECT ?family (GROUP_CONCAT(DISTINCT ?valueName; separator="|") AS ?values)
      WHERE {
        ?family a ${P.ds}ModifierFamily ;
                ${P.ds}name ${escaped} .
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
      recovery: "Run `pragma modifier list` to see available modifiers.",
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
