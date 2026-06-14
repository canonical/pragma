// =============================================================================
// TBox schema surface: Ontology, OntologyClass, OntologyProperty,
// ClassProperty, EntityMeta lookups and edge cases.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import {
  type GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  graphql,
} from "graphql";
import { afterEach, describe, expect, it } from "vitest";
import { type CompilerResult, compile, createStoreQueryFn } from "#compiler";
import type {
  ClassNode,
  CompilerContext,
  MappedIR,
  NamespaceInfo,
  OntologyIR,
  PropertyNode,
  RawExtraction,
} from "#shared";
import {
  DS_REALISTIC_TTL,
  INHERITANCE_TTL,
  MINIMAL_TTL,
  PREFIXES,
  SHACL_TTL,
} from "#testing";
import buildTBoxSchema from "./buildTBoxSchema.js";

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

const run = async (compiled: Compiled, source: string) =>
  graphql({ schema: compiled.schema, source, contextValue: compiled.context });

// A class-ranged property, an inverse pair, an undeclared (unknown) range,
// and a domainless property — one fixture covering the range-kind branches
// that are reachable through full compilation.
const RANGE_TTL = `
@prefix ex: <http://example.org/> .
@prefix ext: <http://external.example/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Thing a owl:Class ; rdfs:label "Thing" .
ex:Cat a owl:Class ; rdfs:label "Cat" .

ex:rel a owl:ObjectProperty ; rdfs:domain ex:Thing ; rdfs:range ex:Cat .
ex:weird a owl:ObjectProperty ; rdfs:domain ex:Thing ; rdfs:range ext:Mystery .
ex:free a owl:DatatypeProperty ; rdfs:range xsd:string .

ex:hasChild a owl:ObjectProperty ;
  rdfs:domain ex:Thing ; rdfs:range ex:Cat ; owl:inverseOf ex:childOf .
ex:childOf a owl:ObjectProperty ; rdfs:domain ex:Cat ; rdfs:range ex:Thing .

ex:t1 a ex:Thing .
ex:c1 a ex:Cat .
`;

describe("Ontology and lookups", () => {
  it("lists ontologies with classes and properties", async () => {
    const compiled = await setup(MINIMAL_TTL);
    const result = await run(
      compiled,
      `{
        ontologies {
          prefix
          namespace
          label
          classes { label }
          properties { label kind functional namespace }
        }
        ontology(prefix: "ex") { prefix }
        unknown: ontology(prefix: "zz") { prefix }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const ontologies = result.data?.ontologies as Array<
      Record<string, unknown>
    >;
    const ex = ontologies.find((o) => o.prefix === "ex");
    expect(ex?.namespace).toBe("http://example.org/");
    expect((ex?.classes as unknown[]).length).toBe(1);
    expect((ex?.properties as unknown[]).length).toBe(2);
    expect((result.data?.ontology as { prefix: string }).prefix).toBe("ex");
    expect(result.data?.unknown).toBeNull();
  });

  it("resolves ontologyProperty with scalar ranges and datatype kind", async () => {
    const compiled = await setup(MINIMAL_TTL);
    const result = await run(
      compiled,
      `{
        ontologyProperty(uri: "http://example.org/count") {
          uri label kind functional range namespace
          domain { label }
          inverse { uri }
        }
        missing: ontologyProperty(uri: "http://example.org/nope") { uri }
        prefixed: ontologyProperty(uri: "ex:count") { uri }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const property = result.data?.ontologyProperty as Record<string, unknown>;
    expect(property.kind).toBe("DATATYPE");
    expect(property.functional).toBe(true); // datatype default is singular
    expect(property.range).toContain("integer");
    expect((property.domain as { label: string }).label).toBe("Thing");
    expect(property.inverse).toBeNull();
    expect(result.data?.missing).toBeNull();
    // Prefixed form resolves like ontologyClass does.
    expect((result.data?.prefixed as { uri: string }).uri).toBe(
      "http://example.org/count",
    );
  });

  it("resolves class and unknown ranges, an inverse, and an absent domain", async () => {
    const compiled = await setup(RANGE_TTL);
    const result = await run(
      compiled,
      `{
        rel: ontologyProperty(uri: "http://example.org/rel") {
          range
          domain { label }
        }
        weird: ontologyProperty(uri: "http://example.org/weird") { range }
        domainless: ontologyProperty(uri: "http://example.org/free") {
          domain { label }
        }
        inv: ontologyProperty(uri: "http://example.org/childOf") {
          inverse { uri }
          definition
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    // class range resolves to the member class URI.
    const rel = result.data?.rel as Record<string, unknown>;
    expect(rel.range).toBe("http://example.org/Cat");
    expect((rel.domain as { label: string }).label).toBe("Thing");
    // unknown range echoes the raw URI string.
    expect((result.data?.weird as { range: string }).range).toBe(
      "http://external.example/Mystery",
    );
    // a property with no rdfs:domain has a null domain.
    expect((result.data?.domainless as { domain: unknown }).domain).toBeNull();
    // an inverse pair exposes the inverse property; definition is absent here.
    const inv = result.data?.inv as {
      inverse: { uri: string };
      definition: string | null;
    };
    expect(inv.inverse.uri).toBe("http://example.org/hasChild");
    expect(inv.definition).toBeNull();
  });

  it("exposes class definition, namespace, and falls back through prefixed lookups", async () => {
    const compiled = await setup(DS_REALISTIC_TTL);
    const result = await run(
      compiled,
      `{
        byFull: ontologyClass(uri: "https://ds.canonical.com/Component") {
          definition
          namespace
        }
        byPrefixed: ontologyClass(uri: "ds:Component") { uri }
        missingClass: ontologyClass(uri: "nope:Nope") { uri }
        propByPrefixed: ontologyProperty(uri: "ds:name") { uri }
        missingProp: ontologyProperty(uri: "nope:nope") { uri }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const cls = result.data?.byFull as Record<string, unknown>;
    expect(cls.definition).toBe("A reusable UI component.");
    expect(cls.namespace).toBe("ds");
    // prefixed-form fallback resolves both class and property…
    expect((result.data?.byPrefixed as { uri: string }).uri).toBe(
      "https://ds.canonical.com/Component",
    );
    expect((result.data?.propByPrefixed as { uri: string }).uri).toBe(
      "https://ds.canonical.com/name",
    );
    // …and an unmatched prefixed form falls through to null.
    expect(result.data?.missingClass).toBeNull();
    expect(result.data?.missingProp).toBeNull();
  });

  it("walks superclass chains on OntologyClass", async () => {
    const compiled = await setup(INHERITANCE_TTL);
    const result = await run(
      compiled,
      `{
        ontologyClass(uri: "http://example.org/Widget") {
          label
          isAbstract
          superclass { label }
          superclasses { label }
          subclasses { label }
        }
        root: ontologyClass(uri: "http://example.org/Entity") {
          isAbstract
          superclass { label }
          subclasses { label }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const widget = result.data?.ontologyClass as Record<string, unknown>;
    expect(widget.isAbstract).toBe(false);
    expect((widget.superclass as { label: string }).label).toBe("Tangible");
    expect(
      (widget.superclasses as Array<{ label: string }>).map((c) => c.label),
    ).toEqual(["Tangible", "Entity"]);
    const root = result.data?.root as Record<string, unknown>;
    expect(root.isAbstract).toBe(true);
    expect(root.superclass).toBeNull();
    expect(
      (root.subclasses as Array<{ label: string }>).map((c) => c.label),
    ).toEqual(["Tangible"]);
  });

  it("exposes per-class SHACL cardinality through ClassProperty", async () => {
    const compiled = await setup(SHACL_TTL);
    const result = await run(
      compiled,
      `{
        ontologyClass(uri: "http://example.org/Spec") {
          properties {
            property { label }
            required
            singular
            inherited
          }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const properties = (result.data?.ontologyClass as Record<string, unknown>)
      .properties as Array<{
      property: { label: string };
      required: boolean;
      singular: boolean;
      inherited: boolean;
    }>;
    const root = properties.find((p) => p.property.label === "root");
    expect(root?.required).toBe(true);
    expect(root?.singular).toBe(true);
    expect(root?.inherited).toBe(false);
  });

  it("returns annotation metadata through OntologyProperty", async () => {
    const compiled = await setup(DS_REALISTIC_TTL);
    const result = await run(
      compiled,
      `{
        ontologyProperty(uri: "https://ds.canonical.com/name") {
          acceptanceCriteria
          completionGuidance
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    const property = result.data?.ontologyProperty as Record<string, unknown>;
    expect(property.acceptanceCriteria).toBe(
      "Must be a human-readable display name.",
    );
    expect(property.completionGuidance).toBeNull();
  });
});

describe("EntityMeta edge cases", () => {
  it("returns null for unknown field names", async () => {
    const compiled = await setup(MINIMAL_TTL);
    const result = await run(
      compiled,
      `{
        thing(uri: "ex:widget") {
          _meta { field(name: "doesNotExist") { required } }
        }
      }`,
    );
    expect(result.errors).toBeUndefined();
    expect(
      (result.data?.thing as { _meta: { field: unknown } })._meta.field,
    ).toBeNull();
  });
});

describe("datatype list fields", () => {
  it("resolves multi-valued datatype properties when forced to list", async () => {
    const compiled = await setup(MINIMAL_TTL, {
      mappings: { "ex:name": { singular: false, graphqlName: "names" } },
    });
    const result = await run(compiled, `{ thing(uri: "ex:widget") { names } }`);
    expect(result.errors).toBeUndefined();
    expect((result.data?.thing as { names: string[] }).names).toEqual([
      "Widget",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Defensive branches reachable only from synthetic parent values: a union
// range, ClassProperty rows pointing at unknown URIs, EntityMeta on an
// unmapped typename, and an instances window whose URI cannot round-trip.
// These states cannot be produced through normal compilation, so the schema
// is built directly with hand-crafted IR and parents fed through extra root
// fields wired to the returned object types.
// ---------------------------------------------------------------------------

const KNOWN = "urn:test#Known";
const UNION_PROP = "urn:test#unionProp";
const GHOST_PROP = "urn:test#ghostProp";

const unionProperty: PropertyNode = {
  uri: UNION_PROP,
  label: "unionProp",
  namespace: "t",
  kind: "object",
  domains: [KNOWN],
  range: { kind: "union", name: "PetUnion", members: ["Cat", "Dog"] },
  functional: false,
  classCardinality: new Map(),
  isAnnotation: false,
  annotations: new Map(),
};

const knownClass: ClassNode = {
  uri: KNOWN,
  label: "Known",
  namespace: "t",
  superclasses: [],
  ancestors: [],
  subclasses: [],
  isAbstract: false,
  embeddable: false,
  // GHOST_PROP has no PropertyNode → listClassProperties' `?? false` fires.
  ownProperties: [UNION_PROP],
  allProperties: [UNION_PROP, GHOST_PROP],
};

const buildSyntheticIR = (): MappedIR => {
  const classes = new Map<string, ClassNode>([[KNOWN, knownClass]]);
  const properties = new Map<string, PropertyNode>([
    [UNION_PROP, unionProperty],
  ]);
  const namespaces = new Map<string, NamespaceInfo>([
    ["t", { prefix: "t", uri: "urn:test#", classCount: 1, propertyCount: 1 }],
  ]);
  const ir: OntologyIR = {
    classes,
    properties,
    namespaces,
    // Only instanceStats is read by the TBox schema; an empty map drives the
    // `?? 0` fallback in instanceCount.
    extraction: { instanceStats: new Map() } as unknown as RawExtraction,
  };
  return {
    ir,
    classes,
    properties,
    namespaces,
    types: new Map([
      [
        "Known",
        {
          owlUri: KNOWN,
          graphqlName: "Known",
          interfaces: [],
          fields: new Map(),
          embeddable: false,
          namespace: "t",
          pluralName: "knowns",
          singularName: "known",
        },
      ],
    ]),
    interfaces: new Map(),
    unions: new Map(),
    nameMap: {
      toGraphQL: () => undefined,
      toOWL: (name: string) => (name === "Known" ? KNOWN : undefined),
      entries: () => [],
    },
  } as unknown as MappedIR;
};

const buildSyntheticSchema = (): GraphQLSchema => {
  const mapped = buildSyntheticIR();
  const nodeInterface = {} as GraphQLInterfaceType;
  const nodeConnection = () =>
    new GraphQLObjectType({
      name: "TestConnection",
      fields: { _empty: { type: GraphQLString } },
    });
  const tbox = buildTBoxSchema(mapped, nodeInterface, nodeConnection);

  const query = new GraphQLObjectType({
    name: "Query",
    fields: {
      // union range branch
      unionProp: {
        type: tbox.ontologyProperty,
        resolve: () => mapped.ir.properties.get(UNION_PROP),
      },
      // ClassProperty whose property is unknown → required/singular short to
      // false (resolveCardinality never called) and inherited's `?? false`.
      orphanProp: {
        type: tbox.classProperty,
        resolve: () => ({
          propertyUri: GHOST_PROP,
          classUri: "urn:test#NoClass",
        }),
      },
      // ClassProperty with a known property but an unknown class → required/
      // singular DO call resolveCardinality, whose `node?.ancestors ?? []`
      // default fires because the class is absent.
      orphanClassProp: {
        type: tbox.classProperty,
        resolve: () => ({
          propertyUri: UNION_PROP,
          classUri: "urn:test#NoClass",
        }),
      },
      // EntityMeta with an unmapped typename
      orphanMeta: {
        type: tbox.entityMeta,
        resolve: () => ({
          uri: null,
          typename: "NotAType",
          triples: new Map(),
        }),
      },
      // ClassNode with an empty stats map and a ghost own-property
      knownClass: {
        type: tbox.ontologyClass,
        resolve: () => mapped.ir.classes.get(KNOWN),
      },
    },
  });

  return new GraphQLSchema({ query, types: [tbox.entityMeta] });
};

describe("TBox defensive branches (synthetic parents)", () => {
  const orphanContext = {
    // A bare token cannot be prefixed nor expanded → instances' `toFull ?? uri`.
    listLoader: { load: async () => ["orphan"] },
    entityLoader: { loadMany: async () => [null] },
  } as unknown as CompilerContext;

  it("joins union range members and reads the empty instanceCount fallback", async () => {
    const schema = buildSyntheticSchema();
    const result = await graphql({
      schema,
      contextValue: orphanContext,
      source: `{
        unionProp { range }
        knownClass {
          namespace
          instanceCount
          properties { inherited }
          instances(first: 5) { _empty }
        }
      }`,
    });
    expect(result.errors).toBeUndefined();
    expect((result.data?.unionProp as { range: string }).range).toBe(
      "Cat | Dog",
    );
    const cls = result.data?.knownClass as Record<string, unknown>;
    expect(cls.namespace).toBe("t");
    // No stats entry for this class → instanceCount falls back to 0.
    expect(cls.instanceCount).toBe(0);
    // listClassProperties runs the annotation filter against GHOST_PROP (no
    // PropertyNode → the `?? false` default keeps it) — both the union prop
    // and the ghost survive, so the list has two entries. `property` is left
    // unqueried because the ghost has no resolvable OntologyProperty.
    const props = cls.properties as Array<{ inherited: boolean }>;
    expect(props).toHaveLength(2);
  });

  it("reports false cardinality and inherited for a ClassProperty with unknown URIs", async () => {
    const schema = buildSyntheticSchema();
    const result = await graphql({
      schema,
      contextValue: orphanContext,
      source: `{ orphanProp { required singular inherited } }`,
    });
    expect(result.errors).toBeUndefined();
    const cp = result.data?.orphanProp as Record<string, boolean>;
    expect(cp.required).toBe(false);
    expect(cp.singular).toBe(false);
    // The class is unknown → ownProperties lookup yields the `?? false` default,
    // so the property is reported as inherited.
    expect(cp.inherited).toBe(true);
  });

  it("falls back to a known property's defaults when its class is unknown", async () => {
    const schema = buildSyntheticSchema();
    const result = await graphql({
      schema,
      contextValue: orphanContext,
      source: `{ orphanClassProp { required singular } }`,
    });
    expect(result.errors).toBeUndefined();
    const cp = result.data?.orphanClassProp as Record<string, boolean>;
    // resolveCardinality found no class node and no per-class spec → the kind
    // default (object property → not singular, not required) applies.
    expect(cp.required).toBe(false);
    expect(cp.singular).toBe(false);
  });

  it("returns an empty field list for an unmapped EntityMeta typename", async () => {
    const schema = buildSyntheticSchema();
    // `fields` is queried alone: an unmapped typename yields no class node, so
    // the resolver returns [] without touching the non-null `type` field.
    const result = await graphql({
      schema,
      contextValue: orphanContext,
      source: `{ orphanMeta { fields { property { uri } } } }`,
    });
    expect(result.errors).toBeUndefined();
    expect((result.data?.orphanMeta as { fields: unknown[] }).fields).toEqual(
      [],
    );
  });

  it("nulls the non-null EntityMeta type for an unmapped typename", async () => {
    const schema = buildSyntheticSchema();
    // `type` is non-null; an unmapped typename resolves it to null, which
    // bubbles a non-null violation and nulls the parent.
    const result = await graphql({
      schema,
      contextValue: orphanContext,
      source: `{ orphanMeta { type { uri } } }`,
    });
    expect(result.data?.orphanMeta).toBeNull();
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});
