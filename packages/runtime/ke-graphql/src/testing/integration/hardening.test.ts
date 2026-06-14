// =============================================================================
// Hardening behaviors that need a compiled schema end-to-end: the forced-
// abstract-with-instances guard (correctness C1 + V015) and the SPARQL
// injection guard reaching through node(id:) to a null result.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import { afterEach, describe, expect, it } from "vitest";
import { compile, createStoreQueryFn } from "#compiler";
import { executeLocal, isIncrementalResults } from "#execution";

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
      source: `{ node(id: "ex:a1") { __typename } }`,
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
      source: `{ node(id: "ex:d1") { __typename } }`,
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
