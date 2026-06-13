// =============================================================================
// Query execution against compiled schemas: resolution templates, node(),
// pagination, _meta, coercion, dual-direction inverses (ADR §5, §12).
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import { type GraphQLSchema, graphql } from "graphql";
import { afterEach, describe, expect, it } from "vitest";
import {
  BLANK_NODES_TTL,
  DS_REALISTIC_TTL,
  EDGE_CASES_TTL,
  INVERSE_TTL,
  PREFIXES,
} from "#testing";
import compile from "./compile.js";
import storeQueryFn from "./storeQueryFn.js";
import type { CompilerContext, CompilerResult } from "./types.js";

type Cleanup = () => void;
let cleanups: Cleanup[] = [];

afterEach(() => {
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
});

interface Compiled {
  result: CompilerResult;
  schema: GraphQLSchema;
  context: CompilerContext;
}

const setup = async (
  ttl: string,
  options: Parameters<typeof compile>[2] = {},
): Promise<Compiled> => {
  const { store, cleanup } = await createTestStore({ ttl, prefixes: PREFIXES });
  cleanups.push(cleanup);
  const result = await compile(storeQueryFn(store), PREFIXES, options);
  return {
    result,
    schema: result.schema,
    context: result.createContext(store),
  };
};

const run = async (
  compiled: Compiled,
  source: string,
  variableValues?: Record<string, unknown>,
) =>
  graphql({
    schema: compiled.schema,
    source,
    variableValues,
    contextValue: compiled.context,
  });

describe("ds-realistic resolution", () => {
  const options = {
    mappings: {
      "ds:hasModifierFamily": { graphqlName: "modifierFamilies" },
      "ds:hasSubcomponent": { graphqlName: "subcomponents" },
      "ds:hasProperty": { graphqlName: "properties" },
      "ds:hasModifier": { graphqlName: "modifiers" },
      "ds:implementsBlock": { inverse: { graphqlName: "implementations" } },
    },
  };

  it("resolves a component with scalars, objects, and embedded blanks", async () => {
    const compiled = await setup(DS_REALISTIC_TTL, options);
    const result = await run(
      compiled,
      `{
        component(uri: "ds:global.component.button") {
          id
          uri
          name
          summary
          tier { name }
          properties { name propertyType optional }
          subcomponents(first: 10) { edges { node { name standalone parentComponent { name } } } }
          implementations(first: 10) { edges { node { name } } }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const component = result.data?.component as Record<string, unknown>;
    expect(component.id).toBe("ds:global.component.button");
    expect(component.name).toBe("Button");
    expect((component.tier as { name: string }).name).toBe("global");
    // embedded blank node with boolean-as-string coercion (EC.03)
    const properties = component.properties as Array<Record<string, unknown>>;
    expect(properties).toHaveLength(1);
    expect(properties[0]?.name).toBe("disabled");
    expect(properties[0]?.optional).toBe(false);
    // declared inverse pair: forward direction asserted in data
    const subcomponents = component.subcomponents as {
      edges: Array<{ node: Record<string, unknown> }>;
    };
    expect(subcomponents.edges).toHaveLength(1);
    expect(subcomponents.edges[0]?.node.standalone).toBe(false);
    expect(
      (subcomponents.edges[0]?.node.parentComponent as { name: string }).name,
    ).toBe("Button");
    // synthetic inverse: reverse assertions found via the inverse loader
    const implementations = component.implementations as {
      edges: Array<{ node: { name: string } }>;
    };
    expect(implementations.edges.map((e) => e.node.name)).toEqual([
      "react button",
    ]);
  });

  it("resolves node() by prefixed-URI global ID with the most specific type", async () => {
    const compiled = await setup(DS_REALISTIC_TTL, options);
    const result = await run(
      compiled,
      `{
        node(id: "ds:global.component.button") {
          id
          __typename
          ... on Component { name }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const node = result.data?.node as Record<string, unknown>;
    expect(node.__typename).toBe("Component");
    expect(node.name).toBe("Button");
  });

  it("returns null for unknown prefixes and unknown URIs", async () => {
    const compiled = await setup(DS_REALISTIC_TTL, options);
    const unknownPrefix = await run(compiled, `{ node(id: "zz:nope") { id } }`);
    expect(unknownPrefix.data?.node).toBeNull();
    const unknownUri = await run(
      compiled,
      `{ node(id: "ds:does.not.exist") { id } }`,
    );
    expect(unknownUri.data?.node).toBeNull();
  });

  it("paginates listings with stable cursors", async () => {
    const compiled = await setup(DS_REALISTIC_TTL, options);
    const page1 = await run(
      compiled,
      `{ modifiers(first: 1) { edges { cursor node { name } } pageInfo { hasNextPage } } }`,
    );
    expect(page1.errors).toBeUndefined();
    const modifiers = page1.data?.modifiers as {
      edges: Array<{ cursor: string; node: { name: string } }>;
      pageInfo: { hasNextPage: boolean };
    };
    expect(modifiers.edges).toHaveLength(1);
    expect(modifiers.pageInfo.hasNextPage).toBe(false);
  });

  it("rejects negative pagination arguments", async () => {
    const compiled = await setup(DS_REALISTIC_TTL, options);
    const result = await run(
      compiled,
      `{ components(first: -1) { edges { cursor } } }`,
    );
    expect(result.errors?.[0]?.message).toContain("non-negative");
  });

  it("exposes _meta with class, fields, and per-class cardinality", async () => {
    const compiled = await setup(DS_REALISTIC_TTL, options);
    const result = await run(
      compiled,
      `{
        component(uri: "ds:global.component.button") {
          _meta {
            type { uri label isAbstract superclasses { label } }
            field(name: "name") { inherited property { label acceptanceCriteria } }
            fields { property { label } }
          }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const meta = (result.data?.component as Record<string, unknown>)
      ._meta as Record<string, unknown>;
    const type = meta.type as Record<string, unknown>;
    expect(type.uri).toBe("https://ds.canonical.com/Component");
    expect(type.isAbstract).toBe(false);
    const field = meta.field as Record<string, unknown>;
    expect(field.inherited).toBe(true); // ds:name declared on Entity
    expect((field.property as Record<string, unknown>).acceptanceCriteria).toBe(
      "Must be a human-readable display name.",
    );
    expect((meta.fields as unknown[]).length).toBeGreaterThan(3);
  });

  it("serves the TBox: ontologies, classes, instances", async () => {
    const compiled = await setup(DS_REALISTIC_TTL, options);
    const result = await run(
      compiled,
      `{
        ontologies { prefix }
        ontologyClass(uri: "https://ds.canonical.com/Component") {
          label
          isAbstract
          instanceCount
          instances(first: 5) { edges { node { id __typename } } }
          properties { property { label } required singular inherited }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const prefixes = (result.data?.ontologies as Array<{ prefix: string }>).map(
      (o) => o.prefix,
    );
    expect(prefixes).toContain("ds");
    const cls = result.data?.ontologyClass as Record<string, unknown>;
    expect(cls.instanceCount).toBe(1);
    const instances = cls.instances as {
      edges: Array<{ node: { id: string; __typename: string } }>;
    };
    expect(instances.edges[0]?.node.id).toBe("ds:global.component.button");
    expect(instances.edges[0]?.node.__typename).toBe("Component");
  });
});

describe("dual-direction inverse resolution (EC.05)", () => {
  it("finds children even when only the reverse direction is asserted", async () => {
    const compiled = await setup(INVERSE_TTL);
    const result = await run(
      compiled,
      `{
        parent(uri: "ex:p1") {
          name
          children(first: 10) { edges { node { uri childOf { name } } } }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const parent = result.data?.parent as Record<string, unknown>;
    const children = parent.children as { edges: Array<{ node: unknown }> };
    expect(children.edges).toHaveLength(2);
  });
});

describe("embedded blank nodes (§12.5)", () => {
  it("resolves embedded values inline with optional fields as null", async () => {
    const compiled = await setup(BLANK_NODES_TTL);
    const result = await run(
      compiled,
      `{ standard(uri: "ex:s1") { title examples { code language } } }`,
    );
    expect(result.errors).toBeUndefined();
    const examples = (result.data?.standard as Record<string, unknown>)
      .examples as Array<Record<string, unknown>>;
    expect(examples).toHaveLength(2);
    const languages = examples.map((e) => e.language).sort();
    expect(languages).toEqual([null, "typescript"].sort());
  });
});

describe("coercion (EC.03, EC.06, EC.14)", () => {
  it("coerces booleans, strips language tags, preserves empty strings", async () => {
    const warnings: string[] = [];
    const compiled = await setup(EDGE_CASES_TTL, {
      onRuntimeWarning: (w) => warnings.push(w.reason),
    });
    const active = await run(compiled, `{ item(uri: "ex:i1") { active } }`);
    expect((active.data?.item as { active: boolean }).active).toBe(true);
    const label = await run(compiled, `{ item(uri: "ex:i3") { label } }`);
    expect((label.data?.item as { label: string }).label).toBe("Tagged");
    const summary = await run(compiled, `{ item(uri: "ex:i5") { summary } }`);
    expect((summary.data?.item as { summary: string }).summary).toBe("");
  });

  it("self-referential chains resolve without infinite recursion (EC.04)", async () => {
    const compiled = await setup(EDGE_CASES_TTL);
    const result = await run(
      compiled,
      `{
        item(uri: "ex:i2") {
          uri
          extends(first: 1) { edges { node { uri } } }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const item = result.data?.item as Record<string, unknown>;
    const extendsConn = item.extends as {
      edges: Array<{ node: { uri: string } }>;
    };
    // the chain terminates because resolution is per-level, not recursive
    expect(extendsConn.edges[0]?.node.uri).toBe("ex:i2");
  });
});
