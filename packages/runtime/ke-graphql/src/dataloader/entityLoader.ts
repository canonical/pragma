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
import type {
  EntityValue,
  MappedIR,
  QueryFn,
  TripleSet,
  TripleValue,
} from "../compiler/types.js";
import { RDF_TYPE } from "../compiler/vocab.js";
import { toPrefixed } from "./uris.js";

/** Separator that cannot occur in IRIs or well-formed literals. */
const SEP = "\u0000";

const toTripleValue = (
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
const mostSpecificTypename = (
  typeUris: string[],
  mapped: MappedIR,
): string | undefined => {
  let best: string | undefined;
  let bestDepth = -1;
  for (const uri of typeUris) {
    const node = mapped.ir.classes.get(uri);
    if (!node) {
      continue;
    }
    if (node.ancestors.length > bestDepth) {
      bestDepth = node.ancestors.length;
      best = uri;
    }
  }
  return best ? mapped.nameMap.toGraphQL(best) : undefined;
};

export const createEntityLoader = (
  query: QueryFn,
  mapped: MappedIR,
  cacheMap?: Map<string, Promise<EntityValue | null>>,
): DataLoader<string, EntityValue | null> => {
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
    const values = fullUris.map((uri) => `<${uri}>`).join(" ");
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

    const setFor = (subject: Term): TripleSet | undefined => {
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

    const objectKey = (term: Term): string =>
      term.termType === "Literal"
        ? `L:${term.value}${SEP}${term.datatype ?? ""}${SEP}${term.language ?? ""}`
        : `${term.termType === "BlankNode" ? "B" : "N"}:${term.value}`;

    for (const quad of quads) {
      const set = setFor(quad.subject);
      if (!set || quad.predicate.termType !== "NamedNode") {
        continue;
      }
      const key = `${objectKey(quad.subject)}${SEP}${quad.predicate.value}${SEP}${objectKey(quad.object)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const list = set.get(quad.predicate.value) ?? [];
      list.push(toTripleValue(quad.object, blankSets));
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
      const typename = mostSpecificTypename(typeUris, mapped);
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
};
