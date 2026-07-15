import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PREFIX_MAP,
  P,
  PREFIX_MAP,
  resolvePrefixes,
  TRANSITIONAL_DS_PREFIX_MAP,
  TTL_PREFIXES,
} from "./prefixes.js";

describe("core PREFIX_MAP", () => {
  it("ships only generic RDF vocabularies — no design-system prefixes", () => {
    expect(Object.keys(PREFIX_MAP).sort()).toEqual([
      "owl",
      "rdf",
      "rdfs",
      "skos",
      "xsd",
    ]);
    expect(PREFIX_MAP).not.toHaveProperty("ds");
    expect(PREFIX_MAP).not.toHaveProperty("cs");
  });
});

describe("TRANSITIONAL_DS_PREFIX_MAP", () => {
  it("bundles the design-system prefixes separately from the core", () => {
    expect(TRANSITIONAL_DS_PREFIX_MAP).toEqual({
      ds: "https://ds.canonical.com/",
      cs: "http://pragma.canonical.com/codestandards#",
    });
  });
});

describe("DEFAULT_PREFIX_MAP (display set)", () => {
  it("reproduces the pre-P0 compaction set — ds/cs plus rdfs/owl/skos", () => {
    expect(Object.keys(DEFAULT_PREFIX_MAP).sort()).toEqual([
      "cs",
      "ds",
      "owl",
      "rdfs",
      "skos",
    ]);
  });

  it("omits rdf/xsd so URI compaction in output is unchanged", () => {
    expect(DEFAULT_PREFIX_MAP).not.toHaveProperty("rdf");
    expect(DEFAULT_PREFIX_MAP).not.toHaveProperty("xsd");
  });
});

describe("P accessor", () => {
  it("exposes prefixed-name accessors including the transitional ds/cs", () => {
    expect(P.ds).toBe("ds:");
    expect(P.cs).toBe("cs:");
    expect(P.rdfs).toBe("rdfs:");
    expect(P.owl).toBe("owl:");
    expect(P.skos).toBe("skos:");
  });
});

describe("TTL_PREFIXES", () => {
  it("declares every display prefix plus xsd", () => {
    expect(TTL_PREFIXES).toContain("@prefix ds: <https://ds.canonical.com/> .");
    expect(TTL_PREFIXES).toContain(
      "@prefix cs: <http://pragma.canonical.com/codestandards#> .",
    );
    expect(TTL_PREFIXES).toContain(
      "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .",
    );
  });
});

describe("resolvePrefixes", () => {
  it("returns core plus the transitional DS fallback for a bare core", () => {
    const resolved = resolvePrefixes([]);
    expect(resolved).toEqual({ ...PREFIX_MAP, ...TRANSITIONAL_DS_PREFIX_MAP });
  });

  it("layers package-declared prefixes over the fallback", () => {
    const resolved = resolvePrefixes([
      { prefixes: { ex: "https://example.org/" } },
    ]);
    expect(resolved.ex).toBe("https://example.org/");
    // core + fallback still present
    expect(resolved.ds).toBe(TRANSITIONAL_DS_PREFIX_MAP.ds);
    expect(resolved.rdf).toBe(PREFIX_MAP.rdf);
  });

  it("lets a package override the transitional DS fallback", () => {
    const resolved = resolvePrefixes([
      { prefixes: { ds: "https://packaged-ds.example/" } },
    ]);
    expect(resolved.ds).toBe("https://packaged-ds.example/");
  });

  it("lets config prefixes win over both packages and the fallback", () => {
    const resolved = resolvePrefixes(
      [{ prefixes: { ds: "https://packaged-ds.example/" } }],
      { ds: "https://config-ds.example/" },
    );
    expect(resolved.ds).toBe("https://config-ds.example/");
  });

  it("merges multiple packages in array order", () => {
    const resolved = resolvePrefixes([
      { prefixes: { a: "https://one.example/" } },
      { prefixes: { a: "https://two.example/", b: "https://b.example/" } },
    ]);
    expect(resolved.a).toBe("https://two.example/");
    expect(resolved.b).toBe("https://b.example/");
  });

  it("tolerates packages that declare no prefixes", () => {
    const resolved = resolvePrefixes([{}, { prefixes: undefined }]);
    expect(resolved).toEqual({ ...PREFIX_MAP, ...TRANSITIONAL_DS_PREFIX_MAP });
  });
});

describe("resolvePrefixes — injection & shadowing hardening", () => {
  let warnings: string[];
  let write: typeof process.stderr.write;

  beforeEach(() => {
    warnings = [];
    write = process.stderr.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      warnings.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
  });

  afterEach(() => {
    process.stderr.write = write;
  });

  it("drops a namespace that could break out of the SPARQL IRIREF", () => {
    // A `>` would close `<...>` early and inject arbitrary SPARQL into every
    // query the store runs.
    const resolved = resolvePrefixes([
      { prefixes: { evil: "http://e> SELECT * WHERE {?s ?p ?o} #" } },
    ]);
    expect(resolved).not.toHaveProperty("evil");
    expect(warnings.join("")).toContain("not valid in an IRI");
  });

  it("rejects namespaces containing whitespace or angle/quote/brace chars", () => {
    const resolved = resolvePrefixes([
      {
        prefixes: {
          space: "http://e /x",
          quote: 'http://e"x',
          brace: "http://e{x}",
        },
      },
    ]);
    expect(resolved).not.toHaveProperty("space");
    expect(resolved).not.toHaveProperty("quote");
    expect(resolved).not.toHaveProperty("brace");
  });

  it("keeps a clean namespace untouched", () => {
    const resolved = resolvePrefixes([
      { prefixes: { ex: "https://example.org/ns#" } },
    ]);
    expect(resolved.ex).toBe("https://example.org/ns#");
    expect(warnings).toHaveLength(0);
  });

  it("refuses to let a package redefine a reserved core prefix", () => {
    const resolved = resolvePrefixes([
      { prefixes: { rdf: "https://evil.example/rdf#" } },
    ]);
    expect(resolved.rdf).toBe(PREFIX_MAP.rdf);
    expect(warnings.join("")).toContain("reserved");
  });

  it("refuses reserved prefixes from config too", () => {
    const resolved = resolvePrefixes([], { owl: "https://evil.example/owl#" });
    expect(resolved.owl).toBe(PREFIX_MAP.owl);
  });

  it("skips a malformed prefix name", () => {
    const resolved = resolvePrefixes([
      { prefixes: { "bad name!": "https://example.org/" } },
    ]);
    expect(resolved).not.toHaveProperty("bad name!");
    expect(warnings.join("")).toContain("not a valid prefix name");
  });

  it("warns on a last-wins collision between two packages", () => {
    const resolved = resolvePrefixes([
      { prefixes: { a: "https://one.example/" } },
      { prefixes: { a: "https://two.example/" } },
    ]);
    expect(resolved.a).toBe("https://two.example/");
    expect(warnings.join("")).toContain("overrides an earlier declaration");
  });

  it("names the declaring package in collision warnings when available", () => {
    resolvePrefixes([
      { name: "@canonical/one", prefixes: { a: "https://one.example/" } },
      { name: "@canonical/two", prefixes: { a: "https://two.example/" } },
    ]);
    expect(warnings.join("")).toContain('package "@canonical/two"');
  });

  it("does not warn when a package overrides the trusted DS fallback", () => {
    resolvePrefixes([{ prefixes: { ds: "https://packaged-ds.example/" } }]);
    expect(warnings).toHaveLength(0);
  });
});
