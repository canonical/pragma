/**
 * Store-backed ontology inspection queries + shapes (the TBox exception).
 *
 * Unlike instance reads (GraphQL by default), ontology inspection queries the
 * schema directly with SPARQL over `owl:Class`/`owl:*Property` — a recorded
 * TBox exception to the source rule. Full IRIs are used in the query text so the
 * result never depends on which vocabulary prefixes the store injected.
 */

import type { PragmaRuntime } from "../../kernel/runtime/types.js";

const OWL = "http://www.w3.org/2002/07/owl#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const OWL_CLASS = `${OWL}Class`;
const OWL_OBJECT_PROPERTY = `${OWL}ObjectProperty`;
const OWL_DATATYPE_PROPERTY = `${OWL}DatatypeProperty`;

/** A loaded namespace summary (`ontology list`). */
export interface OntologySummary {
  readonly prefix: string;
  readonly namespace: string;
  readonly classCount: number;
  readonly propertyCount: number;
}

/** A class in the hierarchy, with its instance count from the pack index. */
export interface OntologyClass {
  readonly uri: string;
  readonly label: string;
  readonly superclass?: string;
  readonly instanceCount: number;
}

/** A property definition. */
export interface OntologyProperty {
  readonly uri: string;
  readonly label: string;
  readonly domain?: string;
  readonly range?: string;
  readonly type: "object" | "datatype";
}

/** The `ontology show` payload — the detailed view plus render options. */
export interface OntologyShowData {
  readonly prefix: string;
  readonly namespace: string;
  readonly classes: readonly OntologyClass[];
  readonly properties: readonly OntologyProperty[];
  /** Show full IRIs instead of prefix-compacted ones. */
  readonly fullUris: boolean;
  /** The `--class` focus, if any. */
  readonly focus?: string;
}

type QueryRt = Pick<PragmaRuntime, "query">;

/** Local name of an IRI (`…#Thing`/`…/Thing` → `Thing`). */
export function localName(uri: string): string {
  const hash = uri.lastIndexOf("#");
  if (hash !== -1) return uri.slice(hash + 1);
  const slash = uri.lastIndexOf("/");
  return slash !== -1 ? uri.slice(slash + 1) : uri;
}

async function select(
  rt: QueryRt,
  text: string,
): Promise<Record<string, string>[]> {
  const result = await rt.query.sparql(text);
  return result.type === "select"
    ? (result.bindings as Record<string, string>[])
    : [];
}

/** Group all defined classes/properties by their namespace prefix, with counts. */
export async function listNamespaces(
  rt: QueryRt,
  prefixes: Readonly<Record<string, string>>,
): Promise<OntologySummary[]> {
  const [classes, props] = await Promise.all([
    select(rt, `SELECT ?class WHERE { ?class a <${OWL_CLASS}> }`),
    select(
      rt,
      `SELECT ?prop WHERE { ?prop a ?t . VALUES ?t { <${OWL_OBJECT_PROPERTY}> <${OWL_DATATYPE_PROPERTY}> } }`,
    ),
  ]);
  const entries = Object.entries(prefixes);
  const classByPrefix = new Map<string, Set<string>>();
  const propByPrefix = new Map<string, Set<string>>();
  const tally = (
    rows: Record<string, string>[],
    key: "class" | "prop",
    into: Map<string, Set<string>>,
  ) => {
    for (const row of rows) {
      const uri = row[key] ?? "";
      const match = findNamespace(uri, entries);
      if (!match) continue;
      const set = into.get(match.prefix) ?? new Set();
      set.add(uri);
      into.set(match.prefix, set);
    }
  };
  tally(classes, "class", classByPrefix);
  tally(props, "prop", propByPrefix);
  const allPrefixes = new Set([
    ...classByPrefix.keys(),
    ...propByPrefix.keys(),
  ]);
  return [...allPrefixes].sort().map((prefix) => ({
    prefix,
    namespace: prefixes[prefix] ?? "",
    classCount: classByPrefix.get(prefix)?.size ?? 0,
    propertyCount: propByPrefix.get(prefix)?.size ?? 0,
  }));
}

/** The longest-matching namespace prefix for a URI. */
function findNamespace(
  uri: string,
  entries: [string, string][],
): { prefix: string; namespace: string } | undefined {
  let best: { prefix: string; namespace: string } | undefined;
  for (const [prefix, namespace] of entries) {
    if (
      uri.startsWith(namespace) &&
      (!best || namespace.length > best.namespace.length)
    ) {
      best = { prefix, namespace };
    }
  }
  return best;
}

/** All classes in a namespace, with labels, superclasses, and index counts. */
export async function queryClasses(
  rt: QueryRt,
  namespace: string,
  instanceCountByType: Readonly<Record<string, number>>,
): Promise<OntologyClass[]> {
  const rows = await select(
    rt,
    [
      "SELECT ?class ?label ?superclass WHERE {",
      `  ?class a <${OWL_CLASS}> .`,
      `  FILTER(STRSTARTS(STR(?class), "${namespace}"))`,
      `  OPTIONAL { ?class <${RDFS}label> ?label }`,
      `  OPTIONAL { ?class <${RDFS}subClassOf> ?superclass }`,
      "} ORDER BY ?class",
    ].join("\n"),
  );
  const seen = new Map<string, OntologyClass>();
  for (const row of rows) {
    const uri = row.class ?? "";
    if (seen.has(uri)) continue;
    seen.set(uri, {
      uri,
      label: row.label || localName(uri),
      ...(row.superclass ? { superclass: row.superclass } : {}),
      instanceCount: instanceCountByType[uri] ?? 0,
    });
  }
  return [...seen.values()];
}

/** All object/datatype properties in a namespace. */
export async function queryProperties(
  rt: QueryRt,
  namespace: string,
): Promise<OntologyProperty[]> {
  const rows = await select(
    rt,
    [
      "SELECT ?prop ?label ?domain ?range ?propType WHERE {",
      "  ?prop a ?propType .",
      `  VALUES ?propType { <${OWL_OBJECT_PROPERTY}> <${OWL_DATATYPE_PROPERTY}> }`,
      `  FILTER(STRSTARTS(STR(?prop), "${namespace}"))`,
      `  OPTIONAL { ?prop <${RDFS}label> ?label }`,
      `  OPTIONAL { ?prop <${RDFS}domain> ?domain }`,
      `  OPTIONAL { ?prop <${RDFS}range> ?range }`,
      "} ORDER BY ?prop",
    ].join("\n"),
  );
  const seen = new Map<string, OntologyProperty>();
  for (const row of rows) {
    const uri = row.prop ?? "";
    if (seen.has(uri)) continue;
    seen.set(uri, {
      uri,
      label: row.label || localName(uri),
      ...(row.domain ? { domain: row.domain } : {}),
      ...(row.range ? { range: row.range } : {}),
      type: row.propType?.includes("ObjectProperty") ? "object" : "datatype",
    });
  }
  return [...seen.values()];
}
