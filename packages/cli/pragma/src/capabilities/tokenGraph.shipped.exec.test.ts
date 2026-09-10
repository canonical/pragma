/**
 * The `token` and `variable` stories, EXECUTED against the shipped pack
 * (PROTECTED).
 *
 * `token.parity.test.ts` and `variable.parity.test.ts` assert the stories'
 * semantics over fixture graphs this repository authors. That is a real check,
 * but a fixture obligingly asserts whatever the story reads — it can prove the
 * story agrees with the fixture and nothing about the corpus a release actually
 * ships. So this file boots the shipped graph and asserts the two things a
 * fixture structurally cannot.
 *
 * FIRST, that every graph term the two stories name is DEFINED by the shipped
 * ontology. Defined, not asserted, and the difference is the whole point: a
 * term the ontology never defines is a story bug that can never render, on any
 * entity, on any install — the defect that let `block lookup` publish no usage
 * narrative for every block on every install, silently, because a name that
 * maps onto no property is exactly what OPTIONAL parity swallows. A term the
 * ontology defines that no instance asserts yet is a content gap and not this
 * suite's business.
 *
 * SECOND, the corpus INVARIANTS the two nouns' addressability rests on: that
 * every symbol and every variable carries exactly one name literal, that the
 * dash-stripping which makes a variable typable is injective and collides with
 * no symbol name, and that a resolved value carries exactly one of a chain or a
 * derivation. Each of those is a property of the whole population, so each is
 * asserted as a count of VIOLATIONS being zero rather than as a row count the
 * next upstream release would move. The populations themselves are deliberately
 * not pinned: upstream adds symbols, and a test that failed because it did
 * would be a test of the wrong thing.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compileStoryModule } from "../kernel/packs/compile.js";
import {
  distributionSource,
  isNestedExpand,
  type PackExpandSelect,
  type PackLookup,
  type PackPage,
} from "../kernel/packs/types.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { bootRuntime } from "../kernel/runtime/boot.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { CapabilityModule, VerbSpec } from "../kernel/spec/types.js";
import { TEST_FLAGS } from "../testing/helpers/projectCli.js";
import { declaredStories } from "./distribution.js";

const SOURCE = distributionSource("pragma.conf.ts");

/** The two stories this file owns, and their compiled modules. */
const NOUNS = ["token", "variable"] as const;

const modules = new Map<string, CapabilityModule>(
  NOUNS.map((noun) => {
    const story = declaredStories.get(noun);
    if (!story) throw new Error(`pragma.conf.ts declares no "${noun}" story`);
    return [noun, compileStoryModule(story, SOURCE, {})];
  }),
);

const lookups = new Map<string, PackLookup>(
  NOUNS.map((noun) => {
    const lookup = declaredStories.get(noun)?.lookup;
    if (!lookup) throw new Error(`the "${noun}" story declares no lookup`);
    return [noun, lookup];
  }),
);

function verb(noun: string, name: string): VerbSpec {
  const found = modules
    .get(noun)
    ?.verbs.find((v) => verbKey(v.path) === `${noun} ${name}`);
  if (!found) throw new Error(`no compiled "${noun} ${name}" verb`);
  return found;
}

/** One graph term a story names, paired with the site that declares it. */
interface DeclaredTerm {
  readonly what: string;
  readonly term: string;
}

/**
 * Standard RDF vocabulary, which no domain ontology declares and every graph
 * carries. The distribution's own vocabulary declaration leaves `rdfs:label`
 * and `rdfs:comment` out for exactly this reason — "the kernel treats standard
 * vocabulary as universal" — and the list walk that reads an `rdf:List` is the
 * same case: `rdf:first` and `rdf:rest` are the list's own structure, not terms
 * a token ontology could define.
 *
 * Skipped here rather than admitted by a looser ASK, so the sweep below stays a
 * hard requirement on every DOMAIN term and this exemption is a readable list
 * rather than a widened predicate.
 */
const STANDARD_VOCABULARY = new Set([
  "rdf:first",
  "rdf:rest",
  "rdfs:label",
  "rdfs:comment",
]);

/**
 * The individual property steps of a declared term.
 *
 * A declared term may be a property PATH, and the shipped stories use three
 * shapes of one: an inverse step (`^dt:symbol`, from a symbol back to the
 * definitions that point at it), a sequence (`dt:under/dt-web:selector`), and a
 * list walk, whose middle step carries a zero-or-more marker. An ASK over the path
 * itself is not the question — the question is whether each STEP names a
 * property the ontology defines — and a path spliced into an ASK's subject
 * position would not even parse.
 */
function steps(term: string): string[] {
  return term
    .split("/")
    .map((step) => step.replace(/^\^/, "").replace(/[*+?]$/, ""))
    .filter((step) => step !== "" && !STANDARD_VOCABULARY.has(step));
}

/** Every term an `expand.select` names, to whatever depth it nests. */
function selectedTerms(
  site: string,
  select: readonly PackExpandSelect[],
): readonly DeclaredTerm[] {
  return select.flatMap((entry) =>
    isNestedExpand(entry)
      ? [
          { what: `${site} → nested "${entry.name}"`, term: entry.relation },
          ...selectedTerms(`${site} → "${entry.name}"`, entry.select),
        ]
      : [{ what: `${site} → field "${entry.name}"`, term: entry.property }],
  );
}

/**
 * Every property the two stories name in the graph, read from the declaration
 * rather than listed — a term added to any field, section or expand is covered
 * the moment it is declared, by the author who declares it.
 *
 * The LOOKUP half only. A list query is author TEXT the kernel does not
 * compose, so its terms cannot be enumerated from the declaration; what guards
 * those is that the list must answer rows at all, which the cross-noun
 * round-trip sweep asserts for every noun with both halves.
 */
const DECLARED_TERMS: readonly DeclaredTerm[] = NOUNS.flatMap((noun) => {
  const lookup = lookups.get(noun) as PackLookup;
  return [
    { what: `${noun} lookup \`by\``, term: lookup.by },
    ...(lookup.fields ?? []).map((f) => ({
      what: `${noun} field "${f.name}"`,
      term: f.property,
    })),
    ...(lookup.sections ?? []).map((s) => ({
      what: `${noun} section "${s.name}"`,
      term: s.property,
    })),
    ...(lookup.expand ?? []).flatMap((e) => [
      { what: `${noun} expand "${e.name}"`, term: e.relation },
      ...selectedTerms(`${noun} expand "${e.name}"`, e.select),
    ]),
  ];
});

/** One case per (declaration site, property step). */
const DECLARED_STEPS: readonly { what: string; property: string }[] =
  DECLARED_TERMS.flatMap(({ what, term }) =>
    steps(term).map((property) => ({ what, property })),
  );

// ONE store for the file — booting the shipped pack is the expensive part, and
// this package already contends under parallel runs.
let rt: PragmaRuntime;
beforeAll(async () => {
  rt = bootRuntime(TEST_FLAGS);
  await rt.store.get();
}, 60_000);
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

/** One scalar from the shipped graph, queried directly. */
async function count(query: string): Promise<number> {
  const result = await rt.query.sparql(query);
  if (result.type !== "select") throw new Error("expected a SELECT");
  return Number(Object.values(result.bindings[0] ?? {})[0] ?? Number.NaN);
}

/** The rows of a list-shaped verb over the shipped pack. */
async function rows(
  noun: string,
  name: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, string>[]> {
  const page = (await verb(noun, name).run(params, rt)) as PackPage;
  return [...page.rows];
}

/** One looked-up entity from the shipped pack. */
async function lookup(
  noun: string,
  name: string,
): Promise<Record<string, unknown>> {
  const out = (await verb(noun, "lookup").run({ name: [name] }, rt)) as {
    errors: unknown[];
    results: Record<string, unknown>[];
  };
  expect(out.errors).toEqual([]);
  return out.results[0] as Record<string, unknown>;
}

describe("every declared term is DEFINED by the shipped ontology (PROTECTED)", () => {
  it("derives the sweep from the declarations rather than a list", () => {
    // A guard, not a no-op: an empty derivation would make every case below
    // vacuous. Both nouns declare a `by`, fields and expands, so the floor is
    // comfortably above zero without pinning a number that moves whenever a
    // field is added.
    expect(DECLARED_STEPS.length).toBeGreaterThanOrEqual(15);
    expect(DECLARED_TERMS.map((t) => t.what)).toContain("token lookup `by`");
    expect(DECLARED_TERMS.map((t) => t.what)).toContain("variable lookup `by`");
  });

  it.each(DECLARED_STEPS)(
    "$what reads $property, which the shipped ontology defines",
    async ({ what, property }) => {
      const result = await rt.query.sparql(
        [
          "ASK {",
          `  ${property} a ?kind .`,
          "  VALUES ?kind { owl:DatatypeProperty owl:ObjectProperty }",
          "}",
        ].join("\n"),
      );
      expect(result.type).toBe("ask");
      expect(
        result.type === "ask" ? result.result : false,
        `${what} reads ${property}, which the shipped ontology does not define — it can never render, for any entity, on any install`,
      ).toBe(true);
    },
  );
});

describe("the name literal both nouns key on (PROTECTED)", () => {
  it("every symbol carries exactly one label", async () => {
    // Both halves of the grammar REQUIRE it and neither declares a fallback,
    // so a symbol without one is published by neither and a symbol with two
    // would be published twice under different names.
    expect(
      await count(
        `SELECT (COUNT(DISTINCT ?s) AS ?n) WHERE {
           ?s a dt:TokenSymbol .
           FILTER NOT EXISTS { ?s rdfs:label ?l }
         }`,
      ),
    ).toBe(0);
    expect(
      await count(
        `SELECT (COUNT(?s) AS ?n) WHERE {
           SELECT ?s (COUNT(DISTINCT ?l) AS ?labels) WHERE {
             ?s a dt:TokenSymbol ; rdfs:label ?l .
           } GROUP BY ?s HAVING (COUNT(DISTINCT ?l) > 1)
         }`,
      ),
    ).toBe(0);
  });

  it("every variable carries exactly one label", async () => {
    expect(
      await count(
        `SELECT (COUNT(DISTINCT ?v) AS ?n) WHERE {
           ?v a dt:Variable .
           FILTER NOT EXISTS { ?v rdfs:label ?l }
         }`,
      ),
    ).toBe(0);
    expect(
      await count(
        `SELECT (COUNT(?v) AS ?n) WHERE {
           SELECT ?v (COUNT(DISTINCT ?l) AS ?labels) WHERE {
             ?v a dt:Variable ; rdfs:label ?l .
           } GROUP BY ?v HAVING (COUNT(DISTINCT ?l) > 1)
         }`,
      ),
    ).toBe(0);
  });

  it("a variable's label IS its CSS name with the leading dashes stripped", async () => {
    // This is what makes the noun addressable at all — a `--`-prefixed
    // positional cannot be typed — and it is upstream's promise rather than
    // this repository's derivation. Asserted as zero violations, so it holds
    // however many variables upstream ships.
    expect(
      await count(
        `SELECT (COUNT(?v) AS ?n) WHERE {
           ?v a dt:Variable ; rdfs:label ?l .
           BIND(REPLACE(REPLACE(STR(?v), "^.*[/#]", ""), "^--", "") AS ?stripped)
           FILTER(?l != ?stripped)
         }`,
      ),
    ).toBe(0);
  });

  it("a symbol's label IS its dotted local name, dots intact", async () => {
    // The reason no IRI-derived fallback is declared: the kernel's derivation
    // publishes these dots as SLASHES, which would disagree with the notation
    // the label uses and the anatomy spells. Pinning the agreement is what
    // makes that a considered omission rather than a guess.
    expect(
      await count(
        `SELECT (COUNT(?s) AS ?n) WHERE {
           ?s a dt:TokenSymbol ; rdfs:label ?l .
           BIND(REPLACE(STR(?s), "^.*[/#]", "") AS ?derived)
           FILTER(?l != ?derived)
         }`,
      ),
    ).toBe(0);
  });

  it("the stripping is INJECTIVE — no two variables answer to one name", async () => {
    // If two ever collided, a lookup would answer one and silently hide the
    // other, which is the shape of defect the round-trip guard exists for.
    const variables = await count(
      "SELECT (COUNT(DISTINCT ?v) AS ?n) WHERE { ?v a dt:Variable }",
    );
    const names = await count(
      "SELECT (COUNT(DISTINCT ?l) AS ?n) WHERE { ?v a dt:Variable ; rdfs:label ?l }",
    );
    expect(names).toBe(variables);
  });

  it("no variable name collides with a symbol name", async () => {
    // The two nouns share one flat namespace as far as a caller is concerned,
    // so a shared name would make `token lookup X` and `variable lookup X`
    // answer different entities under one spelling.
    expect(
      await count(
        `SELECT (COUNT(*) AS ?n) WHERE {
           ?v a dt:Variable ; rdfs:label ?name .
           ?s a dt:TokenSymbol ; rdfs:label ?name .
         }`,
      ),
    ).toBe(0);
  });
});

describe("a resolved value carries a chain XOR a derivation (PROTECTED)", () => {
  it("never both, and never neither", async () => {
    // The shape's own rule, and the reason both S3 surfaces select both: a
    // surface reading only the chain renders every derived routing blank, and
    // one reading only the derivation renders every ordinary value blank.
    expect(
      await count(
        `SELECT (COUNT(?r) AS ?n) WHERE {
           ?r a dt:ResolvedValue .
           OPTIONAL { ?r dt:resolutionChain ?c }
           OPTIONAL { ?r dt:derivedFrom ?d }
           FILTER((BOUND(?c) && BOUND(?d)) || (!BOUND(?c) && !BOUND(?d)))
         }`,
      ),
    ).toBe(0);
  });

  it("a derived routing carries NO value of its own", async () => {
    expect(
      await count(
        `SELECT (COUNT(?r) AS ?n) WHERE {
           ?r a dt:ResolvedValue ; dt:derivedFrom ?d ; dt:resolvesTo ?v .
         }`,
      ),
    ).toBe(0);
  });

  it("both kinds are present, so neither branch is untested here", async () => {
    // Without this the two assertions above would pass vacuously on a corpus
    // that had lost one kind entirely.
    expect(
      await count(
        "SELECT (COUNT(?r) AS ?n) WHERE { ?r dt:resolutionChain ?c }",
      ),
    ).toBeGreaterThan(0);
    expect(
      await count("SELECT (COUNT(?r) AS ?n) WHERE { ?r dt:derivedFrom ?d }"),
    ).toBeGreaterThan(0);
  });
});

describe("the shipped nouns answer, end to end (PROTECTED)", () => {
  it("token list publishes rows, and every row is named and typed or blank", async () => {
    const page = (await verb("token", "list").run(
      { limit: 50 },
      rt,
    )) as PackPage;
    expect(page.rows.length).toBeGreaterThan(0);
    for (const row of page.rows) {
      expect(row.name, JSON.stringify(row)).toBeTruthy();
      // The agreement rule's contract: `type` is either the agreed value or
      // empty. It is never a partial guess, and never an IRI.
      expect(row.type ?? "").not.toContain("://");
    }
  });

  it("a dotted symbol name resolves, with its definitions shown apart", async () => {
    const symbol = await lookup("token", "color.text");
    expect(symbol).toMatchObject({ name: "color.text" });
    const definitions = symbol.definitions as Record<string, string>[];
    // Many definitions is the fact the agreement rule exists for, and the only
    // surface that can show them apart. Asserted as a floor, not a count:
    // upstream adds modifier contexts.
    expect(definitions.length).toBeGreaterThan(1);
    expect(new Set(definitions.map((d) => d.type))).toEqual(new Set(["color"]));
    // Coverage reads the family end of the relation; values read the other.
    expect((symbol.coverage as unknown[]).length).toBeGreaterThan(0);
    expect((symbol.values as unknown[]).length).toBeGreaterThan(0);
  });

  it("a channel names the symbol it provisions and resolves by derivation", async () => {
    const channel = await lookup("token", "modifier.color.text");
    expect(channel).toMatchObject({ channelOf: "color.text" });
    const values = channel.values as Record<string, string>[];
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(value.derivedFrom, JSON.stringify(value)).toBeTruthy();
      expect(value.value).toBeUndefined();
    }
  });

  it("token values answers a symbol's materialised positions", async () => {
    const answered = await rows("token", "values", { symbol: "color.text" });
    expect(answered.length).toBeGreaterThan(0);
    for (const row of answered) expect(row.symbol).toBe("color.text");
    // The default position is a row with no coordinate; the mode coordinate is
    // one the resolver materialises. Both spellings, neither an IRI.
    expect(answered.some((row) => row.position === undefined)).toBe(true);
    for (const row of answered) {
      expect(row.position ?? "").not.toContain("://");
    }
  });

  it("a dash-stripped variable name resolves, with its declarations", async () => {
    const variable = await lookup("variable", "color-text");
    expect(variable).toMatchObject({
      name: "color-text",
      symbol: "color.text",
    });
    const declarations = variable.declarations as Record<string, string>[];
    expect(declarations.length).toBeGreaterThan(0);
    // The web's own bridge fields, which nothing read before this story: the
    // selector a declaration sits under and the at-rule stack around it.
    expect(declarations.some((d) => d.selector !== undefined)).toBe(true);
    expect(declarations.some((d) => d.inAtRule !== undefined)).toBe(true);
    expect(declarations.some((d) => d.emits !== undefined)).toBe(true);
  });

  it("two spellings of one symbol each answer their own row", async () => {
    const out = (await verb("variable", "lookup").run(
      { name: ["typography-weight-semiBold", "typography-weight-semi-bold"] },
      rt,
    )) as { errors: unknown[]; results: Record<string, unknown>[] };
    expect(out.errors).toEqual([]);
    expect(out.results).toHaveLength(2);
    for (const result of out.results) {
      expect(result.symbol).toBe("typography.weight.semiBold");
    }
  });

  it("variable chain walks transitively, through variables standing for nothing", async () => {
    // The walk's whole value: the chain passes through hops that stand for no
    // symbol, so a one-hop join would answer nothing for these.
    const walk = await rows("variable", "chain", {
      variable: "disabled--color-text",
    });
    expect(walk.length).toBeGreaterThan(1);
    for (const row of walk) {
      expect(row.variable).toBe("disabled--color-text");
      expect(row.symbol).toBeTruthy();
    }
    // The starting variable stands for nothing itself — which is exactly why
    // it is not reachable through the token noun.
    expect(
      await count(
        `SELECT (COUNT(*) AS ?n) WHERE {
           ?v rdfs:label "disabled--color-text" ; dt:ofSymbol ?s .
         }`,
      ),
    ).toBe(0);
  });

  it("token consumers answers rows with every identity column, or its recovery", async () => {
    // Deliberately NOT "is empty": the design-system packs will record
    // bindings, and a test pinning the emptiness would fail on that correct
    // change. What is invariant is the SHAPE of the two legal answers.
    const page = (await verb("token", "consumers").run({}, rt)) as PackPage;
    if (page.rows.length === 0) {
      const notice = verb("token", "consumers").output.formatters.notice?.(
        page as never,
      );
      expect(notice).toContain("No token bindings in the store.");
      expect(notice).toContain("sources update");
      return;
    }
    for (const row of page.rows) {
      // All seven identity columns, because two bindings differing only in
      // state or rank are two different facts — a narrower row would publish
      // rows a caller cannot tell apart.
      expect(Object.keys(row).sort()).toEqual(
        expect.arrayContaining(["block", "symbol", "uri"]),
      );
      expect(row.block).toBeTruthy();
      expect(row.symbol).toBeTruthy();
    }
  });
});
