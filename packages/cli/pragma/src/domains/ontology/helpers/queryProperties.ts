/**
 * Query all properties in a namespace from the ke store.
 *
 * Deduplicates by property URI — a property with multiple rdfs:domain or
 * rdfs:range values keeps only the first encountered.
 */

import type { Store } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { OntologyProperty } from "../../shared/types.js";
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
        VALUES ?propType { ${P.owl}ObjectProperty ${P.owl}DatatypeProperty }
        FILTER(STRSTARTS(STR(?prop), "${namespace}"))
        OPTIONAL { ?prop ${P.rdfs}label ?label }
        OPTIONAL { ?prop ${P.rdfs}domain ?domain }
        OPTIONAL { ?prop ${P.rdfs}range ?range }
      }
      ORDER BY ?prop
    `),
  );

  if (result.type !== "select") return [];

  const seen = new Map<string, OntologyProperty>();
  for (const b of result.bindings) {
    const uri = b.prop ?? "";
    if (seen.has(uri)) continue;
    seen.set(uri, {
      uri,
      label: b.label ?? extractLocalName(uri),
      ...(b.domain ? { domain: b.domain } : {}),
      ...(b.range ? { range: b.range } : {}),
      type: b.propType?.includes("ObjectProperty")
        ? ("object" as const)
        : ("datatype" as const),
    });
  }

  return [...seen.values()];
}
