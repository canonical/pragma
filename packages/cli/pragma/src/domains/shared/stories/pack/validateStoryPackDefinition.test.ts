import { describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { RECIPE_STORY } from "#testing";
import validateStoryPackDefinition from "./validateStoryPackDefinition.js";

describe("validateStoryPackDefinition", () => {
  it("accepts a valid definition and round-trips it", () => {
    const validated = validateStoryPackDefinition(
      JSON.parse(JSON.stringify(RECIPE_STORY)),
      "test",
    );
    expect(validated).toEqual(RECIPE_STORY);
  });

  it("rejects a non-kebab noun", () => {
    expect(() =>
      validateStoryPackDefinition({ ...RECIPE_STORY, noun: "Recipe" }, "test"),
    ).toThrow(PragmaError);
  });

  it("rejects a list without a SELECT query", () => {
    expect(() =>
      validateStoryPackDefinition(
        {
          ...RECIPE_STORY,
          list: { ...RECIPE_STORY.list, query: "DELETE WHERE { ?s ?p ?o }" },
        },
        "test",
      ),
    ).toThrow(/SELECT/);
  });

  it("rejects empty columns", () => {
    expect(() =>
      validateStoryPackDefinition(
        { ...RECIPE_STORY, list: { ...RECIPE_STORY.list, columns: [] } },
        "test",
      ),
    ).toThrow(/columns/);
  });

  it("rejects a lookup term that is neither prefixed nor an IRI", () => {
    expect(() =>
      validateStoryPackDefinition(
        {
          ...RECIPE_STORY,
          lookup: { by: "just a name" },
        },
        "test",
      ),
    ).toThrow(/prefixed name/);
  });

  it("rejects an unknown section kind", () => {
    expect(() =>
      validateStoryPackDefinition(
        {
          ...RECIPE_STORY,
          lookup: {
            by: "ex:name",
            sections: [{ name: "x", property: "ex:x", kind: "table" }],
          },
        },
        "test",
      ),
    ).toThrow(/kind/);
  });

  it("names the source in errors", () => {
    try {
      validateStoryPackDefinition({}, "/pkg/stories/broken.json");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(PragmaError);
      expect((error as PragmaError).message).toContain(
        "/pkg/stories/broken.json",
      );
    }
  });
});

describe("validateStoryPackDefinition — term and query hardening", () => {
  function withLookup(lookup: Record<string, unknown>): unknown {
    const base = JSON.parse(JSON.stringify(RECIPE_STORY)) as Record<
      string,
      unknown
    >;
    return { ...base, lookup: { ...(base.lookup as object), ...lookup } };
  }

  it("rejects a slashed prefixed name in class position", () => {
    expect(() =>
      validateStoryPackDefinition(
        withLookup({ type: "ex:Recipe/Sub" }),
        "test",
      ),
    ).toThrow(/must be a prefixed name/);
  });

  it("accepts a property path in predicate position", () => {
    const validated = validateStoryPackDefinition(
      withLookup({ by: "ex:hasName/ex:value" }),
      "test",
    );
    expect(validated.lookup?.by).toBe("ex:hasName/ex:value");
  });

  it("rejects a property path with a malformed segment", () => {
    expect(() =>
      validateStoryPackDefinition(
        withLookup({ by: "ex:hasName/not a name" }),
        "test",
      ),
    ).toThrow(/property path segment/);
  });

  it("rejects an IRI that cannot embed in SPARQL", () => {
    expect(() =>
      validateStoryPackDefinition(
        withLookup({ type: "https://example.org/a b>c" }),
        "test",
      ),
    ).toThrow(/not a valid IRI/);
  });

  it("rejects a PREFIX-led non-SELECT list query", () => {
    const base = JSON.parse(JSON.stringify(RECIPE_STORY)) as Record<
      string,
      unknown
    >;
    const list = {
      ...(base.list as Record<string, unknown>),
      query:
        "PREFIX ex: <http://example.org/> CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }",
    };
    expect(() =>
      validateStoryPackDefinition({ ...base, list }, "test"),
    ).toThrow(/must be a SPARQL SELECT/);
  });
});

describe("validateStoryPackDefinition — list filters", () => {
  const base = JSON.parse(JSON.stringify(RECIPE_STORY)) as Record<
    string,
    unknown
  >;

  function withFilters(filters: unknown): unknown {
    const list = { ...(base.list as Record<string, unknown>), filters };
    return { ...base, list };
  }

  it("accepts declared filters", () => {
    const validated = validateStoryPackDefinition(
      withFilters([
        { param: "category", variable: "category", values: ["soup"] },
      ]),
      "test",
    );
    expect(validated.list.filters?.at(0)?.param).toBe("category");
  });

  it("rejects an empty filters array", () => {
    expect(() => validateStoryPackDefinition(withFilters([]), "test")).toThrow(
      /list.filters/,
    );
  });

  it("rejects reserved parameter names", () => {
    expect(() =>
      validateStoryPackDefinition(
        withFilters([{ param: "format", variable: "category", values: ["x"] }]),
        "test",
      ),
    ).toThrow(/reserved/);
  });

  it("rejects the MCP-appended condensed parameter name", () => {
    expect(() =>
      validateStoryPackDefinition(
        withFilters([
          { param: "condensed", variable: "category", values: ["x"] },
        ]),
        "test",
      ),
    ).toThrow(/reserved/);
  });

  it("rejects a hyphenated parameter name that breaks CLI readback", () => {
    expect(() =>
      validateStoryPackDefinition(
        withFilters([
          { param: "meal-type", variable: "category", values: ["x"] },
        ]),
        "test",
      ),
    ).toThrow(/single lowercase word/);
  });

  it("rejects duplicate parameter names", () => {
    expect(() =>
      validateStoryPackDefinition(
        withFilters([
          { param: "category", variable: "category", values: ["x"] },
          { param: "category", variable: "name", values: ["y"] },
        ]),
        "test",
      ),
    ).toThrow(/duplicate filter param/);
  });

  it("rejects a filter variable the query never mentions", () => {
    expect(() =>
      validateStoryPackDefinition(
        withFilters([{ param: "season", variable: "season", values: ["x"] }]),
        "test",
      ),
    ).toThrow(/does not appear in "list.query"/);
  });

  it("rejects case-insensitive duplicate values", () => {
    expect(() =>
      validateStoryPackDefinition(
        withFilters([
          { param: "category", variable: "category", values: ["Soup", "soup"] },
        ]),
        "test",
      ),
    ).toThrow(/duplicate value/);
  });

  it("rejects empty values arrays", () => {
    expect(() =>
      validateStoryPackDefinition(
        withFilters([{ param: "category", variable: "category", values: [] }]),
        "test",
      ),
    ).toThrow(/values/);
  });

  /** RECIPE_STORY with the given `lookup.expand`, for expand validation. */
  function withExpand(expand: unknown): unknown {
    return {
      ...RECIPE_STORY,
      lookup: { ...RECIPE_STORY.lookup, expand },
    };
  }

  it("accepts a valid expand", () => {
    const validated = validateStoryPackDefinition(
      withExpand([
        {
          name: "ingredients",
          heading: "Ingredients",
          kind: "table",
          relation: "ex:ingredient",
          select: [{ name: "label", property: "ex:label" }],
        },
      ]),
      "test",
    );
    expect(validated.lookup?.expand?.[0]?.name).toBe("ingredients");
  });

  it("rejects an expand with an empty select", () => {
    expect(() =>
      validateStoryPackDefinition(
        withExpand([
          { name: "ingredients", relation: "ex:ingredient", select: [] },
        ]),
        "test",
      ),
    ).toThrow(/select/);
  });

  it("rejects an expand kind other than list or table", () => {
    expect(() =>
      validateStoryPackDefinition(
        withExpand([
          {
            name: "ingredients",
            relation: "ex:ingredient",
            kind: "tree",
            select: [{ name: "label", property: "ex:label" }],
          },
        ]),
        "test",
      ),
    ).toThrow(/must be "list" or "table"/);
  });

  it("rejects duplicate expand names", () => {
    expect(() =>
      validateStoryPackDefinition(
        withExpand([
          {
            name: "dup",
            relation: "ex:a",
            select: [{ name: "x", property: "ex:x" }],
          },
          {
            name: "dup",
            relation: "ex:b",
            select: [{ name: "y", property: "ex:y" }],
          },
        ]),
        "test",
      ),
    ).toThrow(/duplicate expand name/);
  });

  /** RECIPE_STORY with the given `lookup` extras merged in. */
  function withLookupExtras(extras: Record<string, unknown>): unknown {
    return {
      ...RECIPE_STORY,
      lookup: { ...RECIPE_STORY.lookup, ...extras },
    };
  }

  it("accepts a valid disclosure with a level-gated expand", () => {
    const validated = validateStoryPackDefinition(
      withLookupExtras({
        disclosure: { levels: ["summary", "detailed"], default: "summary" },
        expand: [
          {
            name: "ingredients",
            relation: "ex:ingredient",
            select: [{ name: "label", property: "ex:label" }],
            level: "detailed",
          },
        ],
      }),
      "test",
    );
    expect(validated.lookup?.disclosure?.levels).toEqual([
      "summary",
      "detailed",
    ]);
  });

  it("rejects empty disclosure levels", () => {
    expect(() =>
      validateStoryPackDefinition(
        withLookupExtras({ disclosure: { levels: [] } }),
        "test",
      ),
    ).toThrow(/non-empty array/);
  });

  it("rejects a disclosure default not among the levels", () => {
    expect(() =>
      validateStoryPackDefinition(
        withLookupExtras({
          disclosure: { levels: ["summary"], default: "detailed" },
        }),
        "test",
      ),
    ).toThrow(/default "detailed" is not one of/);
  });

  it("rejects an expand level that is not a declared disclosure level", () => {
    expect(() =>
      validateStoryPackDefinition(
        withLookupExtras({
          disclosure: { levels: ["summary"] },
          expand: [
            {
              name: "ingredients",
              relation: "ex:ingredient",
              select: [{ name: "label", property: "ex:label" }],
              level: "detailed",
            },
          ],
        }),
        "test",
      ),
    ).toThrow(/is not a declared disclosure level/);
  });
});
