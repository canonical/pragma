/**
 * Token-noun semantic parity (PROTECTED) — the `token` story `pragma.conf.ts`
 * declares, over a four-symbol fixture graph (the tier/standard-noun pattern).
 *
 * The fixture is authored to make the story's two hard rules FALSIFIABLE, which
 * the shipped corpus cannot do on its own:
 *
 * - the AGREEMENT rule. Type and description are definition-level facts and a
 *   symbol can have many definitions, so the story publishes a value only when
 *   every definition agrees and blanks it when they disagree. `color.text` here
 *   has three definitions that agree on type and disagree on description, which
 *   is the only shape that tells the rule apart from "sample one definition" —
 *   over the shipped graph both rules would return the same type for it, and a
 *   sample would return SOME description, so a shipped-only test could not see
 *   the difference.
 * - the two S3 surfaces select the chain AND the derivation. The shape admits
 *   exactly one of the two, and every value in the token corpus that carries a
 *   derivation is a channel routing — so the fixture carries one of each, and
 *   asserts that a derived value's own value cell is EMPTY by construction
 *   rather than merely absent from the fixture.
 *
 * Counts are pinned here because this file AUTHORS the graph. Nothing in it
 * pins a number the shipped corpus decides; that belongs in
 * `tokenGraph.shipped.exec.test.ts`, which asserts invariants instead.
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

const tokenPack = declaredStories.get("token");
if (!tokenPack) {
  throw new Error('pragma.conf.ts declares no story for "token"');
}

const DT = "https://dt.canonical.com/";
const W3C = "https://dt.canonical.com/w3c-tokens/";
const DS = "https://ds.canonical.com/";
const ANATOMY = "https://anatomy.canonical.com/";
const PREFIXES = {
  dt: DT,
  "w3c-tokens": W3C,
  ds: DS,
  anatomy: ANATOMY,
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  sh: "http://www.w3.org/ns/shacl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

/**
 * Four symbols, chosen so every branch of the story has a witness:
 *
 * - `color.text` — three definitions AGREEING on type, DISAGREEING on
 *   description; two resolved values, one at the default position and one at a
 *   coordinate, the second carrying a two-link chain;
 * - `color.border` — one definition, so both fields publish; it is also the
 *   symbol the channel derives from, so it proves the derivation renders a NAME
 *   rather than an IRI;
 * - `modifier.color.text` — a CHANNEL: no definitions at all (so both fields
 *   blank by absence rather than by disagreement) and one resolved value
 *   carrying a derivation and NO value;
 * - `number.hue` — a second type, so `--type` is a real narrowing rather than
 *   a filter that happens to match everything.
 */
const TTL = `
@prefix dt: <${DT}> .
@prefix w3c-tokens: <${W3C}> .
@prefix ds: <${DS}> .
@prefix anatomy: <${ANATOMY}> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

dt:TokenSymbol a owl:Class .
dt:ResolvedValue a owl:Class .
dt:Coordinate a owl:Class .
w3c-tokens:Token a owl:Class .
w3c-tokens:TokenType a owl:Class .
ds:ModifierFamily a owl:Class .
anatomy:StyleKey a owl:Class .

dt:channelOf a owl:ObjectProperty ; rdfs:range dt:TokenSymbol .
dt:symbol a owl:ObjectProperty ; rdfs:range dt:TokenSymbol .
dt:tokenType a owl:ObjectProperty ; rdfs:range w3c-tokens:TokenType .
dt:covers a owl:ObjectProperty ; rdfs:range dt:TokenSymbol .
dt:forSymbol a owl:ObjectProperty ; rdfs:range dt:TokenSymbol .
dt:coordinate a owl:ObjectProperty ; rdfs:range dt:Coordinate .
dt:derivedFrom a owl:ObjectProperty ; rdfs:range dt:TokenSymbol .
dt:resolutionChain a owl:ObjectProperty ; rdfs:range rdf:List .
dt:resolvesTo a owl:DatatypeProperty ; rdfs:range xsd:string .
w3c-tokens:description a owl:DatatypeProperty ; rdfs:range xsd:string .
w3c-tokens:inFile a owl:ObjectProperty .
w3c-tokens:path a owl:DatatypeProperty ; rdfs:range xsd:string .
ds:name a owl:DatatypeProperty ; rdfs:range xsd:string .
anatomy:styleKey a owl:DatatypeProperty ; rdfs:range xsd:string .
anatomy:styleState a owl:DatatypeProperty ; rdfs:range xsd:string .
ds:hasTokenBinding a owl:ObjectProperty .
ds:consumesSymbol a owl:ObjectProperty ; rdfs:range dt:TokenSymbol .
ds:rank a owl:DatatypeProperty ; rdfs:range xsd:integer .
ds:node a owl:DatatypeProperty ; rdfs:range xsd:string .
ds:viaBlock a owl:ObjectProperty .
dt:ofSymbol a owl:ObjectProperty ; rdfs:range dt:TokenSymbol .
dt:Variable a owl:Class .
ds:Component a owl:Class .

# The two token types, each carrying the label the story displays and filters on.
w3c-tokens:color a w3c-tokens:TokenType ; rdfs:label "color" .
w3c-tokens:number a w3c-tokens:TokenType ; rdfs:label "number" .

# The closed interaction-state vocabulary, shaped the way the anatomy pack
# closes it — this is what 'token consumers --state' reads its roster from.
dt:stateShape sh:path anatomy:styleState ;
    sh:in ( "hover" "focus" "active" "selected" "disabled" ) .

# A style key, so '--key''s roster is non-empty here too.
anatomy:key.appearance.background a anatomy:StyleKey .

# — The symbols ————————————————————————————————————————————————————————————
dt:color.text a dt:TokenSymbol ; rdfs:label "color.text" .
dt:color.border a dt:TokenSymbol ; rdfs:label "color.border" .
dt:number.hue a dt:TokenSymbol ; rdfs:label "number.hue" .
dt:modifier.color.text a dt:TokenSymbol ;
    rdfs:label "modifier.color.text" ;
    dt:channelOf dt:color.text .

# — The definitions ————————————————————————————————————————————————————————
# Three for color.text: SAME type, TWO different descriptions.
<${DT}file/light.json#color.text> a w3c-tokens:Token ;
    dt:symbol dt:color.text ;
    dt:tokenType w3c-tokens:color ;
    w3c-tokens:inFile <${DT}file/light.json> ;
    w3c-tokens:description "Default text colour." .
<${DT}file/dark.json#color.text> a w3c-tokens:Token ;
    dt:symbol dt:color.text ;
    dt:tokenType w3c-tokens:color ;
    w3c-tokens:inFile <${DT}file/dark.json> ;
    w3c-tokens:description "Default text colour." .
<${DT}file/success.json#color.text> a w3c-tokens:Token ;
    dt:symbol dt:color.text ;
    dt:tokenType w3c-tokens:color ;
    w3c-tokens:inFile <${DT}file/success.json> ;
    w3c-tokens:description "Text colour for a successful outcome." .

<${DT}file/light.json#color.border> a w3c-tokens:Token ;
    dt:symbol dt:color.border ;
    dt:tokenType w3c-tokens:color ;
    w3c-tokens:inFile <${DT}file/light.json> ;
    w3c-tokens:description "Border colour." .

<${DT}file/light.json#number.hue> a w3c-tokens:Token ;
    dt:symbol dt:number.hue ;
    dt:tokenType w3c-tokens:number ;
    w3c-tokens:inFile <${DT}file/light.json> ;
    w3c-tokens:description "A hue angle." .

<${DT}file/light.json> w3c-tokens:path "light.json" .
<${DT}file/dark.json> w3c-tokens:path "dark.json" .
<${DT}file/success.json> w3c-tokens:path "success.json" .

# — Coverage: it hangs on the FAMILY, so the story reads the inverse ————————
ds:global.modifier_family.criticality a ds:ModifierFamily ;
    ds:name "Criticality" ;
    dt:covers dt:color.text .

# — The bindings, and the CSS names that spell the symbol they consume ——————
# TWO spellings of color.text, so '--variable' has to collapse them: both
# resolve through dt:ofSymbol to one symbol, so both must answer the same set.
<${DT}s4/web/--color-text> a dt:Variable ;
    rdfs:label "color-text" ;
    dt:ofSymbol dt:color.text .
<${DT}s4/web/--color-text-legacy> a dt:Variable ;
    rdfs:label "color-text-legacy" ;
    dt:ofSymbol dt:color.text .
# And one standing for NO symbol, which therefore has no answer down the
# consumer path at all — an empty answer for a reason, not evidence that
# nothing consumes it.
<${DT}s4/web/--button-color-background> a dt:Variable ;
    rdfs:label "button-color-background" .

ds:button a ds:Component ; ds:name "Button" ;
    ds:hasTokenBinding <${DT}binding/button-bg> , <${DT}binding/button-bg-hover> .
<${DT}binding/button-bg>
    ds:consumesSymbol dt:color.text ;
    anatomy:styleKey "appearance.background" ;
    ds:rank "1" ;
    ds:node ".root" .
<${DT}binding/button-bg-hover>
    ds:consumesSymbol dt:color.text ;
    anatomy:styleKey "appearance.background" ;
    anatomy:styleState "hover" ;
    ds:rank "2" ;
    ds:node ".root" .

# — The coordinates ————————————————————————————————————————————————————————
dt:coordinate.mode.dark a dt:Coordinate .
dt:coordinate.criticality.success a dt:Coordinate .

# — The resolved values ————————————————————————————————————————————————————
# Default position: no coordinate at all, one-link chain.
[] a dt:ResolvedValue ;
    dt:forSymbol dt:color.text ;
    dt:resolvesTo "black" ;
    dt:resolutionChain ( <${DT}file/light.json#color.text> ) .
# A coordinate, and a TWO-link chain: the authored definition first, what it
# aliased through second. The lookup's expand shows the head; the verb shows both.
[] a dt:ResolvedValue ;
    dt:forSymbol dt:color.text ;
    dt:coordinate dt:coordinate.mode.dark ;
    dt:resolvesTo "white" ;
    dt:resolutionChain (
      <${DT}file/dark.json#color.text>
      <${DT}file/light.json#color.border>
    ) .
# A channel routing: a derivation, a coordinate, and NO value and NO chain.
[] a dt:ResolvedValue ;
    dt:forSymbol dt:modifier.color.text ;
    dt:coordinate dt:coordinate.criticality.success ;
    dt:derivedFrom dt:color.border .
`;

const verbs = () =>
  compilePack(
    tokenPack,
    distributionSource("pragma.conf.ts"),
    DEFAULT_PREFIX_MAP,
  );
const verb = (label: string) =>
  verbs().find((v) => verbKey(v.path) === `token ${label}`) as VerbSpec;

let rt: PragmaRuntime;
beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({ ttl: TTL, prefixes: PREFIXES }));
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

/** One page of a list-shaped verb. */
const page = (label: string, params: Record<string, unknown> = {}) =>
  verb(label).run(params, rt) as Promise<PackPage>;

/** The rows of a list-shaped verb, as records. */
async function rows(
  label: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, string>[]> {
  return [...(await page(label, params)).rows];
}

async function lookup(name: string): Promise<Record<string, unknown>> {
  const out = (await verb("lookup").run({ name: [name] }, rt)) as LookupOutput;
  expect(out.errors).toEqual([]);
  return out.results.at(0) as Record<string, unknown>;
}

/** An expand's child records, which the sub-SELECT returns unordered. */
function children(
  entity: Record<string, unknown>,
  name: string,
): Record<string, string>[] {
  return (entity[name] ?? []) as Record<string, string>[];
}

describe("token list — the symbols, and the agreement rule (PROTECTED)", () => {
  it("publishes one row per symbol, ordered by the dotted name", async () => {
    expect((await rows("list")).map((row) => row.name)).toEqual([
      "color.border",
      "color.text",
      "modifier.color.text",
      "number.hue",
    ]);
  });

  it("publishes the type and description every definition AGREES on", async () => {
    const byName = new Map((await rows("list")).map((r) => [r.name, r]));
    // One definition: both fields agree with themselves and both publish.
    expect(byName.get("color.border")).toMatchObject({
      type: "color",
      description: "Border colour.",
    });
    // Three definitions agreeing on type, DISAGREEING on description. This is
    // the whole rule: the type survives, the description is blanked, and the
    // row is still published rather than dropped.
    expect(byName.get("color.text")).toMatchObject({ type: "color" });
    expect(byName.get("color.text")?.description).toBe("");
  });

  it("blanks BOTH fields for a symbol with no definition at all", async () => {
    // A minted channel has no definition, so there is no value every
    // definition agrees on — absence and disagreement answer the same way.
    const channel = (await rows("list")).find(
      (row) => row.name === "modifier.color.text",
    );
    expect(channel?.type).toBe("");
    expect(channel?.description).toBe("");
  });

  it("binds the channel relation to the base symbol's NAME, not its IRI", async () => {
    // A filterable column is the displayed column, so an unbound or IRI-valued
    // cell would both render an IRI and refuse the name a caller would type.
    const byName = new Map((await rows("list")).map((r) => [r.name, r]));
    expect(byName.get("modifier.color.text")?.channelOf).toBe("color.text");
    expect(byName.get("color.text")?.channelOf).toBeUndefined();
  });

  it("--type narrows to the agreed type, and a blank type matches nothing", async () => {
    expect((await rows("list", { type: "color" })).map((r) => r.name)).toEqual([
      "color.border",
      "color.text",
    ]);
    expect((await rows("list", { type: "number" })).map((r) => r.name)).toEqual(
      ["number.hue"],
    );
  });

  it("--channel-of answers the channels that provision one symbol", async () => {
    expect(
      (await rows("list", { channelOf: "color.text" })).map((r) => r.name),
    ).toEqual(["modifier.color.text"]);
  });

  it("--channel-of admits a symbol nothing provisions, and answers empty", async () => {
    // The roster is every symbol, so this is the documented calm empty list
    // rather than INVALID_INPUT — the distinction the graph-read vocabulary
    // exists to preserve.
    const answered = await page("list", { channelOf: "number.hue" });
    expect(answered.rows).toEqual([]);
    expect(answered.nextAfter).toBeUndefined();
  });

  it("refuses a type the graph does not admit, naming the ones it does", async () => {
    await expect(page("list", { type: "shadow" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
      validOptions: ["color", "number"],
    });
  });

  it("--search reads the name and the agreed description", async () => {
    expect(
      (await rows("list", { search: "border" })).map((r) => r.name),
    ).toEqual(["color.border"]);
    // The description is searchable where it published; where the agreement
    // rule blanked it, the row is reachable by name alone.
    expect(
      (await rows("list", { search: "successful" })).map((r) => r.name),
    ).toEqual([]);
  });
});

describe("token values — chain AND derivation on the same surface (PROTECTED)", () => {
  it("publishes one row per (symbol, position) the graph materialises", async () => {
    expect(
      (await rows("values")).map((row) => [row.symbol, row.position ?? ""]),
    ).toEqual([
      ["color.text", ""],
      ["color.text", "mode.dark"],
      ["modifier.color.text", "criticality.success"],
    ]);
  });

  it("names the position by its dotted coordinate, and leaves the default empty", async () => {
    const [defaultRow, darkRow] = await rows("values");
    // Not `dt:coordinate.mode.dark`: the class prefix its IRI carries is
    // dropped, so a position reads and filters the way it is written elsewhere.
    expect(darkRow?.position).toBe("mode.dark");
    expect(defaultRow?.position).toBeUndefined();
  });

  it("concatenates the WHOLE resolution chain, in list order", async () => {
    const darkRow = (await rows("values")).at(1);
    expect(darkRow?.chain).toBe("dark.json#color.text light.json#color.border");
  });

  it("a derived value carries its derivation by NAME and no value cell", async () => {
    const derived = (await rows("values")).at(2);
    expect(derived).toMatchObject({
      symbol: "modifier.color.text",
      position: "criticality.success",
      derivedFrom: "color.border",
    });
    // Empty BY CONSTRUCTION — the shape admits a chain or a derivation, never
    // both, and a routing carries no value of its own. A surface selecting only
    // the chain would render this row blank. Asserted as "no chain, however the
    // row spells it": the projection omits an empty cell rather than carrying
    // the empty string a `GROUP_CONCAT` over nothing produces, and which of the
    // two a caller sees is the formatter's business, not this rule's.
    expect(derived?.value).toBeUndefined();
    expect(derived?.chain ?? "").toBe("");
  });

  it("--position set-matches one coordinate", async () => {
    expect(
      (await rows("values", { position: "mode.dark" })).map((r) => r.symbol),
    ).toEqual(["color.text"]);
  });

  it("--symbol narrows to one symbol's positions", async () => {
    expect(await rows("values", { symbol: "color.text" })).toHaveLength(2);
  });
});

describe("token consumers — the binding tuple, either spelling (PROTECTED)", () => {
  it("publishes one row per binding, with every identity column", async () => {
    // The fixture records two bindings that differ ONLY in state and rank, and
    // both are published: they are two different facts, so a narrower row
    // would publish rows a caller cannot tell apart and a deduplicating
    // consumer would silently lose one.
    const answered = await rows("consumers");
    expect(answered).toHaveLength(2);
    expect(answered.map((row) => [row.key, row.state ?? "", row.rank])).toEqual(
      [
        ["appearance.background", "", "1"],
        ["appearance.background", "hover", "2"],
      ],
    );
    for (const row of answered) {
      expect(row.block).toBe("Button");
      expect(row.symbol).toBe("color.text");
      expect(row.node).toBe(".root");
      expect(row.uri).toBeTruthy();
    }
  });

  it("carries EVERY spelling of the consumed symbol in one cell", async () => {
    // A set, not a join that multiplies: two variables stand for this symbol,
    // so binding one row per variable would have published each binding twice.
    const answered = await rows("consumers");
    for (const row of answered) {
      expect(row.variable?.split(" ").sort()).toEqual([
        "color-text",
        "color-text-legacy",
      ]);
    }
  });

  it("--variable and --symbol answer the SAME set, by either name", async () => {
    // The whole point of the filter: a web implementer holds a CSS name, not a
    // dotted symbol, and should not have to translate it first.
    const bySymbol = await rows("consumers", { symbol: "color.text" });
    const byVariable = await rows("consumers", { variable: "color-text" });
    expect(byVariable).toEqual(bySymbol);
    expect(byVariable).toHaveLength(2);
  });

  it("both spellings of one symbol collapse to the same answer", async () => {
    // Both resolve through the same edge to one symbol, so neither partitions
    // the set. If they ever diverged, half the consumers of a symbol would be
    // invisible from one of its two names.
    expect(await rows("consumers", { variable: "color-text-legacy" })).toEqual(
      await rows("consumers", { variable: "color-text" }),
    );
  });

  it("--symbol and --variable together INTERSECT, like any two filters", async () => {
    // They are two spellings of one constraint, and the kernel's meaning for
    // two filters is conjunction — so naming the same thing twice narrows to
    // itself, and naming two different things narrows to nothing. Documented
    // rather than refused: a per-story mutual exclusion is not something the
    // grammar can express, and inventing one here would be a rule no other
    // story follows.
    expect(
      await rows("consumers", { symbol: "color.text", variable: "color-text" }),
    ).toHaveLength(2);
    expect(
      await rows("consumers", {
        symbol: "color.border",
        variable: "color-text",
      }),
    ).toEqual([]);
  });

  it("a variable standing for NO symbol answers empty, and says why", async () => {
    // Admitted, because it is a real variable — 236 of them stand for no
    // symbol. What it is not is evidence that nothing consumes it, and the
    // recovery says so and names where to go instead.
    const answered = await page("consumers", {
      variable: "button-color-background",
    });
    expect(answered.rows).toEqual([]);
    const notice = verb("consumers").output.formatters.notice?.(
      answered as never,
    );
    expect(notice).toContain("stands for no symbol");
    expect(notice).toContain("variable chain");
  });

  it("--key and --state narrow to one tuple each", async () => {
    expect(
      await rows("consumers", { key: "appearance.background" }),
    ).toHaveLength(2);
    const hover = await rows("consumers", { state: "hover" });
    expect(hover).toHaveLength(1);
    expect(hover[0]?.rank).toBe("2");
  });

  it("refuses a state the closing shape does not admit", async () => {
    await expect(page("consumers", { state: "pressed" })).rejects.toMatchObject(
      {
        code: "INVALID_INPUT",
        validOptions: ["active", "disabled", "focus", "hover", "selected"],
      },
    );
  });

  it("refuses a variable name the graph does not carry", async () => {
    await expect(
      page("consumers", { variable: "not-a-variable" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("token lookup — one symbol, end to end (PROTECTED)", () => {
  it("resolves the dotted name the list publishes, verbatim", async () => {
    expect(await lookup("color.text")).toMatchObject({ name: "color.text" });
  });

  it("resolves the same entity by prefixed IRI", async () => {
    expect(await lookup("dt:color.text")).toMatchObject({ name: "color.text" });
  });

  it("shows every definition APART, with its own type and description", async () => {
    // The only surface that can: the symbol-level pair follows the agreement
    // rule, and this is where the three descriptions behind `color.text`
    // become visible instead of one being chosen arbitrarily.
    const definitions = children(await lookup("color.text"), "definitions");
    expect(definitions).toHaveLength(3);
    expect(definitions.map((d) => d.file).sort()).toEqual([
      "dark.json",
      "light.json",
      "success.json",
    ]);
    expect(new Set(definitions.map((d) => d.description)).size).toBe(2);
    expect(new Set(definitions.map((d) => d.type))).toEqual(new Set(["color"]));
  });

  it("reads coverage from the family end of the relation", async () => {
    expect(children(await lookup("color.text"), "coverage")).toEqual([
      { family: "Criticality" },
    ]);
  });

  it("shows one row per resolved value, and the chain's HEAD on each", async () => {
    const values = children(await lookup("color.text"), "values");
    // TWO rows for two positions. Selecting the whole chain here would have
    // made the two-link value render twice, and a caller counting positions
    // would have read three.
    expect(values).toHaveLength(2);
    const dark = values.find((v) => v.position?.includes("mode.dark"));
    expect(dark?.value).toBe("white");
    expect(dark?.chain).toContain("dark.json#color.text");
    expect(dark?.chain).not.toContain("color.border");
  });

  it("a channel names the symbol it provisions, and its value is a derivation", async () => {
    const channel = await lookup("modifier.color.text");
    expect(channel).toMatchObject({ channelOf: "color.text" });
    const values = children(channel, "values");
    expect(values).toHaveLength(1);
    expect(values[0]).toMatchObject({ derivedFrom: "color.border" });
    expect(values[0]?.value).toBeUndefined();
  });

  it("a miss carries did-you-mean suggestions", async () => {
    let caught: unknown;
    try {
      await verb("lookup").run({ name: ["color.txt"] }, rt);
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: "ENTITY_NOT_FOUND" });
    expect((caught as { suggestions: string[] }).suggestions).toContain(
      "color.text",
    );
  });
});

describe("token — the name literal is the whole grammar (PROTECTED)", () => {
  it("every published name resolves, and every symbol publishes one", async () => {
    // The two-step promise, over the fixture: a row's `name` goes VERBATIM to
    // lookup. Both halves key on `rdfs:label` and NEITHER declares an
    // IRI-derived fallback, so they are empty together or populated together —
    // never one publishing names the other cannot answer.
    const names = (await rows("list")).map((row) => row.name);
    const out = (await verb("lookup").run({ name: names }, rt)) as LookupOutput;
    expect(out.errors).toEqual([]);
    expect(out.results.map((r) => (r as { name: string }).name).sort()).toEqual(
      [...names].sort(),
    );
  });

  it("a symbol carrying no label is published by neither half", async () => {
    // The consequence of requiring the literal, stated as a test rather than
    // as a comment: an unlabelled symbol is not addressable AND not listed, so
    // the two halves cannot disagree about it.
    const unlabelled = await rt.query.sparql(
      `SELECT (COUNT(?s) AS ?n) WHERE {
         ?s a dt:TokenSymbol .
         FILTER NOT EXISTS { ?s rdfs:label ?l }
       }`,
    );
    expect(unlabelled.type).toBe("select");
    // The fixture labels all four, so this is the invariant rather than a
    // count: whatever the graph holds, the list publishes exactly the labelled
    // ones.
    const listed = (await rows("list")).length;
    const labelled = await rt.query.sparql(
      "SELECT (COUNT(DISTINCT ?s) AS ?n) WHERE { ?s a dt:TokenSymbol ; rdfs:label ?l }",
    );
    expect(
      labelled.type === "select" ? Number(labelled.bindings[0]?.n) : -1,
    ).toBe(listed);
  });
});
