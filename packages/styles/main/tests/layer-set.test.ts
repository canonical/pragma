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
 * It runs in Chromium because `@layer` and `@scope` are cascade structure, and
 * the CSSOM of an engine that implements the cascade is the only parser that
 * answers honestly what a browser will do with them.
 */

import { describe, expect, it } from "vitest";
import {
  authorsAtTopLevel,
  DECLARED_LAYERS,
  documentedFiles,
  EXTERNAL_SOURCES,
  entryCss,
  entryRaw,
  importanceCss,
  importsOf,
  LOCAL_SOURCES,
  openedLayers,
  parse,
  RESERVED_LAYERS,
  registeredProperties,
  scopedLayers,
  scopes,
  sourceOf,
  specifierName,
  statementFenceUnder,
  statementOf,
  TOKEN_PLUGIN_LAYERS,
  tableUnder,
  ticked,
  tokenTableRows,
  topLevelKinds,
  typographyCss,
  unlayeredKinds,
} from "./support/cascade.js";

/** The kinds of rule that may sit outside a layer, because no layer sorts them. */
const ALLOWED_AT_TOP_LEVEL = new Set([
  "@layer statement",
  "@layer",
  "@import",
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

  it("every layer opened anywhere is one of the ten or a sublayer of one, and none is anonymous", () => {
    const opened = openedLayers(entryCss);
    expect(opened.length).toBeGreaterThan(0);
    // An anonymous block reports as `(anonymous)`, which is undeclarable by
    // construction: nothing can name it, order it or override it.
    expect(opened.filter((name) => !isDeclared(name))).toEqual([]);
  });

  it("the only declared layers nothing writes to are the two reserved for the component tiers", () => {
    const opened = new Set(openedLayers(entryCss));
    expect(DECLARED_LAYERS.filter((name) => !opened.has(name))).toEqual(
      RESERVED_LAYERS,
    );
  });

  it("every @scope block is scoped to .ds, and the element-level layers are the scoped ones", () => {
    const found = scopes(entryCss);
    expect(found.length).toBeGreaterThan(0);
    expect(found.filter((scope) => scope.start !== ".ds")).toEqual([]);
    // `normalize`, `ds.reset` and `ds.typography` are the gate the adapter's
    // fixtures wait on; `ds.components` is this package's two layout presets.
    expect(scopedLayers(entryCss)).toEqual([
      "ds.components",
      "ds.reset",
      "ds.typography",
      "normalize",
    ]);
  });

  it("the package ships no !important", () => {
    expect(entryCss.match(/!\s*important/g) ?? []).toEqual([]);
    for (const [name, css] of Object.entries(LOCAL_SOURCES))
      expect([name, css.match(/!\s*important/g) ?? []]).toEqual([name, []]);
  });

  it("nothing sits at the top level that a layer could have sorted", () => {
    const unexpected = topLevelKinds(entryCss).filter(
      (kind) => !ALLOWED_AT_TOP_LEVEL.has(kind),
    );
    // A style rule here is the defect the programme exists to prevent: an
    // unlayered author rule beats every layered one, whatever the order says.
    expect(unexpected).toEqual([]);
    // The one rule that is outside a layer on purpose, and has to be there: the
    // typography engine's baseline-unit registration, which reaches the page
    // through this entry.
    expect(registeredProperties(entryCss)).toEqual(["--baseline-height"]);
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
    for (const [name, row] of documented) {
      const css = sourceOf(name);
      expect([name, css === undefined]).toEqual([name, false]);
      expect([name, openedLayers(css as string)]).toEqual([
        name,
        [...row.layers].sort(),
      ]);
    }
  });

  it("every file the README calls scoped confines those layers to .ds, and no other file scopes anything", () => {
    for (const [name, row] of documented) {
      const css = sourceOf(name) as string;
      expect([name, scopedLayers(css)]).toEqual([name, [...row.scoped].sort()]);
    }
  });

  it("the design-tokens generator's four layer names are the ones its files open", () => {
    // The generator emits these four names (its own README carries the row);
    // four of the ten in the statement are those names, so a rename upstream is
    // a change to this package's contract and fails here, not silently in a page.
    for (const [set, layer] of Object.entries(TOKEN_PLUGIN_LAYERS)) {
      const css = EXTERNAL_SOURCES[`@canonical/design-tokens/dist/${set}.css`];
      expect([set, css === undefined]).toEqual([set, false]);
      expect([set, openedLayers(css as string)]).toEqual([set, [layer]]);
    }
  });

  it("every row of the design-token table opens the layer it names, and is imported where it says", () => {
    for (const row of tokenTableRows()) {
      const css = sourceOf(row.file);
      expect([row.file, css === undefined]).toEqual([row.file, false]);
      // A row that names no layer claims the file is empty; one that names a
      // layer claims that file opens exactly it, imported here or not.
      expect([row.file, openedLayers(css as string)]).toEqual([
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
    const rows = tableUnder("What Is Deliberately Unlayered").map((cells) => ({
      rule: ticked(cells[0] as string)[0] as string,
      where: ticked(cells[1] as string)[0] as string,
      reaches: (cells[2] as string).toLowerCase().startsWith("yes"),
    }));
    expect(rows.length).toBeGreaterThan(0);
    // The list is exhaustive downwards: nothing outside a layer that it omits.
    expect(unlayeredKinds(entryCss).sort()).toEqual(
      rows
        .filter((row) => row.reaches)
        .map((row) => row.rule)
        .sort(),
    );
    // And upwards: every rule kind it names is written where it says it is.
    for (const row of rows) {
      const css = sourceOf(row.where);
      expect([row.rule, css === undefined]).toEqual([row.rule, false]);
      expect([row.rule, authorsAtTopLevel(css as string, row.rule)]).toEqual([
        row.rule,
        true,
      ]);
    }
  });

  it("fonts.css is the @font-face file, entire, and the entry does not pull it in", () => {
    const fonts = LOCAL_SOURCES["fonts.css"] as string;
    expect(new Set(topLevelKinds(fonts))).toEqual(new Set(["@font-face"]));
    expect(openedLayers(fonts)).toEqual([]);
    expect(IMPORTED).not.toContain("fonts.css");
  });
});

describe("every file the entry imports earns its import", () => {
  it("each one contributes at least one rule", () => {
    for (const name of IMPORTED) {
      const css = sourceOf(name);
      expect([name, css === undefined]).toEqual([name, false]);
      // A file that resolves to nothing is a name in the graph and nothing on
      // the page. The one this package found — modifiers.importance.css — was
      // dropped; this is what makes the next one loud instead of invisible.
      expect([name, parse(css as string).cssRules.length > 0]).toEqual([
        name,
        true,
      ]);
    }
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
  it("opens only its own layers, and scopes its element rules to .ds", () => {
    expect(openedLayers(typographyCss)).toEqual([
      "ds.modifiers",
      "ds.tokens",
      "ds.typography",
    ]);
    expect(scopedLayers(typographyCss)).toEqual(["ds.typography"]);
    expect(scopes(typographyCss).filter((s) => s.start !== ".ds")).toEqual([]);
  });

  it("registers --baseline-height outside every layer, and the browser keeps it", () => {
    expect(authorsAtTopLevel(typographyCss, "@property")).toBe(true);
    // Presence is the assertion, not absence. A registration whose
    // `initial-value` is not computationally independent is thrown away whole by
    // the engine — an earlier `0.25rem` was, and the fallback it promised
    // silently did not exist. Reading the registration back out of the CSSOM is
    // what makes that failure visible instead of invisible.
    expect(registeredProperties(typographyCss)).toEqual(["--baseline-height"]);
    expect(unlayeredKinds(typographyCss)).toEqual(["@property"]);
  });
});
