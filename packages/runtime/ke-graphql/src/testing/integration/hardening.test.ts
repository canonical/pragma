// =============================================================================
// Hardening behaviors that need a compiled schema end-to-end: the forced-
// abstract-with-instances guard (correctness C1 + V015) and the SPARQL
// injection guard reaching through node(id:) — now keyed on absolute IRIs
// — to a null result.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import { afterEach, describe, expect, it } from "vitest";
import { compile, createStoreQueryFn } from "../../lib/compiler/index.js";
import {
  executeLocal,
  isIncrementalResults,
} from "../../lib/execution/index.js";
import { isAbsoluteIri, isSafeIri } from "../../lib/hardening/index.js";

const PREFIXES = { ex: "http://example.org/" };

// A class with a subclass AND a named instance of the parent itself — the only
// shape that can trip the forced-abstract crash.
const HIERARCHY_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Animal a owl:Class ; rdfs:label "Animal" .
ex:Dog a owl:Class ; rdfs:subClassOf ex:Animal ; rdfs:label "Dog" .
ex:name a owl:DatatypeProperty ; rdfs:domain ex:Animal ; rdfs:range xsd:string .

ex:a1 a ex:Animal ; ex:name "Generic" .
ex:d1 a ex:Dog ; ex:name "Rex" .
`;

type Cleanup = () => void;
let cleanups: Cleanup[] = [];

afterEach(() => {
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
});

const compileHierarchy = async () => {
  const { store, cleanup } = await createTestStore({
    ttl: HIERARCHY_TTL,
    prefixes: PREFIXES,
  });
  cleanups.push(cleanup);
  const result = await compile(createStoreQueryFn(store), PREFIXES, {
    mappings: { "http://example.org/Animal": { abstract: true } },
  });
  return { result, store };
};

describe("forced abstract with direct instances (C1 + V015)", () => {
  it("warns (V015) when the data contradicts an abstract mapping", async () => {
    const { result } = await compileHierarchy();
    expect(result.diagnostics.some((d) => d.code === "V015")).toBe(true);
  });

  it("filters the abstract-only instance instead of crashing resolveType", async () => {
    const { result, store } = await compileHierarchy();
    const context = result.createContext(store);
    const execution = await executeLocal({
      schema: result.schema,
      source: `{ node(id: "http://example.org/a1") { __typename } }`,
      contextValue: context,
    });
    expect(isIncrementalResults(execution)).toBe(false);
    if (!isIncrementalResults(execution)) {
      // No "Abstract type ... resolved to a non-object type" error.
      expect(execution.errors).toBeUndefined();
      expect(execution.data?.node).toBeNull();
    }
  });

  it("still resolves a concrete subclass instance to its concrete type", async () => {
    const { result, store } = await compileHierarchy();
    const context = result.createContext(store);
    const execution = await executeLocal({
      schema: result.schema,
      source: `{ node(id: "http://example.org/d1") { __typename } }`,
      contextValue: context,
    });
    if (!isIncrementalResults(execution)) {
      expect(execution.errors).toBeUndefined();
      expect((execution.data?.node as { __typename: string }).__typename).toBe(
        "Dog",
      );
    }
  });
});

describe("SPARQL injection through node(id:)", () => {
  // An id crafted to break out of the loader's `<${iri}>` interpolation: the
  // ">" would close the IRIREF early and the remainder would ride into the
  // CONSTRUCT as graph patterns.
  const INJECTED_ID =
    "http://example.org/d1> ?x ?y ?z . <http://example.org/d1";

  it("is caught by the isSafeIri gate, not the absolute-IRI gate", () => {
    // Which gate fires matters: node(id:) applies isAbsoluteIri first, and
    // "http" is a legal scheme, so this id is ADMITTED there and reaches the
    // entity loader. isSafeIri inside the loader batch is the guard actually
    // under test — pinned so the test cannot silently degrade into another
    // exercise of the admission gate.
    expect(isAbsoluteIri(INJECTED_ID)).toBe(true);
    expect(isSafeIri(INJECTED_ID)).toBe(false);
  });

  it("resolves null cleanly and leaves a sibling lookup in the same batch intact", async () => {
    const { result, store } = await compileHierarchy();
    const context = result.createContext(store);
    // Both fields resolve in one tick, so they share ONE DataLoader batch and
    // ONE CONSTRUCT. The unsafe id must be dropped from the VALUES clause
    // without failing the query for its valid sibling — a rejected id is
    // "not found", never an error and never injected SPARQL.
    const execution = await executeLocal({
      schema: result.schema,
      source: `{
        injected: node(id: ${JSON.stringify(INJECTED_ID)}) { uri }
        valid: node(id: "http://example.org/d1") { uri __typename }
      }`,
      contextValue: context,
    });
    expect(isIncrementalResults(execution)).toBe(false);
    if (!isIncrementalResults(execution)) {
      // No thrown error surfaced as a GraphQL error, and no partial data.
      expect(execution.errors).toBeUndefined();
      expect(execution.data?.injected).toBeNull();
      expect(execution.data?.valid).toEqual({
        uri: "http://example.org/d1",
        __typename: "Dog",
      });
    }
  });
});
