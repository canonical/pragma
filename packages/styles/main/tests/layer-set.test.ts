/**
 * The cascade contract of `@canonical/styles`, checked against the stylesheet a
 * consumer's bundler actually resolves.
 *
 * The package promises an order: ten layers, one statement, first rule. A
 * promise like that is only worth what a check makes it worth — the defect this
 * work started from was a README that described a layer order the CSS had never
 * implemented, and nothing in the repository could tell. So every claim the
 * README makes about the cascade is read out of the README here and compared
 * with the resolved stylesheet: the statement, the table of what is layered
 * where, the list of what is deliberately unlayered, and the layer each
 * generated design-token file opens. A README that disagrees with the CSS fails.
 *
 * It runs in Chromium because the cascade is what is under test, and the CSSOM
 * of an engine that implements the cascade is the only parser that answers
 * honestly what a browser will do with a stylesheet. `tests/support/cascade.ts`
 * says which four questions are left to the text, and why each of them has to be.
 *
 * `tests/core.test.ts` is the other half, and reads the files rather than a
 * browser: it checks that `core.css` and `index.css` state the same layer order,
 * import the same files in the same order bar the three element ones, and that
 * nothing in the resolved `core.css` selects an element by tag name or claims one
 * of the typographic engine's classes. Those assertions are not repeated here.
 * What this file adds about `core.css` is the layer set it opens and the two
 * properties the cascade decides: no scope, and no important declaration.
 */

import { describe, expect, it } from "vitest";
import {
  authoredProperties,
  authorsAtTopLevel,
  CORE_LAYERS,
  coreCss,
  coreRaw,
  DECLARED_LAYERS,
  declarationsIn,
  directRulesIn,
  documentedFiles,
  ELEMENT_LAYERS,
  ENGINE_SOURCES,
  EXTERNAL_SOURCES,
  elementRulesIn,
  entryCss,
  entryRaw,
  INDEX_LAYERS,
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
    // `core.test.ts` checks that the two entry points quote the same statement;
    // this checks that the statement is the one the README publishes, in order.
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

  it("index.css opens exactly the layers it should", () => {
    expect(openedLayers(entryCss)).toEqual([...INDEX_LAYERS].sort());
  });

  it("the three layers that style elements are all present, and none is empty", () => {
    for (const layer of ELEMENT_LAYERS)
      expect([layer, elementRulesIn(entryCss, layer).length > 0]).toEqual([
        layer,
        true,
      ]);
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
    //
    // Every kind the cascade sorts by layer counts, not only style rules: a
    // browser settles duplicate `@keyframes`, `@font-face` and `@property` by
    // layer too, so one of those written here would outrank the tiers as surely
    // as a style rule would.
    expect(directRulesIn(entryCss, TIERS_ONLY_LAYER)).toEqual([]);
    // And the tier the presets sit in is not empty, so this is not vacuous.
    expect(
      directRulesIn(entryCss, "ds.components.global").length,
    ).toBeGreaterThan(0);
  });

  it("the stylesheet confines nothing: there is no @scope anywhere in it", () => {
    // The rules here style the whole page, as a reset does. Confining them to
    // part of a page is the adapter package's job, and it does it in its own
    // copy; a scope appearing here would mean this stylesheet had quietly
    // started doing it too, on pages that never asked for it.
    expect(scopes(entryCss)).toEqual([]);
    expect(scopes(coreCss)).toEqual([]);
  });

  it("neither entry makes an important declaration", () => {
    // Asked of the browser, not of the text: `getPropertyPriority` is what the
    // cascade itself reads, and it says important for `!IMPORTANT` and for a
    // comment between the bang and the word, neither of which a search for the
    // literal string finds.
    expect(importantDeclarations(entryCss)).toEqual([]);
    expect(importantDeclarations(coreCss)).toEqual([]);
    // The text scan stays as source hygiene, per file, so that a bang written
    // into a file the entry does not import is caught too.
    for (const [name, css] of Object.entries(LOCAL_SOURCES))
      expect([name, css.match(/!\s*important/gi) ?? []]).toEqual([name, []]);
  });

  it("nothing sits at the top level that a layer could have sorted", () => {
    for (const [name, css] of Object.entries({
      "index.css": entryCss,
      "core.css": coreCss,
    }))
      expect([
        name,
        topLevelKinds(css).filter((kind) => !ALLOWED_AT_TOP_LEVEL.has(kind)),
      ]).toEqual([name, []]);
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
    expect(lateImports(coreRaw)).toEqual([]);
  });
});

describe("core.css is the same stylesheet without the element layers", () => {
  it("opens every layer index.css opens except the three that style elements", () => {
    // Which files it imports, and that nothing in it selects an element by tag
    // name or claims an engine class, are `core.test.ts`. This is the layer set
    // that follows from those imports, read out of a browser rather than a file.
    expect(openedLayers(coreCss)).toEqual([...CORE_LAYERS].sort());
    for (const layer of ELEMENT_LAYERS)
      expect([layer, openedLayers(coreCss).includes(layer)]).toEqual([
        layer,
        false,
      ]);
  });

  it("names every layer index.css names, so the order is the same either way", () => {
    // The two entries declare the same ten and open different subsets of them.
    // A layer opened by one and unknown to the other would mean a page
    // arbitrating differently depending on which entry a consumer picked.
    expect(namedLayers(coreCss).filter((name) => !isDeclared(name))).toEqual(
      [],
    );
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

  it("every file the README says selects elements does, and every file it says does not, does not", () => {
    for (const [name, row] of documented) {
      const css = mustResolve(name);
      for (const layer of row.layers)
        expect([name, layer, elementRulesIn(css, layer).length > 0]).toEqual([
          name,
          layer,
          row.selecting.has(layer),
        ]);
    }
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

  it("fonts.css is the @font-face file, entire, and neither entry pulls it in", () => {
    const fonts = mustResolve("fonts.css");
    expect(new Set(topLevelKinds(fonts))).toEqual(new Set(["@font-face"]));
    expect(openedLayers(fonts)).toEqual([]);
    expect(IMPORTED).not.toContain("fonts.css");
    expect(importsOf(coreRaw).map(specifierName)).not.toContain("fonts.css");
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
    const reachable = new Set([
      ...IMPORTED,
      ...importsOf(coreRaw).map(specifierName),
      "index.css",
      "core.css",
      "fonts.css",
    ]);
    expect(
      Object.keys(LOCAL_SOURCES).filter((name) => !reachable.has(name)),
    ).toEqual([]);
  });

  it("modifiers.importance.css is still empty, which is why neither entry imports it", () => {
    // When this fails, the generator has started emitting the importance
    // modifiers: restore the import in both entries and the row in the README's
    // design-token table, and retire modifiers.importance.shim.css.
    expect(parse(importanceCss).cssRules.length).toBe(0);
    const importance = "@canonical/design-tokens/dist/modifiers.importance.css";
    expect(IMPORTED).not.toContain(importance);
    expect(importsOf(coreRaw).map(specifierName)).not.toContain(importance);
  });
});

describe("@canonical/styles-typography carries the same contract", () => {
  it("opens only its own layers, and confines nothing", () => {
    expect(openedLayers(typographyCss)).toEqual([
      "ds.modifiers",
      "ds.tokens",
      "ds.typography",
    ]);
    expect(scopes(typographyCss)).toEqual([]);
    expect(importantDeclarations(typographyCss)).toEqual([]);
  });

  it("declares nothing but custom properties in ds.tokens", () => {
    // The reason a layer needs no element rules is that it declares custom
    // properties, which do nothing until a rule reads them. A real property
    // there would style the page from the layer the mapper shares with the
    // tokens, which is not what either half is for.
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
    // Both entries carry them onto the page unchanged: the registration travels
    // with the mapper, which `core.css` takes without the element rules.
    expect(registeredProperties(entryCss)).toEqual(
      registeredProperties(typographyCss),
    );
    expect(registeredProperties(coreCss)).toEqual(
      registeredProperties(typographyCss),
    );
  });

  it("each baseline engine, resolved on its own, is layered the same way", () => {
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
      expect([name, scopes(css)]).toEqual([name, []]);
      expect([name, elementRulesIn(css, "ds.typography").length > 0]).toEqual([
        name,
        true,
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

/** Nothing outside a layer, in either entry, is a rule the cascade sorts. */
describe("the two entries agree about everything but the element layers", () => {
  it("open the same layers apart from those three, and no others", () => {
    const only = (a: string[], b: string[]) => a.filter((x) => !b.includes(x));
    expect(only(openedLayers(entryCss), openedLayers(coreCss)).sort()).toEqual(
      [...ELEMENT_LAYERS].sort(),
    );
    expect(only(openedLayers(coreCss), openedLayers(entryCss))).toEqual([]);
  });

  it("carry the same rules in every layer they share", () => {
    // The point of `core.css` is that it subtracts three layers and changes
    // nothing else. A rule appearing in one and not the other, in a layer both
    // open, would mean a page taking the adapter's route got something a page
    // taking the ordinary route did not.
    const inShared = (css: string) =>
      styleRules(css)
        .filter((rule) => CORE_LAYERS.includes(rule.layer))
        .map((rule) => `${rule.layer} | ${rule.selector}`)
        .sort();
    expect(inShared(coreCss)).toEqual(inShared(entryCss));
  });
});
