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
