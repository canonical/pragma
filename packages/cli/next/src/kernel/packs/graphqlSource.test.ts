/**
 * GraphQL source (PROTECTED): the source-rule zod refinements (§3), the ported
 * document generator, injection safety, and graphql==sparql PackEntity shape
 * parity — all against the block fixture graph, compiled through the same kernel
 * as every pack.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BLOCK_PREFIXES,
  BLOCK_TTL,
} from "../../testing/fixtures/blockGraph.js";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import type { PragmaRuntime, StoreSession } from "../runtime/types.js";
import { compilePack } from "./compile.js";
import { buildLookupDocument } from "./graphql/buildLookupDocument.js";
import type { LookupOutput } from "./resolveEntity.js";
import { parsePackDefinition } from "./schema.js";
import type { PackDefinition, PackLookup } from "./types.js";
import { verbKey } from "./uniqueness.js";

const DS = "https://ds.canonical.com/";

/** A graphql-sourced block pack over the UIBlock interface (nested + scoped). */
const GBLOCK: PackDefinition = {
  noun: "gblock",
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
        kind: "code",
        level: "detailed",
      },
    ],
    expand: [
      {
        name: "modifierFamilies",
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
        relation: "ds:hasSubcomponent",
        select: [
          { name: "name", property: "ds:name" },
          { name: "uri", property: "ds:name", graphqlField: "uri" },
        ],
      },
    ],
    disclosure: { levels: ["summary", "detailed"], default: "detailed" },
  },
};

describe("source rule — zod refinements reject dual/ill-sourced lookups (PROTECTED)", () => {
  it("accepts a well-formed graphql lookup (round-trips)", () => {
    expect(
      parsePackDefinition(JSON.parse(JSON.stringify(GBLOCK)), "t"),
    ).toEqual(GBLOCK);
  });

  it("rejects `type` and `types` together (mutually exclusive)", () => {
    expect(() =>
      parsePackDefinition(
        {
          noun: "x",
          lookup: {
            by: "ds:name",
            type: "ds:Component",
            types: ["ds:Pattern"],
          },
        },
        "t",
      ),
    ).toThrow(/mutually exclusive/);
  });

  it("rejects a graphql lookup with no fragment target", () => {
    expect(() =>
      parsePackDefinition(
        { noun: "x", lookup: { source: "graphql", by: "ds:name" } },
        "t",
      ),
    ).toThrow(/graphqlType/);
  });

  it("rejects a nested expand on a sparql lookup (single-hop only)", () => {
    expect(() =>
      parsePackDefinition(
        {
          noun: "x",
          lookup: {
            source: "sparql",
            by: "ds:name",
            type: "ds:Component",
            expand: [
              {
                name: "f",
                relation: "ds:hasModifierFamily",
                select: [
                  {
                    name: "v",
                    relation: "ds:hasModifier",
                    select: [{ name: "n", property: "ds:name" }],
                  },
                ],
              },
            ],
          },
        },
        "t",
      ),
    ).toThrow(/single-hop|graphql/i);
  });

  it("rejects a graphql field addressed by a property path", () => {
    expect(() =>
      parsePackDefinition(
        {
          noun: "x",
          lookup: {
            source: "graphql",
            by: "ds:name",
            type: "ds:Component",
            graphqlType: "Component",
            fields: [{ name: "c", property: "ds:a/ds:b" }],
          },
        },
        "t",
      ),
    ).toThrow(/property path/);
  });
});

describe("GraphQL engine — against the compiled fixture schema (PROTECTED)", () => {
  let rt: PragmaRuntime;
  let schema: StoreSession["schema"];

  beforeAll(async () => {
    ({ rt } = await buildFixtureRuntime({
      ttl: BLOCK_TTL,
      prefixes: BLOCK_PREFIXES,
      detail: "detailed",
    }));
    schema = (await rt.store.get()).schema;
  });

  afterAll(async () => {
    (await rt.store.get()).store.dispose();
  });

  const lookup = GBLOCK.lookup as PackLookup;

  it("generates one document with derived names, Relay envelopes, subtype scoping", () => {
    const plan = buildLookupDocument(lookup, schema, "t");
    expect(plan.source).toContain("query PackLookup($uri: ID!)");
    expect(plan.source).toContain("... on UIBlock");
    expect(plan.source).toContain("tier { uri }");
    expect(plan.source).toMatch(
      /modifierFamilies\(first: \d+\) \{ edges \{ node \{/,
    );
    expect(plan.source).toMatch(/values: modifiers\(first: \d+\)/);
    expect(plan.source).toMatch(
      /\.\.\. on Component \{ subcomponents\(first: \d+\) \{ edges \{ node \{ name uri \} \} \} \}/,
    );
  });

  it("drops level-gated selections below their level (fetch-gating)", () => {
    const plan = buildLookupDocument(lookup, schema, "t", "summary");
    expect(plan.source).not.toContain("anatomyDsl");
    expect(plan.source).not.toContain("modifierFamilies");
    expect(plan.source).toContain("summary");
  });

  it("honors and validates the graphqlField escape hatch", () => {
    const plan = buildLookupDocument(
      {
        source: "graphql",
        by: "ds:name",
        graphqlType: "Component",
        fields: [
          { name: "blurb", property: "ds:none", graphqlField: "summary" },
        ],
      },
      schema,
      "t",
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
        "t",
      ),
    ).toThrow(/notAField/);
  });

  it("omits a derived property that maps onto no field (OPTIONAL parity)", () => {
    const plan = buildLookupDocument(
      {
        source: "graphql",
        by: "ds:name",
        graphqlType: "Component",
        fields: [
          { name: "summary", property: "ds:summary" },
          { name: "ghost", property: "ds:definitelyNotAProperty" },
        ],
      },
      schema,
      "t",
    );
    expect(plan.source).toContain("summary");
    expect(plan.source).not.toContain("ghost");
    expect(plan.projections.map((p) => p.name)).toEqual(["summary"]);
  });

  it("rejects cardinality mismatches and an unknown fragment", () => {
    expect(() =>
      buildLookupDocument(
        {
          source: "graphql",
          by: "ds:name",
          graphqlType: "Component",
          fields: [{ name: "f", property: "ds:hasModifierFamily" }],
        },
        schema,
        "t",
      ),
    ).toThrow(/expand/);
    expect(() =>
      buildLookupDocument(
        {
          source: "graphql",
          by: "ds:name",
          graphqlType: "Component",
          expand: [
            {
              name: "t",
              relation: "ds:tier",
              select: [{ name: "n", property: "ds:name" }],
            },
          ],
        },
        schema,
        "t",
      ),
    ).toThrow(/singular/);
    expect(() =>
      buildLookupDocument(
        { source: "graphql", by: "ds:name", graphqlType: "Nonesuch" },
        schema,
        "t",
      ),
    ).toThrow(/Nonesuch/);
  });
});

describe("GraphQL lookup end to end + shape parity with SPARQL (PROTECTED)", () => {
  let rt: PragmaRuntime;

  beforeAll(async () => {
    ({ rt } = await buildFixtureRuntime({
      ttl: BLOCK_TTL,
      prefixes: BLOCK_PREFIXES,
      detail: "detailed",
    }));
  });

  afterAll(async () => {
    (await rt.store.get()).store.dispose();
  });

  const lookupVia = (definition: PackDefinition, name: string) => {
    const verb = compilePack(definition, "t", BLOCK_PREFIXES).find(
      (v) => verbKey(v.path) === `${definition.noun} lookup`,
    );
    if (!verb) throw new Error("no lookup verb");
    return verb.run({ name: [name] }, rt) as Promise<LookupOutput>;
  };

  it("resolves the nested inverse-union and subtype-scoped identity fields", async () => {
    const out = await lookupVia(GBLOCK, "Button");
    expect(out.errors).toEqual([]);
    const entity = out.results.at(0) as Record<string, unknown>;
    expect(entity.uri).toBe(`${DS}button`);
    expect(entity.summary).toBe(
      "Primary action trigger with optional icon and label.",
    );
    expect(entity.tier).toBe(`${DS}global`);
    const families = entity.modifierFamilies as {
      name: string;
      values: string[];
    }[];
    expect(families.map((f) => f.name).sort()).toEqual([
      "density",
      "importance",
    ]);
    const importance = families.find((f) => f.name === "importance");
    expect(importance?.values.sort()).toEqual(["primary", "secondary"]);
    expect(entity.subcomponents).toEqual([
      { name: "Button Icon", uri: `${DS}button.icon` },
    ]);
  });

  it("matches names case-insensitively via the SPARQL resolve", async () => {
    const out = await lookupVia(GBLOCK, "bUTTOn");
    expect((out.results.at(0) as Record<string, unknown>).name).toBe("Button");
  });

  it("produces a PackEntity shape-identical to the SPARQL path (single-hop)", async () => {
    const commonExpand = {
      name: "properties",
      relation: "ds:hasProperty",
      select: [{ name: "name", property: "ds:name" }],
    };
    const graphqlPack: PackDefinition = {
      noun: "gc",
      lookup: {
        source: "graphql",
        by: "ds:name",
        type: "ds:Component",
        graphqlType: "Component",
        fields: [
          { name: "summary", property: "ds:summary" },
          { name: "tier", property: "ds:tier" },
        ],
        expand: [commonExpand],
      },
    };
    const sparqlPack: PackDefinition = {
      noun: "sc",
      lookup: {
        source: "sparql",
        by: "ds:name",
        type: "ds:Component",
        fields: [
          { name: "summary", property: "ds:summary" },
          { name: "tier", property: "ds:tier" },
        ],
        expand: [commonExpand],
      },
    };
    const viaGraphql = (await lookupVia(graphqlPack, "Button")).results.at(0);
    const viaSparql = (await lookupVia(sparqlPack, "Button")).results.at(0);
    expect(viaGraphql).toEqual(viaSparql);
    expect(viaGraphql).toEqual({
      uri: `${DS}button`,
      name: "Button",
      summary: "Primary action trigger with optional icon and label.",
      tier: `${DS}global`,
      properties: [{ name: "disabled" }],
    });
  });

  it("escapes an injection-shaped name in the resolve (no crash, clean miss)", async () => {
    // The `"` and `#` are escaped into the SPARQL literal, so the query stays
    // valid and simply matches nothing — a clean ENTITY_NOT_FOUND, not a crash.
    await expect(lookupVia(GBLOCK, 'Button" } INJECT #')).rejects.toThrow(
      /not found/i,
    );
  });
});
