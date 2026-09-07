/**
 * The cascade contract of `@canonical/styles`, checked against the stylesheet a
 * consumer's bundler actually resolves.
 *
 * The package promises an order: ten layers, one statement, first rule. A
 * promise like that is only worth what a check makes it worth — the defect this
 * work started from was a README that described a layer order the CSS had never
 * implemented, and nothing in the repository could tell. So every claim the
 * README makes about the cascade is read out of the README here and compared
 * with the resolved stylesheet: the statement, the layers each entry point
 * opens, the table of what is layered where, the list of what is deliberately
 * unlayered, and the layer each generated design-token file opens. A README that
 * disagrees with the CSS fails.
 *
 * It runs in Chromium because the cascade is what is under test, and the CSSOM
 * of an engine that implements the cascade is the only parser that answers
 * honestly what a browser will do with a stylesheet. `tests/support/cascade.js`
 * says which three questions are left to the text, and why each has to be.
 *
 * `tests/entries.test.ts` is the other half, and reads the files rather than a
 * browser: that the statement is each entry's first rule and names the same
 * layers in all four, that no entry imports another, that `tokens.css` pulls in
 * no file carrying element rules and delivers no rule with a type selector or an
 * engine class, that each entry's import graph inlines every file exactly once,
 * and that the three parts together deliver exactly what the whole does. None of
 * that is repeated here.
 *
 * One thing neither file checks, and nothing else does either: that the layout
 * presets match what they claim to — `grid`, `subgrid`, `responsive`,
 * `intrinsic`. That is a question about what a selector matches, not about where
 * a rule sits, so it needs a rendered page rather than a parsed stylesheet.
 */

import { describe, expect, it } from "vitest";
import {
  authorsAtTopLevel,
  DECLARED_LAYERS,
  declarationsIn,
  directRulesIn,
  documentedFiles,
  ELEMENT_LAYERS,
  ENGINE_SOURCES,
  ENTRIES,
  ENTRIES_RAW,
  EXTERNAL_SOURCES,
  effectiveRules,
  elementRulesIn,
  entryCss,
  entryRaw,
  entryTableRows,
  importanceCss,
  importantDeclarations,
  importsOf,
  LOCAL_RAW,
  LOCAL_SOURCES,
  lateImports,
  layerTableNames,
  mustResolve,
  namedLayers,
  openedLayers,
  parse,
  RESERVED_LAYERS,
  saysYes,
  scopes,
  specifierName,
  statementFenceUnder,
  statementOf,
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

/** What the README says about each kind of rule it leaves outside the layers. */
const UNLAYERED_ROWS = tableUnder("What Is Deliberately Unlayered").map(
  ([rule, where, reaches]) => ({
    rule: ticked(rule ?? "")[0] ?? "",
    where: ticked(where ?? "")[0] ?? "",
    reaches: saysYes(reaches ?? ""),
  }),
);

/**
 * What may sit at an entry point's top level: the order statement, the layer
 * blocks, and whatever the README's unlayered table names. Read from the README
 * rather than listed here, so that the two checks below cannot disagree about
 * the same rule — one saying a kind is allowed outside a layer while the other
 * says nothing of that kind reaches an entry.
 *
 * Not "because no layer sorts them": a browser settles duplicate `@font-face`
 * rules and duplicate `@property` registrations by layer, measured in Chromium
 * 151 and Firefox 153, and `sortedByLayer` in the support module counts them for
 * exactly that reason. They sit outside the layers because there is only ever one
 * of each, so a layer would have nothing to sort it against.
 *
 * `@import` is not among them and cannot be: `replaceSync` removes import rules
 * from a constructed stylesheet, so one can never appear here. Where an import
 * sits is checked on the unresolved file instead.
 */
const ALLOWED_AT_TOP_LEVEL = new Set([
  "@layer statement",
  "@layer",
  ...UNLAYERED_ROWS.map((row) => row.rule),
]);

/** Whether a layer name is one of the declared ten, or a sublayer of one. */
const isDeclared = (name) =>
  DECLARED_LAYERS.some(
    (declared) => name === declared || name.startsWith(`${declared}.`),
  );

/** Every file the README documents, and the layers each of its rows gives it. */
const documented = documentedFiles();

/** The files `index.css` imports, named the way the README names them. */
const IMPORTED = importsOf(entryRaw).map(specifierName);

/** Every file any of the five entry points imports. */
const IMPORTED_ANYWHERE = new Set(
  Object.values(ENTRIES_RAW).flatMap((raw) =>
    importsOf(raw).map(specifierName),
  ),
);

describe("the layer set used equals the layer set declared", () => {
  it("the statement is the first rule, and names the ten layers in order", () => {
    // `entries.test.ts` checks that all five entry points quote the same
    // statement; this checks that the statement is the one the README publishes,
    // in order, read back out of a browser rather than out of the file.
    const first = parse(entryCss).cssRules[0];
    expect(first).toBeInstanceOf(CSSLayerStatementRule);
    if (!(first instanceof CSSLayerStatementRule)) return;
    expect(Array.from(first.nameList)).toEqual(DECLARED_LAYERS);
  });

  it("every layer any entry names is one of the thirteen or a sublayer of one, and none is anonymous", () => {
    // Named, not merely opened: a second `@layer` statement puts a name into the
    // order without opening anything, so a layer can join the cascade with no
    // block to give it away. An anonymous block reports as `(anonymous)`, which
    // is undeclarable by construction: nothing can name it, order it or override
    // it.
    //
    // The non-empty guard is asked of the entries the README says open a layer.
    // `layers.css` opens none by design — it is the order statement and nothing
    // else — and naming nothing beyond that statement is exactly what it is for.
    const opensLayers = new Set(
      entryTableRows()
        .filter((row) => row.layers.size > 0)
        .map((row) => row.entry),
    );
    for (const [name, css] of Object.entries(ENTRIES)) {
      const named = namedLayers(css);
      expect([name, named.length > 0]).toEqual([name, opensLayers.has(name)]);
      expect([name, named.filter((layer) => !isDeclared(layer))]).toEqual([
        name,
        [],
      ]);
    }
  });

  it("the table that explains the layers names the same thirteen, in the same order", () => {
    // The statement fixes the order; the table beside it is what a reader
    // consults instead of the statement. A layer added to one and not the other
    // is a reader sent to the wrong place, which is how this whole check started.
    expect(layerTableNames()).toEqual(DECLARED_LAYERS);
  });

  it("the declared layers no entry opens are the second-level tiers", () => {
    // Declared and empty on purpose: the packages in those tiers write to them,
    // and the statement is here to fix their order before any of them appears.
    // The README says so in each of their rows.
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
    for (const [name, css] of Object.entries(ENTRIES))
      expect([name, directRulesIn(css, TIERS_ONLY_LAYER)]).toEqual([name, []]);
    // And the tier the presets sit in is not empty, so this is not vacuous.
    expect(
      directRulesIn(entryCss, "ds.components.global").length,
    ).toBeGreaterThan(0);
  });

  it("no entry confines anything: there is no @scope in any of them", () => {
    // The rules here style the whole page, as a reset does. Confining them to
    // part of a page is the adapter package's job, and it does it in its own
    // copy; a scope appearing here would mean this stylesheet had quietly
    // started doing it too, on pages that never asked for it.
    for (const [name, css] of Object.entries(ENTRIES))
      expect([name, scopes(css)]).toEqual([name, []]);
  });

  it("no entry makes an important declaration", () => {
    // Asked of the browser, not of the text: `getPropertyPriority` is what the
    // cascade itself reads, and it says important for `!IMPORTANT` and for a
    // comment between the bang and the word, neither of which a search for the
    // literal string finds.
    for (const [name, css] of Object.entries(ENTRIES))
      expect([name, importantDeclarations(css)]).toEqual([name, []]);
    // The text scan stays as source hygiene, per file, so that a bang written
    // into a file no entry imports is caught too.
    for (const [name, css] of Object.entries(LOCAL_SOURCES))
      expect([name, css.match(/!\s*important/gi) ?? []]).toEqual([name, []]);
  });

  it("nothing sits at the top level of any entry that a layer could have sorted", () => {
    for (const [name, css] of Object.entries(ENTRIES))
      expect([
        name,
        topLevelKinds(css).filter((kind) => !ALLOWED_AT_TOP_LEVEL.has(kind)),
      ]).toEqual([name, []]);
  });

  it("no file writes an @import after a rule, where a browser would drop it", () => {
    // An `@import` is only valid before any rule, a layer statement and
    // `@charset` excepted. A bundler inlines a late one regardless, so the
    // resolved stylesheet cannot show the defect and this reads files as written
    // — both packages' files, because the entries pull the typography package in
    // and a late import written there reaches a consumer just the same.
    const files = { ...LOCAL_RAW, ...TYPOGRAPHY_RAW };
    // An empty glob would pass this loop without reading anything.
    expect(Object.keys(LOCAL_RAW).length).toBeGreaterThan(0);
    expect(Object.keys(TYPOGRAPHY_RAW).length).toBeGreaterThan(0);
    for (const [name, raw] of Object.entries(files))
      expect([name, lateImports(raw)]).toEqual([name, []]);
  });
});

describe("the five entry points deliver what the README says they deliver", () => {
  it("each opens exactly the layers the entry table gives it", () => {
    // Eight for the whole stylesheet, four for the values, three for the element
    // rules, one for the layout presets, and none for the statement on its own.
    // `entries.test.ts` pins several of them from the file side as well; this
    // reads all five out of a browser, which is the parser that decides what a
    // page actually gets — and for the statement-only entry it is the check that
    // it opens nothing, which is the whole of what that file promises.
    const rows = entryTableRows();
    expect(rows.map((row) => row.entry).sort()).toEqual(
      Object.keys(ENTRIES).sort(),
    );
    for (const row of rows) {
      const css = ENTRIES[row.entry];
      expect(css).toBeTypeOf("string");
      if (typeof css !== "string") return;
      expect([row.entry, openedLayers(css)]).toEqual([
        row.entry,
        [...row.layers].sort(),
      ]);
    }
  });

  it("the three layers that style elements are the three the parts split on", () => {
    // Present and non-empty in the whole stylesheet and in the element half;
    // absent from the other two, which is the whole reason those two exist.
    for (const layer of ELEMENT_LAYERS)
      for (const entry of ["index.css", "elements.css"])
        expect([
          entry,
          layer,
          elementRulesIn(ENTRIES[entry] ?? "", layer),
        ]).not.toEqual([entry, layer, []]);
    for (const entry of ["tokens.css", "layout.css"])
      expect([
        entry,
        openedLayers(ENTRIES[entry] ?? "").filter((layer) =>
          ELEMENT_LAYERS.includes(layer),
        ),
      ]).toEqual([entry, []]);
  });
});

describe("the README says what the stylesheet does", () => {
  it("the statement the README quotes is the statement the stylesheet states", () => {
    const quoted = statementFenceUnder("Cascade Layers");
    expect(quoted).toBe(statementOf(entryRaw));
    expect(quoted).toBe(statementOf(entryCss));
  });

  it("the layer tables name every file index.css imports, and nothing else", () => {
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
      expect([row.file, IMPORTED_ANYWHERE.has(row.file)]).toEqual([
        row.file,
        row.imported,
      ]);
    }
  });

  it("what the README calls deliberately unlayered is what sits outside the layers", () => {
    const rows = UNLAYERED_ROWS;
    expect(rows.length).toBeGreaterThan(0);
    // The list is exhaustive downwards: nothing outside a layer that it omits.
    for (const [name, css] of Object.entries(ENTRIES))
      expect([name, unlayeredKinds(css).sort()]).toEqual([
        name,
        rows
          .filter((row) => row.reaches)
          .map((row) => row.rule)
          .sort(),
      ]);
    // And upwards: every rule kind it names is written where it says it is.
    for (const row of rows)
      expect([
        row.rule,
        authorsAtTopLevel(mustResolve(row.where), row.rule),
      ]).toEqual([row.rule, true]);
  });

  it("fonts.css is the @font-face file, entire, and no entry pulls it in", () => {
    const fonts = mustResolve("fonts.css");
    expect(new Set(topLevelKinds(fonts))).toEqual(new Set(["@font-face"]));
    expect(openedLayers(fonts)).toEqual([]);
    expect([...IMPORTED_ANYWHERE]).not.toContain("fonts.css");
  });
});

describe("every file an entry imports earns its import", () => {
  /** The files the README says are generated empty, and are imported anyway. */
  const documentedEmpty = new Set(
    tokenTableRows()
      .filter((row) => row.layers.size === 0)
      .map((row) => row.file),
  );

  it("each one contributes at least one rule, or is one the README says is empty", () => {
    for (const name of IMPORTED_ANYWHERE) {
      // A file that resolves to nothing is a name in the graph and nothing on
      // the page. One is: the generated importance modifiers, which the design
      // token table records as opening no layer. Every other one has to earn its
      // place, so the next file that quietly empties is loud.
      //
      // Counted inside the blocks, not at the top level: a file reduced to
      // `@layer ds.tokens {}` has a top-level rule and delivers nothing.
      const rules = effectiveRules(mustResolve(name)).length;
      expect([name, rules > 0 || documentedEmpty.has(name)]).toEqual([
        name,
        true,
      ]);
    }
    // And the exemption is not a blanket one: it names exactly one file today.
    expect([...documentedEmpty]).toEqual([
      "@canonical/design-tokens/dist/modifiers.importance.css",
    ]);
    expect(effectiveRules(importanceCss)).toEqual([]);
  });

  it("no stylesheet in src/ is orphaned", () => {
    const reachable = new Set([
      ...IMPORTED_ANYWHERE,
      ...Object.keys(ENTRIES),
      "fonts.css",
    ]);
    expect(
      Object.keys(LOCAL_SOURCES).filter((name) => !reachable.has(name)),
    ).toEqual([]);
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
    expect(unlayeredKinds(typographyCss)).toEqual([]);
  });

  it("declares nothing but custom properties in ds.tokens", () => {
    // The reason a layer needs no element rules is that it declares custom
    // properties, which do nothing until a rule reads them. A real property
    // there would style the page from the layer the mapping shares with the
    // tokens, which is not what either half is for.
    const declarations = declarationsIn(typographyCss, "ds.tokens");
    expect(declarations.length).toBeGreaterThan(0);
    expect(declarations.filter((entry) => !/ --[\w-]+$/.test(entry))).toEqual(
      [],
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
      expect([name, unlayeredKinds(css)]).toEqual([name, []]);
      expect([name, importantDeclarations(css)]).toEqual([name, []]);
    }
  });
});
