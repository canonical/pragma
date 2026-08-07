// =============================================================================
// Annotation resolution unit tests: the A-band taxonomy (A001 conflicts,
// A002 targets, A003 values, A004 recognition/applicability, A005 config
// shadowing), the prefix path (namespace re-keying, value validation), and
// the overlay application of every v1 term. Crafted RawExtractions, rows in
// the (target, term, kind, value) order the extractor guarantees. The
// effective-map injectivity guard lives in build.ts and is tested there.
// =============================================================================

import { describe, expect, it } from "vitest";
import {
  type Diagnostic,
  GRAPHQL,
  GRAPHQL_TERMS,
  type GraphqlAnnotationRow,
  type RawExtraction,
  RDFS_LABEL,
} from "../shared/index.js";
import resolveGraphqlAnnotations from "./annotations.js";

const NS = "http://example.org/";
const uri = (local: string) => `${NS}${local}`;

const makeExtraction = (
  partial: Partial<RawExtraction> = {},
): RawExtraction => ({
  classes: [
    { uri: uri("Thing"), superclasses: [] },
    { uri: uri("Other"), superclasses: [] },
  ],
  properties: [
    {
      uri: uri("name"),
      kind: "datatype",
      domains: [uri("Thing")],
      ranges: [],
    },
    {
      uri: uri("link"),
      kind: "object",
      domains: [uri("Thing")],
      ranges: [uri("Other")],
    },
  ],
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
  graphqlAnnotations: [],
  ...partial,
});

const resolve = (
  rows: GraphqlAnnotationRow[],
  partial: Partial<RawExtraction> = {},
  mappings: Parameters<typeof resolveGraphqlAnnotations>[1] = {},
) =>
  resolveGraphqlAnnotations(
    makeExtraction({ graphqlAnnotations: rows, ...partial }),
    mappings,
  );

const codes = (diagnostics: Diagnostic[]): string[] =>
  diagnostics.map((d) => d.code);

describe("annotations — overlay application", () => {
  it("applies every class-targeted term", () => {
    const { output, diagnostics } = resolve([
      [uri("Thing"), GRAPHQL_TERMS.abstract, "false", "literal"],
      [uri("Thing"), GRAPHQL_TERMS.commentFrom, uri("summary"), "iri"],
      [uri("Thing"), GRAPHQL_TERMS.definitionFrom, uri("desc"), "iri"],
      [uri("Thing"), GRAPHQL_TERMS.embeddable, "true", "literal"],
      [uri("Thing"), GRAPHQL_TERMS.expose, "true", "literal"],
      [uri("Thing"), GRAPHQL_TERMS.labelFrom, uri("shortName"), "iri"],
      [uri("Thing"), GRAPHQL_TERMS.name, "Item", "literal"],
      [uri("Thing"), GRAPHQL_TERMS.titleFrom, uri("displayName"), "iri"],
    ]);
    expect(diagnostics).toEqual([]);
    expect(output.classes.get(uri("Thing"))).toEqual({
      abstract: false,
      commentFrom: uri("summary"),
      definitionFrom: uri("desc"),
      embeddable: true,
      expose: true,
      labelFrom: uri("shortName"),
      name: "Item",
      titleFrom: uri("displayName"),
    });
    expect(output.properties.size).toBe(0);
    expect(output.prefixes.size).toBe(0);
  });

  it("applies every property-targeted term, the boolean lexical space included", () => {
    const { output, diagnostics } = resolve([
      [uri("link"), GRAPHQL_TERMS.inverse, uri("backlink"), "iri"],
      [uri("link"), GRAPHQL_TERMS.singular, "1", "literal"],
      [uri("name"), GRAPHQL_TERMS.name, "displayName", "literal"],
      [uri("name"), GRAPHQL_TERMS.nonNull, "true", "literal"],
      [uri("name"), GRAPHQL_TERMS.singular, "0", "literal"],
    ]);
    expect(diagnostics).toEqual([]);
    expect(output.properties.get(uri("link"))).toEqual({
      inverse: uri("backlink"),
      singular: true,
    });
    expect(output.properties.get(uri("name"))).toEqual({
      name: "displayName",
      nonNull: true,
      singular: false,
    });
  });
});

describe("annotations — A001 conflicts (never tiebroken)", () => {
  it("refuses two names for one class, naming every value", () => {
    const { output, diagnostics } = resolve([
      [uri("Thing"), GRAPHQL_TERMS.name, "Alpha", "literal"],
      [uri("Thing"), GRAPHQL_TERMS.name, "Beta", "literal"],
    ]);
    const a001 = diagnostics.find((d) => d.code === "A001");
    expect(a001?.severity).toBe("error");
    expect(a001?.message).toContain(uri("Thing"));
    expect(a001?.message).toContain('"Alpha"');
    expect(a001?.message).toContain('"Beta"');
    // No tiebreak: the term is applied for NEITHER value.
    expect(output.classes.get(uri("Thing"))?.name).toBeUndefined();
  });

  it("treats agreeing xsd:boolean lexicals as one assertion, not a conflict", () => {
    // xsd:boolean has four lexicals for two values, and extraction dedupes on
    // the raw lexical — so `true` and "1" arrive as two rows for one fact.
    // R-9 scopes A001 to sources that DISAGREE; there is nothing to pick here.
    const { output, diagnostics } = resolve([
      [uri("name"), GRAPHQL_TERMS.nonNull, "1", "literal"],
      [uri("name"), GRAPHQL_TERMS.nonNull, "true", "literal"],
    ]);
    expect(diagnostics).toEqual([]);
    expect(output.properties.get(uri("name"))?.nonNull).toBe(true);
  });

  it("treats agreeing false lexicals as one assertion", () => {
    const { output, diagnostics } = resolve([
      [uri("name"), GRAPHQL_TERMS.singular, "0", "literal"],
      [uri("name"), GRAPHQL_TERMS.singular, "false", "literal"],
    ]);
    expect(diagnostics).toEqual([]);
    expect(output.properties.get(uri("name"))?.singular).toBe(false);
  });

  it("still refuses boolean lexicals that genuinely disagree", () => {
    const { output, diagnostics } = resolve([
      [uri("name"), GRAPHQL_TERMS.singular, "0", "literal"],
      [uri("name"), GRAPHQL_TERMS.singular, "true", "literal"],
    ]);
    const a001 = diagnostics.find((d) => d.code === "A001");
    expect(a001?.severity).toBe("error");
    expect(a001?.message).toContain('"0"');
    expect(a001?.message).toContain('"true"');
    expect(output.properties.get(uri("name"))?.singular).toBeUndefined();
  });

  it("does not merge an IRI onto an agreeing boolean lexical", () => {
    // Normalization is scoped to LITERAL rows: an IRI whose string happens to
    // read "true" is a value-kind error (A003 via A001's report), never a
    // second spelling of the boolean.
    const { diagnostics } = resolve([
      [uri("name"), GRAPHQL_TERMS.singular, "true", "iri"],
      [uri("name"), GRAPHQL_TERMS.singular, "true", "literal"],
    ]);
    const a001 = diagnostics.find((d) => d.code === "A001");
    expect(a001?.severity).toBe("error");
    expect(a001?.message).toContain("<true>");
    expect(a001?.message).toContain('"true"');
  });

  it("renders an IRI-vs-literal conflict with both spellings", () => {
    const { diagnostics } = resolve([
      [uri("Thing"), GRAPHQL_TERMS.titleFrom, uri("a"), "iri"],
      [uri("Thing"), GRAPHQL_TERMS.titleFrom, "not-an-iri", "literal"],
    ]);
    const a001 = diagnostics.find((d) => d.code === "A001");
    expect(a001?.message).toContain(`<${uri("a")}>`);
    expect(a001?.message).toContain('"not-an-iri"');
  });

  it("refuses two prefixes for one namespace, across subject spellings", () => {
    const { output, diagnostics } = resolve(
      [
        ["http://hash.test/v", GRAPHQL_TERMS.prefix, "aa", "literal"],
        ["http://hash.test/v#", GRAPHQL_TERMS.prefix, "bb", "literal"],
      ],
      {
        classes: [{ uri: "http://hash.test/v#Thing", superclasses: [] }],
        properties: [],
        namespaces: new Map([["http://hash.test/v#", "ns"]]),
      },
    );
    const a001 = diagnostics.find((d) => d.code === "A001");
    expect(a001?.severity).toBe("error");
    expect(a001?.source).toBe("http://hash.test/v#");
    expect(a001?.message).toContain('"aa"');
    expect(a001?.message).toContain('"bb"');
    expect(output.prefixes.size).toBe(0);
  });

  it("accepts agreeing duplicate prefix declarations as one fact", () => {
    const { output, diagnostics } = resolve(
      [
        ["http://hash.test/v", GRAPHQL_TERMS.prefix, "vv", "literal"],
        ["http://hash.test/v#", GRAPHQL_TERMS.prefix, "vv", "literal"],
      ],
      {
        classes: [{ uri: "http://hash.test/v#Thing", superclasses: [] }],
        properties: [],
        namespaces: new Map([["http://hash.test/v#", "vv"]]),
      },
    );
    expect(diagnostics).toEqual([]);
    expect(output.prefixes.get("http://hash.test/v#")).toBe("vv");
  });
});

describe("annotations — A002 targets", () => {
  it("rejects a standard-vocabulary target", () => {
    const { diagnostics } = resolve([
      [RDFS_LABEL, GRAPHQL_TERMS.name, "Label", "literal"],
    ]);
    const a002 = diagnostics.find((d) => d.code === "A002");
    expect(a002?.severity).toBe("error");
    expect(a002?.message).toContain("standard-vocabulary");
    expect(a002?.source).toBe(RDFS_LABEL);
  });

  it("rejects a nonexistent term of a known namespace (typo)", () => {
    const { diagnostics } = resolve([
      [uri("Thnig"), GRAPHQL_TERMS.name, "Item", "literal"],
    ]);
    const a002 = diagnostics.find((d) => d.code === "A002");
    expect(a002?.message).toContain("not a declared class or property");
    expect(a002?.source).toBe(uri("Thnig"));
  });

  it("rejects a target in a namespace hosting no compiled term", () => {
    const { diagnostics } = resolve([
      ["http://absent.test/Thing", GRAPHQL_TERMS.name, "Item", "literal"],
    ]);
    const a002 = diagnostics.find((d) => d.code === "A002");
    expect(a002?.message).toContain("namespace hosting no compiled class");
  });

  it("rejects a graphql:prefix subject resolving to no discovered namespace", () => {
    const { output, diagnostics } = resolve([
      ["http://nowhere.test/x", GRAPHQL_TERMS.prefix, "no", "literal"],
    ]);
    const a002 = diagnostics.find((d) => d.code === "A002");
    expect(a002?.severity).toBe("error");
    expect(a002?.message).toContain(
      "does not resolve to a discovered namespace",
    );
    expect(output.prefixes.size).toBe(0);
  });

  it("accepts a cross-namespace annotation of a COMPILED term", () => {
    // The documented limitation (plan §2.4): with everything merged into the
    // default graph, a loaded package annotating another LOADED package's
    // term is indistinguishable from that package annotating itself. Both
    // namespaces here are compiled, so the annotation is accepted; full
    // ownership enforcement is the per-source named-graphs follow-up.
    const { output, diagnostics } = resolve(
      [["http://second.test/Thing", GRAPHQL_TERMS.name, "Renamed", "literal"]],
      {
        classes: [
          { uri: uri("Thing"), superclasses: [] },
          { uri: "http://second.test/Thing", superclasses: [] },
        ],
        namespaces: new Map([
          [NS, "ex"],
          ["http://second.test/", "sec"],
        ]),
      },
    );
    expect(diagnostics).toEqual([]);
    expect(output.classes.get("http://second.test/Thing")?.name).toBe(
      "Renamed",
    );
  });
});

describe("annotations — A003 values", () => {
  it("rejects a literal where an IRI is required", () => {
    const { diagnostics } = resolve([
      [uri("Thing"), GRAPHQL_TERMS.titleFrom, "not-an-iri", "literal"],
    ]);
    const a003 = diagnostics.find((d) => d.code === "A003");
    expect(a003?.severity).toBe("error");
    expect(a003?.message).toContain("needs an IRI value");
  });

  it("rejects an IRI where a string literal is required", () => {
    const { diagnostics } = resolve([
      [uri("Thing"), GRAPHQL_TERMS.name, uri("x"), "iri"],
    ]);
    const a003 = diagnostics.find((d) => d.code === "A003");
    expect(a003?.message).toContain("needs a string literal");
  });

  it("rejects an IRI where a boolean is required", () => {
    const { diagnostics } = resolve([
      [uri("Thing"), GRAPHQL_TERMS.abstract, uri("x"), "iri"],
    ]);
    const a003 = diagnostics.find((d) => d.code === "A003");
    expect(a003?.message).toContain("needs a boolean literal");
  });

  it("rejects an unparseable boolean", () => {
    const { output, diagnostics } = resolve([
      [uri("Thing"), GRAPHQL_TERMS.abstract, "maybe", "literal"],
    ]);
    const a003 = diagnostics.find((d) => d.code === "A003");
    expect(a003?.message).toContain('"maybe"');
    expect(a003?.message).toContain("use true or false");
    expect(output.classes.size).toBe(0);
  });

  it("rejects an IRI-valued graphql:prefix", () => {
    const { output, diagnostics } = resolve(
      [[NS, GRAPHQL_TERMS.prefix, uri("x"), "iri"]],
      {},
    );
    const a003 = diagnostics.find((d) => d.code === "A003");
    expect(a003?.message).toContain("needs a string literal");
    expect(output.prefixes.size).toBe(0);
  });

  it("rejects an empty graphql:prefix instead of binding it", () => {
    // "" is falsy: binding it would key NamespaceInfo (and every node's
    // `namespace`) on the empty string, which `??` cannot tell from unset.
    // The namespace must fall back to its registered/synthetic prefix.
    const { output, diagnostics } = resolve([
      [NS, GRAPHQL_TERMS.prefix, "", "literal"],
    ]);
    const a003 = diagnostics.find((d) => d.code === "A003");
    expect(a003?.severity).toBe("error");
    expect(a003?.source).toBe(NS);
    expect(a003?.message).toContain("empty string");
    expect(output.prefixes.has(NS)).toBe(false);
  });
});

describe("annotations — A004 recognition and applicability", () => {
  it("ignores an unrecognized graphql: local name with a warning", () => {
    const { output, diagnostics } = resolve([
      [uri("Thing"), `${GRAPHQL}naem`, "typo", "literal"],
    ]);
    const a004 = diagnostics.find((d) => d.code === "A004");
    expect(a004?.severity).toBe("warning");
    expect(a004?.message).toContain("graphql:naem");
    expect(a004?.message).toContain("not a v1 vocabulary term");
    expect(output.classes.size).toBe(0);
  });

  it("ignores a class-only term on a property, stating the applicability", () => {
    const { diagnostics } = resolve([
      [uri("name"), GRAPHQL_TERMS.abstract, "true", "literal"],
    ]);
    const a004 = diagnostics.find((d) => d.code === "A004");
    expect(a004?.severity).toBe("warning");
    expect(a004?.message).toContain("applies to class targets only");
    expect(a004?.message).toContain("is a property");
  });

  it("ignores a property-only term on a class", () => {
    const { diagnostics } = resolve([
      [uri("Thing"), GRAPHQL_TERMS.singular, "true", "literal"],
    ]);
    const a004 = diagnostics.find((d) => d.code === "A004");
    expect(a004?.message).toContain("applies to property targets only");
    expect(a004?.message).toContain("is a class");
  });

  it("explains WHY field-level expose is not minted", () => {
    const { diagnostics } = resolve([
      [uri("name"), GRAPHQL_TERMS.expose, "true", "literal"],
    ]);
    const a004 = diagnostics.find((d) => d.code === "A004");
    expect(a004?.message).toContain(
      "an exposed class emits its full field set",
    );
  });
});

describe("annotations — A005 config shadowing (config wins)", () => {
  it("warns when a full-IRI config key shadows an annotation with a different value", () => {
    const { output, diagnostics } = resolve(
      [[uri("Thing"), GRAPHQL_TERMS.name, "Annotated", "literal"]],
      {},
      { [uri("Thing")]: { graphqlName: "Configured" } },
    );
    const a005 = diagnostics.find((d) => d.code === "A005");
    expect(a005?.severity).toBe("warning");
    expect(a005?.message).toContain('"Configured"');
    expect(a005?.message).toContain('"Annotated"');
    expect(a005?.message).toContain("delete the config key");
    // The overlay keeps the annotation value; precedence is applied at the
    // consumption sites (config ?? overlay ?? heuristic).
    expect(output.classes.get(uri("Thing"))?.name).toBe("Annotated");
  });

  it("warns through the prefixed config key form for properties", () => {
    const { diagnostics } = resolve(
      [[uri("name"), GRAPHQL_TERMS.singular, "false", "literal"]],
      {},
      { "ex:name": { singular: true } },
    );
    const a005 = diagnostics.find((d) => d.code === "A005");
    expect(a005?.message).toContain("graphql:singular");
    expect(a005?.source).toBe(uri("name"));
  });

  it("covers the boolean class knobs (abstract, embeddable)", () => {
    const { diagnostics } = resolve(
      [
        [uri("Thing"), GRAPHQL_TERMS.abstract, "true", "literal"],
        [uri("Thing"), GRAPHQL_TERMS.embeddable, "true", "literal"],
      ],
      {},
      { [uri("Thing")]: { abstract: false, embeddable: false } },
    );
    expect(codes(diagnostics).filter((c) => c === "A005")).toHaveLength(2);
  });

  it("stays silent when config and annotation agree, or when either side is absent", () => {
    const { diagnostics } = resolve(
      [
        [uri("Thing"), GRAPHQL_TERMS.name, "Same", "literal"],
        [uri("name"), GRAPHQL_TERMS.name, "field", "literal"],
      ],
      {},
      {
        // agreeing values: no A005
        [uri("Thing")]: { graphqlName: "Same" },
        // config key present but a DIFFERENT knob than the annotation used:
        // both directions absent on one side each — no A005
        [uri("name")]: { singular: true },
        // config for an unannotated term: no A005
        [uri("Other")]: { graphqlName: "Nope" },
      },
    );
    expect(codes(diagnostics)).not.toContain("A005");
  });
});

describe("annotations — graphql:searchable (IR capture only)", () => {
  it("captures both boolean values on properties", () => {
    const { output, diagnostics } = resolve([
      [uri("link"), GRAPHQL_TERMS.searchable, "false", "literal"],
      [uri("name"), GRAPHQL_TERMS.searchable, "true", "literal"],
    ]);
    expect(diagnostics).toEqual([]);
    expect(output.properties.get(uri("name"))?.searchable).toBe(true);
    expect(output.properties.get(uri("link"))?.searchable).toBe(false);
  });

  it("rides the same A-band rails as every other term", () => {
    const { output, diagnostics } = resolve([
      // class target → A004 (property-only term)
      [uri("Thing"), GRAPHQL_TERMS.searchable, "true", "literal"],
      // conflict → A001
      [uri("link"), GRAPHQL_TERMS.searchable, "false", "literal"],
      [uri("link"), GRAPHQL_TERMS.searchable, "true", "literal"],
      // unparseable boolean → A003
      [uri("name"), GRAPHQL_TERMS.searchable, "maybe", "literal"],
    ]);
    expect(codes(diagnostics).sort()).toEqual(["A001", "A003", "A004"]);
    expect(output.properties.size).toBe(0);
    expect(output.classes.size).toBe(0);
  });
});

describe("annotations — empty input", () => {
  it("resolves an unannotated extraction to an empty overlay with no diagnostics", () => {
    const { output, diagnostics } = resolve([]);
    expect(diagnostics).toEqual([]);
    expect(output.classes.size).toBe(0);
    expect(output.properties.size).toBe(0);
    expect(output.prefixes.size).toBe(0);
  });
});
