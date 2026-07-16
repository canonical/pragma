import { describe, expect, it } from "vitest";
import buildLookupQuery, {
  activeLookupExpands,
  activeLookupFields,
  buildLookupByIriQuery,
  buildLookupNamesQuery,
  buildNameResolveQuery,
  escapeSparqlString,
  formatTerm,
} from "./buildLookupQuery.js";
import type { StoryPackLookup } from "./types.js";

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

  it("projects a multi-class constraint as a VALUES clause", () => {
    const query = buildLookupQuery(
      { by: "ex:name", types: ["ex:Recipe", "ex:Drink"] },
      "x",
    );
    expect(query).toContain("VALUES ?packType { ex:Recipe ex:Drink }");
    expect(query).toContain("?uri a ?packType .");
  });

  it("excludes level-gated fields below the active level", () => {
    const lookup: StoryPackLookup = {
      by: "ex:name",
      fields: [
        { name: "category", property: "ex:category" },
        { name: "notes", property: "ex:notes", level: "full" },
      ],
      disclosure: { levels: ["base", "full"] },
    };
    const base = buildLookupQuery(lookup, "x", "base");
    expect(base).toContain("?category");
    expect(base).not.toContain("?notes");
    const full = buildLookupQuery(lookup, "x", "full");
    expect(full).toContain("?notes");
  });
});

describe("activeLookupFields / activeLookupExpands", () => {
  const lookup: StoryPackLookup = {
    by: "ex:name",
    fields: [{ name: "a", property: "ex:a" }],
    sections: [{ name: "b", property: "ex:b", level: "full" }],
    expand: [
      {
        name: "kids",
        relation: "ex:kid",
        level: "full",
        select: [{ name: "name", property: "ex:name" }],
      },
    ],
    disclosure: { levels: ["base", "full"] },
  };

  it("includes everything when no level is requested", () => {
    expect(activeLookupFields(lookup).map((f) => f.name)).toEqual(["a", "b"]);
    expect(activeLookupExpands(lookup)).toHaveLength(1);
  });

  it("gates tagged entries below their level", () => {
    expect(activeLookupFields(lookup, "base").map((f) => f.name)).toEqual([
      "a",
    ]);
    expect(activeLookupExpands(lookup, "base")).toHaveLength(0);
    expect(activeLookupExpands(lookup, "full")).toHaveLength(1);
  });
});

describe("buildNameResolveQuery", () => {
  it("selects only uri and name with the class constraint", () => {
    const query = buildNameResolveQuery(
      {
        by: "ex:name",
        types: ["ex:Recipe"],
        fields: [{ name: "category", property: "ex:category" }],
      },
      'Pan"cakes',
    );
    expect(query).toContain("SELECT ?uri ?name WHERE {");
    expect(query).toContain("VALUES ?packType { ex:Recipe }");
    expect(query).toContain('LCASE("Pan\\"cakes")');
    expect(query).not.toContain("?category");
    expect(query).toContain("LIMIT 1");
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
