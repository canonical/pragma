import type { Store } from "@canonical/ke";
import findNamespace from "../../domains/ontology/helpers/findNamespace.js";
import { buildQuery } from "../../domains/shared/buildQuery.js";
import compactUri from "../../domains/shared/compactUri.js";
import extractLocalName from "../../domains/shared/extractLocalName.js";
import classifyEntity from "./classifyEntity.js";
import { RDF_TYPE } from "./constants.js";
import {
  collectDescriptionPredicates,
  collectLabelPredicates,
  resolveDescriptionPredicates,
  resolveLabelPredicates,
} from "./displayPredicates.js";
import pickFirstValue from "./pickFirstValue.js";
import pickPrimaryType from "./pickPrimaryType.js";
import type { GraphEntity, GraphIndex } from "./types.js";

/** A per-subject map of predicate URI → asserted lexical values. */
type ValuesBySubject = Map<string, Map<string, string[]>>;

/** Wrap full URIs as a SPARQL `VALUES` list body. */
function toValuesList(uris: readonly string[]): string {
  return [...new Set(uris)].map((uri) => `<${uri}>`).join(" ");
}

/**
 * Run one `?s ?p ?v` bulk query restricted to the given predicates and
 * collect values per named-node subject. Blank-node subjects are skipped —
 * they are never listed as resources.
 *
 * @note Queries ke store
 */
async function fetchValuesBySubject(
  store: Store,
  predicates: readonly string[],
): Promise<ValuesBySubject> {
  const bySubject: ValuesBySubject = new Map();
  if (predicates.length === 0) return bySubject;

  const result = await store.query(
    buildQuery(
      `SELECT ?s ?p ?v WHERE { ?s ?p ?v . VALUES ?p { ${toValuesList(predicates)} } }`,
    ),
  );
  if (result.type !== "select") return bySubject;

  for (const term of result.termBindings) {
    if (term.s?.termType !== "NamedNode") continue;
    const subject = term.s.value;
    const predicate = term.p?.value ?? "";
    const value = term.v?.value ?? "";
    const byPredicate = bySubject.get(subject) ?? new Map<string, string[]>();
    const values = byPredicate.get(predicate) ?? [];
    values.push(value);
    byPredicate.set(predicate, values);
    bySubject.set(subject, byPredicate);
  }
  return bySubject;
}

/**
 * Build the in-memory graph index used by listing, autocomplete, and reads.
 *
 * Replaces the former per-subject label/type/description queries with three
 * bulk queries — one for types, one for labels, one for descriptions — joined
 * in memory. Only typed named-node subjects are indexed; untyped subjects and
 * blank nodes are reachable via `graph_query` but are not listed as resources.
 *
 * @param store - The ke store to query.
 * @param prefixes - The store's merged prefix map.
 * @returns The classified entities plus label and instance-count lookups.
 *
 * @note Queries ke store
 */
export default async function buildGraphIndex(
  store: Store,
  prefixes: Readonly<Record<string, string>>,
): Promise<GraphIndex> {
  const prefixEntries = Object.entries(prefixes);

  const [typesResult, labelValues, descriptionValues] = await Promise.all([
    store.query(buildQuery(`SELECT ?s ?type WHERE { ?s <${RDF_TYPE}> ?type }`)),
    fetchValuesBySubject(store, collectLabelPredicates()),
    fetchValuesBySubject(store, collectDescriptionPredicates()),
  ]);

  const typesBySubject = new Map<string, string[]>();
  const instanceCountByType = new Map<string, number>();
  if (typesResult.type === "select") {
    for (const term of typesResult.termBindings) {
      if (term.s?.termType !== "NamedNode") continue;
      const subject = term.s.value;
      const typeUri = term.type?.value ?? "";
      const types = typesBySubject.get(subject) ?? [];
      types.push(typeUri);
      typesBySubject.set(subject, types);
      instanceCountByType.set(
        typeUri,
        (instanceCountByType.get(typeUri) ?? 0) + 1,
      );
    }
  }

  // Phase 1: resolve every subject's label and description so that a class
  // label is available before any individual that references it is built.
  interface ResolvedSubject {
    readonly subject: string;
    readonly fullTypes: string[];
    readonly box: GraphEntity["box"];
    readonly category: GraphEntity["category"];
    readonly label: string | null;
    readonly description: string | null;
  }

  const labelByUri = new Map<string, string>();
  const resolved: ResolvedSubject[] = [];

  for (const [subject, fullTypes] of typesBySubject) {
    const classification = classifyEntity(fullTypes);
    if (classification === null) continue;

    const prefix = findNamespace(subject, prefixEntries)?.prefix;
    const label = pickFirstValue(
      labelValues.get(subject) ?? new Map(),
      resolveLabelPredicates(prefix),
    );
    const description = pickFirstValue(
      descriptionValues.get(subject) ?? new Map(),
      resolveDescriptionPredicates(prefix),
    );
    if (label !== null) labelByUri.set(subject, label);

    resolved.push({
      subject,
      fullTypes,
      box: classification.box,
      category: classification.category,
      label,
      description,
    });
  }

  // Phase 2: build entities, resolving each individual's grouping label from
  // the now-complete label lookup.
  const entities: GraphEntity[] = resolved.map((r) => {
    const primaryTypeFull =
      r.category === "individual" ? pickPrimaryType(r.fullTypes) : null;
    return {
      uri: r.subject,
      prefixed: compactUri(r.subject, prefixes),
      box: r.box,
      category: r.category,
      types: r.fullTypes.map((t) => compactUri(t, prefixes)),
      primaryType:
        primaryTypeFull === null ? null : compactUri(primaryTypeFull, prefixes),
      primaryTypeLabel:
        primaryTypeFull === null
          ? null
          : (labelByUri.get(primaryTypeFull) ??
            extractLocalName(primaryTypeFull)),
      label: r.label,
      description: r.description,
    };
  });

  return { entities, labelByUri, instanceCountByType };
}
