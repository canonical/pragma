import { describe, expect, it } from "vitest";
import { namespace } from "./namespace.js";
import { isBrandedURI } from "./sparql.js";

describe("namespace", () => {
  it("creates a namespace helper that produces URIs", () => {
    const schema = namespace("http://schema.org/");
    const name = schema("name");
    expect(name).toBe("http://schema.org/name");
  });

  it("marks produced values as branded URIs", () => {
    const ex = namespace("http://example.org/");
    const uri = ex("test");
    expect(isBrandedURI(uri)).toBe(true);
  });

  it("produces distinct terms from the same namespace", () => {
    const schema = namespace("http://schema.org/");
    const name = schema("name");
    const age = schema("age");
    expect(name).not.toBe(age);
    expect(name).toBe("http://schema.org/name");
    expect(age).toBe("http://schema.org/age");
  });

  it("works with different namespace prefixes", () => {
    const rdf = namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
    const type = rdf("type");
    expect(type).toBe("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
  });
});
