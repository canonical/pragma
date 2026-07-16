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

  it("accepts a value-free filter (data-driven value set)", () => {
    const validated = validateStoryPackDefinition(
      withFilters([{ param: "category", variable: "category" }]),
      "test",
    );
    expect(validated.list.filters?.at(0)).toEqual({
      param: "category",
      variable: "category",
    });
  });

  it("rejects the compiled search parameter name", () => {
    expect(() =>
      validateStoryPackDefinition(
        withFilters([{ param: "search", variable: "category", values: ["x"] }]),
        "test",
      ),
    ).toThrow(/reserved/);
  });

  it("rejects the derived detail parameter name", () => {
    expect(() =>
      validateStoryPackDefinition(
        withFilters([{ param: "detail", variable: "category", values: ["x"] }]),
        "test",
      ),
    ).toThrow(/reserved/);
  });

  /** RECIPE_STORY with the given `list.search`. */
  function withSearch(search: unknown): unknown {
    const list = { ...(base.list as Record<string, unknown>), search };
    return { ...base, list };
  }

  it("accepts a search over variables the query mentions", () => {
    const validated = validateStoryPackDefinition(
      withSearch({ variables: ["name", "category"] }),
      "test",
    );
    expect(validated.list.search?.variables).toEqual(["name", "category"]);
  });

  it("rejects a search without variables", () => {
    expect(() =>
      validateStoryPackDefinition(withSearch({ variables: [] }), "test"),
    ).toThrow(/search.variables/);
  });

  it("rejects a search variable the query never mentions", () => {
    expect(() =>
      validateStoryPackDefinition(
        withSearch({ variables: ["season"] }),
        "test",
      ),
    ).toThrow(/does not appear in "list.query"/);
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

  it("rejects a disclosure level named detail (derived param collision)", () => {
    expect(() =>
      validateStoryPackDefinition(
        withLookupExtras({ disclosure: { levels: ["summary", "detail"] } }),
        "test",
      ),
    ).toThrow(/reserved/);
  });

  it("rejects a disclosure level colliding with a kernel param name", () => {
    expect(() =>
      validateStoryPackDefinition(
        withLookupExtras({ disclosure: { levels: ["summary", "names"] } }),
        "test",
      ),
    ).toThrow(/reserved/);
  });

  it("rejects a disclosure level that is not a single lowercase word", () => {
    expect(() =>
      validateStoryPackDefinition(
        withLookupExtras({ disclosure: { levels: ["summary", "Fully-Deep"] } }),
        "test",
      ),
    ).toThrow(/single lowercase word/);
  });

  it("accepts a disclosure level named detailed (the legacy alias)", () => {
    const validated = validateStoryPackDefinition(
      withLookupExtras({ disclosure: { levels: ["summary", "detailed"] } }),
      "test",
    );
    expect(validated.lookup?.disclosure?.levels).toEqual([
      "summary",
      "detailed",
    ]);
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

describe("validateStoryPackDefinition — identifier hardening", () => {
  const base = JSON.parse(JSON.stringify(RECIPE_STORY)) as Record<
    string,
    unknown
  >;

  it("rejects a column field the query never mentions", () => {
    const list = {
      ...(base.list as Record<string, unknown>),
      columns: [{ field: "name" }, { field: "season" }],
    };
    expect(() =>
      validateStoryPackDefinition({ ...base, list }, "test"),
    ).toThrow(/column field "\?season" does not appear in "list.query"/);
  });

  it("validates verb columns against the verb query", () => {
    expect(() =>
      validateStoryPackDefinition(
        {
          ...RECIPE_STORY,
          verbs: [
            {
              verb: "categories",
              query: "SELECT ?name WHERE { ?uri ex:category ?name }",
              columns: [{ field: "count" }],
            },
          ],
        },
        "test",
      ),
    ).toThrow(/column field "\?count" does not appear in "verbs\[0\].query"/);
  });

  it("accepts a column bound via AS in the SELECT projection", () => {
    const validated = validateStoryPackDefinition(
      {
        ...RECIPE_STORY,
        verbs: [
          {
            verb: "categories",
            query:
              "SELECT ?name (COUNT(?uri) AS ?count) WHERE { ?uri ex:category ?name } GROUP BY ?name",
            columns: [{ field: "name" }, { field: "count" }],
          },
        ],
      },
      "test",
    );
    expect(validated.verbs?.at(0)?.columns).toHaveLength(2);
  });

  // Reserved object-prototype keys: pack identifiers become plain-object
  // keys at run time, so __proto__/constructor/prototype must fail at boot.
  it("rejects a reserved object key as a column field", () => {
    const list = {
      ...(base.list as Record<string, unknown>),
      query: "SELECT ?__proto__ WHERE { ?uri ex:name ?__proto__ }",
      columns: [{ field: "__proto__" }],
      filters: undefined,
    };
    expect(() =>
      validateStoryPackDefinition({ ...base, list }, "test"),
    ).toThrow(/reserved object key "__proto__"/);
  });

  it("rejects a reserved object key as a filter param or variable", () => {
    const withFilter = (filter: Record<string, unknown>): unknown => ({
      ...base,
      list: {
        ...(base.list as Record<string, unknown>),
        query:
          "SELECT ?uri ?name ?category ?constructor WHERE { ?uri ex:name ?name ; ex:category ?category ; ex:kind ?constructor }",
        filters: [filter],
      },
    });
    expect(() =>
      validateStoryPackDefinition(
        withFilter({ param: "constructor", variable: "category" }),
        "test",
      ),
    ).toThrow(/reserved object key "constructor"/);
    expect(() =>
      validateStoryPackDefinition(
        withFilter({ param: "kind", variable: "constructor" }),
        "test",
      ),
    ).toThrow(/reserved object key "constructor"/);
  });

  it("rejects a reserved object key as a search variable", () => {
    expect(() =>
      validateStoryPackDefinition(
        {
          ...base,
          list: {
            ...(base.list as Record<string, unknown>),
            query:
              "SELECT ?uri ?name ?category ?prototype WHERE { ?uri ex:name ?name ; ex:category ?category ; ex:proto ?prototype }",
            search: { variables: ["prototype"] },
          },
        },
        "test",
      ),
    ).toThrow(/reserved object key "prototype"/);
  });

  it("rejects a reserved object key as a lookup field or expand name", () => {
    expect(() =>
      validateStoryPackDefinition(
        {
          ...RECIPE_STORY,
          lookup: {
            ...RECIPE_STORY.lookup,
            fields: [{ name: "__proto__", property: "ex:category" }],
          },
        },
        "test",
      ),
    ).toThrow(/reserved object key "__proto__"/);
    expect(() =>
      validateStoryPackDefinition(
        {
          ...RECIPE_STORY,
          lookup: {
            ...RECIPE_STORY.lookup,
            expand: [
              {
                name: "__proto__",
                relation: "ex:ingredient",
                select: [{ name: "label", property: "ex:label" }],
              },
            ],
          },
        },
        "test",
      ),
    ).toThrow(/reserved object key "__proto__"/);
  });

  it("rejects a reserved object key inside an expand select", () => {
    expect(() =>
      validateStoryPackDefinition(
        {
          ...RECIPE_STORY,
          lookup: {
            ...RECIPE_STORY.lookup,
            expand: [
              {
                name: "ingredients",
                relation: "ex:ingredient",
                select: [{ name: "constructor", property: "ex:label" }],
              },
            ],
          },
        },
        "test",
      ),
    ).toThrow(/reserved object key "constructor"/);
  });

  it("rejects a reserved object key as a disclosure level", () => {
    expect(() =>
      validateStoryPackDefinition(
        {
          ...RECIPE_STORY,
          lookup: {
            ...RECIPE_STORY.lookup,
            disclosure: { levels: ["summary", "prototype"] },
          },
        },
        "test",
      ),
    ).toThrow(/reserved object key "prototype"/);
  });
});

// Pack v1: extra list verbs and the sample capability.
describe("validateStoryPackDefinition — verbs and sample", () => {
  const VERB = {
    verb: "categories",
    query: "SELECT ?name WHERE { ?uri ex:category ?name }",
    columns: [{ field: "name" }],
  };

  function withVerbs(verbs: unknown): unknown {
    return { ...RECIPE_STORY, verbs };
  }

  it("accepts a valid extra verb and validates its list shape", () => {
    const validated = validateStoryPackDefinition(withVerbs([VERB]), "test");
    expect(validated.verbs?.at(0)?.verb).toBe("categories");
    expect(validated.verbs?.at(0)?.columns).toEqual([{ field: "name" }]);
  });

  it("rejects a verb colliding with a compiled verb", () => {
    for (const verb of ["list", "lookup", "sample"]) {
      expect(() =>
        validateStoryPackDefinition(withVerbs([{ ...VERB, verb }]), "test"),
      ).toThrow(/collides with a compiled verb/);
    }
  });

  it("rejects duplicate verbs", () => {
    expect(() =>
      validateStoryPackDefinition(withVerbs([VERB, VERB]), "test"),
    ).toThrow(/duplicate verb/);
  });

  it("rejects a non-kebab verb", () => {
    expect(() =>
      validateStoryPackDefinition(
        withVerbs([{ ...VERB, verb: "Cats" }]),
        "test",
      ),
    ).toThrow(/kebab-case/);
  });

  it("rejects a verb whose query is not a SELECT", () => {
    expect(() =>
      validateStoryPackDefinition(
        withVerbs([{ ...VERB, query: "ASK { ?s ?p ?o }" }]),
        "test",
      ),
    ).toThrow(/verbs\[0\].query/);
  });

  it("validates verb filters against the verb query", () => {
    expect(() =>
      validateStoryPackDefinition(
        withVerbs([
          {
            ...VERB,
            filters: [{ param: "season", variable: "season", values: ["x"] }],
          },
        ]),
        "test",
      ),
    ).toThrow(/does not appear in "verbs\[0\].query"/);
  });

  function withSample(sample: unknown): unknown {
    return { ...RECIPE_STORY, lookup: { ...RECIPE_STORY.lookup, sample } };
  }

  it("accepts sample: true", () => {
    const validated = validateStoryPackDefinition(withSample(true), "test");
    expect(validated.lookup?.sample).toBe(true);
  });

  it("accepts a configured sample with a valid default count", () => {
    const validated = validateStoryPackDefinition(
      withSample({ count: 3 }),
      "test",
    );
    expect(validated.lookup?.sample).toEqual({ count: 3 });
  });

  it("rejects an out-of-range or non-integer sample count", () => {
    for (const count of [0, 6, 2.5, "2"]) {
      expect(() =>
        validateStoryPackDefinition(withSample({ count }), "test"),
      ).toThrow(/sample.count/);
    }
  });
});
