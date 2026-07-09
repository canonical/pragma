// =============================================================================
// Pipeline tests (Passes 1–7) against fixture stores: schema shape,
// diagnostics, golden SDL expectations.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import type { GraphQLObjectType } from "graphql";
import { afterEach, describe, expect, it } from "vitest";
import {
  type CompilerResult,
  compile,
  createStoreQueryFn,
} from "../../lib/compiler/index.js";
import {
  BLANK_NODES_TTL,
  DOMAINLESS_TTL,
  DS_REALISTIC_TTL,
  EDGE_CASES_TTL,
  INHERITANCE_TTL,
  INVERSE_TTL,
  MINIMAL_TTL,
  PREFIXES,
  SHACL_TTL,
} from "../index.js";

type Cleanup = () => void;
let cleanups: Cleanup[] = [];

afterEach(() => {
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
});

const compileFixture = async (
  ttl: string,
  options: Parameters<typeof compile>[2] = {},
): Promise<CompilerResult> => {
  const { store, cleanup } = await createTestStore({
    ttl,
    prefixes: PREFIXES,
  });
  cleanups.push(cleanup);
  return compile(createStoreQueryFn(store), PREFIXES, options);
};

const codes = (result: CompilerResult): string[] =>
  result.diagnostics.map((d) => d.code);

describe("minimal fixture", () => {
  it("compiles one concrete type with root queries and Node membership", async () => {
    const result = await compileFixture(MINIMAL_TTL);
    expect(result.schema).toBeDefined();
    const thing = result.schema.getType("Thing") as GraphQLObjectType;
    expect(thing).toBeDefined();
    const fields = thing.getFields();
    // datatype properties default to singular
    expect(String(fields.name?.type)).toBe("String");
    expect(String(fields.count?.type)).toBe("Int");
    // structural fields
    expect(String(fields.id?.type)).toBe("ID!");
    expect(String(fields.uri?.type)).toBe("String!");
    expect(String(fields._meta?.type)).toBe("EntityMeta!");
    expect(thing.getInterfaces().map((i) => i.name)).toContain("Node");
    // root queries
    const query = result.schema.getQueryType()?.getFields();
    expect(query?.thing).toBeDefined();
    expect(query?.things).toBeDefined();
    expect(String(query?.things?.type)).toBe("ThingConnection!");
    // connection fields carry the four pagination args
    const argNames = query?.things?.args.map((a) => a.name).sort();
    expect(argNames).toEqual(["after", "before", "first", "last"]);
    expect(result.sdl).toContain("type Thing implements Node");
  });
});

describe("inheritance fixture", () => {
  it("generates the interface chain with inherited fields", async () => {
    const result = await compileFixture(INHERITANCE_TTL);
    expect(result.sdl).toContain("interface Entity implements Node");
    expect(result.sdl).toContain("interface Tangible implements");
    const widget = result.schema.getType("Widget") as GraphQLObjectType;
    expect(
      widget
        .getInterfaces()
        .map((i) => i.name)
        .sort(),
    ).toEqual(["Entity", "Node", "Tangible"]);
    const fields = widget.getFields();
    expect(fields.name).toBeDefined(); // inherited from Entity
    expect(fields.weight).toBeDefined(); // inherited from Tangible
    expect(fields.color).toBeDefined(); // own
    // abstract classes produce no root queries
    const query = result.schema.getQueryType()?.getFields();
    expect(query?.entity).toBeUndefined();
    expect(query?.widget).toBeDefined();
  });
});

describe("inverse fixture", () => {
  it("places one field per side with the irregular plural", async () => {
    const result = await compileFixture(INVERSE_TTL);
    const parent = result.schema.getType("Parent") as GraphQLObjectType;
    const child = result.schema.getType("Child") as GraphQLObjectType;
    // hasChild → children (has-strip + irregular plural), connection-wrapped
    expect(String(parent.getFields().children?.type)).toBe("ChildConnection!");
    // childOf is functional → singular
    expect(String(child.getFields().childOf?.type)).toBe("Parent");
    // no duplicated reverse fields
    expect(parent.getFields().childOf).toBeUndefined();
    expect(child.getFields().children).toBeUndefined();
  });
});

describe("polymorphic flattening diagnostic (V016)", () => {
  const SUPERTYPE_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Animal a owl:Class .
ex:Dog a owl:Class ; rdfs:subClassOf ex:Animal .
ex:name a owl:DatatypeProperty ; rdfs:domain ex:Animal ; rdfs:range xsd:string .
ex:a1 a ex:Animal ; ex:name "Generic" .
ex:d1 a ex:Dog ; ex:name "Rex" .
`;

  it("warns when a concrete class has subclasses (instantiable supertype)", async () => {
    const result = await compileFixture(SUPERTYPE_TTL);
    expect(codes(result)).toContain("V016");
    // Animal keeps its direct instance, so it stays a concrete type.
    expect(result.sdl).toContain("type Animal implements Node");
  });

  it("does not warn when the supertype is abstract (no direct instances)", async () => {
    const result = await compileFixture(INHERITANCE_TTL);
    expect(codes(result)).not.toContain("V016");
  });
});

describe("blank nodes fixture", () => {
  it("marks blank-only classes embeddable: no Node, plain list", async () => {
    const result = await compileFixture(BLANK_NODES_TTL);
    expect(codes(result)).toContain("V001");
    const example = result.schema.getType("Example") as GraphQLObjectType;
    expect(example.getInterfaces()).toHaveLength(0);
    expect(example.getFields().id).toBeUndefined();
    expect(example.getFields()._meta).toBeUndefined();
    const standard = result.schema.getType("Standard") as GraphQLObjectType;
    // plain list, not a connection
    expect(String(standard.getFields().examples?.type)).toBe("[Example!]!");
    // no root query for embeddable types
    expect(result.schema.getQueryType()?.getFields().example).toBeUndefined();
  });
});

describe("domainless fixture", () => {
  it("assigns the property to every class in its namespace", async () => {
    const result = await compileFixture(DOMAINLESS_TTL);
    expect(codes(result)).toContain("V002");
    const foo = result.schema.getType("Foo") as GraphQLObjectType;
    const bar = result.schema.getType("Bar") as GraphQLObjectType;
    expect(foo.getFields().description).toBeDefined();
    expect(bar.getFields().description).toBeDefined();
  });
});

describe("edge cases fixture", () => {
  it("emits the expected V-series diagnostics", async () => {
    const result = await compileFixture(EDGE_CASES_TTL);
    const found = codes(result);
    expect(found).toContain("V004"); // self-referential extends
    expect(found).toContain("V005"); // functional violation on ex:rank
    expect(found).toContain("V006"); // boolean range coercion note
    expect(found).toContain("V007"); // annotation property routed to TBox
    expect(found).toContain("V008"); // custom datatype → String
    expect(found).toContain("V009"); // cross-vocabulary subClassOf
    expect(found).toContain("V012"); // sh:in enum constraint
    expect(found).toContain("V014"); // undeclared ABox predicate
    // annotation property produces no ABox field
    const item = result.schema.getType("Item") as GraphQLObjectType;
    expect(item.getFields().guidance).toBeUndefined();
    // custom datatype mapped to String
    expect(String(item.getFields().ver?.type)).toBe("String");
    // Category is a root class despite skos:Concept parentage
    expect(result.schema.getType("Category")).toBeDefined();
  });
});

describe("shacl fixture", () => {
  it("resolves SHACL cardinality including sh:or and maxCount 0", async () => {
    const result = await compileFixture(SHACL_TTL);
    const found = codes(result);
    expect(found).toContain("V010");
    expect(found).toContain("V011");
    const spec = result.schema.getType("Spec") as GraphQLObjectType;
    // sh:maxCount 1 without owl:FunctionalProperty → singular
    expect(String(spec.getFields().root?.type)).toBe("Hop");
    // sh:maxCount 0 → field omitted
    expect(spec.getFields().legacy).toBeUndefined();
    const hop = result.schema.getType("Hop") as GraphQLObjectType;
    // sh:or → both singular, both nullable
    expect(String(hop.getFields().hopTarget?.type)).toBe("Spec");
    expect(String(hop.getFields().hopSwitch?.type)).toBe("Sw");
  });
});

describe("ds-realistic fixture", () => {
  it("compiles the full hierarchy with synthetic inverses and overrides", async () => {
    const result = await compileFixture(DS_REALISTIC_TTL, {
      mappings: {
        "ds:hasModifierFamily": { graphqlName: "modifierFamilies" },
        "ds:hasSubcomponent": { graphqlName: "subcomponents" },
        "ds:hasProperty": { graphqlName: "properties" },
        "ds:hasModifier": { graphqlName: "modifiers" },
        "ds:implementsBlock": { inverse: { graphqlName: "implementations" } },
      },
      nonNullOverrides: { Component: ["name"] },
    });
    expect(result.schema).toBeDefined();
    const component = result.schema.getType("Component") as GraphQLObjectType;
    const fields = component.getFields();
    // abstract chain → interfaces
    expect(
      component
        .getInterfaces()
        .map((i) => i.name)
        .sort(),
    ).toEqual(["Entity", "Node", "UIBlock", "UIElement"]);
    // non-null override
    expect(String(fields.name?.type)).toBe("String!");
    // custom-mapped names, connection-wrapped
    expect(String(fields.modifierFamilies?.type)).toBe(
      "ModifierFamilyConnection!",
    );
    expect(String(fields.subcomponents?.type)).toBe("SubcomponentConnection!");
    // embedded blank-node list stays plain
    expect(String(fields.properties?.type)).toBe("[Property!]!");
    // synthetic inverse on the range type's concrete descendants
    expect(String(fields.implementations?.type)).toBe(
      "ImplementationObjectConnection!",
    );
    // ds:Property is embeddable: detected from blank-only instance stats
    const property = result.schema.getType("Property") as GraphQLObjectType;
    expect(property.getFields().id).toBeUndefined();
  });
});

describe("failure modes", () => {
  it("M003 reports unknown custom mappings", async () => {
    const result = await compileFixture(MINIMAL_TTL, {
      mappings: { "ex:doesNotExist": { graphqlName: "nope" } },
    });
    expect(codes(result)).toContain("M003");
  });

  it("relay: false produces a schema without Node wiring", async () => {
    const result = await compileFixture(MINIMAL_TTL, { relay: false });
    const thing = result.schema.getType("Thing") as GraphQLObjectType;
    expect(thing.getFields().id).toBeUndefined();
    expect(result.schema.getQueryType()?.getFields().node).toBeUndefined();
  });

  it("incremental: true adds the defer and stream directives", async () => {
    const result = await compileFixture(MINIMAL_TTL, { incremental: true });
    expect(result.schema.getDirective("defer")).toBeDefined();
    expect(result.schema.getDirective("stream")).toBeDefined();
  });
});
