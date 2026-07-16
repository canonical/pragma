/**
 * Supplementary TBox queries for `ontology show` — instance counts, SHACL
 * shape summaries, the owl:Ontology header, and per-class sample instances.
 *
 * Kept together because each is a single small SELECT feeding the one
 * {@link OntologyDetailed} structure the show operation assembles.
 *
 * @note Every function queries the ke store.
 */

import type { Store } from "@canonical/ke";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";

const SH = "http://www.w3.org/ns/shacl#";

/**
 * Count instances per class within a namespace.
 *
 * One `GROUP BY ?type` query for the whole namespace — never per class.
 *
 * @returns Map from full class URI to instance count.
 */
export async function queryInstanceCounts(
  store: Store,
  namespace: string,
): Promise<ReadonlyMap<string, number>> {
  const result = await store.query(
    buildQuery(`
      SELECT ?type (COUNT(?s) AS ?n)
      WHERE {
        ?s a ?type .
        FILTER(STRSTARTS(STR(?type), "${namespace}"))
      }
      GROUP BY ?type
    `),
  );

  if (result.type !== "select") return new Map();

  const counts = new Map<string, number>();
  for (const b of result.bindings) {
    if (b.type && b.n) counts.set(b.type, Number(b.n));
  }
  return counts;
}

/** A SHACL node-shape summary row — full URIs. */
export interface RawConstraint {
  readonly shape: string;
  readonly targetClass?: string;
  readonly propertyCount: number;
}

/**
 * Summarize `sh:NodeShape`s whose shape or target class lives in the
 * namespace: target class and number of property constraints.
 */
export async function queryConstraints(
  store: Store,
  namespace: string,
): Promise<RawConstraint[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?shape ?target (COUNT(?p) AS ?n)
      WHERE {
        ?shape a <${SH}NodeShape> .
        OPTIONAL { ?shape <${SH}targetClass> ?target }
        OPTIONAL { ?shape <${SH}property> ?p }
        FILTER(
          STRSTARTS(STR(?shape), "${namespace}") ||
          STRSTARTS(STR(?target), "${namespace}")
        )
      }
      GROUP BY ?shape ?target
      ORDER BY ?shape
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings
    .filter((b) => Boolean(b.shape))
    .map((b) => ({
      shape: b.shape as string,
      ...(b.target ? { targetClass: b.target } : {}),
      propertyCount: Number(b.n ?? 0),
    }));
}

/** owl:Ontology header row — full URIs. */
export interface RawOntologyMeta {
  readonly title?: string;
  readonly version?: string;
  readonly imports: readonly string[];
}

/**
 * Read the `owl:Ontology` header declared in a namespace, when present:
 * title (rdfs:label), version (owl:versionInfo), and owl:imports.
 */
export async function queryOntologyMeta(
  store: Store,
  namespace: string,
): Promise<RawOntologyMeta | undefined> {
  const result = await store.query(
    buildQuery(`
      SELECT ?ont ?title ?version ?import
      WHERE {
        ?ont a ${P.owl}Ontology .
        FILTER(STRSTARTS(STR(?ont), "${namespace}"))
        OPTIONAL { ?ont ${P.rdfs}label ?title }
        OPTIONAL { ?ont ${P.owl}versionInfo ?version }
        OPTIONAL { ?ont ${P.owl}imports ?import }
      }
      ORDER BY ?ont
    `),
  );

  if (result.type !== "select" || result.bindings.length === 0) {
    return undefined;
  }

  const first = result.bindings[0] as (typeof result.bindings)[number];
  const imports = [
    ...new Set(
      result.bindings
        .map((b) => b.import)
        .filter((i): i is string => Boolean(i)),
    ),
  ].sort();

  return {
    ...(first.title ? { title: first.title } : {}),
    ...(first.version ? { version: first.version } : {}),
    imports,
  };
}

/**
 * Fetch up to `limit` instance URIs of a class, as concrete entry points
 * for `graph inspect` and domain lookups.
 */
export async function querySampleInstances(
  store: Store,
  classUri: string,
  limit = 3,
): Promise<string[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?s
      WHERE { ?s a <${classUri}> }
      ORDER BY ?s
      LIMIT ${limit}
    `),
  );

  if (result.type !== "select") return [];
  return result.bindings.map((b) => b.s).filter((s): s is string => Boolean(s));
}
