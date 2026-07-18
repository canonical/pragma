/**
 * End-to-end tests for the GraphQL-document projection engine: a
 * `source: "graphql"` pack lookup against the canonical fixture, compiled
 * through the same kernel as every pack, exercising document generation,
 * in-process execution, Relay unwrapping, and disclosure fetch-gating.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import createTestRuntime from "../../../../testing/helpers/createTestRuntime.js";
import { DEFAULT_PREFIX_MAP } from "../../prefixes.js";
import type { PragmaRuntime } from "../../types/index.js";
import buildLookupDocument from "./buildLookupDocument.js";
import compilePackStories from "./compilePackStories.js";
import type { StoryPackDefinition, StoryPackLookup } from "./types.js";
import validateStoryPackDefinition from "./validateStoryPackDefinition.js";

const DS = "https://ds.canonical.com/";

/**
 * A block-shaped pack over the fixture graph: graphql-sourced lookup with a
 * singular entity field (tier), a level-gated code section (anatomyDsl),
 * and a level-gated nested expand (modifier families → values).
 */
const GBLOCK: StoryPackDefinition = validateStoryPackDefinition(
  {
    noun: "gblock",
    description: "List blocks (graphql engine test)",
    list: {
      query:
        "SELECT ?uri ?name WHERE { ?uri a ds:Component ; ds:name ?name } ORDER BY ?name",
      columns: [{ field: "uri" }, { field: "name" }],
    },
    lookup: {
      source: "graphql",
      by: "ds:name",
      types: ["ds:Component", "ds:Pattern", "ds:Subcomponent"],
      graphqlType: "UIBlock",
      fields: [
        { name: "summary", property: "ds:summary" },
        { name: "tier", property: "ds:tier" },
      ],
      sections: [
        {
          name: "anatomyDsl",
          property: "ds:anatomyDsl",
          label: "Anatomy (DSL)",
          kind: "code",
          level: "detailed",
        },
      ],
      expand: [
        {
          name: "modifierFamilies",
          heading: "Modifier Families",
          relation: "ds:hasModifierFamily",
          level: "detailed",
          select: [
            { name: "name", property: "ds:name" },
            {
              name: "values",
              relation: "ds:hasModifier",
              select: [{ name: "name", property: "ds:name" }],
            },
          ],
        },
        {
          name: "subcomponents",
          heading: "Subcomponents",
          relation: "ds:hasSubcomponent",
          select: [
            { name: "name", property: "ds:name" },
            // The reserved identity field via the escape hatch — unwraps to
            // the FULL IRI (the `iri` projection), not the prefixed form.
            { name: "uri", property: "ds:name", graphqlField: "uri" },
          ],
        },
      ],
      disclosure: { levels: ["summary", "detailed"], default: "detailed" },
    },
  },
  "test:gblock",
);

let rt: PragmaRuntime;

beforeAll(async () => {
  rt = await createTestRuntime();
});

afterAll(() => rt.dispose());

describe("runtime.graphql()", () => {
  it("compiles once and memoizes the schema", async () => {
    const first = await rt.graphql();
    const second = await rt.graphql();
    expect(second.schema).toBe(first.schema);
    expect(first.schema.getType("UIBlock")).toBeDefined();
  });
});

describe("buildLookupDocument", () => {
  const lookup = GBLOCK.lookup as StoryPackLookup;

  it("generates one document with derived names and Relay envelopes", async () => {
    const { schema } = await rt.graphql();
    const plan = buildLookupDocument(lookup, schema, "test:gblock");
    expect(plan.source).toContain("query PackLookup($uri: ID!)");
    expect(plan.source).toContain("node(id: $uri)");
    expect(plan.source).toContain("... on UIBlock");
    // Scalars select bare; the singular object field selects the IRI.
    expect(plan.source).toContain("summary");
    expect(plan.source).toContain("tier { uri }");
    // ds:hasModifierFamily derives the pluralized connection field.
    expect(plan.source).toMatch(
      /modifierFamilies\(first: \d+\) \{ edges \{ node \{/,
    );
    // ds:hasModifier derives the nested inverse-union connection.
    expect(plan.source).toMatch(/values: modifiers\(first: \d+\)/);
    // ds:hasSubcomponent (domain ds:Component, as live) is unreachable on
    // the UIBlock fragment itself — it resolves through a subtype-scoped
    // inline fragment; the reserved `uri` identity field selects bare.
    expect(plan.source).toMatch(
      /\.\.\. on Component \{ subcomponents\(first: \d+\) \{ edges \{ node \{ name uri \} \} \} \}/,
    );
  });

  it("drops level-gated selections below their level (fetch-gating)", async () => {
    const { schema } = await rt.graphql();
    const plan = buildLookupDocument(lookup, schema, "test:gblock", "summary");
    expect(plan.source).not.toContain("anatomyDsl");
    expect(plan.source).not.toContain("modifierFamilies");
    expect(plan.source).toContain("summary");
  });

  it("honors the graphqlField escape hatch and validates it", async () => {
    const { schema } = await rt.graphql();
    const plan = buildLookupDocument(
      {
        source: "graphql",
        by: "ds:name",
        graphqlType: "Component",
        fields: [
          { name: "blurb", property: "ds:nonesuch", graphqlField: "summary" },
        ],
      },
      schema,
      "test:hatch",
    );
    expect(plan.source).toContain("blurb: summary");

    expect(() =>
      buildLookupDocument(
        {
          source: "graphql",
          by: "ds:name",
          graphqlType: "Component",
          fields: [{ name: "x", property: "ds:x", graphqlField: "notAField" }],
        },
        schema,
        "test:hatch",
      ),
    ).toThrowError(/notAField/);
  });

  it("omits a derived property that maps onto no schema field (OPTIONAL parity)", async () => {
    // Ontology drift tolerance: a pack shipped for a richer graph (e.g.
    // declaring ds:whenToUse where the live ontology superseded it) must
    // degrade to emptiness like an unbound SPARQL OPTIONAL, not fail the
    // lookup. Only explicit graphqlField overrides fail fast on a miss.
    const { schema } = await rt.graphql();
    const plan = buildLookupDocument(
      {
        source: "graphql",
        by: "ds:name",
        graphqlType: "Component",
        fields: [
          { name: "summary", property: "ds:summary" },
          { name: "ghostField", property: "ds:definitelyNotAProperty" },
        ],
        expand: [
          {
            name: "ghosts",
            relation: "ds:definitelyNotARelation",
            select: [{ name: "name", property: "ds:name" }],
          },
        ],
      },
      schema,
      "test:derive",
    );
    expect(plan.source).toContain("summary");
    expect(plan.source).not.toContain("ghostField");
    expect(plan.source).not.toContain("ghosts");
    expect(plan.projections.map((p) => p.name)).toEqual(["summary"]);
  });

  it("rejects a multi-valued property declared as a flat field", async () => {
    const { schema } = await rt.graphql();
    expect(() =>
      buildLookupDocument(
        {
          source: "graphql",
          by: "ds:name",
          graphqlType: "Component",
          fields: [{ name: "families", property: "ds:hasModifierFamily" }],
        },
        schema,
        "test:multi",
      ),
    ).toThrowError(/expand/);
  });

  it("rejects a singular property declared as an expand", async () => {
    const { schema } = await rt.graphql();
    expect(() =>
      buildLookupDocument(
        {
          source: "graphql",
          by: "ds:name",
          graphqlType: "Component",
          expand: [
            {
              name: "tiers",
              relation: "ds:tier",
              select: [{ name: "name", property: "ds:name" }],
            },
          ],
        },
        schema,
        "test:singular",
      ),
    ).toThrowError(/singular/);
  });

  it("rejects an unknown fragment type", async () => {
    const { schema } = await rt.graphql();
    expect(() =>
      buildLookupDocument(
        { source: "graphql", by: "ds:name", graphqlType: "Nonesuch" },
        schema,
        "test:fragment",
      ),
    ).toThrowError(/Nonesuch/);
  });
});

describe("graphql-sourced pack lookup (end to end)", () => {
  const compiled = () =>
    compilePackStories(GBLOCK, "test:gblock", DEFAULT_PREFIX_MAP);

  it("resolves an entity shape-identical to the SPARQL path", async () => {
    const { lookup } = compiled();
    const result = await lookup?.resolve(rt, ["Button"], {});
    expect(result?.errors).toEqual([]);
    const entity = result?.results.at(0) as Record<string, unknown>;

    // Flat values: full IRIs and plain strings, no Relay envelopes.
    expect(entity.uri).toBe(`${DS}global.component.button`);
    expect(entity.name).toBe("Button");
    expect(entity.summary).toBe(
      "Primary action trigger with optional icon and label.",
    );
    expect(entity.tier).toBe(`${DS}global`);
    expect(entity.anatomyDsl).toBe("root: button; children: label, icon");

    // The nested expand: one row per family, values collapsed to strings.
    // The fixture asserts only the reverse ds:modifierFamily direction, so
    // values arriving proves the inverse-union resolver path.
    const families = entity.modifierFamilies as {
      name: string;
      values: string[];
    }[];
    expect(families.map((f) => f.name).sort()).toEqual([
      "density",
      "importance",
    ]);
    const importance = families.find((f) => f.name === "importance");
    expect(importance?.values.sort()).toEqual([
      "default",
      "primary",
      "secondary",
    ]);

    // Child rows selecting the reserved `uri` field carry FULL IRIs — the
    // `iri` projection expands ke-graphql's prefixed identity, keeping the
    // GraphQL path indistinguishable from SPARQL bindings.
    expect(entity.subcomponents).toEqual([
      { name: "Button Icon", uri: `${DS}global.subcomponent.button.icon` },
    ]);
  });

  it("matches names case-insensitively via the SPARQL resolve", async () => {
    const { lookup } = compiled();
    const result = await lookup?.resolve(rt, ["bUTTOn"], {});
    const entity = result?.results.at(0) as Record<string, unknown>;
    expect(entity.name).toBe("Button");
  });

  it("gates the code section and expand below their level", async () => {
    const { lookup } = compiled();
    const result = await lookup?.resolve(rt, ["Button"], {
      detail: "summary",
    });
    const entity = result?.results.at(0) as Record<string, unknown>;
    expect(entity.summary).toBeDefined();
    expect(entity.anatomyDsl).toBeUndefined();
    expect(entity.modifierFamilies).toBeUndefined();
  });

  it("renders the code section and modifier values through the generic renderer", async () => {
    const { lookup } = compiled();
    const result = await lookup?.resolve(rt, ["Button"], {
      detail: "detailed",
    });
    const entity = result?.results.at(0);
    if (!entity || !lookup) throw new Error("expected an entity");
    const llm = lookup.formatters.llm(
      lookup.toFmtInput(entity, {
        surface: "cli",
        detailed: true,
        params: {},
      }),
    );
    expect(llm).toContain("## Button");
    expect(llm).toContain("### Anatomy (DSL)");
    expect(llm).toContain("root: button; children: label, icon");
    expect(llm).toContain("### Modifier Families");
    expect(llm).toContain("importance");
    expect(llm).toContain("primary");
  });

  it("collects not-found errors with suggestions from the resolve query", async () => {
    const { lookup } = compiled();
    const result = await lookup?.resolve(rt, ["Buton"], {});
    expect(result?.results).toEqual([]);
    const error = result?.errors.at(0);
    expect(error?.code).toBe("ENTITY_NOT_FOUND");
    expect(error?.suggestions).toContain("Button");
  });

  it("rejects unnamed entities with the shared empty-names error", () => {
    const { lookup } = compiled();
    expect(() => lookup?.emptyNamesError?.()).not.toThrow();
    expect(lookup?.emptyNamesError?.()).toBeInstanceOf(PragmaError);
  });
});
