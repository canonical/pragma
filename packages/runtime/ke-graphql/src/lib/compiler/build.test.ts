// =============================================================================
// Pass 2 — Build unit tests. Crafted RawExtraction inputs drive the branches
// the fixture pipeline does not reach: subClassOf cycles, every resolveRange
// arm, the sh:or merge corners, asymmetric inverse completion, domainless
// assignment, and standard-vocab namespace filtering.
// =============================================================================

import { describe, expect, it } from "vitest";
import {
  GRAPHQL_TERMS,
  type RawExtraction,
  type RawProperty,
  type RawShaclConstraint,
  XSD,
} from "../shared/index.js";
import build from "./build.js";

const NS = "http://example.org/";
const uri = (local: string) => `${NS}${local}`;

/** A RawExtraction with empty defaults; spread in only the parts under test. */
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

const datatypeProp = (
  local: string,
  overrides: Partial<RawProperty> = {},
): RawProperty => ({
  uri: uri(local),
  kind: "datatype",
  domains: [uri("Thing")],
  ranges: [`${XSD}string`],
  ...overrides,
});

describe("build — class graph", () => {
  it("detects a subClassOf cycle and emits B001 with an empty ancestor set", () => {
    const extraction = makeExtraction({
      classes: [
        { uri: uri("A"), superclasses: [uri("B")] },
        { uri: uri("B"), superclasses: [uri("A")] },
      ],
    });
    const { output, diagnostics } = build(extraction);
    expect(diagnostics.map((d) => d.code)).toContain("B001");
    // The cycle short-circuits the recursion so the stack never overflows;
    // each class still records its direct parent as an ancestor.
    expect(output.classes.get(uri("A"))?.ancestors).toContain(uri("B"));
    expect(output.classes.get(uri("B"))?.ancestors).toContain(uri("A"));
  });

  it("orders a diamond's closure most specific first, deduped", () => {
    // A → {B, C}; both B and C → D. D (distance 2) appears once, and after
    // the distance-1 parents B and C — the pre-order DFS would interleave it
    // as [B, D, C], violating the "most specific first" ancestor contract.
    const extraction = makeExtraction({
      classes: [
        { uri: uri("A"), superclasses: [uri("B"), uri("C")] },
        { uri: uri("B"), superclasses: [uri("D")] },
        { uri: uri("C"), superclasses: [uri("D")] },
        { uri: uri("D"), superclasses: [] },
      ],
    });
    const { output } = build(extraction);
    const ancestors = output.classes.get(uri("A"))?.ancestors ?? [];
    expect(ancestors.filter((a) => a === uri("D"))).toHaveLength(1);
    expect(ancestors).toEqual([uri("B"), uri("C"), uri("D")]);
  });

  it("orders a deeper diamond by ascending distance across two levels", () => {
    // A → {B, C}; B → D; C → E; D,E → F. Distance-1 {B,C} precede
    // distance-2 {D,E}, which precede distance-3 {F}; F is deduped.
    const extraction = makeExtraction({
      classes: [
        { uri: uri("A"), superclasses: [uri("B"), uri("C")] },
        { uri: uri("B"), superclasses: [uri("D")] },
        { uri: uri("C"), superclasses: [uri("E")] },
        { uri: uri("D"), superclasses: [uri("F")] },
        { uri: uri("E"), superclasses: [uri("F")] },
        { uri: uri("F"), superclasses: [] },
      ],
    });
    const { output } = build(extraction);
    const ancestors = output.classes.get(uri("A"))?.ancestors ?? [];
    expect(ancestors).toEqual([
      uri("B"),
      uri("C"),
      uri("D"),
      uri("E"),
      uri("F"),
    ]);
  });

  it("dedupes a directly-repeated superclass", () => {
    const extraction = makeExtraction({
      classes: [
        { uri: uri("A"), superclasses: [uri("B"), uri("B")] },
        { uri: uri("B"), superclasses: [] },
      ],
    });
    const { output } = build(extraction);
    expect(output.classes.get(uri("A"))?.ancestors).toEqual([uri("B")]);
  });

  it("skips cross-vocabulary superclasses missing from the class map", () => {
    const extraction = makeExtraction({
      classes: [
        { uri: uri("A"), superclasses: [uri("Missing"), uri("B")] },
        { uri: uri("B"), superclasses: [] },
      ],
    });
    const { output } = build(extraction);
    expect(output.classes.get(uri("A"))?.ancestors).toEqual([uri("B")]);
  });
});

describe("build — abstract and embeddable detection", () => {
  it("marks a class with no instances and subclasses abstract", () => {
    const extraction = makeExtraction({
      classes: [
        { uri: uri("Base"), superclasses: [] },
        { uri: uri("Leaf"), superclasses: [uri("Base")] },
      ],
      instanceStats: new Map([[uri("Leaf"), { total: 1, named: 1 }]]),
    });
    const { output } = build(extraction);
    expect(output.classes.get(uri("Base"))?.isAbstract).toBe(true);
    expect(output.classes.get(uri("Leaf"))?.isAbstract).toBe(false);
  });

  it("marks a blank-only class embeddable", () => {
    const extraction = makeExtraction({
      classes: [{ uri: uri("Embed"), superclasses: [] }],
      instanceStats: new Map([[uri("Embed"), { total: 2, named: 0 }]]),
    });
    const { output } = build(extraction);
    expect(output.classes.get(uri("Embed"))?.embeddable).toBe(true);
  });

  it("honors custom abstract/embeddable mapping overrides", () => {
    const extraction = makeExtraction({
      classes: [{ uri: uri("Thing"), superclasses: [] }],
      instanceStats: new Map([[uri("Thing"), { total: 3, named: 3 }]]),
    });
    const { output } = build(extraction, {
      "ex:Thing": { abstract: true, embeddable: true },
    });
    expect(output.classes.get(uri("Thing"))?.isAbstract).toBe(true);
    expect(output.classes.get(uri("Thing"))?.embeddable).toBe(true);
  });
});

describe("build — resolveRange", () => {
  const classes = [{ uri: uri("Thing"), superclasses: [] }];

  it("resolves an anonymous range union by property", () => {
    const extraction = makeExtraction({
      classes,
      properties: [datatypeProp("rel", { kind: "object", ranges: [] })],
      unions: [{ property: uri("rel"), members: [uri("Thing")] }],
    });
    const { output } = build(extraction);
    expect(output.properties.get(uri("rel"))?.range).toEqual({
      kind: "union",
      members: [uri("Thing")],
    });
  });

  it("falls back to String when a property has no declared range", () => {
    const extraction = makeExtraction({
      classes,
      properties: [datatypeProp("loose", { ranges: [] })],
    });
    expect(output(extraction, "loose").range).toEqual({
      kind: "scalar",
      xsd: `${XSD}string`,
      graphqlScalar: "String",
    });
  });

  it("resolves a custom datatype to its declared base scalar", () => {
    const extraction = makeExtraction({
      classes,
      properties: [datatypeProp("v", { ranges: [uri("Version")] })],
      datatypes: [{ uri: uri("Version"), baseType: `${XSD}integer` }],
    });
    expect(output(extraction, "v").range).toEqual({
      kind: "scalar",
      xsd: `${XSD}integer`,
      graphqlScalar: "Int",
      customDatatype: uri("Version"),
    });
  });

  it("defaults a custom datatype with no base type to String", () => {
    const extraction = makeExtraction({
      classes,
      properties: [datatypeProp("v", { ranges: [uri("Opaque")] })],
      datatypes: [{ uri: uri("Opaque") }],
    });
    expect(output(extraction, "v").range).toEqual({
      kind: "scalar",
      xsd: `${XSD}string`,
      graphqlScalar: "String",
      customDatatype: uri("Opaque"),
    });
  });

  it("maps a custom datatype with a non-scalar base to String", () => {
    const extraction = makeExtraction({
      classes,
      properties: [datatypeProp("v", { ranges: [uri("Weird")] })],
      // base type is not in the XSD scalar table → falls back to String.
      datatypes: [{ uri: uri("Weird"), baseType: uri("CustomBase") }],
    });
    expect(output(extraction, "v").range).toEqual({
      kind: "scalar",
      xsd: uri("CustomBase"),
      graphqlScalar: "String",
      customDatatype: uri("Weird"),
    });
  });

  it("resolves a named union range", () => {
    const extraction = makeExtraction({
      classes: [
        { uri: uri("Thing"), superclasses: [] },
        { uri: uri("Other"), superclasses: [] },
      ],
      properties: [datatypeProp("u", { kind: "object", ranges: [uri("MyU")] })],
      unions: [{ uri: uri("MyU"), members: [uri("Thing"), uri("Other")] }],
    });
    expect(output(extraction, "u").range).toEqual({
      kind: "union",
      name: "MyU",
      members: [uri("Thing"), uri("Other")],
    });
  });

  it("resolves a class range", () => {
    const extraction = makeExtraction({
      classes: [
        { uri: uri("Thing"), superclasses: [] },
        { uri: uri("Target"), superclasses: [] },
      ],
      properties: [
        datatypeProp("rel", { kind: "object", ranges: [uri("Target")] }),
      ],
    });
    expect(output(extraction, "rel").range).toEqual({
      kind: "class",
      uri: uri("Target"),
    });
  });

  it("falls back to unknown for an unresolvable range", () => {
    const extraction = makeExtraction({
      classes,
      properties: [
        datatypeProp("rel", { kind: "object", ranges: [uri("Nowhere")] }),
      ],
    });
    expect(output(extraction, "rel").range).toEqual({
      kind: "unknown",
      raw: uri("Nowhere"),
    });
  });

  /** Helper: build and return the resolved PropertyNode for a local name. */
  function output(extraction: RawExtraction, local: string) {
    const prop = build(extraction).output.properties.get(uri(local));
    if (!prop) {
      throw new Error(`property ${local} missing`);
    }
    return prop;
  }
});

describe("build — SHACL cardinality merge", () => {
  /** Build with one class, one object property, and the given constraints. */
  const withConstraints = (constraints: RawShaclConstraint[]) =>
    build(
      makeExtraction({
        classes: [
          { uri: uri("C"), superclasses: [] },
          { uri: uri("Target"), superclasses: [] },
        ],
        properties: [
          {
            uri: uri("rel"),
            kind: "object",
            domains: [uri("C")],
            ranges: [uri("Target")],
          },
        ],
        instanceStats: new Map([[uri("C"), { total: 1, named: 1 }]]),
        shaclConstraints: constraints,
      }),
    )
      .output.properties.get(uri("rel"))
      ?.classCardinality.get(uri("C"));

  it("intersects a direct maxCount with a finite sh:or branch max", () => {
    const card = withConstraints([
      {
        targetClass: uri("C"),
        property: uri("rel"),
        minCount: 1,
        maxCount: 2,
      },
      {
        targetClass: uri("C"),
        property: uri("rel"),
        maxCount: 3,
        fromOr: true,
      },
    ]);
    // direct max 2, branch max 3 → most permissive across alternatives = 3.
    expect(card?.singular).toBe(false);
    // the unconstrained branch (min 0) lowers the merged minimum below 1.
    expect(card?.required).toBe(false);
  });

  it("merges multiple direct constraints, intersecting their min and max counts", () => {
    // Two direct constraints on the same property exercise the merge loop's
    // second iteration, where the running min/max counts are already set.
    const card = withConstraints([
      {
        targetClass: uri("C"),
        property: uri("rel"),
        minCount: 1,
        maxCount: 5,
      },
      {
        targetClass: uri("C"),
        property: uri("rel"),
        minCount: 2,
        maxCount: 3,
      },
    ]);
    // max of the minimums (2) and min of the maximums (3).
    expect(card?.required).toBe(true);
    expect(card?.singular).toBe(false);
  });

  it("applies a direct minCount-only constraint, leaving the max unbounded", () => {
    // A direct constraint with minCount but no maxCount takes the false arm of
    // the maxCount guard — required, but not singular.
    const card = withConstraints([
      { targetClass: uri("C"), property: uri("rel"), minCount: 1 },
    ]);
    expect(card?.required).toBe(true);
    expect(card?.singular).toBe(false);
  });

  it("skips constraints belonging to a different property", () => {
    // Two object properties; only ex:rel carries a constraint. The merge loop
    // must skip the ex:other key when resolving ex:rel.
    const { output } = build(
      makeExtraction({
        classes: [
          { uri: uri("C"), superclasses: [] },
          { uri: uri("Target"), superclasses: [] },
        ],
        properties: [
          {
            uri: uri("rel"),
            kind: "object",
            domains: [uri("C")],
            ranges: [uri("Target")],
          },
          {
            uri: uri("other"),
            kind: "object",
            domains: [uri("C")],
            ranges: [uri("Target")],
          },
        ],
        shaclConstraints: [
          { targetClass: uri("C"), property: uri("other"), maxCount: 1 },
        ],
      }),
    );
    expect(output.properties.get(uri("rel"))?.classCardinality.size).toBe(0);
    expect(
      output.properties.get(uri("other"))?.classCardinality.get(uri("C"))
        ?.singular,
    ).toBe(true);
  });

  it("treats a direct maxCount with an unbounded sh:or branch as unbounded", () => {
    const card = withConstraints([
      { targetClass: uri("C"), property: uri("rel"), maxCount: 2 },
      {
        targetClass: uri("C"),
        property: uri("rel"),
        minCount: 1,
        fromOr: true,
      },
    ]);
    // branch has no maxCount (unbounded) → keeps the direct max, stays 2;
    // its minCount 1 makes the merged constraint required.
    expect(card?.singular).toBe(false);
    expect(card?.required).toBe(true);
  });

  it("keeps a finite-only sh:or branch maxCount when no direct max exists", () => {
    const card = withConstraints([
      {
        targetClass: uri("C"),
        property: uri("rel"),
        maxCount: 1,
        fromOr: true,
      },
    ]);
    expect(card?.singular).toBe(true);
  });

  it("leaves cardinality unbounded when every sh:or branch is unbounded", () => {
    const card = withConstraints([
      {
        targetClass: uri("C"),
        property: uri("rel"),
        minCount: 1,
        fromOr: true,
      },
      {
        targetClass: uri("C"),
        property: uri("rel"),
        minCount: 0,
        fromOr: true,
      },
    ]);
    expect(card?.singular).toBe(false);
    expect(card?.required).toBe(false);
  });

  it("skips a constraint whose targetClass is empty", () => {
    const card = withConstraints([
      { targetClass: "", property: uri("rel"), maxCount: 1, fromOr: true },
    ]);
    // No per-class entry is written for an empty target, but the singular
    // signal still folds into the property default.
    expect(card).toBeUndefined();
    const prop = build(
      makeExtraction({
        classes: [{ uri: uri("C"), superclasses: [] }],
        properties: [
          {
            uri: uri("rel"),
            kind: "object",
            domains: [uri("C")],
            ranges: [],
          },
        ],
        shaclConstraints: [
          { targetClass: "", property: uri("rel"), maxCount: 1, fromOr: true },
        ],
      }),
    ).output.properties.get(uri("rel"));
    expect(prop?.functional).toBe(true);
  });
});

describe("build — inverse pairs", () => {
  it("auto-completes an asymmetric inverse declaration", () => {
    const extraction = makeExtraction({
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
    });
    const { output } = build(extraction);
    expect(output.properties.get(uri("hasChild"))?.inverse).toBe(
      uri("childOf"),
    );
    // Reverse side completed even though only the forward direction declared it.
    expect(output.properties.get(uri("childOf"))?.inverse).toBe(
      uri("hasChild"),
    );
  });

  it("ignores inverse declarations referencing unknown properties", () => {
    const extraction = makeExtraction({
      classes: [{ uri: uri("Parent"), superclasses: [] }],
      properties: [
        {
          uri: uri("hasChild"),
          kind: "object",
          domains: [uri("Parent")],
          ranges: [],
        },
      ],
      inverses: [{ property: uri("ghost"), inverse: uri("phantom") }],
    });
    const { output } = build(extraction);
    expect(output.properties.get(uri("hasChild"))?.inverse).toBeUndefined();
  });
});

describe("build — property assignment", () => {
  it("skips a property domain that is not a known class", () => {
    const extraction = makeExtraction({
      classes: [{ uri: uri("Thing"), superclasses: [] }],
      properties: [
        datatypeProp("p", { domains: [uri("Ghost"), uri("Thing")] }),
      ],
    });
    const { output } = build(extraction);
    expect(output.classes.get(uri("Thing"))?.ownProperties).toContain(uri("p"));
  });

  it("assigns a domainless property to same-namespace classes only", () => {
    const OTHER = "http://other.test/";
    const extraction = makeExtraction({
      classes: [
        { uri: uri("Foo"), superclasses: [] },
        { uri: uri("Bar"), superclasses: [] },
        { uri: `${OTHER}Far`, superclasses: [] },
      ],
      properties: [datatypeProp("desc", { domains: [] })],
      namespaces: new Map([
        [NS, "ex"],
        [OTHER, "other"],
      ]),
    });
    const { output } = build(extraction);
    expect(output.classes.get(uri("Foo"))?.ownProperties).toContain(
      uri("desc"),
    );
    expect(output.classes.get(uri("Bar"))?.ownProperties).toContain(
      uri("desc"),
    );
    // A class in a different namespace does not receive the domainless property.
    expect(output.classes.get(`${OTHER}Far`)?.ownProperties).not.toContain(
      uri("desc"),
    );
  });

  it("inherits an ancestor's property onto a subclass", () => {
    const extraction = makeExtraction({
      classes: [
        { uri: uri("Base"), superclasses: [] },
        { uri: uri("Leaf"), superclasses: [uri("Base")] },
      ],
      properties: [datatypeProp("p", { domains: [uri("Base")] })],
    });
    const { output } = build(extraction);
    expect(output.classes.get(uri("Leaf"))?.ownProperties).not.toContain(
      uri("p"),
    );
    expect(output.classes.get(uri("Leaf"))?.allProperties).toContain(uri("p"));
  });

  it("dedupes an inherited property already declared on the subclass domain", () => {
    // ex:p has both Base and Leaf as domains; Leaf also inherits it from Base.
    const extraction = makeExtraction({
      classes: [
        { uri: uri("Base"), superclasses: [] },
        { uri: uri("Leaf"), superclasses: [uri("Base")] },
      ],
      properties: [datatypeProp("p", { domains: [uri("Base"), uri("Leaf")] })],
    });
    const { output } = build(extraction);
    const all = output.classes.get(uri("Leaf"))?.allProperties ?? [];
    expect(all.filter((p) => p === uri("p"))).toHaveLength(1);
  });
});

describe("build — namespaces", () => {
  it("excludes standard-vocabulary namespaces from the inventory", () => {
    const extraction = makeExtraction({
      classes: [{ uri: uri("Thing"), superclasses: [] }],
      namespaces: new Map([
        [NS, "ex"],
        ["http://www.w3.org/2000/01/rdf-schema#", "rdfs"],
      ]),
    });
    const { output } = build(extraction);
    expect(output.namespaces.has("ex")).toBe(true);
    expect(output.namespaces.has("rdfs")).toBe(false);
  });

  it("falls back to an empty prefix for an unregistered namespace", () => {
    const extraction = makeExtraction({
      classes: [{ uri: "http://other.test/Thing", superclasses: [] }],
      namespaces: new Map(),
    });
    const { output } = build(extraction);
    expect(output.classes.get("http://other.test/Thing")?.namespace).toBe("");
  });
});

describe("build — custom mapping resolution", () => {
  it("resolves a mapping keyed by prefixed name", () => {
    const extraction = makeExtraction({
      classes: [{ uri: uri("Thing"), superclasses: [] }],
      properties: [datatypeProp("p", { ranges: [`${XSD}string`] })],
    });
    const { output } = build(extraction, { "ex:p": { singular: false } });
    // datatype properties default singular; the prefixed mapping flips it.
    expect(output.properties.get(uri("p"))?.functional).toBe(false);
  });

  it("resolves a mapping keyed by full IRI", () => {
    const extraction = makeExtraction({
      classes: [{ uri: uri("Thing"), superclasses: [] }],
      properties: [datatypeProp("p", { ranges: [`${XSD}string`] })],
    });
    const { output } = build(extraction, { [uri("p")]: { singular: false } });
    expect(output.properties.get(uri("p"))?.functional).toBe(false);
  });
});

describe("build — annotation properties", () => {
  it("routes annotation properties to the TBox, not class fields", () => {
    const extraction = makeExtraction({
      classes: [{ uri: uri("Thing"), superclasses: [] }],
      properties: [
        datatypeProp("note", { kind: "annotation", domains: [uri("Thing")] }),
        datatypeProp("name", { domains: [uri("Thing")] }),
      ],
      annotations: new Map([[uri("name"), new Map([[uri("note"), "hi"]])]]),
    });
    const { output } = build(extraction);
    const own = output.classes.get(uri("Thing"))?.ownProperties ?? [];
    expect(own).toContain(uri("name"));
    expect(own).not.toContain(uri("note"));
    // The annotation value is attached to the targeted property node.
    expect(
      output.properties.get(uri("name"))?.annotations.get(uri("note")),
    ).toBe("hi");
  });
});

describe("build — graphql: annotation overlay binding", () => {
  it("binds graphql:abstract and graphql:embeddable over the heuristics (tri-state)", () => {
    const extraction = makeExtraction({
      classes: [
        // heuristic says concrete (has instances) — annotation forces abstract
        { uri: uri("Forced"), superclasses: [] },
        // heuristic says abstract (0 instances + subclass) — false forces concrete
        { uri: uri("Kept"), superclasses: [] },
        { uri: uri("Sub"), superclasses: [uri("Kept")] },
        // heuristic says non-embeddable (named instances) — annotation forces
        { uri: uri("Embed"), superclasses: [] },
      ],
      instanceStats: new Map([
        [uri("Forced"), { total: 2, named: 2 }],
        [uri("Sub"), { total: 1, named: 1 }],
        [uri("Embed"), { total: 1, named: 1 }],
      ]),
      graphqlAnnotations: [
        [uri("Embed"), GRAPHQL_TERMS.embeddable, "true", "literal"],
        [uri("Forced"), GRAPHQL_TERMS.abstract, "true", "literal"],
        [uri("Kept"), GRAPHQL_TERMS.abstract, "false", "literal"],
      ],
    });
    const { output, diagnostics } = build(extraction);
    expect(diagnostics).toEqual([]);
    expect(output.classes.get(uri("Forced"))?.isAbstract).toBe(true);
    expect(output.classes.get(uri("Kept"))?.isAbstract).toBe(false);
    expect(output.classes.get(uri("Embed"))?.embeddable).toBe(true);
  });

  it("keeps config ahead of the annotation for abstract/embeddable (A005 names the shadow)", () => {
    const extraction = makeExtraction({
      classes: [{ uri: uri("Thing"), superclasses: [] }],
      instanceStats: new Map([[uri("Thing"), { total: 1, named: 1 }]]),
      graphqlAnnotations: [
        [uri("Thing"), GRAPHQL_TERMS.abstract, "true", "literal"],
        [uri("Thing"), GRAPHQL_TERMS.embeddable, "true", "literal"],
      ],
    });
    const { output, diagnostics } = build(extraction, {
      "ex:Thing": { abstract: false, embeddable: false },
    });
    expect(output.classes.get(uri("Thing"))?.isAbstract).toBe(false);
    expect(output.classes.get(uri("Thing"))?.embeddable).toBe(false);
    expect(
      diagnostics.filter((d) => d.code === "A005").map((d) => d.severity),
    ).toEqual(["warning", "warning"]);
  });

  it("binds graphql:singular into the cardinality tier between config and owl/SHACL", () => {
    const extraction = makeExtraction({
      classes: [
        { uri: uri("Thing"), superclasses: [] },
        { uri: uri("Other"), superclasses: [] },
      ],
      properties: [
        // object property defaults to list — annotation makes it singular
        {
          uri: uri("rel"),
          kind: "object",
          domains: [uri("Thing")],
          ranges: [uri("Other")],
        },
        // datatype property defaults to singular — annotation makes it a list
        datatypeProp("tags"),
        // config wins over a contradicting annotation
        datatypeProp("cfg"),
      ],
      graphqlAnnotations: [
        [uri("cfg"), GRAPHQL_TERMS.singular, "false", "literal"],
        [uri("rel"), GRAPHQL_TERMS.singular, "true", "literal"],
        [uri("tags"), GRAPHQL_TERMS.singular, "false", "literal"],
      ],
    });
    const { output, diagnostics } = build(extraction, {
      "ex:cfg": { singular: true },
    });
    expect(output.properties.get(uri("rel"))?.functional).toBe(true);
    expect(output.properties.get(uri("tags"))?.functional).toBe(false);
    expect(output.properties.get(uri("cfg"))?.functional).toBe(true);
    expect(diagnostics.filter((d) => d.code === "A005")).toHaveLength(1);
  });

  it("keeps graphql:singular ahead of owl:FunctionalProperty", () => {
    // The tier boundary directly beneath the annotation: owl says functional
    // (singular), the ontology's own vocabulary says list. The annotation is
    // the higher tier, so the property is a list — and it is recorded as an
    // EXPLICIT decision, which is what outranks a per-class shape downstream.
    const extraction = makeExtraction({
      classes: [
        { uri: uri("Thing"), superclasses: [] },
        { uri: uri("Other"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("rel"),
          kind: "object",
          domains: [uri("Thing")],
          ranges: [uri("Other")],
        },
      ],
      functionals: new Set([uri("rel")]),
      graphqlAnnotations: [
        [uri("rel"), GRAPHQL_TERMS.singular, "false", "literal"],
      ],
    });
    const { output, diagnostics } = build(extraction);
    expect(output.properties.get(uri("rel"))?.functional).toBe(false);
    expect(output.properties.get(uri("rel"))?.explicitSingular).toBe(false);
    expect(diagnostics.filter((d) => d.code === "A001")).toEqual([]);
  });

  it("lets owl:FunctionalProperty decide when no explicit tier spoke", () => {
    // The complement: with no config and no annotation, `functional` still
    // comes from the heuristics and carries NO explicit marker, so per-class
    // SHACL remains free to override it.
    const extraction = makeExtraction({
      classes: [
        { uri: uri("Thing"), superclasses: [] },
        { uri: uri("Other"), superclasses: [] },
      ],
      properties: [
        {
          uri: uri("rel"),
          kind: "object",
          domains: [uri("Thing")],
          ranges: [uri("Other")],
        },
      ],
      functionals: new Set([uri("rel")]),
    });
    const { output } = build(extraction);
    expect(output.properties.get(uri("rel"))?.functional).toBe(true);
    expect(output.properties.get(uri("rel"))?.explicitSingular).toBeUndefined();
  });

  it("joins graphql:inverse pairs with owl:inverseOf declared-pair semantics", () => {
    const extraction = makeExtraction({
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
      graphqlAnnotations: [
        // a name-only overlay entry must NOT mint an inverse pair
        [uri("childOf"), GRAPHQL_TERMS.name, "parent", "literal"],
        [uri("hasChild"), GRAPHQL_TERMS.inverse, uri("childOf"), "iri"],
      ],
    });
    const { output, diagnostics } = build(extraction);
    expect(diagnostics).toEqual([]);
    // Forward side set by the annotation; backward auto-completed exactly
    // like an asymmetric owl:inverseOf.
    expect(output.properties.get(uri("hasChild"))?.inverse).toBe(
      uri("childOf"),
    );
    expect(output.properties.get(uri("childOf"))?.inverse).toBe(
      uri("hasChild"),
    );
  });

  it("keeps a dangling graphql:inverse on the owl:inverseOf parity path", () => {
    const extraction = makeExtraction({
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
      ],
      graphqlAnnotations: [
        [uri("hasChild"), GRAPHQL_TERMS.inverse, uri("ghost"), "iri"],
      ],
    });
    const { output } = build(extraction);
    // The pair joins the IR; Pass 3's existing B004 reports the dangle.
    expect(output.properties.get(uri("hasChild"))?.inverse).toBe(uri("ghost"));
  });

  it("carries the resolved overlay on the IR and binds prefixes with it", () => {
    // Pass 1 reports the REGISTERED prefix ("ex"); the declaration binds here,
    // where the mode is known, and every prefix reader — node namespaces and
    // the NamespaceInfo keying — sees the one effective value.
    const extraction = makeExtraction({
      classes: [{ uri: uri("Thing"), superclasses: [] }],
      namespaces: new Map([[NS, "ex"]]),
      graphqlAnnotations: [[NS, GRAPHQL_TERMS.prefix, "exx", "literal"]],
    });
    const { output, diagnostics } = build(extraction);
    expect(diagnostics).toEqual([]);
    expect(output.graphql.prefixes.get(NS)).toBe("exx");
    expect(output.classes.get(uri("Thing"))?.namespace).toBe("exx");
    expect(output.namespaces.get("exx")?.uri).toBe(NS);
    expect(output.namespaces.get("exx")?.classCount).toBe(1);
    // ...and the prefix it replaced is gone, not a second entry.
    expect(output.namespaces.has("ex")).toBe(false);
  });

  it('does not bind graphql:prefix under mode "auto"', () => {
    // "auto" promises the annotations are never consulted. The declaration
    // must leave no trace: the namespace resolves exactly as it would for an
    // ontology that never carried the assertion.
    const extraction = makeExtraction({
      classes: [{ uri: uri("Thing"), superclasses: [] }],
      namespaces: new Map([[NS, "ex"]]),
      graphqlAnnotations: [[NS, GRAPHQL_TERMS.prefix, "exx", "literal"]],
    });
    const { output, diagnostics } = build(extraction, {}, "auto");
    expect(output.graphql.prefixes.size).toBe(0);
    expect(output.classes.get(uri("Thing"))?.namespace).toBe("ex");
    expect(output.namespaces.get("ex")?.uri).toBe(NS);
    expect(output.namespaces.has("exx")).toBe(false);
    // Only the honest "assertions present but unconsulted" note.
    expect(diagnostics.map((d) => d.code)).toEqual(["A006"]);
  });

  it("exposes an empty overlay for an unannotated extraction", () => {
    const { output } = build(
      makeExtraction({ classes: [{ uri: uri("Thing"), superclasses: [] }] }),
    );
    expect(output.graphql.classes.size).toBe(0);
    expect(output.graphql.properties.size).toBe(0);
    expect(output.graphql.prefixes.size).toBe(0);
  });
});

describe("build — effective prefix injectivity", () => {
  it("refuses a collision a graphql:prefix declaration caused (A001)", () => {
    const { diagnostics } = build(
      makeExtraction({
        classes: [
          { uri: uri("Thing"), superclasses: [] },
          { uri: "http://second.test/Thing", superclasses: [] },
        ],
        namespaces: new Map([
          [NS, "ex"],
          ["http://second.test/", "sec"],
        ]),
        graphqlAnnotations: [
          ["http://second.test/", GRAPHQL_TERMS.prefix, "ex", "literal"],
        ],
      }),
    );
    const a001 = diagnostics.filter((d) => d.code === "A001");
    expect(a001).toHaveLength(1);
    expect(a001[0]?.severity).toBe("error");
    expect(a001[0]?.source).toBe("ex");
    expect(a001[0]?.message).toContain(NS);
    expect(a001[0]?.message).toContain("http://second.test/");
    expect(a001[0]?.message).toContain("graphql:prefix");
  });

  it("warns instead of refusing when NO declaration is in play (B005)", () => {
    // Reachable with zero annotations: registering the prefix "ns" collides
    // with the first serial synthetic. Calling that an ANNOTATION conflict
    // sent operators hunting for assertions that do not exist, and refusing
    // the compile rejected input that compiled before the vocabulary landed.
    const { diagnostics } = build(
      makeExtraction({
        classes: [
          { uri: "http://a.test/Thing", superclasses: [] },
          { uri: "http://b.test/Thing", superclasses: [] },
        ],
        namespaces: new Map([
          ["http://a.test/", "ns"],
          ["http://b.test/", "ns"],
        ]),
      }),
    );
    expect(diagnostics.filter((d) => d.code === "A001")).toEqual([]);
    const b005 = diagnostics.filter((d) => d.code === "B005");
    expect(b005).toHaveLength(1);
    expect(b005[0]?.severity).toBe("warning");
    expect(b005[0]?.source).toBe("ns");
    expect(b005[0]?.message).toContain("StoreConfig.prefixes");
    expect(b005[0]?.message).not.toContain("graphql:prefix");
  });

  it("stays silent on an injective map", () => {
    const { diagnostics } = build(
      makeExtraction({
        classes: [
          { uri: uri("Thing"), superclasses: [] },
          { uri: "http://second.test/Thing", superclasses: [] },
        ],
        namespaces: new Map([
          [NS, "ex"],
          ["http://second.test/", "sec"],
        ]),
      }),
    );
    expect(
      diagnostics.filter((d) => d.code === "A001" || d.code === "B005"),
    ).toEqual([]);
  });
});
