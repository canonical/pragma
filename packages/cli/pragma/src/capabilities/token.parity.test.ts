/**
 * Token-noun semantic parity (PROTECTED) — the `token` story `pragma.conf.ts`
 * declares, over a four-symbol fixture graph (the tier/standard-noun pattern).
 *
 * The fixture is authored to make the story's two hard rules FALSIFIABLE, which
 * the shipped corpus cannot do on its own:
 *
 * - the symbol's OWN DEFINITION. Type and description are definition-level
 *   facts and a symbol can have many definitions, so the story reads the one
 *   the symbol's BASE resolved value was authored in — the head of that value's
 *   resolution chain. `color.text` here has three definitions with three
 *   different descriptions, one of them the base head and one of them the head
 *   of the value at `mode.dark`, which is the only shape that tells the rule
 *   apart from both of its neighbours: "sample one definition" would return any
 *   of the three, and a walk that forgot to restrict itself to the BASE value
 *   would publish two rows for the symbol.
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
import { declaredLookups, declaredStories } from "./distribution.js";

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
 * - `color.text` — three definitions agreeing on type and each carrying its OWN
 *   description; two resolved values, one at the default position and one at a
 *   coordinate, the second carrying a two-link chain whose head is a DIFFERENT
 *   definition from the base value's. So the published description is the base
 *   head's, and a walk over every value would publish the symbol twice;
 * - `color.border` — one definition and one base value, so both fields publish;
 *   it is also the symbol the channel derives from, so it proves the derivation
 *   renders a NAME rather than an IRI;
 * - `modifier.color.text` — a CHANNEL: no definitions at all, and one resolved
 *   value carrying a derivation, a coordinate and NO chain — so it has no base
 *   head and both fields are left unbound;
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
# Three for color.text: SAME type, THREE different descriptions. The light one
# is the head of the BASE value's chain and so the one the story publishes; the
# dark one heads the chain at mode.dark and must NOT reach the row.
<${DT}file/light.json#color.text> a w3c-tokens:Token ;
    dt:symbol dt:color.text ;
    dt:tokenType w3c-tokens:color ;
    w3c-tokens:inFile <${DT}file/light.json> ;
    w3c-tokens:description "Default text colour." .
<${DT}file/dark.json#color.text> a w3c-tokens:Token ;
    dt:symbol dt:color.text ;
    dt:tokenType w3c-tokens:color ;
    w3c-tokens:inFile <${DT}file/dark.json> ;
    w3c-tokens:description "Text colour in dark mode." .
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

# Every record carries ds:viaBlock, and on a block's OWN tree it names the
# block itself — the shipped shape, which the term's own definition states
# ("Equal to the subject in the own-tree case"). Button's two records are
# own-tree, so their via must print BLANK; Modal's is the SAME binding reached
# through the Button its anatomy embeds, so its via must print "Button" and its
# block must print "Modal". Those two rows are what tell a consuming-block
# column from a via-block one: COALESCE'ing the via over the block printed both
# as "Button", byte-identical and indistinguishable.
ds:button a ds:Component ; ds:name "Button" ;
    ds:hasTokenBinding <${DT}binding/button-bg> , <${DT}binding/button-bg-hover> .
<${DT}binding/button-bg>
    ds:consumesSymbol dt:color.text ;
    anatomy:styleKey "appearance.background" ;
    ds:rank "1" ;
    ds:viaBlock ds:button ;
    ds:node ".root" .
<${DT}binding/button-bg-hover>
    ds:consumesSymbol dt:color.text ;
    anatomy:styleKey "appearance.background" ;
    anatomy:styleState "hover" ;
    ds:rank "2" ;
    ds:viaBlock ds:button ;
    ds:node ".root" .

ds:modal a ds:Component ; ds:name "Modal" ;
    ds:hasTokenBinding <${DT}binding/modal-button-bg> .
<${DT}binding/modal-button-bg>
    ds:consumesSymbol dt:color.text ;
    anatomy:styleKey "appearance.background" ;
    ds:rank "1" ;
    ds:viaBlock ds:button ;
    ds:node ".root" .

# — The coordinates ————————————————————————————————————————————————————————
dt:coordinate.mode.dark a dt:Coordinate .
dt:coordinate.criticality.success a dt:Coordinate .

# — The resolved values ————————————————————————————————————————————————————
# Default position: no coordinate at all, one-link chain. This value's chain
# HEAD is what the list and the lookup publish as the symbol's own type and
# description, so every symbol with a definition carries one — which is the
# shipped graph's shape too.
[] a dt:ResolvedValue ;
    dt:forSymbol dt:color.text ;
    dt:resolvesTo "black" ;
    dt:resolutionChain ( <${DT}file/light.json#color.text> ) .
[] a dt:ResolvedValue ;
    dt:forSymbol dt:color.border ;
    dt:resolvesTo "grey" ;
    dt:resolutionChain ( <${DT}file/light.json#color.border> ) .
[] a dt:ResolvedValue ;
    dt:forSymbol dt:number.hue ;
    dt:resolvesTo "240" ;
    dt:resolutionChain ( <${DT}file/light.json#number.hue> ) .
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
    declaredLookups,
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

describe("token list — the symbols, and their own definitions (PROTECTED)", () => {
  it("publishes one row per symbol, ordered by the dotted name", async () => {
    expect((await rows("list")).map((row) => row.name)).toEqual([
      "color.border",
      "color.text",
      "modifier.color.text",
      "number.hue",
    ]);
  });

  it("publishes the type and description of the symbol's OWN definition", async () => {
    const byName = new Map((await rows("list")).map((r) => [r.name, r]));
    // One definition, which is therefore the base value's chain head.
    expect(byName.get("color.border")).toMatchObject({
      type: "color",
      description: "Border colour.",
    });
    // Three definitions with three different descriptions. The published one
    // is the BASE value's head — `light.json` — and not `dark.json`'s, which
    // heads the chain at `mode.dark`, nor `success.json`'s, which heads no
    // value at all.
    expect(byName.get("color.text")).toMatchObject({
      type: "color",
      description: "Default text colour.",
    });
  });

  it("publishes ONE row per symbol even where several values carry chains", async () => {
    // `color.text` has a base value and a value at `mode.dark`, each with its
    // own chain head and its own description. A walk over every value would
    // publish the symbol twice — once per head — which is what restricting to
    // the value with no coordinate prevents.
    const named = (await rows("list")).filter((r) => r.name === "color.text");
    expect(named).toHaveLength(1);
  });

  it("leaves BOTH fields unbound for a symbol with no base chain head", async () => {
    // A minted channel has no definition anywhere and its only value is a
    // derivation, so there is no head to read. The cells are absent rather
    // than guessed.
    const channel = (await rows("list")).find(
      (row) => row.name === "modifier.color.text",
    );
    expect(channel).toBeDefined();
    expect(channel?.type).toBeUndefined();
    expect(channel?.description).toBeUndefined();
  });

  it("binds the channel relation to the base symbol's NAME, not its IRI", async () => {
    // A filterable column is the displayed column, so an unbound or IRI-valued
    // cell would both render an IRI and refuse the name a caller would type.
    const byName = new Map((await rows("list")).map((r) => [r.name, r]));
    expect(byName.get("modifier.color.text")?.channelOf).toBe("color.text");
    expect(byName.get("color.text")?.channelOf).toBeUndefined();
  });

  it("--type narrows to the definition's type, and an unbound type matches nothing", async () => {
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

  it("--search reads the name and the published description", async () => {
    expect(
      (await rows("list", { search: "border" })).map((r) => r.name),
    ).toEqual(["color.border"]);
    // Only the published description is searchable. A word that appears solely
    // in a definition this symbol's base value was NOT authored in reaches no
    // row — `successful` is `success.json`'s wording, and `dark mode` is the
    // head at `mode.dark`. Both are readable through the `definitions` expand
    // and neither is a symbol-level fact.
    expect(
      (await rows("list", { search: "successful" })).map((r) => r.name),
    ).toEqual([]);
    expect(
      (await rows("list", { search: "dark mode" })).map((r) => r.name),
    ).toEqual([]);
  });
});

describe("token values — chain AND derivation on the same surface (PROTECTED)", () => {
  it("publishes one row per (symbol, position) the graph materialises", async () => {
    expect(
      (await rows("values")).map((row) => [row.symbol, row.position ?? ""]),
    ).toEqual([
      ["color.border", ""],
      ["color.text", ""],
      ["color.text", "mode.dark"],
      ["modifier.color.text", "criticality.success"],
      ["number.hue", ""],
    ]);
  });

  it("names the position by its dotted coordinate, and leaves the default empty", async () => {
    const named = await rows("values");
    const darkRow = named.find(
      (row) => row.symbol === "color.text" && row.position,
    );
    const defaultRow = named.find(
      (row) => row.symbol === "color.text" && !row.position,
    );
    // Not `dt:coordinate.mode.dark`: the class prefix its IRI carries is
    // dropped, so a position reads and filters the way it is written elsewhere.
    expect(darkRow?.position).toBe("mode.dark");
    expect(defaultRow?.position).toBeUndefined();
  });

  it("concatenates the WHOLE resolution chain, as a set", async () => {
    // Every link, which is the point — the lookup's expand shows the head
    // alone, and this verb is where the whole walk is readable.
    //
    // As a SET, not a sequence, and asserted that way after pinning one
    // spelling of it flaked: `GROUP_CONCAT` has no defined order in SPARQL and
    // takes no `ORDER BY`, so a two-link chain may serialise either way round.
    // Pinning the order would be pinning the engine's evaluation, and the
    // story's own note now says the cell answers WHICH definitions a value
    // passed through rather than in what order.
    const darkRow = (await rows("values")).find(
      (row) => row.symbol === "color.text" && row.position === "mode.dark",
    );
    expect(darkRow?.chain?.split(" ").sort()).toEqual([
      "dark.json#color.text",
      "light.json#color.border",
    ]);
  });

  it("a derived value carries its derivation by NAME and no value cell", async () => {
    const derived = (await rows("values")).find(
      (row) => row.symbol === "modifier.color.text",
    );
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
    // The fixture records two bindings on Button that differ ONLY in state and
    // rank, and both are published: they are two different facts, so a
    // narrower row would publish rows a caller cannot tell apart and a
    // deduplicating consumer would silently lose one.
    const answered = await rows("consumers");
    expect(answered).toHaveLength(3);
    expect(
      answered.map((row) => [
        row.block,
        row.via ?? "",
        row.key,
        row.state ?? "",
        row.rank,
      ]),
    ).toEqual([
      ["Button", "", "appearance.background", "", "1"],
      ["Button", "", "appearance.background", "hover", "2"],
      ["Modal", "Button", "appearance.background", "", "1"],
    ]);
    for (const row of answered) {
      expect(row.symbol).toBe("color.text");
      expect(row.node).toBe(".root");
      // Still SELECTed — the row's subject, and what keeps two bindings
      // differing only in state apart — though no longer a rendered column.
      expect(row.uri).toBeTruthy();
    }
  });

  it("names the CONSUMING block, and the via only when it differs", async () => {
    // The fact the verb exists for. Modal's row is Button's binding reached
    // through the Button its anatomy embeds: the block that CHANGES if the
    // symbol does is Modal, and the tree the binding was authored in is
    // Button's. Coalescing the two printed Modal's row as "Button" —
    // byte-identical to Button's own, so `--symbol color.text` answered the
    // same row twice and no reader could tell which component was meant.
    const answered = await rows("consumers", { symbol: "color.text" });
    expect(answered.map((row) => row.block)).toEqual([
      "Button",
      "Button",
      "Modal",
    ]);

    // Blank on a record sitting on the block's OWN tree, where the fixture
    // asserts `ds:viaBlock` equal to the block — the shipped shape. A blank
    // and not the block's own name repeated, which is never news.
    const own = answered.filter((row) => row.block === "Button");
    expect(own).toHaveLength(2);
    for (const row of own) expect(row.via ?? "").toBe("");

    const inherited = answered.find((row) => row.block === "Modal");
    expect(inherited?.via).toBe("Button");
  });

  it("searches the via as well as the consuming block", async () => {
    // A reader who knows a symbol reaches everything embedding a Button holds
    // the word "Button", not the name of each embedder — so the via is
    // searchable beside the block. Modal's row carries "Button" ONLY in its
    // via, so a search that reached it can only have read that column.
    const found = await rows("consumers", { search: "Modal" });
    expect(found.map((row) => [row.block, row.via])).toEqual([
      ["Modal", "Button"],
    ]);
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
    expect(byVariable).toHaveLength(3);
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
    ).toHaveLength(3);
    expect(
      await rows("consumers", {
        symbol: "color.border",
        variable: "color-text",
      }),
    ).toEqual([]);
  });

  it("a variable standing for NO symbol answers empty, naming the filter", async () => {
    // Admitted, because it is a real variable — 236 of them stand for no
    // symbol. What it is not is evidence that nothing consumes it, so the
    // answer names the filter that came back empty.
    //
    // The story's `emptyRecovery` follows that sentence rather than replacing
    // it. Zero rows cannot say which of the two emptinesses this is — nothing
    // consumes this variable, or nothing consumes anything yet — so the answer
    // says both: the filter that came back empty, then the story's account of
    // where consumers are recorded. What the recovery may NOT do is assert the
    // population is empty, which is the defect users hit as "No token symbols
    // in the store" over 745 present symbols; `token consumers` opens on the
    // two readings instead, so it stays true here.
    const answered = await page("consumers", {
      variable: "button-color-background",
    });
    expect(answered.rows).toEqual([]);
    const notice = verb("consumers").output.formatters.notice?.(
      answered as never,
    );
    expect(notice).toContain("matches `--variable button-color-background`.");
    expect(notice).toContain("Either no component uses this token");
  });

  it("--key and --state narrow to one tuple each", async () => {
    expect(
      await rows("consumers", { key: "appearance.background" }),
    ).toHaveLength(3);
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

  it("carries the SAME type and description the list row publishes", async () => {
    // Two spellings of one rule: the list reads the base value's chain head in
    // its own SPARQL, the lookup reads it as a property path. A divergence here
    // would mean a caller who looked a symbol up saw a different description
    // from the one that brought them to it.
    //
    // Asserted on `color.border`, which has ONE chain head. `color.text` is
    // deliberately the other case: this fixture gives its two values two
    // DIFFERENT heads, and a property path cannot spell the base restriction
    // that tells them apart, so the lookup's cell is whichever row the store
    // returns first. That is not a defect this fixture can fix — it is a
    // CONDITION on the corpus, and `tokenGraph.shipped.exec.test.ts` pins it:
    // over the shipped graph no symbol's heads name two types or two
    // descriptions, which is what makes the path's answer the list's answer.
    const row = (await rows("list")).find((r) => r.name === "color.border");
    expect(row?.description).toBe("Border colour.");
    expect(await lookup("color.border")).toMatchObject({
      type: row?.type,
      description: row?.description,
    });
  });

  it("leaves the pair unbound for a symbol with no base chain head", async () => {
    const channel = await lookup("modifier.color.text");
    expect(channel.type).toBeUndefined();
    expect(channel.description).toBeUndefined();
  });

  it("shows every definition APART, with its own type and description", async () => {
    // The only surface that can: the symbol-level pair names ONE definition —
    // the base value's head — and this is where the other two behind
    // `color.text` stay readable rather than being outvoted or discarded.
    const definitions = children(await lookup("color.text"), "definitions");
    expect(definitions).toHaveLength(3);
    expect(definitions.map((d) => d.file).sort()).toEqual([
      "dark.json",
      "light.json",
      "success.json",
    ]);
    expect(new Set(definitions.map((d) => d.description)).size).toBe(3);
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
