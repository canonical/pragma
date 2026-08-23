// =============================================================================
// Descriptive predicate selection + the language resolution behind
// _meta.title/label/comment/definition: the canonical-first chain, the
// local-name fallback tier, the filtering arms, the literal walk, exact-tag
// matching with the untagged fallback, and title's total tier stack.
// =============================================================================

import { describe, expect, it } from "vitest";
import {
  type ClassNode,
  COMMENT_LOCAL_NAMES,
  DEFINITION_LOCAL_NAMES,
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
  type Lexical,
  resolveLabel,
  resolveTitle,
  selectAnnotatedSource,
  selectDescriptivePredicates,
  selectLexicals,
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
  graphqlClasses: OntologyIR["graphql"]["classes"] = new Map(),
): OntologyIR => ({
  classes: new Map(classes.map((node) => [node.uri, node])),
  properties: new Map(properties.map((node) => [node.uri, node])),
  namespaces: new Map(),
  graphql: {
    classes: graphqlClasses,
    properties: new Map(),
    prefixes: new Map(),
  },
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

describe("selectAnnotatedSource", () => {
  it("answers undefined for an undefined class and for an unannotated tree", () => {
    const ir = buildIR([classNode({ uri: uri("Thing") })], []);
    expect(selectAnnotatedSource(undefined, ir, "titleFrom")).toBeUndefined();
    expect(
      selectAnnotatedSource(uri("Thing"), ir, "titleFrom"),
    ).toBeUndefined();
  });

  it("prefers the class's own declaration over an ancestor's (nearest wins)", () => {
    const ir = buildIR(
      [
        classNode({ uri: uri("Leaf"), ancestors: [uri("Mid"), uri("Root")] }),
        classNode({ uri: uri("Mid"), ancestors: [uri("Root")] }),
        classNode({ uri: uri("Root") }),
      ],
      [],
      new Map([
        [uri("Leaf"), { titleFrom: uri("leafTitle") }],
        [uri("Root"), { titleFrom: uri("rootTitle") }],
      ]),
    );
    expect(selectAnnotatedSource(uri("Leaf"), ir, "titleFrom")).toBe(
      uri("leafTitle"),
    );
    // The middle class declares nothing: the walk continues to the root —
    // annotating a root class covers its whole tree.
    expect(selectAnnotatedSource(uri("Mid"), ir, "titleFrom")).toBe(
      uri("rootTitle"),
    );
  });

  it("walks each descriptive field independently", () => {
    const ir = buildIR(
      [classNode({ uri: uri("Thing"), ancestors: [uri("Base")] })],
      [],
      new Map([
        [uri("Thing"), { labelFrom: uri("shortName") }],
        [uri("Base"), { commentFrom: uri("note") }],
      ]),
    );
    expect(selectAnnotatedSource(uri("Thing"), ir, "labelFrom")).toBe(
      uri("shortName"),
    );
    expect(selectAnnotatedSource(uri("Thing"), ir, "commentFrom")).toBe(
      uri("note"),
    );
    expect(
      selectAnnotatedSource(uri("Thing"), ir, "definitionFrom"),
    ).toBeUndefined();
  });

  it("reads a class absent from the IR map by its own URI alone", () => {
    // A typename can reach chain computation without a ClassNode (crafted
    // MappedIR); the walk degrades to the class URI itself.
    const ir = buildIR(
      [],
      [],
      new Map([[uri("Ghost"), { titleFrom: uri("t") }]]),
    );
    expect(selectAnnotatedSource(uri("Ghost"), ir, "titleFrom")).toBe(uri("t"));
  });
});

describe("selectLexicals", () => {
  it("takes the FIRST predicate that has any literal, whole value set", () => {
    const triples: TripleSet = new Map([
      [
        RDFS_LABEL,
        [
          { kind: "literal", value: "b" },
          { kind: "literal", value: "a", language: "de" },
        ],
      ],
      [uri("name"), [{ kind: "literal", value: "never" }]],
    ]);
    expect(selectLexicals(triples, [RDFS_LABEL, uri("name")])).toEqual([
      { value: "b", lang: "" },
      { value: "a", lang: "de" },
    ]);
  });

  it("skips a predicate whose only values are URIs or blank nodes", () => {
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
    expect(selectLexicals(triples, [RDFS_LABEL, uri("name")])).toEqual([
      { value: "Fallback", lang: "" },
    ]);
  });

  it("returns an empty list when every predicate is exhausted", () => {
    expect(selectLexicals(new Map(), [RDFS_LABEL, uri("name")])).toEqual([]);
  });
});

describe("resolveLabel", () => {
  const untagged = (value: string): Lexical => ({ value, lang: "" });
  const tagged = (value: string, lang: string): Lexical => ({ value, lang });

  it("prefers an exact tag match, case-insensitively", () => {
    const lexicals = [tagged("Zeug", "de"), tagged("Thing", "EN")];
    expect(resolveLabel(lexicals, "en")).toBe("Thing");
    expect(resolveLabel(lexicals, "de")).toBe("Zeug");
  });

  it("does NOT treat en-GB as a match for en (exact tags only)", () => {
    expect(resolveLabel([tagged("Colour", "en-GB")], "en")).toBeNull();
  });

  it("falls back to the untagged literals — the documented untagged tier", () => {
    // An exact-tag-only rule would return null here; nulling out an untagged
    // corpus is precisely the outcome this package refuses.
    expect(resolveLabel([untagged("Plain"), tagged("Zeug", "de")], "en")).toBe(
      "Plain",
    );
  });

  it("returns null when neither the exact tag nor an untagged literal exists", () => {
    expect(resolveLabel([tagged("Zeug", "de")], "fr")).toBeNull();
  });

  it("returns null for no literals at all", () => {
    expect(resolveLabel([], "en")).toBeNull();
  });

  it("picks the lexicographically least value, not the first encountered", () => {
    // CONSTRUCT order is not guaranteed: a two-value predicate must answer the
    // same string on every request regardless of the order it arrives in.
    expect(resolveLabel([untagged("zebra"), untagged("aardvark")], "en")).toBe(
      "aardvark",
    );
    expect(resolveLabel([untagged("aardvark"), untagged("zebra")], "en")).toBe(
      "aardvark",
    );
  });

  it("preserves an empty-string literal as a value, not a miss", () => {
    expect(resolveLabel([untagged("")], "en")).toBe("");
  });
});

describe("resolveTitle", () => {
  const untagged = (value: string): Lexical => ({ value, lang: "" });
  const tagged = (value: string, lang: string): Lexical => ({ value, lang });

  it("returns the label when one resolves", () => {
    expect(
      resolveTitle([tagged("Thing", "en")], "en", uri("t1"), "Thing"),
    ).toBe("Thing");
  });

  it("falls back to the least (tag, value) literal of ANY tag", () => {
    // No en and nothing untagged → the any-tag tier, ordered by tag then value.
    expect(
      resolveTitle(
        [tagged("Zeug", "de"), tagged("Chose", "fr"), tagged("Alt", "de")],
        "en",
        uri("t1"),
        "Thing",
      ),
    ).toBe("Alt");
  });

  it("answers the untagged literal for a tag with no exact match", () => {
    // The untagged fallback is UNCONDITIONAL: no "fr" literal exists, so
    // label's untagged tier answers "zzz" — title returns it as the resolved
    // label, and the any-tag tier is never reached in this case.
    expect(
      resolveTitle(
        [tagged("Zeug", "de"), untagged("zzz")],
        "fr",
        uri("t1"),
        "Thing",
      ),
    ).toBe("zzz");
  });

  it("falls back to the IRI local name when no literal exists", () => {
    expect(resolveTitle([], "en", uri("Widget"), "Thing")).toBe("Widget");
  });

  it("falls back to the whole IRI when the local name is empty", () => {
    // A namespace IRI ending in "/" has no local name to show.
    expect(resolveTitle([], "en", NS, "Thing")).toBe(NS);
  });

  it("falls back to the typename for a value with no IRI (embedded blank node)", () => {
    expect(resolveTitle([], "en", null, "Review")).toBe("Review");
  });
});
