// =============================================================================
// Query execution against compiled schemas: resolution templates, node(),
// pagination, _meta, coercion, dual-direction inverses.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import { type GraphQLSchema, graphql } from "graphql";
import { afterEach, describe, expect, it } from "vitest";
import {
  type CompilerResult,
  compile,
  createStoreQueryFn,
} from "../../lib/compiler/index.js";
import type { CompilerContext } from "../../lib/shared/index.js";
import {
  BLANK_NODES_TTL,
  DS_REALISTIC_TTL,
  EDGE_CASES_TTL,
  INVERSE_TTL,
  PREFIXES,
} from "../index.js";

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
  const result = await compile(createStoreQueryFn(store), PREFIXES, options);
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
    expect(component.uri).toBe(
      "https://ds.canonical.com/global.component.button",
    );
    expect(component.name).toBe("Button");
    expect((component.tier as { name: string }).name).toBe("global");
    // embedded blank node with boolean-as-string coercion
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

  it("resolves node() by absolute IRI with the most specific type", async () => {
    const compiled = await setup(DS_REALISTIC_TTL, options);
    const result = await run(
      compiled,
      `{
        node(id: "https://ds.canonical.com/global.component.button") {
          uri
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

  it("resolves the generic descriptive fields through _meta", async () => {
    const compiled = await setup(DS_REALISTIC_TTL, options);
    const result = await run(
      compiled,
      `{ component(uri: "ds:global.component.button") { _meta { title label comment definition } } }`,
    );
    expect(result.errors).toBeUndefined();
    expect((result.data?.component as Record<string, unknown>)._meta).toEqual({
      // title is TOTAL and agrees with label whenever label resolves
      title: "Button",
      // no rdfs:label on the instance → the local-name tier (ds:name) fires
      label: "Button",
      // no rdfs:comment on the instance → the tier (ds:summary) fires
      comment: "Primary action trigger.",
      // ds: declares no description-shaped predicate and the instance asserts
      // no skos:definition → the whole chain is exhausted
      definition: null,
    });
  });

  it("selects the generic fields straight through node(id:)", async () => {
    const compiled = await setup(DS_REALISTIC_TTL, options);
    // No inline fragment: Node declares _meta, and EntityMeta declares them all.
    const result = await run(
      compiled,
      `{ node(id: "https://ds.canonical.com/global.component.button") { uri _meta { title label } } }`,
    );
    expect(result.errors).toBeUndefined();
    expect(result.data?.node).toEqual({
      uri: "https://ds.canonical.com/global.component.button",
      _meta: { title: "Button", label: "Button" },
    });
  });

  it("returns null for non-absolute ids and for unknown IRIs", async () => {
    const compiled = await setup(DS_REALISTIC_TTL, options);
    // No scheme at all: rejected by the absolute-IRI gate, not by a lookup.
    const notAnIri = await run(compiled, `{ node(id: "nope") { uri } }`);
    expect(notAnIri.errors).toBeUndefined();
    expect(notAnIri.data?.node).toBeNull();
    // Syntactically fine, but nothing in the store answers to it.
    const unknownUri = await run(
      compiled,
      `{ node(id: "https://ds.canonical.com/does.not.exist") { uri } }`,
    );
    expect(unknownUri.data?.node).toBeNull();
  });

  it("pages a listing by its own cursors — the cursor/uri currency is one string", async () => {
    // The silent failure this guards: if the paginated list were still in the
    // prefixed form while EntityValue.uri went absolute, `after:` would miss
    // and every page would restart at index 0 with no error at all.
    const compiled = await setup(DS_REALISTIC_TTL, options);
    const page1 = await run(
      compiled,
      `{ uIBlocks: components(first: 1) { edges { cursor node { uri } } } }`,
    );
    expect(page1.errors).toBeUndefined();
    const first = (
      page1.data?.uIBlocks as {
        edges: Array<{ cursor: string; node: { uri: string } }>;
      }
    ).edges[0];
    // the cursor decodes to the very IRI the node reports
    expect(atob(first?.cursor ?? "")).toBe(first?.node.uri);
    const page2 = await run(
      compiled,
      `query($c: String) { components(first: 1, after: $c) { edges { node { uri } } } }`,
      { c: first?.cursor },
    );
    expect(page2.errors).toBeUndefined();
    // one component in the fixture: the cursor HIT, so page 2 is empty rather
    // than silently restarting with the same node.
    expect((page2.data?.components as { edges: unknown[] }).edges).toHaveLength(
      0,
    );
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
          instances(first: 5) { edges { node { uri __typename } } }
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
      edges: Array<{ node: { uri: string; __typename: string } }>;
    };
    expect(instances.edges[0]?.node.uri).toBe(
      "https://ds.canonical.com/global.component.button",
    );
    expect(instances.edges[0]?.node.__typename).toBe("Component");
  });
});

describe("dual-direction inverse resolution", () => {
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

describe("embedded blank nodes", () => {
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

describe("coercion", () => {
  it("coerces booleans, strips language tags, preserves empty strings", async () => {
    const warnings: string[] = [];
    const compiled = await setup(EDGE_CASES_TTL, {
      onRuntimeWarning: (w) => warnings.push(w.reason),
    });
    const active = await run(compiled, `{ item(uri: "ex:i1") { active } }`);
    expect((active.data?.item as { active: boolean }).active).toBe(true);
    // ex:label keeps its own name now (nothing reserves `label` any more) and
    // is the field still running through coerce, which strips the @en tag.
    const label = await run(compiled, `{ item(uri: "ex:i3") { label } }`);
    expect((label.data?.item as { label: string }).label).toBe("Tagged");
    const summary = await run(compiled, `{ item(uri: "ex:i5") { summary } }`);
    expect((summary.data?.item as { summary: string }).summary).toBe("");
  });

  it("leaves the generic label null when no label-shaped value is asserted", async () => {
    const compiled = await setup(EDGE_CASES_TTL);
    // ex:i1 asserts only ex:active — every candidate predicate is exhausted,
    // which must produce null rather than an empty string. `title` is still
    // total and falls all the way through to the IRI local name.
    const result = await run(
      compiled,
      `{ item(uri: "ex:i1") { _meta { label title } } }`,
    );
    expect(result.errors).toBeUndefined();
    expect((result.data?.item as Record<string, unknown>)._meta).toEqual({
      label: null,
      title: "i1",
    });
  });
});

// A provider whose instances carry BOTH the canonical rdfs/skos predicates and
// local-name-shaped properties, so the fixed chain's precedence is observable.
const DESCRIPTIVE_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

ex:Doc a owl:Class ; rdfs:label "Doc" .

ex:name a owl:DatatypeProperty ; rdfs:domain ex:Doc ; rdfs:range xsd:string .
ex:summary a owl:DatatypeProperty ; rdfs:domain ex:Doc ; rdfs:range xsd:string .
ex:description a owl:DatatypeProperty ; rdfs:domain ex:Doc ; rdfs:range xsd:string .

# every canonical predicate asserted alongside its local-name counterpart
ex:d1 a ex:Doc ;
  rdfs:label "Canonical label" ; ex:name "Tier name" ;
  rdfs:comment "Canonical comment" ; ex:summary "Tier summary" ;
  skos:definition "Canonical definition" ; ex:description "Tier description" .

# only the local-name tier is asserted
ex:d2 a ex:Doc ;
  ex:name "Tier name" ; ex:summary "Tier summary" ; ex:description "Tier description" .

# neither tier
ex:d3 a ex:Doc .
`;

// Language-tagged and untagged literals side by side, so the exact-tag rule
// and the untagged fallback are both observable end to end.
const LANG_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Doc a owl:Class ; rdfs:label "Doc" .
ex:code a owl:DatatypeProperty ; rdfs:domain ex:Doc ; rdfs:range xsd:string .

# only tagged literals: "fr" finds nothing, and there is no untagged fallback
ex:d1 a ex:Doc ; rdfs:label "The Widget"@en , "Das Widget"@de ; ex:code "d1" .

# only an untagged literal: it answers every lang
ex:d2 a ex:Doc ; rdfs:label "Plain label" ; ex:code "d2" .
`;

describe("generic descriptive chain", () => {
  const selection = `{ _meta { label comment definition } }`;
  const metaOf = (data: Record<string, unknown> | null | undefined) =>
    (data?.doc as Record<string, unknown>)._meta;

  it("prefers the canonical rdfs/skos predicate over the local-name tier", async () => {
    const compiled = await setup(DESCRIPTIVE_TTL);
    const result = await run(compiled, `{ doc(uri: "ex:d1") ${selection} }`);
    expect(result.errors).toBeUndefined();
    expect(metaOf(result.data)).toEqual({
      label: "Canonical label",
      comment: "Canonical comment",
      definition: "Canonical definition",
    });
  });

  it("falls back to the local-name tier when no canonical value is asserted", async () => {
    const compiled = await setup(DESCRIPTIVE_TTL);
    const result = await run(compiled, `{ doc(uri: "ex:d2") ${selection} }`);
    expect(result.errors).toBeUndefined();
    // each field resolves independently through its own chain
    expect(metaOf(result.data)).toEqual({
      label: "Tier name",
      comment: "Tier summary",
      definition: "Tier description",
    });
  });

  it("yields null — not an empty string — when a chain is exhausted", async () => {
    const compiled = await setup(DESCRIPTIVE_TTL);
    const result = await run(compiled, `{ doc(uri: "ex:d3") ${selection} }`);
    expect(result.errors).toBeUndefined();
    expect(metaOf(result.data)).toEqual({
      label: null,
      comment: null,
      definition: null,
    });
  });

  it("leaves every ontology field name free — nothing is reserved but uri/_meta", async () => {
    const compiled = await setup(DESCRIPTIVE_TTL);
    // ex:name / ex:summary / ex:description all keep their natural names; the
    // generic answers live one level down, under _meta.
    const result = await run(
      compiled,
      `{ doc(uri: "ex:d1") { name summary description _meta { definition } } }`,
    );
    expect(result.errors).toBeUndefined();
    expect(result.data?.doc).toEqual({
      name: "Tier name",
      summary: "Tier summary",
      description: "Tier description",
      _meta: { definition: "Canonical definition" },
    });
  });

  it("selects by language tag, defaulting the argument to en", async () => {
    const compiled = await setup(LANG_TTL);
    const result = await run(
      compiled,
      `{
        d1: doc(uri: "ex:d1") { _meta { def: label, en: label(lang: "en"), de: label(lang: "de"), fr: label(lang: "fr"), t: title(lang: "fr") } }
        d2: doc(uri: "ex:d2") { _meta { any: label, gb: label(lang: "en-GB"), t: title } }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const d1 = (result.data?.d1 as Record<string, unknown>)._meta;
    // no lang given → the argument default "en" is coerced in by graphql-js
    expect(d1).toEqual({
      def: "The Widget",
      en: "The Widget",
      de: "Das Widget",
      // no fr literal and nothing untagged → label is null, title is not
      fr: null,
      t: "Das Widget",
    });
    const d2 = (result.data?.d2 as Record<string, unknown>)._meta;
    // d2's only literal is untagged: it answers any lang (the untagged tier)…
    expect(d2).toEqual({
      any: "Plain label",
      // …but an exact en-GB literal would have won; there is none, so the
      // untagged fallback answers here too.
      gb: "Plain label",
      t: "Plain label",
    });
  });

  it("prints the lang argument with its default in the SDL", async () => {
    const compiled = await setup(LANG_TTL);
    // graphql@17 renders `default: { value }` — the deprecated `defaultValue`
    // would print nothing at all.
    expect(compiled.result.sdl).toContain('label(lang: String = "en"): String');
    expect(compiled.result.sdl).toContain(
      'title(lang: String = "en"): String!',
    );
  });

  it("self-referential chains resolve without infinite recursion", async () => {
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
    expect(extendsConn.edges[0]?.node.uri).toBe("http://example.org/i2");
  });
});
