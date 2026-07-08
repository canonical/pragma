// =============================================================================
// Pass 1 — Extract unit tests. The only pass that touches the store, so it is
// exercised two ways: a real fixture store for the happy path, and a crafted
// QueryFn (the pass's sole dependency) for the term-shape guards and the
// SPARQL failure modes a valid store cannot reproduce.
// =============================================================================

import type { QueryResult, SelectResult, Term } from "@canonical/ke";
import { createTestStore } from "@canonical/ke/testing";
import { afterEach, describe, expect, it } from "vitest";
import { MINIMAL_TTL, PREFIXES } from "../../testing/index.js";
import type { QueryFn } from "../shared/index.js";
import extract from "./extract.js";
import { createStoreQueryFn } from "./index.js";

const OWL = "http://www.w3.org/2002/07/owl#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const XSD = "http://www.w3.org/2001/XMLSchema#";
const EX = "http://example.org/";

const named = (value: string): Term => ({ termType: "NamedNode", value });
const literal = (
  value: string,
  extra: { datatype?: string; language?: string } = {},
): Term => ({ termType: "Literal", value, ...extra });
const blank = (value: string): Term => ({ termType: "BlankNode", value });

const select = (rows: Record<string, Term>[]): SelectResult => ({
  type: "select",
  variables: rows[0] ? Object.keys(rows[0]) : [],
  bindings: [],
  termBindings: rows,
});

const EMPTY = select([]);

/** A query result keyed by a fragment that uniquely identifies one query. */
type Routes = Array<[fragment: string, result: QueryResult | (() => never)]>;

/**
 * Build a QueryFn that returns EMPTY for every query unless a route fragment
 * matches; a function route throws (to exercise the select/catch paths).
 */
const router =
  (routes: Routes): QueryFn =>
  async (query: string) => {
    for (const [fragment, result] of routes) {
      if (query.includes(fragment)) {
        if (typeof result === "function") {
          return result();
        }
        return result;
      }
    }
    return EMPTY;
  };

const NO_PREFIXES: Record<string, string> = {};

describe("extract — real fixture store", () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("extracts classes, properties, namespaces, and stats end to end", async () => {
    const store = await createTestStore({
      ttl: MINIMAL_TTL,
      prefixes: PREFIXES,
    });
    cleanup = store.cleanup;
    const { output, diagnostics } = await extract(
      createStoreQueryFn(store.store),
      PREFIXES,
    );
    expect(output.classes.map((c) => c.uri)).toContain(`${EX}Thing`);
    const thing = output.classes.find((c) => c.uri === `${EX}Thing`);
    expect(thing?.label).toBe("Thing");
    expect(thing?.definition).toBe("A concrete thing.");
    expect(output.properties.map((p) => p.uri).sort()).toEqual([
      `${EX}count`,
      `${EX}name`,
    ]);
    expect(output.namespaces.get(EX)).toBe("ex");
    expect(output.instanceStats.get(`${EX}Thing`)).toEqual({
      total: 1,
      named: 1,
    });
    expect(diagnostics).toHaveLength(0);
  });
});

describe("extract — select failure modes", () => {
  it("emits E001 when a SELECT returns a non-select result", async () => {
    const query = router([
      [
        "?class ?label ?definition ?comment ?superclass",
        { type: "ask", result: true },
      ],
    ]);
    const { output, diagnostics } = await extract(query, PREFIXES);
    expect(output.classes).toEqual([]);
    const e001 = diagnostics.find(
      (d) => d.code === "E001" && d.message.includes("expected SELECT"),
    );
    expect(e001?.severity).toBe("error");
  });

  it("emits E001 when a query throws", async () => {
    const query = router([
      [
        "?class ?label ?definition ?comment ?superclass",
        () => {
          throw new Error("boom");
        },
      ],
    ]);
    const { diagnostics } = await extract(query, PREFIXES);
    expect(
      diagnostics.some((d) => d.code === "E001" && d.message.includes("boom")),
    ).toBe(true);
  });

  it("stringifies a non-Error thrown value", async () => {
    const query: QueryFn = async (q: string) => {
      if (q.includes("?class ?label ?definition ?comment ?superclass")) {
        throw "plain string failure";
      }
      return EMPTY;
    };
    const { diagnostics } = await extract(query, PREFIXES);
    expect(
      diagnostics.some((d) => d.message.includes("plain string failure")),
    ).toBe(true);
  });
});

describe("extract — class rows", () => {
  it("skips standard-vocabulary classes and collects superclasses once", async () => {
    const query = router([
      [
        "?class ?label ?definition ?comment ?superclass",
        select([
          // standard-vocab class is skipped
          { class: named(`${OWL}Thing`) },
          // non-NamedNode class is skipped
          { class: blank("_:x") },
          // comment used as the definition fallback; superclass deduped
          {
            class: named(`${EX}A`),
            comment: literal("from comment"),
            superclass: named(`${EX}Base`),
          },
          { class: named(`${EX}A`), superclass: named(`${EX}Base`) },
        ]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    expect(output.classes).toHaveLength(1);
    const a = output.classes[0];
    expect(a?.uri).toBe(`${EX}A`);
    expect(a?.definition).toBe("from comment");
    expect(a?.superclasses).toEqual([`${EX}Base`]);
  });
});

describe("extract — property rows", () => {
  it("skips standard-vocab properties and resolves each kind", async () => {
    const query = router([
      [
        "?prop ?kind ?label ?definition ?comment ?domain ?range",
        select([
          {
            prop: named(`${RDFS}label`),
            kind: named(`${OWL}DatatypeProperty`),
          },
          {
            prop: named(`${EX}d`),
            kind: named(`${OWL}DatatypeProperty`),
            domain: named(`${EX}C`),
            range: named(`${XSD}string`),
          },
          { prop: named(`${EX}a`), kind: named(`${OWL}AnnotationProperty`) },
          { prop: named(`${EX}o`), kind: named(`${OWL}ObjectProperty`) },
        ]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    const byUri = new Map(output.properties.map((p) => [p.uri, p]));
    expect(byUri.has(`${RDFS}label`)).toBe(false);
    expect(byUri.get(`${EX}d`)?.kind).toBe("datatype");
    expect(byUri.get(`${EX}a`)?.kind).toBe("annotation");
    expect(byUri.get(`${EX}o`)?.kind).toBe("object");
    expect(byUri.get(`${EX}d`)?.domains).toEqual([`${EX}C`]);
  });
});

describe("extract — inverses (Q3)", () => {
  it("keeps fully-bound inverse pairs and drops partial rows", async () => {
    const query = router([
      [
        "?prop ?inverse WHERE",
        select([
          { prop: named(`${EX}hasChild`), inverse: named(`${EX}childOf`) },
          { prop: named(`${EX}lonely`) }, // missing inverse → dropped
        ]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    expect(output.inverses).toEqual([
      { property: `${EX}hasChild`, inverse: `${EX}childOf` },
    ]);
  });
});

describe("extract — self-referential predicates (Q10)", () => {
  it("collects named self-referential predicates and skips non-named rows", async () => {
    const query = router([
      [
        "{ ?s ?p ?s }",
        select([
          { p: named(`${EX}extends`) },
          { p: blank("_:anon") }, // non-NamedNode → skipped
        ]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    expect(output.selfReferential.has(`${EX}extends`)).toBe(true);
    expect(output.selfReferential.size).toBe(1);
  });
});

describe("extract — datatypes", () => {
  it("skips standard-vocab datatypes", async () => {
    const query = router([
      [
        "?dt ?base ?pattern",
        select([
          { dt: named(`${XSD}custom`), base: named(`${XSD}string`) },
          {
            dt: named(`${EX}Version`),
            base: named(`${XSD}string`),
            pattern: literal("\\d+"),
          },
        ]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    expect(output.datatypes).toHaveLength(1);
    expect(output.datatypes[0]).toEqual({
      uri: `${EX}Version`,
      baseType: `${XSD}string`,
      pattern: "\\d+",
    });
  });
});

describe("extract — namespace discovery", () => {
  it("assigns a synthetic prefix and warns for an unregistered namespace", async () => {
    const query = router([
      [
        "?class ?label ?definition ?comment ?superclass",
        select([{ class: named("http://unregistered.test/Foo") }]),
      ],
    ]);
    // Pass an empty prefix map so the discovered namespace has no prefix.
    const { output, diagnostics } = await extract(query, NO_PREFIXES);
    expect(output.namespaces.get("http://unregistered.test/")).toBe("ns");
    expect(
      diagnostics.some(
        (d) =>
          d.severity === "warning" &&
          d.message.includes("no registered prefix"),
      ),
    ).toBe(true);
  });
});

describe("extract — SHACL direct constraints", () => {
  it("resolves sh:in values, skips guard rows, attaches inValues", async () => {
    const query = router([
      [
        "?targetClass ?path ?minCount ?maxCount ?inList",
        select([
          // guard: missing path is skipped
          { targetClass: named(`${EX}C`) },
          {
            targetClass: named(`${EX}C`),
            path: named(`${EX}mode`),
            minCount: literal("1"),
            maxCount: literal("not-a-number"),
            inList: named("_:list"),
          },
        ]),
      ],
      [
        "?path ?value WHERE",
        select([
          // guard: missing path skipped
          { value: literal("x") },
          // guard: value neither literal nor NamedNode (blank) skipped
          { path: named(`${EX}mode`), value: blank("_:b") },
          { path: named(`${EX}mode`), value: literal("fast") },
          { path: named(`${EX}mode`), value: named(`${EX}slow`) },
        ]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    expect(output.shaclConstraints).toHaveLength(1);
    const c = output.shaclConstraints[0];
    expect(c?.minCount).toBe(1);
    // non-numeric maxCount parses to undefined
    expect(c?.maxCount).toBeUndefined();
    expect(c?.inValues).toEqual(["fast", `${EX}slow`]);
  });

  it("omits inValues when no sh:in list is present", async () => {
    const query = router([
      [
        "?targetClass ?path ?minCount ?maxCount ?inList",
        select([{ targetClass: named(`${EX}C`), path: named(`${EX}p`) }]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    expect(output.shaclConstraints[0]?.inValues).toBeUndefined();
  });
});

describe("extract — SHACL sh:or branches", () => {
  it("flags sh:or constraints and skips guard rows", async () => {
    const query = router([
      [
        "?targetClass ?path ?minCount ?maxCount WHERE",
        select([
          { targetClass: named(`${EX}C`) }, // missing path → skipped
          {
            targetClass: named(`${EX}C`),
            path: named(`${EX}hop`),
            maxCount: literal("1"),
          },
        ]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    const fromOr = output.shaclConstraints.filter((c) => c.fromOr);
    expect(fromOr).toHaveLength(1);
    expect(fromOr[0]?.property).toBe(`${EX}hop`);
  });
});

describe("extract — unions", () => {
  it("collects named unions and skips member guard rows", async () => {
    const query = router([
      [
        "?class ?member",
        select([
          { class: named(`${EX}U`) }, // missing member → skipped
          { class: named(`${EX}U`), member: named(`${EX}A`) },
          { class: named(`${EX}U`), member: named(`${EX}B`) },
        ]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    const named1 = output.unions.find((u) => u.uri === `${EX}U`);
    expect(named1?.members).toEqual([`${EX}A`, `${EX}B`]);
  });

  it("collects anonymous range unions and skips member guard rows", async () => {
    const query = router([
      [
        "?property ?member",
        select([
          { member: named(`${EX}A`) }, // missing property → skipped
          { property: named(`${EX}rel`), member: named(`${EX}A`) },
          { property: named(`${EX}rel`), member: named(`${EX}B`) },
        ]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    const anon = output.unions.find((u) => u.property === `${EX}rel`);
    expect(anon?.members).toEqual([`${EX}A`, `${EX}B`]);
  });
});

describe("extract — instance stats", () => {
  it("skips rows with an unparseable total", async () => {
    const query = router([
      [
        "(COUNT(?i) AS ?total)",
        select([
          { class: named(`${EX}A`), total: literal("oops") }, // skipped
          { class: named(`${EX}B`), total: literal("3"), named: literal("2") },
          // named missing → defaults to 0
          { class: named(`${EX}C`), total: literal("1") },
        ]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    expect(output.instanceStats.has(`${EX}A`)).toBe(false);
    expect(output.instanceStats.get(`${EX}B`)).toEqual({ total: 3, named: 2 });
    expect(output.instanceStats.get(`${EX}C`)).toEqual({ total: 1, named: 0 });
  });
});

describe("extract — functional violations (Q11)", () => {
  it("queries violations only when functional properties exist", async () => {
    const query = router([
      [
        "<http://www.w3.org/2002/07/owl#FunctionalProperty> }",
        select([
          { prop: named(`${EX}rank`) },
          { prop: blank("_:anon") }, // non-NamedNode → dropped from the set
        ]),
      ],
      [
        "?o1 != ?o2",
        select([
          { p: named(`${EX}rank`) },
          { p: blank("_:anon") }, // non-NamedNode → not recorded
        ]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    expect(output.functionals.has(`${EX}rank`)).toBe(true);
    expect(output.functionals.size).toBe(1);
    expect(output.functionalViolations.has(`${EX}rank`)).toBe(true);
    expect(output.functionalViolations.size).toBe(1);
  });
});

describe("extract — undeclared predicates (Q12)", () => {
  it("flags predicates in a known namespace that are missing from the TBox", async () => {
    const query = router([
      [
        "SELECT DISTINCT ?p WHERE { ?s ?p ?o }",
        select([
          { p: named(`${EX}undeclared`) }, // in ex namespace, not a property
          { p: named(`${RDFS}label`) }, // standard vocab → skipped
          { p: blank("_:anon") }, // non-NamedNode → skipped
          { p: named("http://foreign.test/pred") }, // unknown namespace → skipped
        ]),
      ],
      [
        "?class ?label ?definition ?comment ?superclass",
        select([{ class: named(`${EX}Thing`) }]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    expect(output.undeclaredPredicates.has(`${EX}undeclared`)).toBe(true);
    expect(output.undeclaredPredicates.has(`${RDFS}label`)).toBe(false);
    expect(output.undeclaredPredicates.has("http://foreign.test/pred")).toBe(
      false,
    );
    expect(output.undeclaredPredicates.size).toBe(1);
  });
});

describe("extract — annotation assertions", () => {
  it("collects annotation values and skips non-literal guard rows", async () => {
    const query = router([
      [
        "?prop ?kind ?label ?definition ?comment ?domain ?range",
        select([
          { prop: named(`${EX}note`), kind: named(`${OWL}AnnotationProperty`) },
        ]),
      ],
      [
        "?target ?prop ?value",
        select([
          // value is not a literal → skipped
          {
            target: named(`${EX}A`),
            prop: named(`${EX}note`),
            value: named(`${EX}X`),
          },
          {
            target: named(`${EX}A`),
            prop: named(`${EX}note`),
            value: literal("hello"),
          },
        ]),
      ],
    ]);
    const { output } = await extract(query, PREFIXES);
    expect(output.annotations.get(`${EX}A`)?.get(`${EX}note`)).toBe("hello");
  });
});

describe("extract — depth guard", () => {
  it("warns when blank nodes nest deeper than one level", async () => {
    const query = router([["ASK", { type: "ask", result: true }]]);
    const { output, diagnostics } = await extract(query, PREFIXES);
    expect(output.deepBlankNesting).toBe(true);
    expect(
      diagnostics.some(
        (d) => d.severity === "warning" && d.message.includes("nest deeper"),
      ),
    ).toBe(true);
  });

  it("emits E001 when the depth-guard ASK throws", async () => {
    const query: QueryFn = async (q: string) => {
      if (q.startsWith("ASK")) {
        throw new Error("ask failed");
      }
      return EMPTY;
    };
    const { output, diagnostics } = await extract(query, PREFIXES);
    expect(output.deepBlankNesting).toBe(false);
    expect(
      diagnostics.some(
        (d) =>
          d.code === "E001" && d.message.includes("depth guard: ask failed"),
      ),
    ).toBe(true);
  });

  it("stringifies a non-Error thrown by the depth guard", async () => {
    const query: QueryFn = async (q: string) => {
      if (q.startsWith("ASK")) {
        throw 42;
      }
      return EMPTY;
    };
    const { diagnostics } = await extract(query, PREFIXES);
    expect(diagnostics.some((d) => d.message.includes("depth guard: 42"))).toBe(
      true,
    );
  });
});
