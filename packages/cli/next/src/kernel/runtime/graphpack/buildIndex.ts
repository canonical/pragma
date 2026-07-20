/**
 * Build the storeless entity index (`index.json`) from a populated store.
 *
 * A lean port of the v1 `buildGraphIndex` (#856): three bulk SPARQL queries —
 * types, labels, and instance counts — joined in memory, rather than a query
 * per subject. Only typed named-node subjects are indexed (untyped subjects and
 * blank-node subjects are reachable via `graph query` but never listed). Each
 * entity carries the FROZEN `{ name, type }` minimum plus the enrichment fields
 * (`uri`, `prefixed`, `types`, `label`, `box`) the completion tier and reads
 * use. The output is pure JSON — no store handle survives — so the completion
 * tier reads it without ever booting oxigraph.
 *
 * Real-data correctness (things a single-typed toy graph never exercises):
 * - Blank-node `rdf:type` objects (SHACL shapes, RDF lists) are ignored — a
 *   `_:b0` is never a domain class and must not become a `type:"_:b0"` key.
 * - The abox primary type is the LEXICALLY-SMALLEST domain class, a
 *   deterministic tie-break: SPARQL returns a subject's types in unspecified
 *   order, so a multi-domain individual would otherwise get an arbitrary
 *   completion key that flips across builds/engines.
 * - Multilingual labels prefer untagged / `@en`, then the lexically smallest —
 *   never the store's arbitrary first row.
 * - An OWL-punned subject (a class/property IRI ALSO asserted as a domain
 *   individual) emits BOTH its tbox and abox facet, so its abox membership
 *   stays completable instead of vanishing behind the tbox facet.
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

/**
 * Alternative-name predicates: `ds:name`, the property `tier lookup` (and other
 * `ds:name`-addressed families) match on. Projected into `altNames` so the
 * storeless name-completion sources can offer those tokens exactly, without a
 * store boot. Distinct from the display `label` — a subject may carry both.
 */
const ALT_NAME_PREDICATES = ["https://ds.canonical.com/name"];

const isStdVocab = (uri: string): boolean =>
  STD_VOCAB_PREFIXES.some((ns) => uri.startsWith(ns));

/** One classification facet: which box a subject occupies + its primary type. */
interface Facet {
  readonly box: "tbox" | "abox";
  readonly primary: string;
}

/**
 * Classify a subject's full types into its facets — one per box it occupies.
 *
 * A plain individual or a plain class yields ONE facet. An OWL-punned subject
 * (a class/property IRI ALSO asserted as a domain individual) yields BOTH its
 * tbox and abox facet (A8), so its abox membership stays completable rather than
 * disappearing behind the tbox one. The abox primary is the lexically-smallest
 * domain class — a deterministic tie-break (A3), not the store's first row.
 *
 * @param fullTypes - The subject's asserted `rdf:type` values (blank nodes
 *   already dropped), in store order.
 * @returns The subject's facets (empty when it has no usable type).
 */
function classify(fullTypes: readonly string[]): Facet[] {
  if (fullTypes.length === 0) return [];
  const facets: Facet[] = [];
  const classMeta = fullTypes.find((t) => CLASS_METATYPES.has(t));
  const propMeta = fullTypes.find((t) => PROPERTY_METATYPES.has(t));
  if (classMeta !== undefined) facets.push({ box: "tbox", primary: classMeta });
  else if (propMeta !== undefined)
    facets.push({ box: "tbox", primary: propMeta });

  // A subject's domain classes: its own types minus the structural std vocab
  // and the `owl:NamedIndividual` typing artifact. Sorted, so the abox primary
  // (the smallest) is stable across builds/engines regardless of store order.
  const domainClasses = fullTypes
    .filter((t) => t !== NAMED_INDIVIDUAL && !isStdVocab(t))
    .sort();
  const primaryDomain = domainClasses.at(0);
  if (primaryDomain !== undefined) {
    facets.push({ box: "abox", primary: primaryDomain });
  } else if (facets.length === 0) {
    // No schema facet and no domain class — a bare individual (only
    // `owl:NamedIndividual`, or only std-vocab types). Keep it indexed under a
    // deterministic primary rather than dropping it silently.
    const fallback =
      fullTypes
        .filter((t) => t !== NAMED_INDIVIDUAL)
        .sort()
        .at(0) ?? [...fullTypes].sort().at(0);
    if (fallback !== undefined) facets.push({ box: "abox", primary: fallback });
  }
  return facets;
}

/** A `VALUES ?p { … }` body from a predicate list. */
const valuesList = (uris: readonly string[]): string =>
  uris.map((uri) => `<${uri}>`).join(" ");

/** Language rank for label selection: untagged (0) < `@en` (1) < any other (2). */
function rankLanguage(language: string): number {
  if (language === "") return 0;
  const lower = language.toLowerCase();
  return lower === "en" || lower.startsWith("en-") ? 1 : 2;
}

/**
 * Per subject, keep the object whose predicate ranks HIGHEST (lowest index) in
 * `preference`. The `?p` binding is projected so the winner is chosen by declared
 * preference order: SPARQL returns solutions in an unspecified order, so keeping
 * the first row per subject would be store-order-dependent (an entity carrying
 * both `rdfs:label` and `skos:prefLabel` could index either), not ranked.
 *
 * Ties within a predicate (a subject with several `rdfs:label` values — the
 * multilingual case) are broken deterministically: untagged / `@en` first, then
 * the lexically smallest value. So `"Button"@en`/`"Bouton"@fr` always resolves
 * to `Button`, never whichever row the store happened to return first (A7).
 */
function preferredBySubject(
  result: import("@canonical/ke").SelectResult,
  valueVar: string,
  preference: readonly string[],
): Map<string, string> {
  const best = new Map<
    string,
    { value: string; rank: number; langRank: number }
  >();
  for (const term of result.termBindings) {
    if (term.s?.termType !== "NamedNode") continue;
    const valueTerm = term[valueVar];
    const predicate = term.p?.value;
    if (valueTerm === undefined || predicate === undefined) continue;
    const value = valueTerm.value;
    if (!value) continue;
    const rank = preference.indexOf(predicate);
    if (rank === -1) continue;
    const language =
      valueTerm.termType === "Literal" ? (valueTerm.language ?? "") : "";
    const langRank = rankLanguage(language);
    const current = best.get(term.s.value);
    const better =
      current === undefined ||
      rank < current.rank ||
      (rank === current.rank &&
        (langRank < current.langRank ||
          (langRank === current.langRank && value < current.value)));
    if (better) best.set(term.s.value, { value, rank, langRank });
  }
  const picked = new Map<string, string>();
  for (const [subject, entry] of best) picked.set(subject, entry.value);
  return picked;
}

/**
 * Collect ALL matching object values per subject (deduped, insertion order) —
 * for multi-valued enrichment like `altNames`, where every value is a
 * completable token rather than a single preferred one.
 */
function allBySubject(
  result: import("@canonical/ke").SelectResult,
  valueVar: string,
): Map<string, string[]> {
  const collected = new Map<string, string[]>();
  for (const term of result.termBindings) {
    if (term.s?.termType !== "NamedNode") continue;
    const value = term[valueVar]?.value;
    if (!value) continue;
    const bucket = collected.get(term.s.value) ?? [];
    if (!bucket.includes(value)) bucket.push(value);
    collected.set(term.s.value, bucket);
  }
  return collected;
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
  const [typesResult, labelResult, descResult, altNameResult] =
    await Promise.all([
      store.query(
        `SELECT ?s ?type WHERE { ?s <${RDF_TYPE}> ?type }` as never,
      ) as Promise<import("@canonical/ke").SelectResult>,
      store.query(
        `SELECT ?s ?p ?label WHERE { ?s ?p ?label . VALUES ?p { ${valuesList(LABEL_PREDICATES)} } }` as never,
      ) as Promise<import("@canonical/ke").SelectResult>,
      store.query(
        `SELECT ?s ?p ?desc WHERE { ?s ?p ?desc . VALUES ?p { ${valuesList(DESCRIPTION_PREDICATES)} } }` as never,
      ) as Promise<import("@canonical/ke").SelectResult>,
      store.query(
        `SELECT ?s ?p ?alt WHERE { ?s ?p ?alt . VALUES ?p { ${valuesList(ALT_NAME_PREDICATES)} } }` as never,
      ) as Promise<import("@canonical/ke").SelectResult>,
    ]);

  const typesBySubject = new Map<string, string[]>();
  const instanceCountByType: Record<string, number> = {};
  for (const term of typesResult.termBindings) {
    if (term.s?.termType !== "NamedNode") continue;
    const typeTerm = term.type;
    // Ignore blank-node `rdf:type` objects (SHACL shapes / RDF lists): a `_:b0`
    // is never a domain class, so it must not become a garbage primary type or
    // inflate the per-type instance counts (A6).
    if (typeTerm === undefined || typeTerm.termType === "BlankNode") continue;
    const subject = term.s.value;
    const typeUri = typeTerm.value;
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
  const altNamesBySubject = allBySubject(altNameResult, "alt");

  const entities: PackIndexEntity[] = [];
  for (const [subject, fullTypes] of typesBySubject) {
    const facets = classify(fullTypes);
    if (facets.length === 0) continue;
    const prefixed = compactUri(subject, prefixes);
    const altNames = altNamesBySubject.get(subject);
    const typesCompact = fullTypes.map((t) => compactUri(t, prefixes));
    const label = labelBySubject.get(subject) ?? null;
    const description = descBySubject.get(subject) ?? null;
    // A punned subject emits one entity per facet (tbox class + abox individual).
    for (const facet of facets) {
      entities.push({
        name: prefixed,
        type: compactUri(facet.primary, prefixes),
        uri: subject,
        prefixed,
        types: typesCompact,
        label,
        ...(altNames && altNames.length > 0 ? { altNames } : {}),
        box: facet.box,
        description,
      });
    }
  }
  // Sort by name, then a deterministic tie-break (box, then type) so a punned
  // subject's two facets keep a stable order across builds.
  entities.sort((a, b) => {
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    if (a.box !== b.box) return a.box === "tbox" ? -1 : 1;
    return a.type < b.type ? -1 : a.type > b.type ? 1 : 0;
  });

  return {
    version: 2,
    contentHash,
    prefixes,
    entities,
    instanceCountByType,
  };
}
