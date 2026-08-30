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
  INHERITANCE_TTL,
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

  it("MIGRATION PIN: the prefixed form is no longer node()'s identity currency", async () => {
    // "ds:global.component.button" was the global ID under the old prefixed
    // identity currency; node(id:) now speaks absolute IRIs only. It is NOT
    // rejected by the admission gate — "ds" is a syntactically legal scheme,
    // so isAbsoluteIri admits it and the loader looks it up verbatim — it
    // simply matches no subject in the store. Pinned because the failure that
    // matters is the opposite one: quietly resolving it again (by consulting
    // the prefix map) would make node() answer differently depending on which
    // prefixes a consumer happened to register.
    const compiled = await setup(DS_REALISTIC_TTL, options);
    const result = await run(
      compiled,
      `{ node(id: "ds:global.component.button") { uri } }`,
    );
    expect(result.errors).toBeUndefined();
    expect(result.data?.node).toBeNull();
    // The absolute form of the very same entity still resolves — the pin is
    // about the currency, not about the entity being missing.
    const absolute = await run(
      compiled,
      `{ node(id: "https://ds.canonical.com/global.component.button") { uri } }`,
    );
    expect((absolute.data?.node as { uri: string }).uri).toBe(
      "https://ds.canonical.com/global.component.button",
    );
  });

  it("resolves a class IRI through node() — ABox first, TBox second", async () => {
    const compiled = await setup(DS_REALISTIC_TTL, options);
    const result = await run(
      compiled,
      `{
        cls: node(id: "https://ds.canonical.com/Component") {
          __typename
          uri
          _meta { title definition type { uri } }
          ... on OntologyClass { label instanceCount }
        }
        entity: node(id: "https://ds.canonical.com/global.component.button") {
          __typename
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    // A class IRI has no mapped rdf:type, so the entity loader answers null
    // and the TBox fallthrough serves the ClassNode — as a full Node, with
    // _meta through the adapter and the meta-class as its type.
    expect(result.data?.cls).toEqual({
      __typename: "OntologyClass",
      uri: "https://ds.canonical.com/Component",
      _meta: {
        title: "Component",
        definition: "A reusable UI component.",
        type: { uri: "http://www.w3.org/2002/07/owl#Class" },
      },
      label: "Component",
      instanceCount: 1,
    });
    // ...while the ABox path answered first and exactly as before.
    expect(result.data?.entity).toEqual({ __typename: "Component" });
  });

  it("resolves a PUNNED IRI ABox-first — the ordering, not just the fallthrough", async () => {
    // The test above queries two DISJOINT ids: exactly one branch can answer
    // each, so branch ORDER is unobservable and a TBox-first mutant passes.
    // OWL 2 punning makes one IRI answerable by BOTH branches, which is the
    // only input that can falsify "ABox first, TBox second — strictly
    // additive": ex:Widget is a class AND an individual of ex:Category.
    const compiled = await setup(`
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Category a owl:Class ; rdfs:label "Category" .
ex:Widget a owl:Class , ex:Category ; rdfs:label "Widget" .
ex:code a owl:DatatypeProperty ; rdfs:domain ex:Category ; rdfs:range xsd:string .

ex:Widget ex:code "W-1" .
ex:w1 a ex:Widget .
ex:c1 a ex:Category .
`);
    const result = await run(
      compiled,
      `{
        punned: node(id: "http://example.org/Widget") {
          __typename
          ... on Category { code }
          ... on OntologyClass { instanceCount }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    // The ABox branch answers first: the entity shape wins, carrying the
    // ontology's own field. Hoisting the TBox lookup above the loader would
    // return __typename "OntologyClass" with instanceCount instead — the
    // regression this pins, and the one every disjoint-id test misses.
    expect(result.data?.punned).toEqual({
      __typename: "Category",
      code: "W-1",
    });
  });

  it("a junk singular-lookup argument cannot poison sibling lookups in the same tick", async () => {
    // Both lookups resolve in one tick, so they share one loader batch. The
    // colon-free argument expands to nothing and must resolve to null WITHOUT
    // entering the batch: interpolated as <dune> it would be an invalid
    // IRIREF that fails the whole CONSTRUCT — including the valid sibling.
    const compiled = await setup(DS_REALISTIC_TTL, options);
    const result = await run(
      compiled,
      `{
        bad: component(uri: "dune") { name }
        good: component(uri: "ds:global.component.button") { name }
      }`,
    );
    expect(result.errors).toBeUndefined();
    expect(result.data?.bad).toBeNull();
    expect((result.data?.good as { name: string }).name).toBe("Button");
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

describe("the meta-class through node()", () => {
  it("resolves owl:Class; its instances are the classes and the counts agree", async () => {
    const compiled = await setup(INHERITANCE_TTL);
    const result = await run(
      compiled,
      `{
        node(id: "http://www.w3.org/2002/07/owl#Class") {
          __typename
          uri
          ... on OntologyClass {
            label
            instanceCount
            instances(first: 10) {
              edges { cursor node { __typename uri } }
              pageInfo { hasNextPage }
            }
          }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const meta = result.data?.node as {
      __typename: string;
      uri: string;
      label: string;
      instanceCount: number;
      instances: {
        edges: Array<{
          cursor: string;
          node: { __typename: string; uri: string };
        }>;
        pageInfo: { hasNextPage: boolean };
      };
    };
    expect(meta.__typename).toBe("OntologyClass");
    expect(meta.uri).toBe("http://www.w3.org/2002/07/owl#Class");
    expect(meta.label).toBe("Class");
    // instances and instanceCount are ONE promise: both speak ir.classes.
    expect(meta.instanceCount).toBe(4);
    expect(meta.instances.edges).toHaveLength(4);
    expect(
      meta.instances.edges.every((e) => e.node.__typename === "OntologyClass"),
    ).toBe(true);
    // URI-sorted, so cursors are stable across requests — and each cursor is
    // base64 of the very IRI its node reports, like every other connection.
    expect(meta.instances.edges.map((e) => e.node.uri)).toEqual([
      "http://example.org/Entity",
      "http://example.org/Gadget",
      "http://example.org/Tangible",
      "http://example.org/Widget",
    ]);
    expect(atob(meta.instances.edges[0]?.cursor ?? "")).toBe(
      "http://example.org/Entity",
    );
    expect(meta.instances.pageInfo.hasNextPage).toBe(false);
  });

  it("counts the compiler's classes, not raw owl:Class declarations", async () => {
    // rdfs:Resource is declared `a owl:Class` in the store, so the raw
    // instance stats for owl:Class say 2 — but the compiler filters
    // standard-vocabulary classes out of the IR, and the meta-class's
    // instances connection yields exactly ir.classes. instanceCount must
    // match what instances yields, not what the store counted.
    const compiled = await setup(`
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Thing a owl:Class ; rdfs:label "Thing" .
rdfs:Resource a owl:Class .
ex:name a owl:DatatypeProperty ; rdfs:domain ex:Thing ; rdfs:range xsd:string .
ex:t1 a ex:Thing ; ex:name "t1" .
`);
    const result = await run(
      compiled,
      `{
        node(id: "http://www.w3.org/2002/07/owl#Class") {
          ... on OntologyClass {
            instanceCount
            instances(first: 10) { edges { node { uri } } }
          }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const meta = result.data?.node as {
      instanceCount: number;
      instances: { edges: Array<{ node: { uri: string } }> };
    };
    expect(meta.instanceCount).toBe(1);
    expect(meta.instances.edges.map((e) => e.node.uri)).toEqual([
      "http://example.org/Thing",
    ]);
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

  it("treats an explicit lang: null as the default chain instead of throwing", async () => {
    // The argument default fires only when `lang` is OMITTED — an explicit
    // null bypasses it and reaches the resolver, where it must mean "the
    // default chain" rather than crash tag matching (on the non-null `title`
    // a throw would kill the whole request).
    const compiled = await setup(LANG_TTL);
    const result = await run(
      compiled,
      `{
        doc(uri: "ex:d1") {
          _meta {
            t: title(lang: null)
            l: label(lang: null)
            c: comment(lang: null)
            d: definition(lang: null)
          }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    expect((result.data?.doc as Record<string, unknown>)._meta).toEqual({
      // same answers as an omitted argument: the "en" default chain
      t: "The Widget",
      l: "The Widget",
      c: null,
      d: null,
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
