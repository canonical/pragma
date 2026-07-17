import type { Store } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import extractLocalName from "../../shared/extractLocalName.js";
import { P } from "../../shared/prefixes.js";

/** A property row as stored — full URIs. */
export interface RawOntologyProperty {
  readonly uri: string;
  readonly label: string;
  readonly kind: "object" | "datatype";
  readonly domain?: string;
  readonly range?: string;
  readonly functional: boolean;
}

/**
 * Queries all `owl:ObjectProperty` and `owl:DatatypeProperty` definitions
 * within a namespace, marking those also typed `owl:FunctionalProperty`.
 *
 * Deduplicates by property URI -- when a property has multiple `rdfs:domain`
 * or `rdfs:range` values, only the first encountered is kept.
 *
 * @note Queries ke store
 *
 * @param store - The ke store to query.
 * @param namespace - The namespace URI to filter properties by.
 * @returns An array of {@link RawOntologyProperty} entries.
 */
export default async function queryProperties(
  store: Store,
  namespace: string,
): Promise<RawOntologyProperty[]> {
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

  const functional = await queryFunctionalProperties(store, namespace);

  const seen = new Map<string, RawOntologyProperty>();
  for (const b of result.bindings) {
    const uri = b.prop ?? "";
    if (seen.has(uri)) continue;
    seen.set(uri, {
      uri,
      label: b.label ?? extractLocalName(uri),
      ...(b.domain ? { domain: b.domain } : {}),
      ...(b.range ? { range: b.range } : {}),
      kind: b.propType?.includes("ObjectProperty")
        ? ("object" as const)
        : ("datatype" as const),
      functional: functional.has(uri),
    });
  }

  return [...seen.values()];
}

/** URIs within the namespace typed `owl:FunctionalProperty`. */
async function queryFunctionalProperties(
  store: Store,
  namespace: string,
): Promise<Set<string>> {
  const result = await store.query(
    buildQuery(`
      SELECT ?prop
      WHERE {
        ?prop a ${P.owl}FunctionalProperty .
        FILTER(STRSTARTS(STR(?prop), "${namespace}"))
      }
    `),
  );

  if (result.type !== "select") return new Set();
  return new Set(
    result.bindings.map((b) => b.prop).filter((p): p is string => Boolean(p)),
  );
}
