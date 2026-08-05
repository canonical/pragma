// =============================================================================
// Prefix harvesting from Turtle prologues.
//
// ke's `createStore` does not fold parsed-Turtle prefixes into
// `store.prefixes`, so the compiler would see full IRIs and emit field names
// derived from them. Every prefixed field name in the committed
// `schema.graphql` depends on this function finding the declaration.
// =============================================================================

import { describe, expect, it } from "vitest";
import { CORPUS_REFS_ROOT, CORPUS_SEM_ROOT } from "../../testing/corpus.js";
import { collectTtlSources } from "./collectTtlSources.js";
import { harvestPrefixes } from "./harvestPrefixes.js";

const source = (content: string) => [{ path: "x.ttl", content }];

describe("harvestPrefixes over the corpus", () => {
  const prefixes = harvestPrefixes(
    collectTtlSources({
      refsRoot: CORPUS_REFS_ROOT,
      semRoot: CORPUS_SEM_ROOT,
    }),
  );

  it("harvests from both roots", () => {
    expect(prefixes.ds).toBe("https://design.example.org/ontology#");
    expect(prefixes.sur).toBe("sem://surface#");
    expect(prefixes.anatomy).toBe("http://anatomy-dsl.example.org/ontology#");
  });
});

describe("harvestPrefixes", () => {
  it("accepts the SPARQL keyword form without the at-sign", () => {
    expect(harvestPrefixes(source("PREFIX ex: <https://e.example/>"))).toEqual({
      ex: "https://e.example/",
    });
  });

  it("skips the default-namespace form", () => {
    // `@prefix : <iri>` has no label, and an empty key would collide with
    // every other unlabelled declaration in the corpus.
    expect(harvestPrefixes(source("@prefix : <https://e.example/> ."))).toEqual(
      {},
    );
  });

  it("lets a later declaration win", () => {
    expect(
      harvestPrefixes([
        { path: "a.ttl", content: "@prefix ex: <https://a.example/> ." },
        { path: "b.ttl", content: "@prefix ex: <https://b.example/> ." },
      ]),
    ).toEqual({ ex: "https://b.example/" });
  });

  it("returns nothing for a prologue-free source", () => {
    expect(harvestPrefixes(source("<a> <b> <c> ."))).toEqual({});
  });

  it("skips a declaration with an empty IRI", () => {
    // `<>` parses as a group match but is not a usable namespace; letting it
    // through would map a prefix onto the empty string and silently shorten
    // every IRI in the store to its own text.
    expect(harvestPrefixes(source("@prefix ex: <> ."))).toEqual({});
  });
});
