/**
 * Operations that query the ke store for a single modifier family.
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { PragmaError } from "../../../error/index.js";
import { buildQuery } from "../shared/buildQuery.js";
import type { ModifierFamily } from "../shared/types.js";

/**
 * Get a single modifier family by name.
 *
 * Queries the ke store for a ds:ModifierFamily matching the given name,
 * aggregating its distinct values into a single result.
 *
 * @note Impure — performs a SPARQL query against the ke store.
 * @throws PragmaError.notFound if the modifier family does not exist.
 */
export async function getModifier(
  store: Store,
  name: string,
): Promise<ModifierFamily> {
  const escaped = escapeSparqlValue(name);

  const result = await store.query(
    buildQuery(`
      SELECT ?family (GROUP_CONCAT(DISTINCT ?value; separator="|") AS ?values)
      WHERE {
        ?family a ds:ModifierFamily ;
                ds:modifierName ${escaped} ;
                ds:hasValue ?value .
      }
      GROUP BY ?family
    `),
  );

  if (result.type !== "select" || result.bindings.length === 0) {
    throw PragmaError.notFound("modifier", name, {
      recovery: "Run `pragma modifier list` to see available modifiers.",
    });
  }

  const b = result.bindings[0]!;
  return {
    uri: (b.family ?? "") as URI,
    name,
    values: b.values ? b.values.split("|").filter(Boolean) : [],
  };
}
