import type { Store } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import extractLocalName from "../../shared/extractLocalName.js";
import { P } from "../../shared/prefixes.js";

/** A class row as stored — full URIs, all superclass edges preserved. */
export interface RawOntologyClass {
  readonly uri: string;
  readonly label: string;
  readonly comment?: string;
  readonly subClassOf: readonly string[];
}

/**
 * Queries all `owl:Class` definitions within a namespace, including their
 * `rdfs:comment` and **every** `rdfs:subClassOf` edge (multiple inheritance
 * is preserved; downstream renderers decide tree placement).
 *
 * @note Queries ke store
 *
 * @param store - The ke store to query.
 * @param namespace - The namespace URI to filter classes by.
 * @returns An array of {@link RawOntologyClass} entries, one per class.
 */
export default async function queryClasses(
  store: Store,
  namespace: string,
): Promise<RawOntologyClass[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?class ?label ?comment ?superclass
      WHERE {
        ?class a ${P.owl}Class .
        FILTER(STRSTARTS(STR(?class), "${namespace}"))
        OPTIONAL { ?class ${P.rdfs}label ?label }
        OPTIONAL { ?class ${P.rdfs}comment ?comment }
        OPTIONAL { ?class ${P.rdfs}subClassOf ?superclass }
      }
      ORDER BY ?class ?superclass
    `),
  );

  if (result.type !== "select") return [];

  const seen = new Map<
    string,
    { label: string; comment?: string; supers: Set<string> }
  >();
  for (const b of result.bindings) {
    const uri = b.class ?? "";
    const entry = seen.get(uri) ?? {
      label: b.label ?? extractLocalName(uri),
      ...(b.comment ? { comment: b.comment } : {}),
      supers: new Set<string>(),
    };
    if (b.superclass) entry.supers.add(b.superclass);
    seen.set(uri, entry);
  }

  return [...seen.entries()].map(([uri, entry]) => ({
    uri,
    label: entry.label,
    ...(entry.comment ? { comment: entry.comment } : {}),
    subClassOf: [...entry.supers].sort(),
  }));
}
