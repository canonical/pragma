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

/** Description predicates, in preference order. */
const DESCRIPTION_PREDICATES = [
  "http://www.w3.org/2000/01/rdf-schema#comment",
  "http://purl.org/dc/terms/description",
  "http://www.w3.org/2004/02/skos/core#definition",
  "http://schema.org/description",
];

/** Local name of an IRI (`…#Thing`/`…/Thing` → `Thing`). */
function localName(uri: string): string {
  const hash = uri.lastIndexOf("#");
  if (hash !== -1) return uri.slice(hash + 1);
  const slash = uri.lastIndexOf("/");
  return slash !== -1 ? uri.slice(slash + 1) : uri;
}

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
 * Per subject, keep the object whose predicate ranks HIGHEST (lowest index) in
 * `preference`. The `?p` binding is projected so the winner is chosen by declared
 * preference order: SPARQL returns solutions in an unspecified order, so keeping
 * the first row per subject would be store-order-dependent (an entity carrying
 * both `rdfs:label` and `skos:prefLabel` could index either), not ranked.
 */
function preferredBySubject(
  result: import("@canonical/ke").SelectResult,
  valueVar: string,
  preference: readonly string[],
): Map<string, string> {
  const best = new Map<string, { value: string; rank: number }>();
  for (const term of result.termBindings) {
    if (term.s?.termType !== "NamedNode") continue;
    const value = term[valueVar]?.value;
    const predicate = term.p?.value;
    if (!value || predicate === undefined) continue;
    const rank = preference.indexOf(predicate);
    if (rank === -1) continue;
    const current = best.get(term.s.value);
    if (current === undefined || rank < current.rank) {
      best.set(term.s.value, { value, rank });
    }
  }
  const picked = new Map<string, string>();
  for (const [subject, entry] of best) picked.set(subject, entry.value);
  return picked;
}

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
  const [typesResult, labelResult, descResult] = await Promise.all([
    store.query(
      `SELECT ?s ?type WHERE { ?s <${RDF_TYPE}> ?type }` as never,
    ) as Promise<import("@canonical/ke").SelectResult>,
    store.query(
      `SELECT ?s ?p ?label WHERE { ?s ?p ?label . VALUES ?p { ${valuesList(LABEL_PREDICATES)} } }` as never,
    ) as Promise<import("@canonical/ke").SelectResult>,
    store.query(
      `SELECT ?s ?p ?desc WHERE { ?s ?p ?desc . VALUES ?p { ${valuesList(DESCRIPTION_PREDICATES)} } }` as never,
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

  const labelBySubject = preferredBySubject(
    labelResult,
    "label",
    LABEL_PREDICATES,
  );
  const descBySubject = preferredBySubject(
    descResult,
    "desc",
    DESCRIPTION_PREDICATES,
  );

  const entities: PackIndexEntity[] = [];
  for (const [subject, fullTypes] of typesBySubject) {
    const classification = classify(fullTypes);
    if (classification === null) continue;
    const prefixed = compactUri(subject, prefixes);
    const primaryFull = classification.primary;
    const isIndividual = classification.box === "abox";
    const category = isIndividual
      ? "individual"
      : CLASS_METATYPES.has(primaryFull)
        ? "class"
        : "property";
    entities.push({
      name: prefixed,
      type: compactUri(primaryFull, prefixes),
      uri: subject,
      prefixed,
      types: fullTypes.map((t) => compactUri(t, prefixes)),
      label: labelBySubject.get(subject) ?? null,
      box: classification.box,
      category,
      // The domain class is meaningful only for an individual; schema subjects
      // carry a null primaryType (their `type` is the metatype).
      primaryType: isIndividual ? compactUri(primaryFull, prefixes) : null,
      primaryTypeLabel: isIndividual
        ? (labelBySubject.get(primaryFull) ?? localName(primaryFull))
        : null,
      description: descBySubject.get(subject) ?? null,
    });
  }
  entities.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  return {
    version: 2,
    contentHash,
    prefixes,
    entities,
    instanceCountByType,
  };
}
