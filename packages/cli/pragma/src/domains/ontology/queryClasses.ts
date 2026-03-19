/**
 * Query all classes in a namespace from the ke store.
 */

import type { Store } from "@canonical/ke";
import { buildQuery } from "../shared/buildQuery.js";
import type { OntologyClass } from "../shared/types.js";
import extractLocalName from "./extractLocalName.js";

export default async function queryClasses(
  store: Store,
  namespace: string,
): Promise<OntologyClass[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?class ?label ?superclass
      WHERE {
        ?class a owl:Class .
        FILTER(STRSTARTS(STR(?class), "${namespace}"))
        OPTIONAL { ?class rdfs:label ?label }
        OPTIONAL { ?class rdfs:subClassOf ?superclass }
      }
      ORDER BY ?class
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings.map((b) => {
    const entry: OntologyClass = {
      uri: b.class ?? "",
      label: b.label ?? extractLocalName(b.class ?? ""),
      ...(b.superclass ? { superclass: b.superclass } : {}),
    };
    return entry;
  });
}
