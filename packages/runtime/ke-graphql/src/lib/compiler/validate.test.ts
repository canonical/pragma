import { describe, expect, it } from "vitest";
import type {
  ClassNode,
  Diagnostic,
  OntologyIR,
  PropertyNode,
  RangeSpec,
} from "#shared";
import validate from "./validate.js";

const classNode = (
  over: Partial<ClassNode> & Pick<ClassNode, "uri">,
): ClassNode => ({
  label: over.uri,
  namespace: "ex",
  superclasses: [],
  ancestors: [],
  subclasses: [],
  isAbstract: false,
  embeddable: false,
  ownProperties: [],
  allProperties: [],
  ...over,
});

const scalarRange: RangeSpec = {
  kind: "scalar",
  xsd: "http://www.w3.org/2001/XMLSchema#string",
  graphqlScalar: "String",
};

const property = (
  over: Partial<PropertyNode> & Pick<PropertyNode, "uri">,
): PropertyNode => ({
  label: over.uri,
  namespace: "ex",
  kind: "datatype",
  domains: ["http://example.org/Thing"],
  range: scalarRange,
  functional: false,
  classCardinality: new Map(),
  isAnnotation: false,
  annotations: new Map(),
  ...over,
});

const buildIR = (
  properties: Map<string, PropertyNode>,
  classes: Map<string, ClassNode> = new Map(),
): OntologyIR =>
  ({
    classes,
    properties,
    namespaces: new Map(),
    extraction: {
      classes: [],
      properties: [],
      inverses: [],
      functionals: new Set(),
      datatypes: [],
      namespaces: new Map(),
      shaclConstraints: [],
      unions: [],
      instanceStats: new Map(),
      selfReferential: new Set(),
      functionalViolations: new Set(),
      undeclaredPredicates: new Set(),
      annotations: new Map(),
      deepBlankNesting: false,
    },
  }) as unknown as OntologyIR;

const codes = (diagnostics: Diagnostic[]): string[] =>
  diagnostics.map((d) => d.code);

describe("validate property diagnostics", () => {
  it("B003 — unknown range mapped to String", () => {
    const properties = new Map<string, PropertyNode>([
      [
        "http://example.org/p",
        property({
          uri: "http://example.org/p",
          range: { kind: "unknown", raw: "http://example.org/Mystery" },
        }),
      ],
    ]);
    const { diagnostics } = validate(buildIR(properties));
    expect(codes(diagnostics)).toContain("B003");
    expect(diagnostics.find((d) => d.code === "B003")?.message).toContain(
      "Mystery",
    );
  });

  it("B004 — inverse declares an unknown property", () => {
    const properties = new Map<string, PropertyNode>([
      [
        "http://example.org/forward",
        property({
          uri: "http://example.org/forward",
          inverse: "http://example.org/missing",
        }),
      ],
    ]);
    const { diagnostics } = validate(buildIR(properties));
    expect(codes(diagnostics)).toContain("B004");
    // the inverse target is absent, so V003 does not also fire
    expect(codes(diagnostics)).not.toContain("V003");
  });

  it("V003 — asymmetric owl:inverseOf between two declared properties", () => {
    // a.inverse = b, but b is paired symmetrically with c → a is the only
    // contradiction. All three inverse targets exist, so no B004 fires.
    const properties = new Map<string, PropertyNode>([
      [
        "http://example.org/a",
        property({
          uri: "http://example.org/a",
          kind: "object",
          inverse: "http://example.org/b",
        }),
      ],
      [
        "http://example.org/b",
        property({
          uri: "http://example.org/b",
          kind: "object",
          inverse: "http://example.org/c",
        }),
      ],
      [
        "http://example.org/c",
        property({
          uri: "http://example.org/c",
          kind: "object",
          inverse: "http://example.org/b",
        }),
      ],
    ]);
    const { diagnostics } = validate(buildIR(properties));
    const v003 = diagnostics.filter((d) => d.code === "V003");
    // exactly one asymmetry: a → b
    expect(v003).toHaveLength(1);
    expect(v003[0]?.message).toContain("a");
    expect(diagnostics.filter((d) => d.code === "B004")).toHaveLength(0);
  });

  it("V013 — property declares multiple rdfs:domain classes", () => {
    const properties = new Map<string, PropertyNode>([
      [
        "http://example.org/multi",
        property({
          uri: "http://example.org/multi",
          domains: ["http://example.org/A", "http://example.org/B"],
        }),
      ],
    ]);
    const { diagnostics } = validate(buildIR(properties));
    expect(codes(diagnostics)).toContain("V013");
    expect(diagnostics.find((d) => d.code === "V013")?.message).toContain(
      "2 domains",
    );
  });
});

describe("validate class diagnostics", () => {
  it("B002 — class references an unknown, non-standard superclass", () => {
    // superclass is neither in the IR nor a standard vocabulary → B002
    // (a standard-vocab parent would instead be V009).
    const classes = new Map<string, ClassNode>([
      [
        "http://example.org/Sub",
        classNode({
          uri: "http://example.org/Sub",
          superclasses: ["http://example.org/Ghost"],
        }),
      ],
    ]);
    const { diagnostics } = validate(buildIR(new Map(), classes));
    expect(codes(diagnostics)).toContain("B002");
    expect(codes(diagnostics)).not.toContain("V009");
    expect(diagnostics.find((d) => d.code === "B002")?.message).toContain(
      "Ghost",
    );
  });

  it("V015 — class mapped abstract but has direct instances", () => {
    const classes = new Map<string, ClassNode>([
      [
        "http://example.org/A",
        classNode({ uri: "http://example.org/A", isAbstract: true }),
      ],
    ]);
    const ir = buildIR(new Map(), classes);
    // A custom mapping can force isAbstract while the data still has instances
    // (the automatic heuristic only marks zero-instance classes abstract).
    (
      ir.extraction.instanceStats as Map<
        string,
        { total: number; named: number }
      >
    ).set("http://example.org/A", { total: 3, named: 3 });
    const { diagnostics } = validate(ir);
    expect(codes(diagnostics)).toContain("V015");
  });
});
