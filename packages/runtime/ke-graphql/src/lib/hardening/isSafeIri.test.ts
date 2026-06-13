import { describe, expect, it } from "vitest";
import isSafeIri from "./isSafeIri.js";

describe("isSafeIri (SPARQL IRIREF injection guard)", () => {
  it("accepts well-formed IRIs with legal punctuation", () => {
    for (const iri of [
      "http://example.org/Thing",
      "https://ds.canonical.com/global.component.button",
      "http://ex.org/path?q=1#frag",
      "urn:uuid:1234-5678",
    ]) {
      expect(isSafeIri(iri)).toBe(true);
    }
  });

  it("rejects IRIs carrying an IRIREF-illegal character", () => {
    for (const iri of [
      "http://ex.org/x> } UNION { ?s ?p ?o } #", // the injection breakout
      "http://ex.org/a b", // space
      "http://ex.org/x\ty", // control character (tab)
      "http://ex.org/<x>",
      'http://ex.org/"x"',
      "http://ex.org/{x}",
      "http://ex.org/x|y",
      "http://ex.org/x^y",
      "http://ex.org/x`y",
      "http://ex.org/x\\y",
      "",
    ]) {
      expect(isSafeIri(iri)).toBe(false);
    }
  });
});
