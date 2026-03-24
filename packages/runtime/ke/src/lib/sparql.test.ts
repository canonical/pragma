import { describe, expect, it } from "vitest";
import {
  escapeSparqlURI,
  escapeSparqlValue,
  markAsURI,
  sparql,
} from "./sparql.js";
import type { URI } from "./types.js";

describe("escapeSparqlValue", () => {
  it("escapes a plain string", () => {
    expect(escapeSparqlValue("hello")).toBe('"hello"');
  });

  it("escapes double quotes in strings", () => {
    expect(escapeSparqlValue('say "hi"')).toBe('"say \\"hi\\""');
  });

  it("escapes backslashes in strings", () => {
    expect(escapeSparqlValue("back\\slash")).toBe('"back\\\\slash"');
  });

  it("escapes newlines in strings", () => {
    expect(escapeSparqlValue("line1\nline2")).toBe('"line1\\nline2"');
  });

  it("handles numbers", () => {
    expect(escapeSparqlValue(42)).toBe("42");
    expect(escapeSparqlValue(3.14)).toBe("3.14");
    expect(escapeSparqlValue(-1)).toBe("-1");
    expect(escapeSparqlValue(0)).toBe("0");
  });

  it("rejects non-finite numbers", () => {
    expect(() => escapeSparqlValue(Number.NaN)).toThrow("non-finite");
    expect(() => escapeSparqlValue(Number.POSITIVE_INFINITY)).toThrow(
      "non-finite",
    );
  });

  it("handles booleans", () => {
    expect(escapeSparqlValue(true)).toBe("true");
    expect(escapeSparqlValue(false)).toBe("false");
  });

  it("handles null and undefined", () => {
    expect(escapeSparqlValue(null)).toBe('""');
    expect(escapeSparqlValue(undefined)).toBe('""');
  });

  it("allows curly braces inside quoted string values", () => {
    expect(escapeSparqlValue('{ type: "a" }')).toBe('"{ type: \\"a\\" }"');
  });

  it("rejects strings with UNION keyword", () => {
    expect(() => escapeSparqlValue("} UNION {")).toThrow("dangerous");
    expect(() => escapeSparqlValue("UNION")).toThrow("dangerous");
    expect(() => escapeSparqlValue("union")).toThrow("dangerous");
  });

  it("allows words containing dangerous keywords as substrings", () => {
    expect(escapeSparqlValue("Addison")).toBe('"Addison"');
    expect(escapeSparqlValue("CreateElement")).toBe('"CreateElement"');
    expect(escapeSparqlValue("CopyToClipboard")).toBe('"CopyToClipboard"');
  });

  it("rejects strings with semicolons at end", () => {
    expect(() => escapeSparqlValue("value; ")).toThrow("dangerous");
  });

  it("allows hash characters inside quoted string values", () => {
    expect(escapeSparqlValue("value # comment")).toBe('"value # comment"');
  });

  it("rejects strings with INSERT/DELETE keywords", () => {
    expect(() => escapeSparqlValue("INSERT DATA")).toThrow("dangerous");
    expect(() => escapeSparqlValue("DELETE WHERE")).toThrow("dangerous");
  });

  it("rejects unsupported types", () => {
    expect(() => escapeSparqlValue(Symbol("bad"))).toThrow("Unsupported");
    expect(() => escapeSparqlValue({})).toThrow("Unsupported");
  });
});

describe("escapeSparqlURI", () => {
  it("wraps a URI in angle brackets", () => {
    const uri = "http://example.org/test" as URI;
    expect(escapeSparqlURI(uri)).toBe("<http://example.org/test>");
  });

  it("rejects URIs with closing angle bracket", () => {
    const uri = "http://example.org/te>st" as URI;
    expect(() => escapeSparqlURI(uri)).toThrow("Invalid IRI");
  });

  it("rejects URIs with newlines", () => {
    const uri = "http://example.org/te\nst" as URI;
    expect(() => escapeSparqlURI(uri)).toThrow("Invalid IRI");
  });
});

describe("sparql tagged template", () => {
  it("creates a SPARQL query from a template literal", () => {
    const query = sparql`SELECT ?s WHERE { ?s ?p ?o }`;
    expect(query).toBe("SELECT ?s WHERE { ?s ?p ?o }");
  });

  it("escapes string interpolations", () => {
    const name = "Alice";
    const query = sparql`SELECT ?s WHERE { ?s <http://schema.org/name> ${name} }`;
    expect(query).toBe(
      'SELECT ?s WHERE { ?s <http://schema.org/name> "Alice" }',
    );
  });

  it("escapes number interpolations", () => {
    const age = 30;
    const query = sparql`SELECT ?s WHERE { ?s <http://schema.org/age> ${age} }`;
    expect(query).toBe("SELECT ?s WHERE { ?s <http://schema.org/age> 30 }");
  });

  it("escapes boolean interpolations", () => {
    const active = true;
    const query = sparql`ASK { ?s <http://example.org/active> ${active} }`;
    expect(query).toBe("ASK { ?s <http://example.org/active> true }");
  });

  it("wraps branded URIs in angle brackets", () => {
    const uri = markAsURI("http://example.org/alice");
    const query = sparql`SELECT ?name WHERE { ${uri} <http://schema.org/name> ?name }`;
    expect(query).toBe(
      "SELECT ?name WHERE { <http://example.org/alice> <http://schema.org/name> ?name }",
    );
  });

  it("handles multiple interpolations", () => {
    const name = "Alice";
    const age = 30;
    const query = sparql`SELECT ?s WHERE { ?s <http://schema.org/name> ${name} . ?s <http://schema.org/age> ${age} }`;
    expect(query).toBe(
      'SELECT ?s WHERE { ?s <http://schema.org/name> "Alice" . ?s <http://schema.org/age> 30 }',
    );
  });

  it("rejects dangerous string interpolations", () => {
    expect(() => sparql`SELECT ?s WHERE { ?s ?p ${"} UNION {"} }`).toThrow(
      "dangerous",
    );
  });
});
