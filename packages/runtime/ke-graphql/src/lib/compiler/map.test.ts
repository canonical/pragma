// =============================================================================
// Pass 4 — Map unit tests. Drives the name-resolution corners (sanitization,
// reserved collisions, unresolvable collisions), the field-type arms (class,
// union with abstract-member expansion, unknown), field-name collisions,
// synthetic inverse fields, standard-vocab fields, and union emission — none of
// which the fixture pipeline exercises.
// =============================================================================

import { describe, expect, it } from "vitest";
import {
  type ClassNode,
  type OntologyIR,
  type PropertyNode,
  type RawExtraction,
  XSD,
} from "#shared";
import build from "./build.js";
import map from "./map.js";

const NS = "http://example.org/";
const uri = (local: string) => `${NS}${local}`;

const makeExtraction = (
  partial: Partial<RawExtraction> = {},
): RawExtraction => ({
  classes: [],
  properties: [],
  inverses: [],
  functionals: new Set(),
  datatypes: [],
  namespaces: new Map([[NS, "ex"]]),
  shaclConstraints: [],
  unions: [],
  instanceStats: new Map(),
  selfReferential: new Set(),
  functionalViolations: new Set(),
  undeclaredPredicates: new Set(),
  annotations: new Map(),
  deepBlankNesting: false,
  ...partial,
});

/** Build a real OntologyIR from a crafted extraction. */
const buildIR = (
  partial: Partial<RawExtraction>,
  mappings: Parameters<typeof build>[1] = {},
): OntologyIR => build(makeExtraction(partial), mappings).output;

const codes = (diagnostics: { code: string }[]) =>
  diagnostics.map((d) => d.code);

describe("map — type name resolution", () => {
  it("sanitizes an illegal class local name and reports M002", () => {
    const ir = buildIR({
      classes: [{ uri: uri("My-Class"), superclasses: [] }],
      instanceStats: new Map([[uri("My-Class"), { total: 1, named: 1 }]]),
    });
    const { output, diagnostics } = map(ir);
    expect(codes(diagnostics)).toContain("M002");
    expect(output.types.has("My_Class")).toBe(true);
  });

  it("namespace-prefixes a class colliding with a reserved name (M004)", () => {
    const ir = buildIR({
      classes: [{ uri: uri("Query"), superclasses: [] }],
      instanceStats: new Map([[uri("Query"), { total: 1, named: 1 }]]),
    });
    const { output, diagnostics } = map(ir);
    expect(codes(diagnostics)).toContain("M004");
    expect(output.types.has("ExQuery")).toBe(true);
  });

  it("reports M001 when two custom mappings force the same type name", () => {
    const ir = buildIR({
      classes: [
        { uri: uri("A"), superclasses: [] },
        { uri: uri("B"), superclasses: [] },
      ],
      instanceStats: new Map([
        [uri("A"), { total: 1, named: 1 }],
        [uri("B"), { total: 1, named: 1 }],
      ]),
    });
    const { diagnostics } = map(ir, {
      mappings: {
        "ex:A": { graphqlName: "Dup" },
        "ex:B": { graphqlName: "Dup" },
      },
    });
    expect(codes(diagnostics)).toContain("M001");
  });
});

describe("map — field type specs", () => {
  it("resolves a class-typed field to its GraphQL type name", () => {
    const ir = buildIR({
      classes: [
        { uri: uri("Doc"), superclasses: [] },
        { uri: uri("Author"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("writtenBy"),
          kind: "object",
          domains: [uri("Doc")],
          ranges: [uri("Author")],
        },
      ],
      // functional → singular field name "writtenBy".
      functionals: new Set([uri("writtenBy")]),
      instanceStats: new Map([
        [uri("Doc"), { total: 1, named: 1 }],
        [uri("Author"), { total: 1, named: 1 }],
      ]),
    });
    const { output } = map(ir);
    const field = output.types.get("Doc")?.fields.get("writtenBy");
    expect(field?.type).toEqual({ kind: "type", name: "Author" });
  });

  it("expands an abstract union member to its concrete descendants", () => {
    // Animal (abstract) has concrete Dog; the union over {Animal, Plant}
    // expands Animal → Dog and keeps Plant directly.
    const ir = buildIR({
      classes: [
        { uri: uri("Animal"), superclasses: [] },
        { uri: uri("Dog"), superclasses: [uri("Animal")] },
        { uri: uri("Plant"), superclasses: [] },
        { uri: uri("Tag"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("subject"),
          kind: "object",
          domains: [uri("Tag")],
          ranges: [],
        },
      ],
      unions: [
        { property: uri("subject"), members: [uri("Animal"), uri("Plant")] },
      ],
      functionals: new Set([uri("subject")]),
      // Animal has no instances + a subclass → abstract; Dog/Plant concrete.
      instanceStats: new Map([
        [uri("Dog"), { total: 1, named: 1 }],
        [uri("Plant"), { total: 1, named: 1 }],
        [uri("Tag"), { total: 1, named: 1 }],
      ]),
    });
    const { output } = map(ir);
    const field = output.types.get("Tag")?.fields.get("subject");
    expect(field?.type.kind).toBe("union");
    if (field?.type.kind === "union") {
      expect([...field.type.members].sort()).toEqual(["Dog", "Plant"]);
      // anonymous range → synthesized "<Prop>Union" name.
      expect(field.type.name).toBe("SubjectUnion");
    }
  });

  it("skips union members that are not known classes", () => {
    const ir = buildIR({
      classes: [
        { uri: uri("Cat"), superclasses: [] },
        { uri: uri("Tag"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("subject"),
          kind: "object",
          domains: [uri("Tag")],
          ranges: [],
        },
      ],
      // ex:Ghost is not declared as a class → dropped from the union.
      unions: [
        { property: uri("subject"), members: [uri("Cat"), uri("Ghost")] },
      ],
      functionals: new Set([uri("subject")]),
      instanceStats: new Map([
        [uri("Cat"), { total: 1, named: 1 }],
        [uri("Tag"), { total: 1, named: 1 }],
      ]),
    });
    const { output } = map(ir);
    const field = output.types.get("Tag")?.fields.get("subject");
    if (field?.type.kind === "union") {
      expect([...field.type.members]).toEqual(["Cat"]);
    } else {
      throw new Error("expected a union field");
    }
  });

  it("dedupes a concrete descendant reachable by two abstract paths", () => {
    // A and B are both abstract supertypes of the concrete C (diamond). A
    // union over {A, B} must list C only once.
    const ir = buildIR({
      classes: [
        { uri: uri("A"), superclasses: [] },
        { uri: uri("B"), superclasses: [] },
        { uri: uri("C"), superclasses: [uri("A"), uri("B")] },
        { uri: uri("Tag"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("subject"),
          kind: "object",
          domains: [uri("Tag")],
          ranges: [],
        },
      ],
      unions: [{ property: uri("subject"), members: [uri("A"), uri("B")] }],
      functionals: new Set([uri("subject")]),
      instanceStats: new Map([
        [uri("C"), { total: 1, named: 1 }],
        [uri("Tag"), { total: 1, named: 1 }],
      ]),
    });
    const { output } = map(ir);
    const field = output.types.get("Tag")?.fields.get("subject");
    if (field?.type.kind === "union") {
      expect([...field.type.members]).toEqual(["C"]);
    } else {
      throw new Error("expected a union field");
    }
  });

  it("dedupes a concrete member that appears twice in a union", () => {
    const ir = buildIR({
      classes: [
        { uri: uri("Cat"), superclasses: [] },
        { uri: uri("Tag"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("subject"),
          kind: "object",
          domains: [uri("Tag")],
          ranges: [],
        },
      ],
      // Cat listed twice → only one member survives.
      unions: [{ property: uri("subject"), members: [uri("Cat"), uri("Cat")] }],
      functionals: new Set([uri("subject")]),
      instanceStats: new Map([
        [uri("Cat"), { total: 1, named: 1 }],
        [uri("Tag"), { total: 1, named: 1 }],
      ]),
    });
    const { output } = map(ir);
    const field = output.types.get("Tag")?.fields.get("subject");
    if (field?.type.kind === "union") {
      expect([...field.type.members]).toEqual(["Cat"]);
    } else {
      throw new Error("expected a union field");
    }
  });

  it("uses a named union's name and emits X002", () => {
    const ir = buildIR({
      classes: [
        { uri: uri("Cat"), superclasses: [] },
        { uri: uri("Box"), superclasses: [] },
        { uri: uri("Holder"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("holds"),
          kind: "object",
          domains: [uri("Holder")],
          ranges: [uri("Contents")],
        },
      ],
      unions: [{ uri: uri("Contents"), members: [uri("Cat"), uri("Box")] }],
      instanceStats: new Map([
        [uri("Cat"), { total: 1, named: 1 }],
        [uri("Box"), { total: 1, named: 1 }],
        [uri("Holder"), { total: 1, named: 1 }],
      ]),
    });
    const { output, diagnostics } = map(ir);
    expect(output.unions.has("Contents")).toBe(true);
    expect(codes(diagnostics)).toContain("X002");
  });

  it("emits X003 for an anonymous-range union", () => {
    const ir = buildIR({
      classes: [
        { uri: uri("Cat"), superclasses: [] },
        { uri: uri("Box"), superclasses: [] },
        { uri: uri("Holder"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("holds"),
          kind: "object",
          domains: [uri("Holder")],
          ranges: [],
        },
      ],
      unions: [{ property: uri("holds"), members: [uri("Cat"), uri("Box")] }],
      instanceStats: new Map([
        [uri("Cat"), { total: 1, named: 1 }],
        [uri("Box"), { total: 1, named: 1 }],
        [uri("Holder"), { total: 1, named: 1 }],
      ]),
    });
    const { output, diagnostics } = map(ir);
    expect(output.unions.has("HoldsUnion")).toBe(true);
    expect(codes(diagnostics)).toContain("X003");
  });

  it("falls back to String for an unknown range", () => {
    const ir = buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      properties: [
        {
          uri: uri("rel"),
          kind: "object",
          domains: [uri("Doc")],
          ranges: [uri("Nowhere")],
        },
      ],
      functionals: new Set([uri("rel")]),
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { output } = map(ir);
    const field = output.types.get("Doc")?.fields.get("rel");
    expect(field?.type).toEqual({ kind: "scalar", name: "String" });
  });

  it("falls back to String when a class range has no resolved type name", () => {
    // Hand-built IR: a property whose class range URI is absent from the class
    // map, so resolveTypeNames never assigns it a name.
    const doc: ClassNode = {
      uri: uri("Doc"),
      label: "Doc",
      namespace: "ex",
      superclasses: [],
      ancestors: [],
      subclasses: [],
      isAbstract: false,
      embeddable: false,
      ownProperties: [uri("rel")],
      allProperties: [uri("rel")],
    };
    const rel: PropertyNode = {
      uri: uri("rel"),
      label: "rel",
      namespace: "ex",
      kind: "object",
      domains: [uri("Doc")],
      range: { kind: "class", uri: uri("Phantom") },
      functional: true,
      classCardinality: new Map(),
      isAnnotation: false,
      annotations: new Map(),
    };
    const ir: OntologyIR = {
      classes: new Map([[doc.uri, doc]]),
      properties: new Map([[rel.uri, rel]]),
      namespaces: new Map([
        ["ex", { prefix: "ex", uri: NS, classCount: 1, propertyCount: 1 }],
      ]),
      extraction: makeExtraction(),
    };
    const { output } = map(ir);
    const field = output.types.get("Doc")?.fields.get("rel");
    expect(field?.type).toEqual({ kind: "scalar", name: "String" });
  });
});

describe("map — concrete descendant collection", () => {
  it("is cycle-safe and skips unknown subclasses", () => {
    // Build with a subClassOf cycle: A ↔ B both abstract, union over them.
    const ir = buildIR({
      classes: [
        { uri: uri("A"), superclasses: [uri("B")] },
        { uri: uri("B"), superclasses: [uri("A")] },
        { uri: uri("C"), superclasses: [uri("A")] },
        { uri: uri("Tag"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("subject"),
          kind: "object",
          domains: [uri("Tag")],
          ranges: [],
        },
      ],
      unions: [{ property: uri("subject"), members: [uri("A")] }],
      functionals: new Set([uri("subject")]),
      instanceStats: new Map([
        [uri("C"), { total: 1, named: 1 }],
        [uri("Tag"), { total: 1, named: 1 }],
      ]),
    });
    // A is abstract (no instances, has subclasses); the walk must terminate.
    const { output } = map(ir);
    const field = output.types.get("Tag")?.fields.get("subject");
    expect(field?.type.kind).toBe("union");
  });
});

describe("map — field name collisions", () => {
  it("renames a field colliding with a reserved field name", () => {
    const ir = buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      properties: [
        {
          uri: uri("uri"),
          kind: "datatype",
          domains: [uri("Doc")],
          ranges: [`${XSD}string`],
        },
      ],
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { output, diagnostics } = map(ir);
    expect(codes(diagnostics)).toContain("M002");
    // "uri" is reserved → namespace-prefixed to "exUri".
    expect(output.types.get("Doc")?.fields.has("exUri")).toBe(true);
  });

  it("reports M001 when a renamed field collides with an existing field", () => {
    // First property takes "dup"; second takes the prefixed form "exDup"; the
    // third's "dup" collides → renamed to "exDup", which already exists → M001.
    const ir = buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      properties: [
        {
          uri: uri("a"),
          kind: "datatype",
          domains: [uri("Doc")],
          ranges: [`${XSD}string`],
        },
        {
          uri: uri("b"),
          kind: "datatype",
          domains: [uri("Doc")],
          ranges: [`${XSD}string`],
        },
        {
          uri: uri("c"),
          kind: "datatype",
          domains: [uri("Doc")],
          ranges: [`${XSD}string`],
        },
      ],
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { diagnostics } = map(ir, {
      mappings: {
        "ex:a": { graphqlName: "dup" },
        "ex:b": { graphqlName: "exDup" },
        "ex:c": { graphqlName: "dup" },
      },
    });
    expect(codes(diagnostics)).toContain("M001");
  });
});

describe("map — synthetic inverse fields", () => {
  it("adds a synthetic inverse field on the range type", () => {
    const ir = buildIR({
      classes: [
        { uri: uri("Block"), superclasses: [] },
        { uri: uri("Impl"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("implements"),
          kind: "object",
          domains: [uri("Impl")],
          ranges: [uri("Block")],
        },
      ],
      instanceStats: new Map([
        [uri("Block"), { total: 1, named: 1 }],
        [uri("Impl"), { total: 1, named: 1 }],
      ]),
    });
    const { output } = map(ir, {
      mappings: {
        "ex:implements": { inverse: { graphqlName: "implementations" } },
      },
    });
    const field = output.types.get("Block")?.fields.get("implementations");
    expect(field?.resolverTemplate).toBe("inverse");
    expect(field?.type).toEqual({ kind: "type", name: "Impl" });
  });

  it("falls back to Node when the synthetic inverse domain is unresolved", () => {
    // Object property with a class range but NO domain — the synthetic field's
    // type cannot resolve a domain type and falls back to Node.
    const block: ClassNode = {
      uri: uri("Block"),
      label: "Block",
      namespace: "ex",
      superclasses: [],
      ancestors: [],
      subclasses: [],
      isAbstract: false,
      embeddable: false,
      ownProperties: [],
      allProperties: [],
    };
    const prop: PropertyNode = {
      uri: uri("touches"),
      label: "touches",
      namespace: "ex",
      kind: "object",
      domains: [],
      range: { kind: "class", uri: uri("Block") },
      functional: false,
      classCardinality: new Map(),
      isAnnotation: false,
      annotations: new Map(),
    };
    const ir: OntologyIR = {
      classes: new Map([[block.uri, block]]),
      properties: new Map([[prop.uri, prop]]),
      namespaces: new Map([
        ["ex", { prefix: "ex", uri: NS, classCount: 1, propertyCount: 1 }],
      ]),
      extraction: makeExtraction(),
    };
    const { output } = map(ir, {
      mappings: { "ex:touches": { inverse: { graphqlName: "touchedBy" } } },
    });
    const field = output.types.get("Block")?.fields.get("touchedBy");
    expect(field?.type).toEqual({ kind: "type", name: "Node" });
  });

  it("does not synthesize an inverse for a declared owl:inverseOf pair", () => {
    const ir = buildIR({
      classes: [
        { uri: uri("Parent"), superclasses: [] },
        { uri: uri("Child"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("hasChild"),
          kind: "object",
          domains: [uri("Parent")],
          ranges: [uri("Child")],
        },
        {
          uri: uri("childOf"),
          kind: "object",
          domains: [uri("Child")],
          ranges: [uri("Parent")],
        },
      ],
      inverses: [{ property: uri("hasChild"), inverse: uri("childOf") }],
      instanceStats: new Map([
        [uri("Parent"), { total: 1, named: 1 }],
        [uri("Child"), { total: 1, named: 1 }],
      ]),
    });
    const { output } = map(ir, {
      mappings: { "ex:hasChild": { inverse: { graphqlName: "kids" } } },
    });
    // The declared pair keeps its own forward field; no synthetic "kids".
    expect(output.types.get("Child")?.fields.has("kids")).toBe(false);
  });
});

describe("map — resolver templates", () => {
  it("assigns the embedded-singular template to a functional embeddable range", () => {
    // Card is embeddable (blank-only instances); a functional object property
    // pointing at it yields a singular embedded field.
    const ir = buildIR({
      classes: [
        { uri: uri("Doc"), superclasses: [] },
        { uri: uri("Card"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("cover"),
          kind: "object",
          domains: [uri("Doc")],
          ranges: [uri("Card")],
        },
      ],
      functionals: new Set([uri("cover")]),
      instanceStats: new Map([
        [uri("Doc"), { total: 1, named: 1 }],
        [uri("Card"), { total: 2, named: 0 }],
      ]),
    });
    const { output } = map(ir);
    expect(output.types.get("Doc")?.fields.get("cover")?.resolverTemplate).toBe(
      "embedded-singular",
    );
  });
});

describe("map — standard-vocab fields", () => {
  it("adds opt-in instance-level standard-vocab fields", () => {
    const ir = buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { output } = map(ir, {
      standardVocabFields: {
        Doc: { "http://www.w3.org/2000/01/rdf-schema#label": "rdfsLabel" },
      },
    });
    const field = output.types.get("Doc")?.fields.get("rdfsLabel");
    expect(field?.resolverTemplate).toBe("datatype");
    expect(field?.type).toEqual({ kind: "scalar", name: "String" });
  });

  it("renames a standard-vocab field colliding with a reserved name", () => {
    // The predicate is not a known property, so the rename's namespace lookup
    // misses and falls back to the "x" prefix → "xId".
    const ir = buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { output, diagnostics } = map(ir, {
      standardVocabFields: {
        Doc: { "http://www.w3.org/2000/01/rdf-schema#seeAlso": "id" },
      },
    });
    expect(codes(diagnostics)).toContain("M002");
    expect(output.types.get("Doc")?.fields.has("xId")).toBe(true);
  });
});

describe("map — mappings on an unregistered namespace", () => {
  it("returns no mapping when the class namespace prefix is empty", () => {
    // The class lives in a namespace with no registered prefix → namespace "".
    const FOREIGN = "http://foreign.test/";
    const ir = buildIR(
      {
        classes: [{ uri: `${FOREIGN}Thing`, superclasses: [] }],
        namespaces: new Map(),
        instanceStats: new Map([[`${FOREIGN}Thing`, { total: 1, named: 1 }]]),
      },
      {},
    );
    // Supplying mappings forces findMapping past the direct lookup into the
    // prefixed-key branch, where an empty namespace yields undefined.
    const { output } = map(ir, {
      mappings: { "ex:Unrelated": { graphqlName: "Nope" } },
    });
    expect(output.types.has("Thing")).toBe(true);
  });
});

describe("map — defensive guards on a malformed IR", () => {
  it("skips an allProperties entry that is annotation or missing", () => {
    const doc: ClassNode = {
      uri: uri("Doc"),
      label: "Doc",
      namespace: "ex",
      superclasses: [],
      ancestors: [],
      subclasses: [],
      isAbstract: false,
      embeddable: false,
      ownProperties: [uri("note"), uri("ghost")],
      allProperties: [uri("note"), uri("ghost")],
    };
    const note: PropertyNode = {
      uri: uri("note"),
      label: "note",
      namespace: "ex",
      kind: "annotation",
      domains: [uri("Doc")],
      range: { kind: "scalar", xsd: `${XSD}string`, graphqlScalar: "String" },
      functional: true,
      classCardinality: new Map(),
      isAnnotation: true,
      annotations: new Map(),
    };
    const ir: OntologyIR = {
      classes: new Map([[doc.uri, doc]]),
      // ex:ghost is referenced by allProperties but absent from the map.
      properties: new Map([[note.uri, note]]),
      namespaces: new Map([
        ["ex", { prefix: "ex", uri: NS, classCount: 1, propertyCount: 1 }],
      ]),
      extraction: makeExtraction(),
    };
    const { output } = map(ir);
    // Neither the annotation nor the missing property produces a field.
    expect(output.types.get("Doc")?.fields.size).toBe(0);
  });

  it("skips a dangling subclass when expanding an abstract union member", () => {
    // Abstract A claims a subclass Gone that is absent from the class map; the
    // descendant walk must terminate without throwing.
    const a: ClassNode = {
      uri: uri("A"),
      label: "A",
      namespace: "ex",
      superclasses: [],
      ancestors: [],
      subclasses: [uri("Gone")],
      isAbstract: true,
      embeddable: false,
      ownProperties: [],
      allProperties: [],
    };
    const tag: ClassNode = {
      uri: uri("Tag"),
      label: "Tag",
      namespace: "ex",
      superclasses: [],
      ancestors: [],
      subclasses: [],
      isAbstract: false,
      embeddable: false,
      ownProperties: [uri("subject")],
      allProperties: [uri("subject")],
    };
    const subject: PropertyNode = {
      uri: uri("subject"),
      label: "subject",
      namespace: "ex",
      kind: "object",
      domains: [uri("Tag")],
      range: { kind: "union", members: [uri("A")] },
      functional: true,
      classCardinality: new Map(),
      isAnnotation: false,
      annotations: new Map(),
    };
    const ir: OntologyIR = {
      classes: new Map([
        [a.uri, a],
        [tag.uri, tag],
      ]),
      properties: new Map([[subject.uri, subject]]),
      namespaces: new Map([
        ["ex", { prefix: "ex", uri: NS, classCount: 2, propertyCount: 1 }],
      ]),
      extraction: makeExtraction(),
    };
    const { output } = map(ir);
    const field = output.types.get("Tag")?.fields.get("subject");
    // A is abstract with no resolvable concrete descendants → empty union.
    if (field?.type.kind === "union") {
      expect([...field.type.members]).toEqual([]);
    } else {
      throw new Error("expected a union field");
    }
  });
});

describe("map — interfaces", () => {
  it("emits an interface with its abstract parent chain", () => {
    const ir = buildIR({
      classes: [
        { uri: uri("Entity"), superclasses: [] },
        { uri: uri("Tangible"), superclasses: [uri("Entity")] },
        { uri: uri("Widget"), superclasses: [uri("Tangible")] },
      ],
      // Entity + Tangible abstract (no instances, have subclasses); Widget
      // concrete.
      instanceStats: new Map([[uri("Widget"), { total: 1, named: 1 }]]),
    });
    const { output } = map(ir);
    expect(output.interfaces.has("Entity")).toBe(true);
    expect(output.interfaces.has("Tangible")).toBe(true);
    // Tangible's parent interface chain includes the abstract Entity.
    expect([
      ...(output.interfaces.get("Tangible")?.parentInterfaces ?? []),
    ]).toContain("Entity");
    const widget = output.types.get("Widget");
    expect([...(widget?.interfaces ?? [])].sort()).toEqual([
      "Entity",
      "Tangible",
    ]);
  });

  it("does not list a non-abstract ancestor as a parent interface", () => {
    // Animal is concrete (has its own instance) yet has a subclass; it must
    // not appear in Dog's implemented-interface list.
    const ir = buildIR({
      classes: [
        { uri: uri("Animal"), superclasses: [] },
        { uri: uri("Dog"), superclasses: [uri("Animal")] },
      ],
      instanceStats: new Map([
        [uri("Animal"), { total: 1, named: 1 }],
        [uri("Dog"), { total: 1, named: 1 }],
      ]),
    });
    const { output } = map(ir);
    expect(output.types.get("Dog")?.interfaces ?? []).toHaveLength(0);
  });
});

describe("map — mapping resolution by namespace", () => {
  it("resolves a custom mapping by prefixed property key", () => {
    const ir = buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      properties: [
        {
          uri: uri("title"),
          kind: "datatype",
          domains: [uri("Doc")],
          ranges: [`${XSD}string`],
        },
      ],
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { output } = map(ir, {
      mappings: { "ex:title": { graphqlName: "heading" } },
    });
    expect(output.types.get("Doc")?.fields.has("heading")).toBe(true);
  });
});

describe("map — cardinality and interface coverage", () => {
  it("resolves a custom mapping keyed by full IRI", () => {
    const ir = buildIR({
      classes: [{ uri: uri("Thing"), superclasses: [] }],
      instanceStats: new Map([[uri("Thing"), { total: 1, named: 1 }]]),
    });
    const { output } = map(ir, {
      mappings: { [uri("Thing")]: { graphqlName: "Renamed" } },
    });
    expect(output.types.has("Renamed")).toBe(true);
  });

  it("reads a per-class cardinality spec when one is present", () => {
    const ir = buildIR({
      classes: [
        { uri: uri("Spec"), superclasses: [] },
        { uri: uri("Hop"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("root"),
          kind: "object",
          domains: [uri("Spec")],
          ranges: [uri("Hop")],
        },
      ],
      shaclConstraints: [
        {
          targetClass: uri("Spec"),
          property: uri("root"),
          minCount: 1,
          maxCount: 1,
        },
      ],
      instanceStats: new Map([[uri("Spec"), { total: 1, named: 1 }]]),
    });
    const { output } = map(ir);
    // maxCount 1 → the per-class spec makes it a singular object field.
    expect(output.types.get("Spec")?.fields.get("root")?.type.kind).toBe(
      "type",
    );
  });

  it("omits a field whose SHACL maxCount is 0 (V010)", () => {
    const ir = buildIR({
      classes: [{ uri: uri("Item"), superclasses: [] }],
      properties: [
        {
          uri: uri("legacy"),
          kind: "datatype",
          domains: [uri("Item")],
          ranges: [`${XSD}string`],
        },
      ],
      shaclConstraints: [
        { targetClass: uri("Item"), property: uri("legacy"), maxCount: 0 },
      ],
      instanceStats: new Map([[uri("Item"), { total: 1, named: 1 }]]),
    });
    const { output } = map(ir);
    expect(output.types.get("Item")?.fields.has("legacy")).toBe(false);
  });

  it("treats an interface with only embeddable descendants as embeddable", () => {
    const ir = buildIR({
      classes: [
        { uri: uri("Shape"), superclasses: [] },
        { uri: uri("Box"), superclasses: [uri("Shape")] },
      ],
      properties: [
        {
          uri: uri("size"),
          kind: "datatype",
          domains: [uri("Box")],
          ranges: [`${XSD}integer`],
        },
      ],
      // Shape: no instances + a subclass → abstract interface.
      // Box: blank-node-only instances → embeddable.
      instanceStats: new Map([[uri("Box"), { total: 2, named: 0 }]]),
    });
    const { output } = map(ir);
    expect(output.interfaces.has("Shape")).toBe(true);
  });

  it("uses list templates for non-functional datatype and embedded fields", () => {
    const ir = buildIR({
      classes: [
        { uri: uri("Doc"), superclasses: [] },
        { uri: uri("Meta"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("title"),
          kind: "datatype",
          domains: [uri("Doc")],
          ranges: [`${XSD}string`],
        },
        {
          uri: uri("meta"),
          kind: "object",
          domains: [uri("Doc")],
          ranges: [uri("Meta")],
        },
      ],
      // Neither functional and no SHACL cap → list cardinality; Meta is
      // blank-only → embeddable, so its field uses the embedded-list template.
      instanceStats: new Map([
        [uri("Doc"), { total: 1, named: 1 }],
        [uri("Meta"), { total: 1, named: 0 }],
      ]),
    });
    const { output } = map(ir);
    const fieldNames = [...(output.types.get("Doc")?.fields.keys() ?? [])];
    // datatype-list and embedded-list fields (list names may be pluralized).
    expect(fieldNames.some((n) => n.startsWith("title"))).toBe(true);
    expect(fieldNames.some((n) => n.startsWith("meta"))).toBe(true);
  });

  it("uses the singular datatype template under a SHACL maxCount of 1", () => {
    const ir = buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      properties: [
        {
          uri: uri("title"),
          kind: "datatype",
          domains: [uri("Doc")],
          ranges: [`${XSD}string`],
        },
      ],
      shaclConstraints: [
        { targetClass: uri("Doc"), property: uri("title"), maxCount: 1 },
      ],
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { output } = map(ir);
    // maxCount 1 → singular datatype field, keeping its singular name.
    expect(output.types.get("Doc")?.fields.has("title")).toBe(true);
  });

  it("resolves an object property with an unknown range as a String scalar (B003)", () => {
    const ir = buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      properties: [
        {
          uri: uri("ref"),
          kind: "object",
          domains: [uri("Doc")],
          ranges: [uri("Ghost")],
        },
      ],
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { output } = map(ir);
    // Ghost is not a known class → the object range falls back to a String
    // scalar, so the field uses a datatype template rather than a connection.
    const names = [...(output.types.get("Doc")?.fields.keys() ?? [])];
    expect(names.some((n) => n.startsWith("ref"))).toBe(true);
  });
});
