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
} from "../shared/index.js";
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
  graphqlAnnotations: [],
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
    const m004 = diagnostics.filter((d) => d.code === "M004");
    expect(m004).toHaveLength(1);
    // The reserved-name case keeps its own message: there is no prior class
    // to name, and the claimant really is the compiler.
    expect(m004[0]?.message).toContain("collides with a reserved name");
    expect(m004[0]?.message).toContain("ExQuery");
    expect(output.types.has("ExQuery")).toBe(true);
  });

  it("M004 names BOTH class IRIs when the prior claimant is a mapped class", () => {
    // Same local name in two namespaces: the first registers `Doc`, the second
    // is auto-renamed to `DsDoc`. Reporting that as "collides with a reserved
    // name" sends the reader hunting for a reserved word that is not there —
    // the actual claimant is their own other class, so name both IRIs.
    const OTHER = "https://ds.canonical.com/";
    const ir = buildIR({
      classes: [
        { uri: uri("Doc"), superclasses: [] },
        { uri: `${OTHER}Doc`, superclasses: [] },
      ],
      namespaces: new Map([
        [NS, "ex"],
        [OTHER, "ds"],
      ]),
      instanceStats: new Map([
        [uri("Doc"), { total: 1, named: 1 }],
        [`${OTHER}Doc`, { total: 1, named: 1 }],
      ]),
    });
    const { output, diagnostics } = map(ir);
    const m004 = diagnostics.filter((d) => d.code === "M004");
    expect(m004).toHaveLength(1);
    expect(m004[0]?.severity).toBe("info");
    expect(m004[0]?.message).toContain(uri("Doc"));
    expect(m004[0]?.message).toContain(`${OTHER}Doc`);
    expect(m004[0]?.message).toContain("DsDoc");
    expect(m004[0]?.message).not.toContain("reserved");
    // Both classes survive — the rename is an auto-resolution, not a drop.
    expect(output.types.has("Doc")).toBe(true);
    expect(output.types.has("DsDoc")).toBe(true);
  });

  it("sanitizes a dashed Turtle prefix in the M004 rename", () => {
    // The M004 auto-rename composes the namespace prefix into the type name;
    // a raw "ds-global" would mint the illegal "Ds-globalQuery".
    const DASHED = "http://dashed.example/";
    const ir = buildIR({
      classes: [{ uri: `${DASHED}Query`, superclasses: [] }],
      namespaces: new Map([[DASHED, "ds-global"]]),
      instanceStats: new Map([[`${DASHED}Query`, { total: 1, named: 1 }]]),
    });
    const { output, diagnostics } = map(ir);
    expect(codes(diagnostics)).toContain("M004");
    expect(output.types.has("DsGlobalQuery")).toBe(true);
  });

  it("M001 names BOTH class IRIs and DROPS the later class (not registered)", () => {
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
    const { output, diagnostics } = map(ir, {
      mappings: {
        "ex:A": { graphqlName: "Dup" },
        "ex:B": { graphqlName: "Dup" },
      },
    });
    const m001 = diagnostics.filter((d) => d.code === "M001");
    expect(m001).toHaveLength(1);
    const [diagnostic] = m001;
    expect(diagnostic?.severity).toBe("error");
    // aligned with the field-level policy: both IRIs, the drop, the remedy
    expect(diagnostic?.message).toContain(uri("A"));
    expect(diagnostic?.message).toContain(uri("B"));
    expect(diagnostic?.message).toContain("DROPPED");
    expect(diagnostic?.message).toContain("graphqlName");
    // The FIRST class keeps the name; the second is gone entirely — it does
    // not overwrite the first at types.set and never enters the name map.
    expect(output.types.get("Dup")?.owlUri).toBe(uri("A"));
    expect([...output.types.values()].some((t) => t.owlUri === uri("B"))).toBe(
      false,
    );
    expect(output.nameMap.toOWL("Dup")).toBe(uri("A"));
  });

  it("DROPS a class custom-mapped onto a compiler-reserved type name", () => {
    const ir = buildIR({
      classes: [{ uri: uri("A"), superclasses: [] }],
      instanceStats: new Map([[uri("A"), { total: 1, named: 1 }]]),
    });
    // A custom graphqlName skips the M004 auto-rename, so the reserved name
    // collides directly — there is no first CLASS to blame, only the
    // compiler's own name.
    const { output, diagnostics } = map(ir, {
      mappings: { "ex:A": { graphqlName: "Query" } },
    });
    const m001 = diagnostics.filter((d) => d.code === "M001");
    expect(m001).toHaveLength(1);
    expect(m001[0]?.message).toContain("compiler-reserved");
    expect(m001[0]?.message).toContain(uri("A"));
    expect(output.types.size).toBe(0);
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
      graphql: {
        classes: new Map(),
        properties: new Map(),
        prefixes: new Map(),
      },
      extraction: makeExtraction(),
    };
    const { output } = map(ir);
    const field = output.types.get("Doc")?.fields.get("rel");
    expect(field?.type).toEqual({ kind: "scalar", name: "String" });
  });
});

describe("map — anonymous union name occupancy (M006)", () => {
  /**
   * Two properties with the same LOCAL name on different types, each with an
   * anonymous union range: both synthesize the name "SubjectUnion".
   */
  const twoSubjectProperties = (membersA: string[], membersB: string[]) =>
    buildIR({
      classes: [
        { uri: uri("Doc1"), superclasses: [] },
        { uri: uri("Doc2"), superclasses: [] },
        { uri: uri("Cat"), superclasses: [] },
        { uri: uri("Dog"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("v1#subject"),
          kind: "object",
          domains: [uri("Doc1")],
          ranges: [],
        },
        {
          uri: uri("v2#subject"),
          kind: "object",
          domains: [uri("Doc2")],
          ranges: [],
        },
      ],
      unions: [
        { property: uri("v1#subject"), members: membersA },
        { property: uri("v2#subject"), members: membersB },
      ],
      functionals: new Set([uri("v1#subject"), uri("v2#subject")]),
      instanceStats: new Map([
        [uri("Doc1"), { total: 1, named: 1 }],
        [uri("Doc2"), { total: 1, named: 1 }],
        [uri("Cat"), { total: 1, named: 1 }],
        [uri("Dog"), { total: 1, named: 1 }],
      ]),
    });

  it("errors when one union name is minted with two DIFFERENT member sets", () => {
    const ir = twoSubjectProperties([uri("Cat")], [uri("Dog")]);
    const { output, diagnostics } = map(ir);
    const m006 = diagnostics.filter((d) => d.code === "M006");
    expect(m006).toHaveLength(1);
    const [diagnostic] = m006;
    expect(diagnostic?.severity).toBe("error");
    // names BOTH minting property IRIs
    expect(diagnostic?.message).toContain(uri("v1#subject"));
    expect(diagnostic?.message).toContain(uri("v2#subject"));
    expect(diagnostic?.message).toContain("SubjectUnion");
    // first registration wins; the later definition is dropped, not merged
    expect([...(output.unions.get("SubjectUnion")?.members ?? [])]).toEqual([
      "Cat",
    ]);
  });

  it("shares one union silently when the member sets are identical", () => {
    const ir = twoSubjectProperties(
      [uri("Cat"), uri("Dog")],
      [uri("Dog"), uri("Cat")], // same set, different declaration order
    );
    const { output, diagnostics } = map(ir);
    expect(diagnostics.filter((d) => d.code === "M006")).toHaveLength(0);
    // one union, one info diagnostic — exactly the pre-existing behavior
    expect(diagnostics.filter((d) => d.code === "X003")).toHaveLength(1);
    expect(output.unions.size).toBe(1);
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

describe("map — structural field collisions (M005)", () => {
  const docWith = (locals: string[]) =>
    buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      properties: locals.map((local) => ({
        uri: uri(local),
        kind: "datatype" as const,
        domains: [uri("Doc")],
        ranges: [`${XSD}string`],
      })),
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });

  it("DROPS a property claiming `uri` and names the IRI and both remedies", () => {
    const { output, diagnostics } = map(docWith(["uri"]));
    const m005 = diagnostics.filter((d) => d.code === "M005");
    expect(m005).toHaveLength(1);
    const [diagnostic] = m005;
    expect(diagnostic?.severity).toBe("error");
    expect(diagnostic?.source).toBe(uri("uri"));
    expect(diagnostic?.message).toContain(uri("uri"));
    expect(diagnostic?.message).toContain("Doc.uri");
    expect(diagnostic?.message).toContain("graphqlName");
    expect(diagnostic?.message).toContain('prefixing: "all"');
    // Neither kept NOR renamed: the field is gone, and no silent `exUri`
    // survives to make the drop look like a rename.
    const fields = output.types.get("Doc")?.fields;
    expect(fields?.has("uri")).toBe(false);
    expect(fields?.has("exUri")).toBe(false);
    expect(fields?.size).toBe(0);
  });

  it("DROPS a property claiming `_meta` too", () => {
    const { output, diagnostics } = map(docWith(["_meta"]));
    expect(diagnostics.filter((d) => d.code === "M005")).toHaveLength(1);
    expect(output.types.get("Doc")?.fields.size).toBe(0);
  });

  it("leaves the former reserved names free for the ontology to use", () => {
    // label/comment/definition/kind/id moved behind _meta (or were deleted), so
    // an ontology declaring them keeps its OWN names — no rename, no diagnostic.
    const { output, diagnostics } = map(
      docWith(["label", "comment", "definition", "kind", "id", "description"]),
    );
    expect(diagnostics.filter((d) => d.code === "M005")).toHaveLength(0);
    expect(diagnostics.filter((d) => d.code === "M002")).toHaveLength(0);
    const fields = output.types.get("Doc")?.fields;
    for (const name of [
      "label",
      "comment",
      "definition",
      "kind",
      "id",
      "description",
    ]) {
      expect(fields?.has(name)).toBe(true);
    }
  });

  it("reserves only `_meta` on an embeddable class — it has no uri to shadow", () => {
    const ir = buildIR({
      classes: [{ uri: uri("Card"), superclasses: [] }],
      properties: [
        {
          uri: uri("uri"),
          kind: "datatype",
          domains: [uri("Card")],
          ranges: [`${XSD}string`],
        },
      ],
      // blank-node-only instances → embeddable
      instanceStats: new Map([[uri("Card"), { total: 2, named: 0 }]]),
    });
    const { output, diagnostics } = map(ir);
    expect(diagnostics.filter((d) => d.code === "M005")).toHaveLength(0);
    expect(output.types.get("Card")?.fields.has("uri")).toBe(true);
  });

  it("guards an abstract class by its IMPLEMENTORS, not its own embeddable flag (direction A)", () => {
    // Media: all-blank instances (embeddable flag true) but forced abstract,
    // with a concrete NON-embeddable subclass Film. The interface's actual
    // structural surface follows the implementors — Film keeps Node
    // membership, so the interface gets uri: ID! — and an ontology property
    // named `uri` must be M005-dropped, or it would shadow the injected
    // uri: ID! in the Pass 6 merge and crash validateSchema (C003).
    const ir = buildIR(
      {
        classes: [
          { uri: uri("Media"), superclasses: [] },
          { uri: uri("Film"), superclasses: [uri("Media")] },
        ],
        properties: [
          {
            uri: uri("uri"),
            kind: "datatype",
            domains: [uri("Media")],
            ranges: [`${XSD}string`],
          },
        ],
        instanceStats: new Map([
          [uri("Media"), { total: 2, named: 0 }], // blank-only → embeddable
          [uri("Film"), { total: 1, named: 1 }], // named → NOT embeddable
        ]),
      },
      { "ex:Media": { abstract: true } },
    );
    const { output, diagnostics } = map(ir);
    const m005 = diagnostics.filter((d) => d.code === "M005");
    // dropped from the interface AND from the inheriting concrete Film
    expect(m005.some((d) => d.message.includes("Media.uri"))).toBe(true);
    expect(m005.some((d) => d.message.includes("Film.uri"))).toBe(true);
    expect(output.interfaces.get("Media")?.fields.has("uri")).toBe(false);
    expect(output.types.get("Film")?.fields.has("uri")).toBe(false);
  });

  it("protects only `_meta` on an abstract class whose implementors are all embeddable (direction B)", () => {
    // Section: auto-abstract (no instances, has a subclass) so its own
    // embeddable flag is FALSE — but its only concrete implementor Card is
    // embeddable, so the interface gets `_meta` alone and never injects
    // `uri`. A property named `uri` must SURVIVE on the interface (and on
    // Card); only a property named `_meta` is a true structural collision.
    const ir = buildIR({
      classes: [
        { uri: uri("Section"), superclasses: [] },
        { uri: uri("Card"), superclasses: [uri("Section")] },
      ],
      properties: [
        {
          uri: uri("uri"),
          kind: "datatype",
          domains: [uri("Section")],
          ranges: [`${XSD}string`],
        },
        {
          uri: uri("_meta"),
          kind: "datatype",
          domains: [uri("Section")],
          ranges: [`${XSD}string`],
        },
      ],
      instanceStats: new Map([[uri("Card"), { total: 2, named: 0 }]]),
    });
    const { output, diagnostics } = map(ir);
    const m005 = diagnostics.filter((d) => d.code === "M005");
    // no false M005 for `uri` — the interface never gets a structural uri
    expect(m005.some((d) => d.message.includes(".uri"))).toBe(false);
    // `_meta` is still owned by the compiler on both containers
    expect(m005.every((d) => d.message.includes("._meta"))).toBe(true);
    expect(m005).toHaveLength(2);
    expect(output.interfaces.get("Section")?.fields.has("uri")).toBe(true);
    expect(output.types.get("Card")?.fields.has("uri")).toBe(true);
  });
});

describe("map — duplicate field collisions (M001)", () => {
  it("DROPS the second property and names BOTH IRIs and both remedies", () => {
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
      ],
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { output, diagnostics } = map(ir, {
      mappings: {
        "ex:a": { graphqlName: "dup" },
        "ex:b": { graphqlName: "dup" },
      },
    });
    const m001 = diagnostics.filter((d) => d.code === "M001");
    expect(m001).toHaveLength(1);
    const [diagnostic] = m001;
    expect(diagnostic?.severity).toBe("error");
    expect(diagnostic?.message).toContain(uri("a"));
    expect(diagnostic?.message).toContain(uri("b"));
    expect(diagnostic?.message).toContain("Doc.dup");
    expect(diagnostic?.message).toContain("graphqlName");
    expect(diagnostic?.message).toContain('prefixing: "all"');
    // The FIRST property keeps the name; the second is dropped, not renamed.
    const fields = output.types.get("Doc")?.fields;
    expect(fields?.get("dup")?.owlUri).toBe(uri("a"));
    expect(fields?.has("exDup")).toBe(false);
    expect(fields?.size).toBe(1);
  });
});

describe('map — prefixing: "all"', () => {
  it("resolves a structural collision schema-wide with ZERO diagnostics", () => {
    // The very input that produces M005 above compiles clean under prefixing.
    const ir = buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      properties: [
        {
          uri: uri("uri"),
          kind: "datatype",
          domains: [uri("Doc")],
          ranges: [`${XSD}string`],
        },
        {
          uri: uri("title"),
          kind: "datatype",
          domains: [uri("Doc")],
          ranges: [`${XSD}string`],
        },
      ],
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { output, diagnostics } = map(ir, { prefixing: "all" });
    expect(diagnostics).toHaveLength(0);
    const fields = output.types.get("Doc")?.fields;
    // EVERY field is prefixed, not only the colliding one
    expect(fields?.has("exUri")).toBe(true);
    expect(fields?.has("exTitle")).toBe(true);
    expect(fields?.has("uri")).toBe(false);
    expect(fields?.has("title")).toBe(false);
  });

  it("resolves a CROSS-namespace field collision: both fields survive, prefixed", () => {
    // ex:name and ds:name are two different properties on one class that both
    // want the field `name`. Their prefixes differ, so prefixing separates
    // them — this is the case the remedy string promises.
    const OTHER = "https://ds.canonical.com/";
    const crossNamespaceIR = () =>
      buildIR({
        classes: [{ uri: uri("Doc"), superclasses: [] }],
        properties: [
          {
            uri: uri("name"),
            kind: "datatype",
            domains: [uri("Doc")],
            ranges: [`${XSD}string`],
          },
          {
            uri: `${OTHER}name`,
            kind: "datatype",
            domains: [uri("Doc")],
            ranges: [`${XSD}string`],
          },
        ],
        namespaces: new Map([
          [NS, "ex"],
          [OTHER, "ds"],
        ]),
        instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
      });

    // Baseline: the collision is real under the default policy.
    expect(codes(map(crossNamespaceIR()).diagnostics)).toContain("M001");

    const { output, diagnostics } = map(crossNamespaceIR(), {
      prefixing: "all",
    });
    expect(codes(diagnostics)).not.toContain("M001");
    const fields = output.types.get("Doc")?.fields;
    expect(fields?.has("exName")).toBe(true);
    expect(fields?.has("dsName")).toBe(true);
    expect(fields?.has("name")).toBe(false);
  });

  it("does NOT resolve a SAME-namespace field collision: M001 survives", () => {
    // ex:name and ex:hasName both strip to `name` and both take the `ex`
    // prefix, so prefixing renames them onto ONE name all over again. The
    // remedy string must not promise otherwise — only a mappings rename
    // separates these two.
    const ir = buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      properties: [
        {
          uri: uri("name"),
          kind: "datatype",
          domains: [uri("Doc")],
          ranges: [`${XSD}string`],
        },
        {
          uri: uri("hasName"),
          kind: "datatype",
          domains: [uri("Doc")],
          ranges: [`${XSD}string`],
        },
      ],
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { output, diagnostics } = map(ir, { prefixing: "all" });
    const m001 = diagnostics.filter((d) => d.code === "M001");
    expect(m001).toHaveLength(1);
    expect(m001[0]?.severity).toBe("error");
    expect(m001[0]?.message).toContain("Doc.exName");
    expect(m001[0]?.message).toContain(uri("name"));
    expect(m001[0]?.message).toContain(uri("hasName"));
    // …and the message says so, rather than pointing at prefixing as the fix.
    expect(m001[0]?.message).toContain("different namespaces");
    // One field kept, the second dropped — exactly as under prefixing "none".
    const fields = output.types.get("Doc")?.fields;
    expect(fields?.get("exName")?.owlUri).toBe(uri("name"));
    expect(fields?.size).toBe(1);
  });

  it("never prefixes an explicit graphqlName", () => {
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
      prefixing: "all",
      mappings: { "ex:title": { graphqlName: "heading" } },
    });
    expect(output.types.get("Doc")?.fields.has("heading")).toBe(true);
  });

  it("sanitizes a dashed Turtle prefix into the composed field name", () => {
    // "ds-global" is a legal Turtle prefix but "-" is illegal in a GraphQL
    // name: raw concatenation would mint "ds-globalTitle" AFTER the field
    // part was already sanitized, smuggling the dash into the schema.
    const DASHED = "http://dashed.example/";
    const ir = buildIR({
      classes: [{ uri: `${DASHED}Doc`, superclasses: [] }],
      properties: [
        {
          uri: `${DASHED}title`,
          kind: "datatype",
          domains: [`${DASHED}Doc`],
          ranges: [`${XSD}string`],
        },
      ],
      namespaces: new Map([[DASHED, "ds-global"]]),
      instanceStats: new Map([[`${DASHED}Doc`, { total: 1, named: 1 }]]),
    });
    const { output } = map(ir, { prefixing: "all" });
    const fields = output.types.get("Doc")?.fields;
    expect(fields?.has("dsGlobalTitle")).toBe(true);
    expect(fields?.has("ds-globalTitle")).toBe(false);
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
      graphql: {
        classes: new Map(),
        properties: new Map(),
        prefixes: new Map(),
      },
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

  it("keeps a standard-vocab field named `label` — the README example is now true", () => {
    // `label` moved behind _meta, so nothing reserves it any more: the
    // documented mapping finally produces the documented field name.
    const ir = buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { output, diagnostics } = map(ir, {
      standardVocabFields: {
        Doc: { "http://www.w3.org/2000/01/rdf-schema#label": "label" },
      },
    });
    expect(diagnostics).toHaveLength(0);
    expect(output.types.get("Doc")?.fields.has("label")).toBe(true);
  });

  it("DROPS a standard-vocab field claiming a structural name (M005)", () => {
    const ir = buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { output, diagnostics } = map(ir, {
      standardVocabFields: {
        Doc: { "http://www.w3.org/2000/01/rdf-schema#seeAlso": "uri" },
      },
    });
    expect(codes(diagnostics)).toContain("M005");
    expect(output.types.get("Doc")?.fields.size).toBe(0);
  });

  it('prefixes a standard-vocab field under prefixing: "all", falling back to "x"', () => {
    // The predicate is not a known ontology property, so the namespace lookup
    // misses and the "x" fallback fires → "xLabel".
    const ir = buildIR({
      classes: [{ uri: uri("Doc"), superclasses: [] }],
      instanceStats: new Map([[uri("Doc"), { total: 1, named: 1 }]]),
    });
    const { output } = map(ir, {
      prefixing: "all",
      standardVocabFields: {
        Doc: { "http://www.w3.org/2000/01/rdf-schema#label": "label" },
      },
    });
    expect(output.types.get("Doc")?.fields.has("xLabel")).toBe(true);
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
      graphql: {
        classes: new Map(),
        properties: new Map(),
        prefixes: new Map(),
      },
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
      graphql: {
        classes: new Map(),
        properties: new Map(),
        prefixes: new Map(),
      },
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

  it("makes an embeddable type implement its all-embeddable interface", () => {
    // Shape: no instances + a subclass → abstract interface. Box: its only
    // concrete descendant, blank-node-only → embeddable. The interface is thus
    // embeddable, so the embeddable Box DOES implement it.
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
      instanceStats: new Map([[uri("Box"), { total: 2, named: 0 }]]),
    });
    const { output } = map(ir);
    expect(output.interfaces.has("Shape")).toBe(true);
    expect(output.types.get("Box")?.interfaces).toContain("Shape");
  });

  it("drops the interface from an embeddable type when a sibling is named", () => {
    // Adding a named (non-embeddable) Card under Shape makes the interface
    // non-embeddable: the embeddable Box no longer implements it (it would have
    // no uri/_meta), but the non-embeddable Card still does.
    const ir = buildIR({
      classes: [
        { uri: uri("Shape"), superclasses: [] },
        { uri: uri("Box"), superclasses: [uri("Shape")] },
        { uri: uri("Card"), superclasses: [uri("Shape")] },
      ],
      properties: [
        {
          uri: uri("size"),
          kind: "datatype",
          domains: [uri("Box")],
          ranges: [`${XSD}integer`],
        },
        {
          uri: uri("label"),
          kind: "datatype",
          domains: [uri("Card")],
          ranges: [`${XSD}string`],
        },
      ],
      instanceStats: new Map([
        [uri("Box"), { total: 2, named: 0 }], // embeddable
        [uri("Card"), { total: 2, named: 2 }], // named → not embeddable
      ]),
    });
    const { output } = map(ir);
    expect(output.types.get("Box")?.interfaces ?? []).not.toContain("Shape");
    expect(output.types.get("Card")?.interfaces).toContain("Shape");
  });

  it("picks templates by cardinality: datatype defaults singular, object list embedded", () => {
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
      // Datatype properties default to singular (so `title` is a singular
      // datatype field); the non-functional object to the blank-only (=>
      // embeddable) Meta is a list → embedded-list (pluralized to `metas`).
      instanceStats: new Map([
        [uri("Doc"), { total: 1, named: 1 }],
        [uri("Meta"), { total: 1, named: 0 }],
      ]),
    });
    const { output } = map(ir);
    const fields = output.types.get("Doc")?.fields;
    expect(fields?.get("title")?.resolverTemplate).toBe("datatype");
    expect(fields?.get("metas")?.resolverTemplate).toBe("embedded-list");
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
    // maxCount 1 → singular datatype template (not the list variant).
    expect(output.types.get("Doc")?.fields.get("title")?.resolverTemplate).toBe(
      "datatype",
    );
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
    // scalar, so the (pluralized, non-functional list) field resolves as a
    // datatype-list of strings, not a connection.
    const refs = output.types.get("Doc")?.fields.get("refs");
    expect(refs?.type).toEqual({ kind: "scalar", name: "String" });
    expect(refs?.resolverTemplate).toBe("datatype-list");
  });
});
