// =============================================================================
// The node(id:) admission gate. The admission rule is fixed by the schema
// contract (graphql-schema-spec 1) — every conforming runtime must admit and
// reject exactly the same strings, so the vectors here are contract vectors.
// =============================================================================

import { describe, expect, it } from "vitest";
import isAbsoluteIri from "./isAbsoluteIri.js";

describe("isAbsoluteIri", () => {
  it("admits absolute IRIs under any scheme", () => {
    expect(isAbsoluteIri("pkg://@x/a#T")).toBe(true);
    expect(isAbsoluteIri("urn:uuid:1234")).toBe(true);
  });

  it("rejects strings with no RFC 3986 scheme", () => {
    expect(isAbsoluteIri("not an iri")).toBe(false); // no colon at all
    expect(isAbsoluteIri("Film")).toBe(false); // no scheme
    expect(isAbsoluteIri("1http://x")).toBe(false); // digit-initial scheme
    expect(isAbsoluteIri(":empty")).toBe(false); // empty scheme
  });

  it("rejects a scheme with nothing after the colon", () => {
    expect(isAbsoluteIri("http:")).toBe(false);
  });

  it("rejects an illegal character inside the scheme", () => {
    expect(isAbsoluteIri("ht_tp://x")).toBe(false);
  });

  it("admits the full RFC 3986 scheme alphabet", () => {
    // ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
    expect(isAbsoluteIri("a1+b-c.d:x")).toBe(true);
    expect(isAbsoluteIri("HTTPS://X")).toBe(true);
  });

  it("admits the real ontology IRIs this package keys on", () => {
    expect(
      isAbsoluteIri("https://ds.canonical.com/global.component.button"),
    ).toBe(true);
    expect(
      isAbsoluteIri("http://pragma.canonical.com/codestandards#Standard"),
    ).toBe(true);
  });
});
