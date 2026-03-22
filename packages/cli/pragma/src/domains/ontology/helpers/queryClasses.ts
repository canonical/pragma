/**
 * Query all classes in a namespace from the ke store.
 *
 * Deduplicates by class URI — a class with multiple rdfs:subClassOf values
 * keeps only the first superclass encountered.
 */

import type { Store } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import extractLocalName from "../../shared/extractLocalName.js";
import { P } from "../../shared/prefixes.js";
import type { OntologyClass } from "../../shared/types.js";

export default async function queryClasses(
  store: Store,
  namespace: string,
): Promise<OntologyClass[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?class ?label ?superclass
      WHERE {
        ?class a ${P.owl}Class .
        FILTER(STRSTARTS(STR(?class), "${namespace}"))
        OPTIONAL { ?class ${P.rdfs}label ?label }
        OPTIONAL { ?class ${P.rdfs}subClassOf ?superclass }
      }
      ORDER BY ?class
    `),
  );

  if (result.type !== "select") return [];

  const seen = new Map<string, OntologyClass>();
  for (const b of result.bindings) {
    const uri = b.class ?? "";
    if (seen.has(uri)) continue;
    seen.set(uri, {
      uri,
      label: b.label ?? extractLocalName(uri),
      ...(b.superclass ? { superclass: b.superclass } : {}),
    });
  }

  return [...seen.values()];
}
