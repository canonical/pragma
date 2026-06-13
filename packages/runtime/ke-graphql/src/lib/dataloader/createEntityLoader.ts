// =============================================================================
// Entity loader (§5.3). One batched CONSTRUCT fetches the requested entities'
// triples AND the closure of their blank-node children in the same query —
// blank-node labels are only consistent within a single result set (a
// follow-up query per blank node is invalid SPARQL: labels are existential
// variables, and VALUES may not contain blank nodes).
//
// Guards: ke classifies an empty CONSTRUCT result as { type: "select" }
// (shape-based detection) — treated here as "all URIs missing". The closure
// query produces one row per (?p,?o) x (?bp,?bo) combination, so identical
// triples repeat — deduped by (subject, predicate, object identity).
// =============================================================================

import type { Quad, Term } from "@canonical/ke";
import DataLoader from "dataloader";
import { isSafeIri } from "#hardening";
import {
  type EntityValue,
  type MappedIR,
  type QueryFn,
  RDF_TYPE,
  type TripleSet,
  type TripleValue,
} from "#shared";
import { toPrefixed } from "./uris.js";

/** Separator that cannot occur in IRIs or well-formed literals. */
const SEP = "\u0000";

const convertToTripleValue = (
  term: Term,
  blankSets: Map<string, TripleSet>,
): TripleValue => {
  switch (term.termType) {
    case "NamedNode":
      return { kind: "uri", value: term.value };
    case "BlankNode": {
      let triples = blankSets.get(term.value);
      if (!triples) {
        triples = new Map();
        blankSets.set(term.value, triples);
      }
      return { kind: "blank", id: term.value, triples };
    }
    case "Literal":
      return {
        kind: "literal",
        value: term.value,
        datatype: term.datatype,
        language: term.language,
      };
  }
};

/** Pick the most specific class among rdf:type assertions via the IR. */
const pickMostSpecificTypename = (
  typeUris: string[],
  mapped: MappedIR,
): string | undefined => {
  let best: string | undefined;
  let bestDepth = -1;
  for (const uri of typeUris) {
    const node = mapped.ir.classes.get(uri);
    // Only concrete classes are valid runtime typenames. Returning an abstract
    // class's name makes graphql-js reject it in resolveType ("abstract type
    // resolved to non-object type"), which nulls the whole field. An entity
    // typed only as abstract classes resolves to undefined (filtered) instead.
    if (!node || node.isAbstract) {
      continue;
    }
    if (node.ancestors.length > bestDepth) {
      bestDepth = node.ancestors.length;
      best = uri;
    }
  }
  return best ? mapped.nameMap.toGraphQL(best) : undefined;
};

/**
 * Create the entity DataLoader: batches full-IRI keys into one CONSTRUCT
 * (including the single-hop blank-node closure) and yields EntityValues, or
 * null for missing/typeless URIs. An optional cacheMap shares the cache
 * across contexts ("process" mode); failed batches evict their keys so
 * errors are never memoized.
 *
 * @note Impure — the returned loader executes SPARQL queries against the
 * store.
 */
export default function createEntityLoader(
  query: QueryFn,
  mapped: MappedIR,
  cacheMap?: Map<string, Promise<EntityValue | null>>,
): DataLoader<string, EntityValue | null> {
  const loader: DataLoader<string, EntityValue | null> = new DataLoader(
    (fullUris) =>
      batch(fullUris).catch((error) => {
        // A shared (process-lifetime) cache must not memoize failures:
        // evict the keys of a failed batch before rethrowing.
        for (const uri of fullUris) {
          loader.clear(uri);
        }
        throw error;
      }),
    cacheMap ? { cacheMap } : undefined,
  );
  const batch = async (fullUris: ReadonlyArray<string>) => {
    // Injection guard (KG.19): only IRIs safe to interpolate into an IRIREF
    // reach the query. An unsafe global ID is simply absent from VALUES and
    // resolves to null (not found), never to injected SPARQL.
    const values = fullUris
      .filter(isSafeIri)
      .map((uri) => `<${uri}>`)
      .join(" ");
    const result = await query(
      `CONSTRUCT { ?s ?p ?o . ?o ?bp ?bo }
       WHERE {
         VALUES ?s { ${values} }
         ?s ?p ?o .
         OPTIONAL { ?o ?bp ?bo . FILTER(isBlank(?o)) }
       }`,
    );
    // Empty CONSTRUCT results arrive select-shaped from ke.
    const quads: Quad[] = result.type === "construct" ? result.quads : [];

    // Group triples per subject; blank-node subjects fill the shared sets.
    const bySubject = new Map<string, TripleSet>();
    const blankSets = new Map<string, TripleSet>();
    const seen = new Set<string>();

    const resolveTripleSet = (subject: Term): TripleSet | undefined => {
      if (subject.termType === "NamedNode") {
        let set = bySubject.get(subject.value);
        if (!set) {
          set = new Map();
          bySubject.set(subject.value, set);
        }
        return set;
      }
      if (subject.termType === "BlankNode") {
        let set = blankSets.get(subject.value);
        if (!set) {
          set = new Map();
          blankSets.set(subject.value, set);
        }
        return set;
      }
      return undefined;
    };

    const encodeTermKey = (term: Term): string =>
      term.termType === "Literal"
        ? `L:${term.value}${SEP}${term.datatype ?? ""}${SEP}${term.language ?? ""}`
        : `${term.termType === "BlankNode" ? "B" : "N"}:${term.value}`;

    for (const quad of quads) {
      const set = resolveTripleSet(quad.subject);
      if (!set || quad.predicate.termType !== "NamedNode") {
        continue;
      }
      const key = `${encodeTermKey(quad.subject)}${SEP}${quad.predicate.value}${SEP}${encodeTermKey(quad.object)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const list = set.get(quad.predicate.value) ?? [];
      list.push(convertToTripleValue(quad.object, blankSets));
      set.set(quad.predicate.value, list);
    }

    return fullUris.map((uri) => {
      const triples = bySubject.get(uri);
      if (!triples) {
        return null;
      }
      const typeUris = (triples.get(RDF_TYPE) ?? [])
        .filter((v) => v.kind === "uri")
        .map((v) => (v as { value: string }).value);
      const typename = pickMostSpecificTypename(typeUris, mapped);
      if (!typename) {
        return null; // URI exists but has no known class assertion
      }
      return {
        uri: toPrefixed(uri, mapped.namespaces),
        typename,
        triples,
      } satisfies EntityValue;
    });
  };

  return loader;
}
