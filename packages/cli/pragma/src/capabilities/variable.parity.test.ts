/**
 * Variable-noun semantic parity (PROTECTED) — the `variable` story
 * `pragma.conf.ts` declares, over a platform-stratum fixture graph.
 *
 * Three properties of the story are only falsifiable against an authored graph,
 * and the fixture exists for them:
 *
 * - the PUBLISHED NAME is the CSS name without its leading dashes. That is not
 *   cosmetic: a `--`-prefixed positional cannot be typed at all, so a noun
 *   publishing `--color-text` would be addressable by nothing. The fixture
 *   carries a variable whose name would collide with a SYMBOL name if the
 *   dashes were kept differently, and one standing for no symbol at all.
 * - the AT-RULE STACK is an rdf:List, so its path needs the list walk. One
 *   condition here nests two levels, which is the only shape that tells the
 *   walk apart from reading the list's head — and the corpus has exactly one
 *   such condition, so a shipped-only test would pass on the head alone.
 * - the CHAIN is transitively closed over every declaration of every hop. The
 *   fixture is a three-hop chain through a variable that stands for nothing, so
 *   the walk has to pass THROUGH a symbol-less variable to reach the symbol at
 *   the end. That is the case a one-hop join silently gets wrong.
 *
 * Counts are pinned because this file AUTHORS the graph. The invariants the
 * shipped corpus decides — that the dash-stripping is injective and collides
 * with no symbol name — are asserted over the real corpus in
 * `tokenGraph.shipped.exec.test.ts`.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compilePack } from "../kernel/packs/compile.js";
import type { LookupOutput } from "../kernel/packs/resolveEntity.js";
import { distributionSource, type PackPage } from "../kernel/packs/types.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { DEFAULT_PREFIX_MAP } from "../kernel/render/prefixes.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { VerbSpec } from "../kernel/spec/types.js";
import { buildFixtureRuntime } from "../testing/helpers/packRuntime.js";
import { declaredStories } from "./distribution.js";

const variablePack = declaredStories.get("variable");
if (!variablePack) {
  throw new Error('pragma.conf.ts declares no story for "variable"');
}

const DT = "https://dt.canonical.com/";
const DT_WEB = "https://dt.canonical.com/platform/web/";
const PREFIXES = {
  dt: DT,
  "dt-web": DT_WEB,
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

/**
 * Four variables under one platform, and the chain that joins them:
 *
 *   --modifier-color-text  (stands for NOTHING; selected at criticality.success,
 *                           and nested two at-rules deep)
 *        references
 *   --color-text-success   (stands for nothing either — the middle of the walk)
 *        references
 *   --color-text           (stands for dt:color.text; declared under :root,
 *                           also at mode.dark)
 *
 * plus `--typography-weight-semi-bold`, a second spelling of a symbol another
 * variable already stands for, which is why a lookup by name answers one row
 * each rather than two.
 */
const TTL = `
@prefix dt: <${DT}> .
@prefix dt-web: <${DT_WEB}> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

dt:Variable a owl:Class .
dt:TokenSymbol a owl:Class .
dt:Declaration a owl:Class .
dt:Condition a owl:Class .
dt:Coordinate a owl:Class .
dt:Tier a owl:Class .
dt:Visibility a owl:Class .
dt:Derivation a owl:Class .

dt:ofSymbol a owl:ObjectProperty ; rdfs:range dt:TokenSymbol .
dt:tier a owl:ObjectProperty ; rdfs:range dt:Tier .
dt:visibility a owl:ObjectProperty ; rdfs:range dt:Visibility .
dt:declaredAt a owl:ObjectProperty ; rdfs:range dt:Declaration .
dt:under a owl:ObjectProperty ; rdfs:range dt:Condition .
dt:emits a owl:DatatypeProperty ; rdfs:range xsd:string .
dt:at a owl:DatatypeProperty ; rdfs:range xsd:string .
dt:alsoAt a owl:ObjectProperty ; rdfs:range dt:Coordinate .
dt:derives a owl:ObjectProperty ; rdfs:range dt:Derivation .
dt:references a owl:ObjectProperty ; rdfs:range rdf:List .
dt:selectsCoordinate a owl:ObjectProperty ; rdfs:range dt:Coordinate .
dt-web:selector a owl:DatatypeProperty ; rdfs:range xsd:string .
dt-web:inAtRule a owl:ObjectProperty ; rdfs:range rdf:List .

dt:tier.semantic a dt:Tier .
dt:tier.derived a dt:Tier .
dt:visibility.public a dt:Visibility .
dt:visibility.internal a dt:Visibility .
dt:coordinate.mode.dark a dt:Coordinate .
dt:coordinate.criticality.success a dt:Coordinate .
dt:derivation.channel-modifier a dt:Derivation .

dt:color.text a dt:TokenSymbol ; rdfs:label "color.text" .
dt:typography.weight.semiBold a dt:TokenSymbol ;
    rdfs:label "typography.weight.semiBold" .

# — The conditions ————————————————————————————————————————————————————————
# One at-rule, the ordinary case.
<${DT}s4/web/cond/root> a dt:Condition ;
    dt-web:selector ":root" ;
    dt-web:inAtRule ( "@layer ds.tokens" ) .
# TWO at-rules, nested: this is what the list walk is for. Reading the head
# alone would lose the inner layer and nobody would notice on a corpus where
# one condition in thirty-one nests.
<${DT}s4/web/cond/success> a dt:Condition ;
    dt-web:selector ".success" ;
    dt-web:inAtRule ( "@media (min-width: 40em)" "@layer ds.modifiers" ) ;
    dt:selectsCoordinate dt:coordinate.criticality.success .

# — The variables ——————————————————————————————————————————————————————————
<${DT}s4/web/--color-text> a dt:Variable ;
    rdfs:label "color-text" ;
    dt:ofSymbol dt:color.text ;
    dt:tier dt:tier.semantic ;
    dt:visibility dt:visibility.public ;
    dt:declaredAt [
      a dt:Declaration ;
      dt:under <${DT}s4/web/cond/root> ;
      dt:emits "light-dark(black, white)" ;
      dt:at "tokens.css:12" ;
      dt:alsoAt dt:coordinate.mode.dark
    ] .

# Stands for NOTHING — one of the population a symbol-keyed surface cannot
# reach, and the middle hop of the walk below.
<${DT}s4/web/--color-text-success> a dt:Variable ;
    rdfs:label "color-text-success" ;
    dt:tier dt:tier.semantic ;
    dt:visibility dt:visibility.internal ;
    dt:declaredAt [
      a dt:Declaration ;
      dt:under <${DT}s4/web/cond/root> ;
      dt:emits "var(--color-text)" ;
      dt:at "tokens.css:20" ;
      dt:references ( <${DT}s4/web/--color-text> )
    ] .

# Also stands for nothing, and is where the walk starts.
<${DT}s4/web/--modifier-color-text> a dt:Variable ;
    rdfs:label "modifier-color-text" ;
    dt:tier dt:tier.derived ;
    dt:visibility dt:visibility.internal ;
    dt:declaredAt [
      a dt:Declaration ;
      dt:under <${DT}s4/web/cond/success> ;
      dt:emits "var(--color-text-success)" ;
      dt:at "modifiers.css:7" ;
      dt:derives dt:derivation.channel-modifier ;
      dt:references ( <${DT}s4/web/--color-text-success> )
    ] .

# The second spelling of a symbol another variable already stands for.
<${DT}s4/web/--typography-weight-semiBold> a dt:Variable ;
    rdfs:label "typography-weight-semiBold" ;
    dt:ofSymbol dt:typography.weight.semiBold ;
    dt:tier dt:tier.semantic ;
    dt:visibility dt:visibility.public .
<${DT}s4/web/--typography-weight-semi-bold> a dt:Variable ;
    rdfs:label "typography-weight-semi-bold" ;
    dt:ofSymbol dt:typography.weight.semiBold ;
    dt:tier dt:tier.semantic ;
    dt:visibility dt:visibility.public .
`;

const verbs = () =>
  compilePack(
    variablePack,
    distributionSource("pragma.conf.ts"),
    DEFAULT_PREFIX_MAP,
  );
const verb = (label: string) =>
  verbs().find((v) => verbKey(v.path) === `variable ${label}`) as VerbSpec;

let rt: PragmaRuntime;
beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({ ttl: TTL, prefixes: PREFIXES }));
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

const page = (label: string, params: Record<string, unknown> = {}) =>
  verb(label).run(params, rt) as Promise<PackPage>;

async function rows(
  label: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, string>[]> {
  return [...(await page(label, params)).rows];
}

async function lookupAll(...names: string[]): Promise<LookupOutput> {
  return (await verb("lookup").run({ name: names }, rt)) as LookupOutput;
}

async function lookup(name: string): Promise<Record<string, unknown>> {
  const out = await lookupAll(name);
  expect(out.errors).toEqual([]);
  return out.results.at(0) as Record<string, unknown>;
}

function children(
  entity: Record<string, unknown>,
  name: string,
): Record<string, string>[] {
  return (entity[name] ?? []) as Record<string, string>[];
}

describe("variable list — the platform names, and what they stand for (PROTECTED)", () => {
  it("publishes the CSS name WITHOUT its leading dashes", async () => {
    // The whole reason the noun is addressable. Commander reads a leading `--`
    // as an option, so a row publishing `--color-text` would name something no
    // caller could pass as a positional.
    const names = (await rows("list")).map((row) => row.name);
    expect(names).toEqual([
      "color-text",
      "color-text-success",
      "modifier-color-text",
      "typography-weight-semi-bold",
      "typography-weight-semiBold",
    ]);
    expect(names.some((name) => name.startsWith("--"))).toBe(false);
  });

  it("reads the platform out of the IRI base rather than an assertion", async () => {
    // Nothing asserts the platform; the file identity in the IRI is the only
    // statement of it, which is why it is a filter and not a noun.
    expect(new Set((await rows("list")).map((row) => row.platform))).toEqual(
      new Set(["web"]),
    );
  });

  it("publishes a row for a variable standing for NO symbol", async () => {
    // The measurement the second noun exists for: a symbol-keyed surface
    // cannot address these at all.
    const orphan = (await rows("list")).find(
      (row) => row.name === "modifier-color-text",
    );
    expect(orphan).toBeDefined();
    expect(orphan?.symbol).toBeUndefined();
  });

  it("names tier and visibility by their own local names", async () => {
    const byName = new Map((await rows("list")).map((r) => [r.name, r]));
    expect(byName.get("color-text")).toMatchObject({
      symbol: "color.text",
      tier: "semantic",
      visibility: "public",
    });
    expect(byName.get("modifier-color-text")).toMatchObject({
      tier: "derived",
      visibility: "internal",
    });
  });

  it("collects EVERY coordinate a variable reaches, from both sources", async () => {
    const byName = new Map((await rows("list")).map((r) => [r.name, r]));
    // From the declaration's own `dt:alsoAt`.
    expect(byName.get("color-text")?.coordinate).toBe("mode.dark");
    // From the CONDITION the declaration sits under.
    expect(byName.get("modifier-color-text")?.coordinate).toBe(
      "criticality.success",
    );
  });

  it("--coordinate set-matches, so a multi-coordinate cell answers for each", async () => {
    expect(
      (await rows("list", { coordinate: "mode.dark" })).map((r) => r.name),
    ).toEqual(["color-text"]);
    expect(
      (await rows("list", { coordinate: "criticality.success" })).map(
        (r) => r.name,
      ),
    ).toEqual(["modifier-color-text"]);
  });

  it("--symbol, --tier, --visibility and --platform each narrow", async () => {
    expect(
      (await rows("list", { symbol: "color.text" })).map((r) => r.name),
    ).toEqual(["color-text"]);
    expect(
      (await rows("list", { tier: "derived" })).map((r) => r.name),
    ).toEqual(["modifier-color-text"]);
    expect(
      (await rows("list", { visibility: "internal" })).map((r) => r.name),
    ).toEqual(["color-text-success", "modifier-color-text"]);
    expect(await rows("list", { platform: "web" })).toHaveLength(5);
  });

  it("--symbol answers BOTH spellings that stand for one symbol", async () => {
    // A symbol can have more than one variable, which is the fact that makes
    // this noun necessary rather than a flag on `token`.
    expect(
      (await rows("list", { symbol: "typography.weight.semiBold" })).map(
        (r) => r.name,
      ),
    ).toEqual(["typography-weight-semi-bold", "typography-weight-semiBold"]);
  });

  it("refuses a tier the graph does not admit, naming the ones it does", async () => {
    await expect(page("list", { tier: "cosmic" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
      validOptions: ["derived", "semantic"],
    });
  });
});

describe("variable lookup — every place it is declared (PROTECTED)", () => {
  it("resolves the dash-stripped name the list publishes", async () => {
    expect(await lookup("color-text")).toMatchObject({
      name: "color-text",
      symbol: "color.text",
    });
  });

  it("each spelling answers ONE row, because each carries its own label", async () => {
    // Both stand for the same symbol, and both are addressable — the surface
    // shows both because the ontology holds both.
    const out = await lookupAll(
      "typography-weight-semiBold",
      "typography-weight-semi-bold",
    );
    expect(out.errors).toEqual([]);
    expect(out.results).toHaveLength(2);
    for (const result of out.results) {
      expect(result).toMatchObject({ symbol: "typography.weight.semiBold" });
    }
  });

  it("shows the selector, the emitted value, the source and the coordinate", async () => {
    const declarations = children(await lookup("color-text"), "declarations");
    expect(declarations).toHaveLength(1);
    expect(declarations[0]).toMatchObject({
      selector: ":root",
      emits: "light-dark(black, white)",
      at: "tokens.css:12",
      inAtRule: "@layer ds.tokens",
    });
    // `dt:at` is the SOURCE LOCATION and `dt:alsoAt` the coordinate. The two
    // read alike and mean different things, so both are asserted.
    expect(declarations[0]?.alsoAt).toContain("mode.dark");
  });

  it("walks the at-rule LIST, so a nested stack contributes each level", async () => {
    // The one shape a head-only read gets wrong. Two rows for one declaration
    // here is the stack, read outermost-in.
    const declarations = children(
      await lookup("modifier-color-text"),
      "declarations",
    );
    expect(declarations.map((d) => d.inAtRule).sort()).toEqual([
      "@layer ds.modifiers",
      "@media (min-width: 40em)",
    ]);
    expect(new Set(declarations.map((d) => d.selector))).toEqual(
      new Set([".success"]),
    );
  });

  it("shows the derivation that computed a derived variable", async () => {
    const declarations = children(
      await lookup("modifier-color-text"),
      "declarations",
    );
    expect(declarations[0]?.derives).toContain("channel-modifier");
  });

  it("a miss carries did-you-mean suggestions", async () => {
    let caught: unknown;
    try {
      await verb("lookup").run({ name: ["color-txt"] }, rt);
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: "ENTITY_NOT_FOUND" });
    expect((caught as { suggestions: string[] }).suggestions).toContain(
      "color-text",
    );
  });
});

describe("variable chain — the transitive walk (PROTECTED)", () => {
  it("reaches a symbol THROUGH a variable that stands for nothing", async () => {
    // Three hops, and the middle one stands for no symbol. A one-hop join
    // would answer nothing here and be silently wrong rather than empty.
    expect(await rows("chain", { variable: "modifier-color-text" })).toEqual([
      {
        variable: "modifier-color-text",
        reaches: "color-text",
        symbol: "color.text",
      },
    ]);
  });

  it("answers from every starting variable that reaches a symbol", async () => {
    expect(
      (await rows("chain")).map((row) => [row.variable, row.symbol]),
    ).toEqual([
      ["color-text-success", "color.text"],
      ["modifier-color-text", "color.text"],
    ]);
  });

  it("--symbol answers the walks that REACH one symbol", async () => {
    expect(await rows("chain", { symbol: "color.text" })).toHaveLength(2);
  });

  it("a variable that references nothing has no walk, calmly", async () => {
    const answered = await page("chain", { variable: "color-text" });
    expect(answered.rows).toEqual([]);
    expect(answered.nextAfter).toBeUndefined();
  });
});

describe("variable — the name literal is the whole grammar (PROTECTED)", () => {
  it("every published name resolves through lookup, verbatim", async () => {
    const names = (await rows("list")).map((row) => row.name);
    const out = await lookupAll(...names);
    expect(out.errors).toEqual([]);
    expect(out.results.map((r) => (r as { name: string }).name).sort()).toEqual(
      [...names].sort(),
    );
  });

  it("the dash-stripping is injective over this graph", async () => {
    // Asserted here over an authored graph and over the WHOLE shipped corpus in
    // `tokenGraph.shipped.exec.test.ts`: if two variables ever stripped to one
    // name, a lookup would answer one of them and silently hide the other.
    const names = (await rows("list")).map((row) => row.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
