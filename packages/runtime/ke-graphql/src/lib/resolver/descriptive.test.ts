// =============================================================================
// Descriptive predicate selection + the generic label/comment/definition
// resolver: the canonical-first chain, the local-name fallback tier, the
// filtering arms, and the literal walk.
// =============================================================================

import { describe, expect, it } from "vitest";
import {
  type ClassNode,
  COMMENT_LOCAL_NAMES,
  type CompilerContext,
  DEFINITION_LOCAL_NAMES,
  type EntityValue,
  LABEL_LOCAL_NAMES,
  type OntologyIR,
  type PropertyNode,
  RDFS_COMMENT,
  RDFS_LABEL,
  SKOS_DEFINITION,
  SKOS_PREF_LABEL,
  type TripleSet,
  XSD,
} from "../shared/index.js";
import {
  createDescriptiveResolver,
  selectDescriptivePredicates,
} from "./descriptive.js";

const NS = "http://example.org/";
const uri = (local: string) => `${NS}${local}`;

const LABEL_UNIVERSAL = [RDFS_LABEL, SKOS_PREF_LABEL];

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

const propertyNode = (
  over: Partial<PropertyNode> & Pick<PropertyNode, "uri">,
): PropertyNode => ({
  label: over.uri,
  namespace: "ex",
  kind: "datatype",
  range: { kind: "scalar", xsd: `${XSD}string`, graphqlScalar: "String" },
  domains: [],
  functional: true,
  classCardinality: new Map(),
  isAnnotation: false,
  annotations: new Map(),
  ...over,
});

const buildIR = (
  classes: ClassNode[],
  properties: PropertyNode[],
): OntologyIR => ({
  classes: new Map(classes.map((node) => [node.uri, node])),
  properties: new Map(properties.map((node) => [node.uri, node])),
  namespaces: new Map(),
  extraction: {} as OntologyIR["extraction"],
});

describe("selectDescriptivePredicates", () => {
  it("puts the canonical predicates ahead of the local-name tier", () => {
    const ir = buildIR(
      [
        classNode({
          uri: uri("Thing"),
          allProperties: [uri("title"), uri("name")],
        }),
      ],
      [propertyNode({ uri: uri("title") }), propertyNode({ uri: uri("name") })],
    );
    // canonical first and verbatim; then the tier in LABEL_LOCAL_NAMES order
    // (name before title) regardless of declaration order.
    expect(
      selectDescriptivePredicates(
        uri("Thing"),
        ir,
        LABEL_UNIVERSAL,
        LABEL_LOCAL_NAMES,
      ),
    ).toEqual([RDFS_LABEL, SKOS_PREF_LABEL, uri("name"), uri("title")]);
  });

  it("ranks the comment and definition tiers independently", () => {
    const ir = buildIR(
      [
        classNode({
          uri: uri("Thing"),
          allProperties: [uri("summary"), uri("description")],
        }),
      ],
      [
        propertyNode({ uri: uri("summary") }),
        propertyNode({ uri: uri("description") }),
      ],
    );
    expect(
      selectDescriptivePredicates(
        uri("Thing"),
        ir,
        [RDFS_COMMENT],
        COMMENT_LOCAL_NAMES,
      ),
    ).toEqual([RDFS_COMMENT, uri("summary")]);
    expect(
      selectDescriptivePredicates(
        uri("Thing"),
        ir,
        [SKOS_DEFINITION],
        DEFINITION_LOCAL_NAMES,
      ),
    ).toEqual([SKOS_DEFINITION, uri("description")]);
  });

  it("keeps only the canonical tier when the class declares no match", () => {
    const ir = buildIR(
      [classNode({ uri: uri("Thing"), allProperties: [uri("color")] })],
      [propertyNode({ uri: uri("color") })],
    );
    expect(
      selectDescriptivePredicates(
        uri("Thing"),
        ir,
        LABEL_UNIVERSAL,
        LABEL_LOCAL_NAMES,
      ),
    ).toEqual(LABEL_UNIVERSAL);
  });

  it("returns the canonical tier for an undefined class URI", () => {
    const ir = buildIR([], []);
    expect(
      selectDescriptivePredicates(
        undefined,
        ir,
        LABEL_UNIVERSAL,
        LABEL_LOCAL_NAMES,
      ),
    ).toEqual(LABEL_UNIVERSAL);
  });

  it("returns the canonical tier for a class URI absent from the IR", () => {
    const ir = buildIR([classNode({ uri: uri("Thing") })], []);
    expect(
      selectDescriptivePredicates(
        uri("Ghost"),
        ir,
        LABEL_UNIVERSAL,
        LABEL_LOCAL_NAMES,
      ),
    ).toEqual(LABEL_UNIVERSAL);
  });

  it("drops a declared property that is absent from the property map", () => {
    const ir = buildIR(
      [classNode({ uri: uri("Thing"), allProperties: [uri("name")] })],
      [], // ex:name is declared on the class but never made it into the IR
    );
    expect(
      selectDescriptivePredicates(
        uri("Thing"),
        ir,
        LABEL_UNIVERSAL,
        LABEL_LOCAL_NAMES,
      ),
    ).toEqual(LABEL_UNIVERSAL);
  });

  it("drops non-String ranges: a class range and a non-String scalar", () => {
    const ir = buildIR(
      [
        classNode({
          uri: uri("Thing"),
          allProperties: [uri("name"), uri("title")],
        }),
      ],
      [
        // object range → not a scalar at all
        propertyNode({
          uri: uri("name"),
          kind: "object",
          range: { kind: "class", uri: uri("Other") },
        }),
        // scalar range, but not String
        propertyNode({
          uri: uri("title"),
          range: {
            kind: "scalar",
            xsd: `${XSD}integer`,
            graphqlScalar: "Int",
          },
        }),
      ],
    );
    expect(
      selectDescriptivePredicates(
        uri("Thing"),
        ir,
        LABEL_UNIVERSAL,
        LABEL_LOCAL_NAMES,
      ),
    ).toEqual(LABEL_UNIVERSAL);
  });

  it("deduplicates an own property that IS a canonical predicate", () => {
    // Contrived tables: the canonical predicate's local name is also in the
    // fallback tier, so it would otherwise be listed twice.
    const ir = buildIR(
      [classNode({ uri: uri("Thing"), allProperties: [uri("name")] })],
      [propertyNode({ uri: uri("name") })],
    );
    expect(
      selectDescriptivePredicates(uri("Thing"), ir, [uri("name")], ["name"]),
    ).toEqual([uri("name")]);
  });
});

describe("createDescriptiveResolver", () => {
  const ctx = {} as CompilerContext;

  const entity = (triples: TripleSet): EntityValue => ({
    uri: "ex:thing",
    typename: "Thing",
    triples,
  });

  const resolveWith = (predicates: string[], triples: TripleSet) =>
    createDescriptiveResolver(predicates)(
      entity(triples),
      {},
      ctx,
      {} as never,
    );

  it("returns the canonical value when it is asserted", () => {
    const triples: TripleSet = new Map([
      [RDFS_LABEL, [{ kind: "literal", value: "Canonical" }]],
      [uri("name"), [{ kind: "literal", value: "Fallback" }]],
    ]);
    expect(resolveWith([RDFS_LABEL, uri("name")], triples)).toBe("Canonical");
  });

  it("falls through to the local-name tier when the canonical is absent", () => {
    const triples: TripleSet = new Map([
      [uri("name"), [{ kind: "literal", value: "Fallback" }]],
    ]);
    expect(resolveWith([RDFS_LABEL, uri("name")], triples)).toBe("Fallback");
  });

  it("skips URI and blank-node values and continues to the next predicate", () => {
    const triples: TripleSet = new Map([
      [
        RDFS_LABEL,
        [
          { kind: "uri", value: uri("elsewhere") },
          { kind: "blank", id: "_:b0", triples: new Map() },
        ],
      ],
      [uri("name"), [{ kind: "literal", value: "Fallback" }]],
    ]);
    expect(resolveWith([RDFS_LABEL, uri("name")], triples)).toBe("Fallback");
  });

  it("returns null when every predicate is exhausted", () => {
    expect(resolveWith([RDFS_LABEL, uri("name")], new Map())).toBeNull();
  });

  it("preserves an empty-string literal", () => {
    const triples: TripleSet = new Map([
      [RDFS_LABEL, [{ kind: "literal", value: "" }]],
    ]);
    expect(resolveWith([RDFS_LABEL], triples)).toBe("");
  });
});
