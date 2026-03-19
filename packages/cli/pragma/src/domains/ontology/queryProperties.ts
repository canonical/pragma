/**
 * Query all properties in a namespace from the ke store.
 */

import type { Store } from "@canonical/ke";
import { buildQuery } from "../shared/buildQuery.js";
import type { OntologyProperty } from "../shared/types.js";
import extractLocalName from "./extractLocalName.js";

export default async function queryProperties(
  store: Store,
  namespace: string,
): Promise<OntologyProperty[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?prop ?label ?domain ?range ?propType
      WHERE {
        ?prop a ?propType .
        VALUES ?propType { owl:ObjectProperty owl:DatatypeProperty }
        FILTER(STRSTARTS(STR(?prop), "${namespace}"))
        OPTIONAL { ?prop rdfs:label ?label }
        OPTIONAL { ?prop rdfs:domain ?domain }
        OPTIONAL { ?prop rdfs:range ?range }
      }
      ORDER BY ?prop
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings.map((b) => ({
    uri: b.prop ?? "",
    label: b.label ?? extractLocalName(b.prop ?? ""),
    ...(b.domain ? { domain: b.domain } : {}),
    ...(b.range ? { range: b.range } : {}),
    type: b.propType?.includes("ObjectProperty")
      ? ("object" as const)
      : ("datatype" as const),
  }));
}
