import { describe, expect, it } from "vitest";
import { embeddedManifest } from "../runtime/graphpack/embedded.js";
import { DEFAULT_PREFIX_MAP } from "./prefixes.js";

describe("DEFAULT_PREFIX_MAP", () => {
  it("is the standard RDF vocabulary plus the distribution's declared namespaces", () => {
    // A literal pin, not a re-derivation: the point is that editing
    // `pragma.conf.ts`'s `prefixes` is what moves this map, and that the
    // standard half stays kernel-owned. A reviewer reads the values here.
    expect(DEFAULT_PREFIX_MAP).toEqual({
      rdfs: "http://www.w3.org/2000/01/rdf-schema#",
      owl: "http://www.w3.org/2002/07/owl#",
      skos: "http://www.w3.org/2004/02/skos/core#",
      ds: "https://ds.canonical.com/",
      cs: "http://pragma.canonical.com/codestandards#",
    });
  });

  it("binds every prefix to the same IRI the shipped pack does", () => {
    // Two independently produced maps: this compiled-in constant, and the
    // committed embedded artifact's harvested manifest. Neither derives the
    // other, so agreement is a real claim.
    //
    // It is also the guard against a silent bundler skip. `scripts/bundle.ts`
    // writes nothing when the content hash matches, and that hash covers pack
    // SOURCES only — so declaring a namespace in `pragma.conf.ts` cannot, by
    // itself, make the shipped pack bind it. Without this test that mismatch
    // shows up as entities compacting to nothing; with it, it fails here.
    const shipped = embeddedManifest().prefixes;
    for (const [prefix, namespace] of Object.entries(DEFAULT_PREFIX_MAP)) {
      expect(shipped[prefix], `pack binding for \`${prefix}:\``).toBe(
        namespace,
      );
    }
  });
});
