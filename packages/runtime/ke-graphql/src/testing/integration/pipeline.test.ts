// =============================================================================
// Pipeline tests (Passes 1–7) against fixture stores: schema shape,
// diagnostics, golden SDL expectations.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import type { GraphQLInterfaceType, GraphQLObjectType } from "graphql";
import { afterEach, describe, expect, it } from "vitest";
import {
  CompilationError,
  type CompilerResult,
  compile,
  createStoreQueryFn,
} from "../../lib/compiler/index.js";
import { GRAPHQL } from "../../lib/shared/index.js";
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
    // structural fields — exactly two, and `id` is gone
    expect(String(fields.uri?.type)).toBe("ID!");
    expect(String(fields._meta?.type)).toBe("EntityMeta!");
    expect(fields.id).toBeUndefined();
    expect(fields.kind).toBeUndefined();
    // the descriptive fields live behind _meta now, with a lang argument
    const meta = result.schema.getType("EntityMeta") as GraphQLObjectType;
    expect(String(meta.getFields().title?.type)).toBe("String!");
    expect(String(meta.getFields().label?.type)).toBe("String");
    expect(String(meta.getFields().comment?.type)).toBe("String");
    expect(String(meta.getFields().definition?.type)).toBe("String");
    expect(result.sdl).toContain('title(lang: String = "en"): String!');
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

  it("makes OntologyClass a real Node; OntologyProperty stays a non-Node", async () => {
    const result = await compileFixture(MINIMAL_TTL);
    expect(result.sdl).toContain("type OntologyClass implements Node");
    const ontologyClass = result.schema.getType(
      "OntologyClass",
    ) as GraphQLObjectType;
    expect(ontologyClass.getInterfaces().map((i) => i.name)).toEqual(["Node"]);
    expect(String(ontologyClass.getFields()._meta?.type)).toBe("EntityMeta!");
    // Node.resolveType's TBox branch is identity-based: this build's own
    // ClassNode instance resolves to OntologyClass, while an ABox
    // EntityValue keeps resolving through its typename.
    const node = result.schema.getType("Node") as GraphQLInterfaceType;
    const classNode = result.mapped.ir.classes.get("http://example.org/Thing");
    expect(node.resolveType?.(classNode, {}, {} as never, node)).toBe(
      "OntologyClass",
    );
    expect(
      node.resolveType?.(
        { uri: "http://example.org/widget", typename: "Thing" },
        {},
        {} as never,
        node,
      ),
    ).toBe("Thing");
    // The asymmetry is deliberate scope: the property side keeps uri: ID!
    // but carries no _meta and implements nothing.
    const ontologyProperty = result.schema.getType(
      "OntologyProperty",
    ) as GraphQLObjectType;
    expect(ontologyProperty.getInterfaces()).toEqual([]);
    expect(ontologyProperty.getFields()._meta).toBeUndefined();
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
    expect(example.getFields().uri).toBeUndefined();
    // R9: an embeddable still carries _meta — self-description is a fact about
    // the class, not about identity.
    expect(String(example.getFields()._meta?.type)).toBe("EntityMeta!");
    const standard = result.schema.getType("Standard") as GraphQLObjectType;
    // plain list, not a connection
    expect(String(standard.getFields().examples?.type)).toBe("[Example!]!");
    // no root query for embeddable types
    expect(result.schema.getQueryType()?.getFields().example).toBeUndefined();
  });
});

describe("zero-property embeddable (R9)", () => {
  // ex:Marker is instantiated ONLY as a bare blank node with no properties of
  // its own: blank-only instances make it embeddable, and it declares nothing.
  // Before _meta was extended to embeddables this schema FAILED to build with
  // C003 ("Type Marker must define one or more fields") — this fixture is the
  // proof that the change is load-bearing, not decorative.
  const BARE_EMBEDDABLE_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Doc a owl:Class ; rdfs:label "Doc" .
ex:Marker a owl:Class ; rdfs:label "Marker" .

ex:title a owl:DatatypeProperty ; rdfs:domain ex:Doc ; rdfs:range xsd:string .
ex:hasMarker a owl:ObjectProperty ; rdfs:domain ex:Doc ; rdfs:range ex:Marker .

ex:d1 a ex:Doc ; ex:title "Titled" ; ex:hasMarker [ a ex:Marker ] .
`;

  it("builds a class with no properties at all, carrying _meta alone", async () => {
    const result = await compileFixture(BARE_EMBEDDABLE_TTL);
    // The schema exists: no C003 at all.
    expect(codes(result)).not.toContain("C003");
    const marker = result.schema.getType("Marker") as GraphQLObjectType;
    expect(Object.keys(marker.getFields())).toEqual(["_meta"]);
    expect(marker.getInterfaces()).toHaveLength(0);
    expect(result.sdl).toContain("type Marker {");
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
    expect(property.getFields().uri).toBeUndefined();
  });
});

describe("root-field occupancy (W001)", () => {
  // camelize("Lens") → "lens"; pluralize("lens") is the identity for
  // s-ending names → singular == plural on the Query root.
  const LENS_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Lens a owl:Class ; rdfs:label "Lens" .
ex:focal a owl:DatatypeProperty ; rdfs:domain ex:Lens ; rdfs:range xsd:string .
ex:l1 a ex:Lens ; ex:focal "50mm" .
`;

  it("refuses the compile instead of silently overwriting a root field", async () => {
    const thrown = await compileFixture(LENS_TTL).catch(
      (error: unknown) => error,
    );
    if (!(thrown instanceof CompilationError)) {
      throw new Error("expected a CompilationError");
    }
    const w001 = thrown.diagnostics.filter((d) => d.code === "W001");
    expect(w001).toHaveLength(1);
    expect(w001[0]?.message).toContain("Query.lens");
    expect(w001[0]?.message).toContain("singular lookup");
    expect(w001[0]?.message).toContain("listing");
  });
});

describe("abstract-class structural guard follows the interface surface", () => {
  it("direction A: a real shadowing is a TRUE M005, not a C003 shadow crash", async () => {
    // Media has only a blank-node instance (embeddable flag) but is forced
    // abstract; its concrete subclass Film is NOT embeddable, so the
    // interface gets uri: ID!. The ontology's own `uri` property is dropped
    // with M005 naming the real structural field — previously it survived
    // past the guard and shadowed the injected uri at validateSchema (C003),
    // pointing nowhere near the cause.
    const MEDIA_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Media a owl:Class ; rdfs:label "Media" .
ex:Film a owl:Class ; rdfs:subClassOf ex:Media ; rdfs:label "Film" .
ex:uri a owl:DatatypeProperty ; rdfs:domain ex:Media ; rdfs:range xsd:string .
[] a ex:Media .
ex:f1 a ex:Film .
`;
    const thrown = await compileFixture(MEDIA_TTL, {
      mappings: { "ex:Media": { abstract: true } },
    }).catch((error: unknown) => error);
    if (!(thrown instanceof CompilationError)) {
      throw new Error("expected a CompilationError");
    }
    const found = thrown.diagnostics.map((d) => d.code);
    expect(found).toContain("M005");
    expect(found).not.toContain("C003");
    expect(
      thrown.diagnostics.some((d) => d.message.includes("Media.uri")),
    ).toBe(true);
  });

  it("direction B: an embeddable-only interface keeps a property named uri on every container", async () => {
    // Section is auto-abstract (no instances, one subclass) so its own
    // embeddable flag is false — but its only concrete implementor Card is
    // embeddable, so the interface injects `_meta` alone and the ontology's
    // `uri` property survives on the interface AND on Card. Previously a
    // false M005 dropped it from the interface while every implementor
    // kept it.
    const SECTION_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Doc a owl:Class ; rdfs:label "Doc" .
ex:Section a owl:Class ; rdfs:label "Section" .
ex:Card a owl:Class ; rdfs:subClassOf ex:Section ; rdfs:label "Card" .
ex:uri a owl:DatatypeProperty ; rdfs:domain ex:Section ; rdfs:range xsd:string .
ex:hasCard a owl:ObjectProperty ; rdfs:domain ex:Doc ; rdfs:range ex:Card .
ex:d1 a ex:Doc ; ex:hasCard [ a ex:Card ; ex:uri "inner" ] .
`;
    const result = await compileFixture(SECTION_TTL);
    expect(codes(result)).not.toContain("M005");
    const sectionBlock = /interface Section \{[^}]*\}/.exec(result.sdl)?.[0];
    expect(sectionBlock).toContain("uri: String");
    expect(sectionBlock).not.toContain("uri: ID!");
    const cardBlock = /type Card implements Section \{[^}]*\}/.exec(
      result.sdl,
    )?.[0];
    expect(cardBlock).toContain("uri: String");
  });
});

describe("provenance header", () => {
  it("stamps the contract header block ahead of the printed SDL", async () => {
    const result = await compileFixture(MINIMAL_TTL, {
      mode: "explicit",
      provider: "ex",
      revision: "deadbeef",
    });
    expect(result.sdl.split("\n").slice(0, 7)).toEqual([
      "# ke-graphql · canonical SDL",
      "# graphql-schema-spec: 1",
      "# provider: ex",
      "# mode: explicit",
      "# validated-store: false",
      "# revision: deadbeef",
      "# prefixing: none",
    ]);
  });
});

describe("determinism", () => {
  it("emits byte-identical SDL for two independent compiles of one fixture", async () => {
    // Deterministic output is what makes the SDL snapshottable and reviewable
    // in a diff — the whole premise of the canonical SDL. Two fresh stores,
    // same TTL, same prefixes, same options: the printed bytes must not move.
    // Anything order-sensitive (Map iteration, union member collection, root
    // field claiming, connection minting) would show up here as a churn diff.
    const options = {
      mappings: {
        "ds:hasModifierFamily": { graphqlName: "modifierFamilies" },
        "ds:hasSubcomponent": { graphqlName: "subcomponents" },
        "ds:hasProperty": { graphqlName: "properties" },
        "ds:hasModifier": { graphqlName: "modifiers" },
        "ds:implementsBlock": { inverse: { graphqlName: "implementations" } },
      },
      nonNullOverrides: { Component: ["name"] },
    };
    const first = await compileFixture(DS_REALISTIC_TTL, options);
    const second = await compileFixture(DS_REALISTIC_TTL, options);
    // Guard against a vacuous pass: "" === "" would satisfy the comparison.
    expect(first.sdl.length).toBeGreaterThan(0);
    expect(second.sdl).toBe(first.sdl);
  });
});

describe("zero-class compile", () => {
  // No owl:Class anywhere — a prefix block and one unrelated triple. This is
  // the "ontology not loaded yet / wrong file" shape, and it must not be a
  // crash: the TBox surface is still a valid schema to serve.
  const NO_CLASSES_TTL = `
@prefix ex: <http://example.org/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

ex:note rdfs:label "an unrelated triple" .
`;

  it("succeeds with the Query + TBox surface and no generated types", async () => {
    const result = await compileFixture(NO_CLASSES_TTL);
    // No diagnostics at all: nothing is wrong, there is simply nothing to map.
    expect(result.diagnostics).toEqual([]);
    expect([...result.mapped.types.keys()]).toEqual([]);
    expect([...result.mapped.interfaces.keys()]).toEqual([]);
    // The reflective surface survives, plus node(id:) — but no per-type
    // lookup or listing root fields, because there are no types.
    expect(
      Object.keys(result.schema.getQueryType()?.getFields() ?? {}).sort(),
    ).toEqual([
      "node",
      "ontologies",
      "ontology",
      "ontologyClass",
      "ontologyProperty",
    ]);
    expect(result.sdl).toContain("type EntityMeta");
    expect(result.sdl).toContain("type OntologyClass implements Node");
  });
});

describe("graphql: annotation fatality", () => {
  // The A-band error codes ride the existing compile-level gate: any
  // error-severity diagnostic refuses the compile, so a conflicted or
  // malformed annotation can never reach a served schema.
  const GRAPHQL_NS = GRAPHQL;

  it("refuses conflicting annotation values (A001)", async () => {
    const ttl = `${MINIMAL_TTL}
<http://example.org/Thing> <${GRAPHQL_NS}name> "Alpha" , "Beta" .
`;
    await expect(compileFixture(ttl)).rejects.toThrow(CompilationError);
    const thrown = await compileFixture(ttl).catch(
      (error: CompilationError) => error,
    );
    if (!(thrown instanceof CompilationError)) {
      throw new Error("expected a CompilationError");
    }
    expect(thrown.diagnostics.some((d) => d.code === "A001")).toBe(true);
    expect(thrown.message).toContain("A001");
  });

  it("refuses a foreign annotation target (A002)", async () => {
    const ttl = `${MINIMAL_TTL}
<http://www.w3.org/2000/01/rdf-schema#label> <${GRAPHQL_NS}name> "Label" .
`;
    const thrown = await compileFixture(ttl).catch(
      (error: CompilationError) => error,
    );
    if (!(thrown instanceof CompilationError)) {
      throw new Error("expected a CompilationError");
    }
    expect(thrown.diagnostics.some((d) => d.code === "A002")).toBe(true);
  });

  it("refuses a malformed annotation value (A003)", async () => {
    const ttl = `${MINIMAL_TTL}
<http://example.org/Thing> <${GRAPHQL_NS}abstract> "maybe" .
`;
    const thrown = await compileFixture(ttl).catch(
      (error: CompilationError) => error,
    );
    if (!(thrown instanceof CompilationError)) {
      throw new Error("expected a CompilationError");
    }
    expect(thrown.diagnostics.some((d) => d.code === "A003")).toBe(true);
  });

  it("compiles through A004 (warning): an unknown local name never blocks the schema", async () => {
    const result = await compileFixture(`${MINIMAL_TTL}
<http://example.org/Thing> <${GRAPHQL_NS}naem> "typo" .
`);
    expect(codes(result)).toContain("A004");
    expect(result.schema.getType("Thing")).toBeDefined();
  });

  it("binds graphql:name and graphql:nonNull end to end: roots, connection pair, and nullability follow", async () => {
    const result = await compileFixture(`${MINIMAL_TTL}
<http://example.org/Thing> <${GRAPHQL_NS}name> "Item" .
<http://example.org/name> <${GRAPHQL_NS}nonNull> true .
`);
    expect(result.schema.getType("Item")).toBeDefined();
    expect(result.schema.getType("Thing")).toBeUndefined();
    // The rename propagates to the singular/plural root fields and the
    // connection pair minted from the type name.
    expect(result.sdl).toContain("item(uri: String!): Item");
    expect(result.sdl).toContain("items(");
    expect(result.sdl).toContain("ItemConnection");
    // graphql:nonNull promoted the field with no config at all.
    const itemBlock = /type Item implements Node \{[^}]*\}/.exec(
      result.sdl,
    )?.[0];
    expect(itemBlock).toContain("name: String!");
    expect(itemBlock).toContain("count: Int\n");
  });
});

describe("failure modes", () => {
  it("M003 reports unknown custom mappings", async () => {
    const result = await compileFixture(MINIMAL_TTL, {
      mappings: { "ex:doesNotExist": { graphqlName: "nope" } },
    });
    expect(codes(result)).toContain("M003");
  });

  it("refuses the compile on ANY error-severity diagnostic, carrying the full list", async () => {
    // Two custom mappings collide on one field name: Pass 4 drops the second
    // property with an M001 error. The pass-level drop is unchanged, but the
    // compile-level gate refuses to hand out the schema — a schema minus a
    // silently dropped field must never be served, so the boot dies loudly.
    const options = {
      mappings: {
        "ex:name": { graphqlName: "dup" },
        "ex:count": { graphqlName: "dup" },
      },
    };
    await expect(compileFixture(MINIMAL_TTL, options)).rejects.toThrow(
      CompilationError,
    );
    const thrown = await compileFixture(MINIMAL_TTL, options).catch(
      (error: CompilationError) => error,
    );
    if (!(thrown instanceof CompilationError)) {
      throw new Error("expected a CompilationError");
    }
    // The full diagnostic list rides on the error — the fatal M001 and the
    // non-fatal findings alike, so the consumer can report everything at once.
    expect(thrown.diagnostics.some((d) => d.code === "M001")).toBe(true);
    expect(
      thrown.diagnostics.filter((d) => d.severity === "error"),
    ).toHaveLength(1);
    expect(thrown.message).toContain("M001");
  });

  it("relay: false produces a schema without Node wiring", async () => {
    const result = await compileFixture(MINIMAL_TTL, { relay: false });
    const thing = result.schema.getType("Thing") as GraphQLObjectType;
    expect(thing.getFields().uri).toBeUndefined();
    expect(result.schema.getQueryType()?.getFields().node).toBeUndefined();
  });

  it("incremental: true adds the defer and stream directives", async () => {
    const result = await compileFixture(MINIMAL_TTL, { incremental: true });
    expect(result.schema.getDirective("defer")).toBeDefined();
    expect(result.schema.getDirective("stream")).toBeDefined();
  });
});
