import { describe, expect, it } from "vitest";
import buildLookupQuery, {
  buildLookupByIriQuery,
  buildLookupNamesQuery,
  escapeSparqlString,
  formatTerm,
} from "./buildLookupQuery.js";

describe("escapeSparqlString", () => {
  it("escapes quotes, backslashes, and newlines", () => {
    expect(escapeSparqlString('a"b\\c\nd')).toBe('a\\"b\\\\c\\nd');
  });
});

describe("formatTerm", () => {
  it("keeps prefixed names and wraps absolute IRIs", () => {
    expect(formatTerm("ex:Recipe")).toBe("ex:Recipe");
    expect(formatTerm("http://example.org/x")).toBe("<http://example.org/x>");
  });
});

describe("buildLookupQuery", () => {
  it("generates a typed, escaped, case-insensitive match", () => {
    const query = buildLookupQuery(
      {
        by: "ex:name",
        type: "ex:Recipe",
        fields: [{ name: "category", property: "ex:category" }],
      },
      'Pan"cakes',
    );
    expect(query).toContain("?uri ex:name ?name .");
    expect(query).toContain("?uri a ex:Recipe .");
    expect(query).toContain("OPTIONAL { ?uri ex:category ?category . }");
    expect(query).toContain('LCASE("Pan\\"cakes")');
    expect(query).toContain("LIMIT 1");
  });

  it("omits the type constraint when absent", () => {
    const query = buildLookupQuery({ by: "ex:name" }, "x");
    expect(query).not.toContain("?uri a ");
  });
});

describe("buildLookupByIriQuery", () => {
  it("binds the resolved IRI instead of filtering on the name", () => {
    const query = buildLookupByIriQuery(
      {
        by: "ex:name",
        type: "ex:Recipe",
        fields: [{ name: "category", property: "ex:category" }],
      },
      "http://example.org/recipes/pancakes",
    );
    expect(query).toContain(
      "BIND(<http://example.org/recipes/pancakes> AS ?uri)",
    );
    expect(query).toContain("?uri ex:name ?name .");
    expect(query).toContain("?uri a ex:Recipe .");
    expect(query).toContain("OPTIONAL { ?uri ex:category ?category . }");
    expect(query).not.toContain("FILTER");
    expect(query).toContain("LIMIT 1");
  });

  it("omits the type constraint when absent", () => {
    const query = buildLookupByIriQuery(
      { by: "ex:name" },
      "http://example.org/x",
    );
    expect(query).not.toContain("?uri a ");
  });
});

describe("buildLookupNamesQuery", () => {
  it("selects all names for the by property", () => {
    const query = buildLookupNamesQuery({ by: "ex:name", type: "ex:Recipe" });
    expect(query).toContain("SELECT ?name WHERE {");
    expect(query).toContain("?uri ex:name ?name .");
    expect(query).toContain("?uri a ex:Recipe .");
  });
});
