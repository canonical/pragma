/**
 * Build the storeless entity index (`index.json`) from a populated store.
 *
 * A lean port of the v1 `buildGraphIndex` (#856): three bulk SPARQL queries —
 * types, labels, and instance counts — joined in memory, rather than a query
 * per subject. Only typed named-node subjects are indexed (untyped subjects and
 * blank nodes are reachable via `graph query` but never listed). Each entity
 * carries the FROZEN `{ name, type }` minimum plus the enrichment fields
 * (`uri`, `prefixed`, `types`, `label`, `box`) the completion tier and reads
 * use. The output is pure JSON — no store handle survives — so the completion
 * tier reads it without ever booting oxigraph.
 */

import { compactUri } from "../../render/compactUri.js";
import type { PackIndex, PackIndexEntity } from "./types.js";

type Store = import("@canonical/ke").Store;

/** `rdf:type`. */
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

/** Meta-types that mark a subject as TBox schema (a class). */
const CLASS_METATYPES = new Set([
  "http://www.w3.org/2002/07/owl#Class",
  "http://www.w3.org/2000/01/rdf-schema#Class",
]);

/** Meta-types that mark a subject as TBox schema (a property). */
const PROPERTY_METATYPES = new Set([
  "http://www.w3.org/2002/07/owl#ObjectProperty",
  "http://www.w3.org/2002/07/owl#DatatypeProperty",
  "http://www.w3.org/2002/07/owl#AnnotationProperty",
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
]);

/** `owl:NamedIndividual` — a typing artifact, never a subject's domain class. */
const NAMED_INDIVIDUAL = "http://www.w3.org/2002/07/owl#NamedIndividual";

/** Namespaces whose types are structural, not a subject's domain class. */
const STD_VOCAB_PREFIXES = [
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  "http://www.w3.org/2000/01/rdf-schema#",
  "http://www.w3.org/2002/07/owl#",
  "http://www.w3.org/2001/XMLSchema#",
  "http://www.w3.org/2004/02/skos/core#",
  "http://www.w3.org/ns/shacl#",
];

/** Label predicates, in preference order. */
const LABEL_PREDICATES = [
  "http://www.w3.org/2000/01/rdf-schema#label",
  "http://www.w3.org/2004/02/skos/core#prefLabel",
  "http://purl.org/dc/terms/title",
  "http://schema.org/name",
];

const isStdVocab = (uri: string): boolean =>
  STD_VOCAB_PREFIXES.some((ns) => uri.startsWith(ns));

/** Classify a subject's full types into a box and a primary (filter) type. */
function classify(
  fullTypes: readonly string[],
): { box: "tbox" | "abox"; primary: string } | null {
  if (fullTypes.length === 0) return null;
  const classMeta = fullTypes.find((t) => CLASS_METATYPES.has(t));
  if (classMeta) return { box: "tbox", primary: classMeta };
  const propMeta = fullTypes.find((t) => PROPERTY_METATYPES.has(t));
  if (propMeta) return { box: "tbox", primary: propMeta };
  // An individual: its filter key is the most specific domain class.
  const domain =
    fullTypes.find((t) => t !== NAMED_INDIVIDUAL && !isStdVocab(t)) ??
    fullTypes.find((t) => t !== NAMED_INDIVIDUAL) ??
    fullTypes[0];
  return { box: "abox", primary: domain as string };
}

/** A `VALUES ?p { … }` body from a predicate list. */
const valuesList = (uris: readonly string[]): string =>
  uris.map((uri) => `<${uri}>`).join(" ");

/**
 * Build the entity index from a populated store.
 *
 * @param store - The ke store to query.
 * @param prefixes - The store's merged prefix map.
 * @param contentHash - The pack's content hash, embedded in the index.
 * @returns The storeless {@link PackIndex}.
 * @note Impure — runs bulk SPARQL queries against the store.
 */
export async function buildIndex(
  store: Store,
  prefixes: Readonly<Record<string, string>>,
  contentHash: string,
): Promise<PackIndex> {
  const [typesResult, labelResult] = await Promise.all([
    store.query(
      `SELECT ?s ?type WHERE { ?s <${RDF_TYPE}> ?type }` as never,
    ) as Promise<import("@canonical/ke").SelectResult>,
    store.query(
      `SELECT ?s ?label WHERE { ?s ?p ?label . VALUES ?p { ${valuesList(LABEL_PREDICATES)} } }` as never,
    ) as Promise<import("@canonical/ke").SelectResult>,
  ]);

  const typesBySubject = new Map<string, string[]>();
  const instanceCountByType: Record<string, number> = {};
  for (const term of typesResult.termBindings) {
    if (term.s?.termType !== "NamedNode") continue;
    const subject = term.s.value;
    const typeUri = term.type?.value ?? "";
    const bucket = typesBySubject.get(subject) ?? [];
    bucket.push(typeUri);
    typesBySubject.set(subject, bucket);
    instanceCountByType[typeUri] = (instanceCountByType[typeUri] ?? 0) + 1;
  }

  const labelBySubject = new Map<string, string>();
  for (const term of labelResult.termBindings) {
    if (term.s?.termType !== "NamedNode") continue;
    const subject = term.s.value;
    if (!labelBySubject.has(subject) && term.label?.value) {
      labelBySubject.set(subject, term.label.value);
    }
  }

  const entities: PackIndexEntity[] = [];
  for (const [subject, fullTypes] of typesBySubject) {
    const classification = classify(fullTypes);
    if (classification === null) continue;
    const prefixed = compactUri(subject, prefixes);
    entities.push({
      name: prefixed,
      type: compactUri(classification.primary, prefixes),
      uri: subject,
      prefixed,
      types: fullTypes.map((t) => compactUri(t, prefixes)),
      label: labelBySubject.get(subject) ?? null,
      box: classification.box,
    });
  }
  entities.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  return {
    version: 1,
    contentHash,
    prefixes,
    entities,
    instanceCountByType,
  };
}
