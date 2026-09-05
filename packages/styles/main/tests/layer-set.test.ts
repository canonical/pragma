/**
 * The cascade contract of `@canonical/styles`, checked against the stylesheet a
 * consumer's bundler actually resolves.
 *
 * The package promises an order: ten layers, one statement, first rule. A
 * promise like that is only worth what a check makes it worth — the defect this
 * whole programme started from was a README that described a layer order the CSS
 * had never implemented, and nothing in the repository could tell. So every
 * claim the README makes about the cascade is read out of the README here and
 * compared with the resolved stylesheet: the statement, the table of what is
 * layered where, the list of what is deliberately unlayered, and the layer each
 * generated design-token file opens. A README that disagrees with the CSS fails.
 *
 * It runs in Chromium because the cascade is what is under test, and the CSSOM
 * of an engine that implements the cascade is the only parser that answers
 * honestly what a browser will do with a stylesheet. `tests/support/cascade.ts`
 * says which four questions are left to the text, and why each of them has to be.
 *
 * One thing this file does not check, and nothing else checks either: that each
 * layout preset's `:scope` twin — `:scope.grid` beside `.grid`, and the same for
 * `subgrid`, `responsive`, `intrinsic` and `content-flow` — matches a root
 * carrying the class as well as a descendant of one. That is a question about
 * what a selector matches, not about where a rule sits, so it needs a rendered
 * page rather than a parsed stylesheet, and it belongs to this package's own
 * future check. Saying so is the point: the twins are the reason those presets
 * survived being scoped, and nobody is watching them.
 */

import { describe, expect, it } from "vitest";
import {
  authoredProperties,
  authorsAtTopLevel,
  DECLARED_LAYERS,
  declarationsIn,
  directRulesIn,
  documentedFiles,
  ELEMENT_LAYERS,
  ENGINE_SOURCES,
  EXTERNAL_SOURCES,
  entryCss,
  entryRaw,
  importanceCss,
  importantDeclarations,
  importsOf,
  LOCAL_RAW,
  LOCAL_SOURCES,
  lateImports,
  mustResolve,
  namedLayers,
  openedLayers,
  parse,
  RESERVED_LAYERS,
  registeredProperties,
  saysYes,
  scopedLayers,
  scopes,
  specifierName,
  statementFenceUnder,
  statementOf,
  styleRules,
  TIERS_ONLY_LAYER,
  TOKEN_PLUGIN_LAYERS,
  TYPOGRAPHY_RAW,
  tableUnder,
  ticked,
  tokenTableRows,
  topLevelKinds,
  typographyCss,
  UNSCOPED_BY_MEASUREMENT,
  unconfinedElementRules,
  unlayeredKinds,
  usedLayers,
} from "./support/cascade.js";

/**
 * The kinds of rule that may sit outside a layer, because no layer sorts them.
 * `@import` is not among them and cannot be: `replaceSync` removes import rules
 * from a constructed stylesheet, so one can never appear here. Where an import
 * sits is checked on the unresolved file instead.
 */
const ALLOWED_AT_TOP_LEVEL = new Set([
  "@layer statement",
  "@layer",
  "@property",
  "@font-face",
]);

/** Whether a layer name is one of the declared ten, or a sublayer of one. */
const isDeclared = (name: string): boolean =>
  DECLARED_LAYERS.some(
    (declared) => name === declared || name.startsWith(`${declared}.`),
  );

/** Every file the README documents, and the layers each of its rows gives it. */
const documented = documentedFiles();

/** The files the entry imports, named the way the README names them. */
const IMPORTED = importsOf(entryRaw).map(specifierName);

describe("the layer set used equals the layer set declared", () => {
  it("the statement is the first rule, and names the ten layers in order", () => {
    const first = parse(entryCss).cssRules[0];
    expect(first).toBeInstanceOf(CSSLayerStatementRule);
    if (!(first instanceof CSSLayerStatementRule)) return;
    expect(Array.from(first.nameList)).toEqual(DECLARED_LAYERS);
  });

  it("every layer named anywhere is one of the ten or a sublayer of one, and none is anonymous", () => {
    // Named, not merely opened: a second `@layer` statement puts a name into the
    // order without opening anything, so a layer can join the cascade with no
    // block to give it away.
    const named = namedLayers(entryCss);
    expect(named.length).toBeGreaterThan(0);
    // An anonymous block reports as `(anonymous)`, which is undeclarable by
    // construction: nothing can name it, order it or override it.
    expect(named.filter((name) => !isDeclared(name))).toEqual([]);
  });

  it("the only declared layer nothing writes to is the one reserved for the application tiers", () => {
    const used = new Set(usedLayers(entryCss, DECLARED_LAYERS));
    expect(DECLARED_LAYERS.filter((name) => !used.has(name))).toEqual(
      RESERVED_LAYERS,
    );
  });

  it("nothing is written directly into ds.components: everything in it sits in a tier", () => {
    // A rule written straight into a parent layer lands in that layer's implicit
    // final sublayer, above every named one — so it would outrank both tiers and
    // no component package could override it by layer. Measured in Chromium: a
    // rule in `@layer ds.components` beats one in `@layer ds.components.app` at
    // equal specificity, under a statement that declares both.
    // Every kind the cascade sorts by layer counts, not only style rules: a
    // browser settles duplicate `@keyframes`, `@font-face` and `@property` by
    // layer too, so one of those written here would outrank the tiers as surely
    // as a style rule would.
    expect(directRulesIn(entryCss, TIERS_ONLY_LAYER)).toEqual([]);
    // And the tier the presets moved to is not empty, so this is not vacuous.
    expect(
      directRulesIn(entryCss, "ds.components.global").length,
    ).toBeGreaterThan(0);
  });

  it("every @scope block is scoped to .ds, and the element-level layers are the scoped ones", () => {
    const found = scopes(entryCss);
    expect(found.length).toBeGreaterThan(0);
    expect(found.filter((scope) => scope.start !== ".ds")).toEqual([]);
    expect(scopedLayers(entryCss)).toEqual([...ELEMENT_LAYERS].sort());
  });

  it("every rule in an element-level layer is confined to pragma territory", () => {
    // The layer-by-layer check above says a layer holds a scope somewhere. This
    // says every rule in it is inside one — which is the actual promise, and the
    // defect the release exists to close: an element rule of pragma's reaching a
    // `<p>` on a page pragma does not own competes with that page's own rule and
    // wins or loses by source order, one property at a time.
    expect(styleRules(entryCss).length).toBeGreaterThan(0);
    expect(unconfinedElementRules(entryCss, ELEMENT_LAYERS)).toEqual(
      UNSCOPED_BY_MEASUREMENT,
    );
  });

  it("the one rule written outside a scope is the one the README says is written outside a scope", () => {
    // The layer table answers the scope column with a selector for exactly one
    // row — `reset.css` box-sizing — and that sentence is the exception above.
    // Reading the selector back out of the README is what stops the exception
    // from quietly growing to cover a rule nobody wrote it for.
    const quoted = tableUnder("What Is Layered Where")
      .flatMap((cells) => ticked(cells[2] ?? ""))
      // A scope cell may mention the at-rule it is the alternative to, and a
      // selector that is not a claim about confinement at all. The claim is the
      // selector that names the territory class in place of the scope.
      .filter((token) => token.includes(".ds"));
    expect(quoted).toEqual([":where(.ds, .ds *)"]);
    expect(UNSCOPED_BY_MEASUREMENT).toHaveLength(1);
    expect(UNSCOPED_BY_MEASUREMENT[0]).toContain(quoted[0]);
  });

  it("the package makes no important declaration", () => {
    // Asked of the browser, not of the text: `getPropertyPriority` is what the
    // cascade itself reads, and it says important for `!IMPORTANT` and for a
    // comment between the bang and the word, neither of which a search for the
    // literal string finds.
    expect(importantDeclarations(entryCss)).toEqual([]);
    // The text scan stays as source hygiene, per file, so that a bang written
    // into a file the entry does not import is caught too.
    for (const [name, css] of Object.entries(LOCAL_SOURCES))
      expect([name, css.match(/!\s*important/gi) ?? []]).toEqual([name, []]);
  });

  it("nothing sits at the top level that a layer could have sorted", () => {
    const unexpected = topLevelKinds(entryCss).filter(
      (kind) => !ALLOWED_AT_TOP_LEVEL.has(kind),
    );
    // A style rule here is the defect the programme exists to prevent: an
    // unlayered author rule beats every layered one, whatever the order says.
    expect(unexpected).toEqual([]);
  });

  it("no file writes an @import after a rule, where a browser would drop it", () => {
    // An `@import` is only valid before any rule, a layer statement and
    // `@charset` excepted. A bundler inlines a late one regardless, so the
    // resolved stylesheet cannot show the defect and this reads files as written
    // — both packages' files, because the entry pulls the typography package in
    // and a late import written there reaches a consumer just the same.
    const files = { ...LOCAL_RAW, ...TYPOGRAPHY_RAW };
    // An empty glob would pass this loop without reading anything.
    expect(Object.keys(LOCAL_RAW).length).toBeGreaterThan(0);
    expect(Object.keys(TYPOGRAPHY_RAW).length).toBeGreaterThan(0);
    for (const [name, raw] of Object.entries(files))
      expect([name, lateImports(raw)]).toEqual([name, []]);
  });
});

describe("the README says what the stylesheet does", () => {
  it("the statement the README quotes is the statement the stylesheet states", () => {
    const quoted = statementFenceUnder("Cascade Layers");
    expect(quoted).toBe(statementOf(entryRaw));
    expect(quoted).toBe(statementOf(entryCss));
  });

  it("the layer tables name every file the entry imports, and nothing else", () => {
    expect([...documented.keys()].sort()).toEqual([...IMPORTED].sort());
  });

  it("every file the README names opens exactly the layers the README gives it", () => {
    for (const [name, row] of documented)
      expect([name, openedLayers(mustResolve(name))]).toEqual([
        name,
        [...row.layers].sort(),
      ]);
  });

  it("every file the README calls scoped confines those layers to .ds, and no other file scopes anything", () => {
    for (const [name, row] of documented)
      expect([name, scopedLayers(mustResolve(name))]).toEqual([
        name,
        [...row.scoped].sort(),
      ]);
  });

  it("the design-tokens generator's four layer names are the ones its files open", () => {
    // The generator emits these four names (its own README carries the row);
    // four of the ten in the statement are those names, so a rename upstream is
    // a change to this package's contract and fails here, not silently in a page.
    for (const [set, layer] of Object.entries(TOKEN_PLUGIN_LAYERS)) {
      const name = `@canonical/design-tokens/dist/${set}.css`;
      const css = EXTERNAL_SOURCES[name];
      expect(css).toBeTypeOf("string");
      if (typeof css !== "string") return;
      expect([set, openedLayers(css)]).toEqual([set, [layer]]);
    }
  });

  it("every row of the design-token table opens the layer it names, and is imported where it says", () => {
    for (const row of tokenTableRows()) {
      // A row that names no layer claims the file is empty; one that names a
      // layer claims that file opens exactly it, imported here or not.
      expect([row.file, openedLayers(mustResolve(row.file))]).toEqual([
        row.file,
        [...row.layers].sort(),
      ]);
      expect([row.file, IMPORTED.includes(row.file)]).toEqual([
        row.file,
        row.imported,
      ]);
    }
  });

  it("what the README calls deliberately unlayered is what sits outside the layers", () => {
    const rows = tableUnder("What Is Deliberately Unlayered").map(
      ([rule, where, reaches]) => ({
        rule: ticked(rule ?? "")[0] ?? "",
        where: ticked(where ?? "")[0] ?? "",
        reaches: saysYes(reaches ?? ""),
      }),
    );
    expect(rows.length).toBeGreaterThan(0);
    // The list is exhaustive downwards: nothing outside a layer that it omits.
    expect(unlayeredKinds(entryCss).sort()).toEqual(
      rows
        .filter((row) => row.reaches)
        .map((row) => row.rule)
        .sort(),
    );
    // And upwards: every rule kind it names is written where it says it is.
    for (const row of rows)
      expect([
        row.rule,
        authorsAtTopLevel(mustResolve(row.where), row.rule),
      ]).toEqual([row.rule, true]);
  });

  it("fonts.css is the @font-face file, entire, and the entry does not pull it in", () => {
    const fonts = mustResolve("fonts.css");
    expect(new Set(topLevelKinds(fonts))).toEqual(new Set(["@font-face"]));
    expect(openedLayers(fonts)).toEqual([]);
    expect(IMPORTED).not.toContain("fonts.css");
  });
});

describe("every file the entry imports earns its import", () => {
  it("each one contributes at least one rule", () => {
    // A file that resolves to nothing is a name in the graph and nothing on
    // the page. The one this package found — modifiers.importance.css — was
    // dropped; this is what makes the next one loud instead of invisible.
    for (const name of IMPORTED)
      expect([name, parse(mustResolve(name)).cssRules.length > 0]).toEqual([
        name,
        true,
      ]);
  });

  it("no stylesheet in src/ is orphaned", () => {
    const reachable = new Set([...IMPORTED, "index.css", "fonts.css"]);
    expect(
      Object.keys(LOCAL_SOURCES).filter((name) => !reachable.has(name)),
    ).toEqual([]);
  });

  it("modifiers.importance.css is still empty, which is why the entry does not import it", () => {
    // When this fails, the generator has started emitting the importance
    // modifiers: restore the import in src/index.css and the row in the README's
    // design-token table, and retire modifiers.importance.shim.css.
    expect(parse(importanceCss).cssRules.length).toBe(0);
    expect(IMPORTED).not.toContain(
      "@canonical/design-tokens/dist/modifiers.importance.css",
    );
  });
});

describe("@canonical/styles-typography carries the same contract", () => {
  it("opens only its own layers, and confines every element rule to .ds", () => {
    expect(openedLayers(typographyCss)).toEqual([
      "ds.modifiers",
      "ds.tokens",
      "ds.typography",
    ]);
    expect(scopedLayers(typographyCss)).toEqual(["ds.typography"]);
    expect(
      scopes(typographyCss).filter((scope) => scope.start !== ".ds"),
    ).toEqual([]);
    expect(unconfinedElementRules(typographyCss, ELEMENT_LAYERS)).toEqual([]);
  });

  it("declares nothing but custom properties in ds.tokens, which is why that layer is unscoped", () => {
    // The README's reason for leaving a layer unscoped is that it declares
    // custom properties, which do nothing until a rule reads them. A real
    // property there would reach every page the stylesheet is loaded on.
    const declarations = declarationsIn(typographyCss, "ds.tokens");
    expect(declarations.length).toBeGreaterThan(0);
    expect(declarations.filter((entry) => !/ --[\w-]+$/.test(entry))).toEqual(
      [],
    );
  });

  it("registers every @property it writes outside every layer, and the browser keeps them all", () => {
    expect(authorsAtTopLevel(typographyCss, "@property")).toBe(true);
    // Counted, not named. A registration whose `initial-value` is not
    // computationally independent is thrown away whole by the engine — an
    // earlier `0.25rem` was, and the fallback it promised silently did not
    // exist. Comparing what the source writes against what the CSSOM keeps is
    // what makes a dead registration visible, and it stays true of the next one.
    expect(registeredProperties(typographyCss).length).toBe(
      authoredProperties(typographyCss),
    );
    expect(registeredProperties(typographyCss).length).toBeGreaterThan(0);
    expect(unlayeredKinds(typographyCss)).toEqual(["@property"]);
    // The entry carries them onto the page unchanged.
    expect(registeredProperties(entryCss)).toEqual(
      registeredProperties(typographyCss),
    );
  });

  it("each baseline engine, resolved on its own, is layered and confined the same way", () => {
    // The package entry imports one engine; the other two are documented as
    // consumer-swappable entry points and reach a page only when a consumer
    // imports one directly, so nothing would check them unless they are resolved
    // alone. This is the typography README's row that covers all three.
    expect(Object.keys(ENGINE_SOURCES).sort()).toEqual([
      "baseline-cap.css",
      "baseline-metrics.css",
      "baseline-trim.css",
    ]);
    for (const [name, css] of Object.entries(ENGINE_SOURCES)) {
      expect([name, openedLayers(css).filter((n) => !isDeclared(n))]).toEqual([
        name,
        [],
      ]);
      expect([name, openedLayers(css).includes("ds.typography")]).toEqual([
        name,
        true,
      ]);
      expect([name, scopedLayers(css)]).toEqual([name, ["ds.typography"]]);
      expect([
        name,
        scopes(css).filter((scope) => scope.start !== ".ds"),
      ]).toEqual([name, []]);
      expect([name, unconfinedElementRules(css, ELEMENT_LAYERS)]).toEqual([
        name,
        [],
      ]);
      expect([name, unlayeredKinds(css)]).toEqual([name, ["@property"]]);
      expect([name, registeredProperties(css).length]).toEqual([
        name,
        authoredProperties(css),
      ]);
      expect([name, importantDeclarations(css)]).toEqual([name, []]);
    }
  });
});
