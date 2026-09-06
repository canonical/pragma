import { describe, expect, it } from "vitest";
import {
  adapterCss,
  computed,
  differences,
  elementsCss,
  idsIn,
  importantDeclarations,
  layerNames,
  layersCss,
  layoutCss,
  MIXED_PRAGMA_CSS,
  mixedPage,
  PRAGMA_CSS,
  parse,
  pragmaElementsCss,
  render,
  stylesCss,
  tokensCss,
} from "./support/pages.js";

const MIXED_ORDER = [
  "vanilla",
  "boundary",
  "normalize",
  "ds.tokens",
  "ds.reset",
  "ds.typography",
  "ds.modifiers",
  "ds.surfaces",
  "ds.states",
  "ds.adapter",
  "ds.components",
  "ds.components.global",
  "ds.components.sites",
  "ds.components.documentation",
  "ds.components.stores",
  "ds.components.apps",
  "app",
];

const ADAPTER_ONLY = ["vanilla", "boundary", "ds.adapter", "app"];

/** Pragma's own order: the mixed order minus the adapter's four layers. */
const PRAGMA_ORDER = MIXED_ORDER.filter((name) => !ADAPTER_ONLY.includes(name));

/** The layers elements.css carries, in pragma's order. */
const ELEMENT_LAYERS = ["normalize", "ds.reset", "ds.typography"];

/** Whether a layer name is one of the declared ones or a sublayer of one. */
const isDeclared = (name: string): boolean =>
  MIXED_ORDER.some(
    (declared) => name === declared || name.startsWith(`${declared}.`),
  );

/** A stylesheet text without its comments. */
const uncommented = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, "");

/** A selector list split on the commas outside parentheses. */
const selectorsOf = (rule: CSSStyleRule): string[] =>
  rule.selectorText.split(/,\s*(?![^()]*\))/);

/** A stylesheet text without its `@import` statements, which a constructed sheet drops. */
const withoutImports = (css: string): string =>
  css.replace(/^\s*@import[^;]*;/gm, "");

describe("the order contract", () => {
  it("layers.css is a single statement naming the seventeen layers in order", () => {
    const sheet = parse(layersCss);
    expect(sheet.cssRules.length).toBe(1);
    expect(sheet.cssRules[0]).toBeInstanceOf(CSSLayerStatementRule);
    expect(layerNames(layersCss)).toEqual(MIXED_ORDER);
  });

  it("adapter.css opens with its three imports, then the boundary block and the bridge block, and Chromium keeps the boundary's list whole", () => {
    // The imports are the first rules of the file (README rule 4): pragma's
    // tokens first, so that they arrive before the copy that reads them.
    const statements = uncommented(adapterCss)
      .split(";")
      .map((line) => line.trim())
      .filter(Boolean);
    expect(statements.slice(0, 3)).toEqual([
      '@import url("@canonical/styles/tokens.css")',
      '@import url("@canonical/styles/layout.css")',
      '@import url("./elements.css")',
    ]);
    const blocks = Array.from(
      parse(withoutImports(adapterCss)).cssRules,
    ).filter(
      (rule): rule is CSSLayerBlockRule => rule instanceof CSSLayerBlockRule,
    );
    expect(blocks.map((block) => block.name)).toEqual([
      "boundary",
      "ds.adapter",
    ]);
    const [boundary, bridge] = blocks;
    // Chromium drops the Gecko-only rules one by one, as designed, and must
    // never drop the list that names the WebKit parts and the placeholder.
    const list = boundary?.cssRules[0];
    expect(list).toBeInstanceOf(CSSStyleRule);
    if (!(list instanceof CSSStyleRule)) return;
    expect(list.selectorText).toContain("::placeholder");
    expect(list.selectorText).toContain("::-webkit-slider-thumb");
    expect(list.selectorText).not.toContain("html");
    expect(list.style.cssText).toBe("all: revert;");
    const rule = bridge?.cssRules[0];
    expect(rule).toBeInstanceOf(CSSStyleRule);
    if (!(rule instanceof CSSStyleRule)) return;
    expect(bridge?.cssRules.length).toBe(1);
    expect(rule.selectorText).toBe(":where(.ds:not(.ds *))");
    expect(rule.style.colorScheme).toBe(
      "var(--vf-theme-light, light) var(--vf-theme-dark, dark)",
    );
  });

  it("elements.css is the three element layers, every rule confined to an island", () => {
    const blocks = Array.from(parse(elementsCss).cssRules);
    expect(
      blocks.map((rule) =>
        rule instanceof CSSLayerBlockRule ? rule.name : rule.cssText,
      ),
    ).toEqual(ELEMENT_LAYERS);
    const loose: string[] = [];
    let scoped = 0;
    for (const block of blocks) {
      if (!(block instanceof CSSLayerBlockRule)) continue;
      for (const rule of block.cssRules) {
        if (rule instanceof CSSScopeRule) {
          expect(rule.start).toBe(".ds");
          scoped += rule.cssRules.length;
        } else if (rule instanceof CSSStyleRule) {
          // The universal box-sizing rule, outside its block by design.
          for (const selector of selectorsOf(rule))
            if (!selector.startsWith(":where(.ds, .ds *)"))
              loose.push(`${block.name} ${selector}`);
        } else {
          loose.push(`${block.name} ${rule.cssText.slice(0, 60)}`);
        }
      }
    }
    expect(loose).toEqual([]);
    // Chromium parses the scope blocks rather than dropping them.
    expect(scoped).toBeGreaterThan(20);
  });

  it("every layer pragma's CSS uses is in the statement, and none is anonymous, on both kinds of page", () => {
    for (const css of [PRAGMA_CSS, MIXED_PRAGMA_CSS]) {
      const names = layerNames(css);
      expect(names.length).toBeGreaterThan(0);
      expect(names.filter((name) => !isDeclared(name))).toEqual([]);
    }
  });

  it("pragma's CSS carries no !important on either kind of page (README rule 17)", () => {
    // The CSSOM is the check; the text match is a second look at what a
    // browser might read differently, with the comments taken out, because
    // adapter.css's own comment names Vanilla's important declarations.
    for (const css of [PRAGMA_CSS, MIXED_PRAGMA_CSS]) {
      expect(importantDeclarations(css)).toEqual([]);
      expect(uncommented(css).match(/!\s*important/gi) ?? []).toEqual([]);
    }
  });

  it("@canonical/styles and each of its entries open with pragma's own statement, the mixed order minus the adapter's four", () => {
    // The mixed page sees the adapter's statement first and pragma's later, at
    // the top of each entry. A later statement can add layers but never
    // reorder the ones already fixed; this one adds none and lists them in the
    // same order, so it changes nothing.
    for (const css of [stylesCss, tokensCss, layoutCss, pragmaElementsCss]) {
      const first = parse(css).cssRules[0];
      expect(first).toBeInstanceOf(CSSLayerStatementRule);
      if (!(first instanceof CSSLayerStatementRule)) return;
      expect(Array.from(first.nameList)).toEqual(PRAGMA_ORDER);
    }
    expect(MIXED_ORDER.filter((name) => PRAGMA_ORDER.includes(name))).toEqual(
      PRAGMA_ORDER,
    );
  });

  it("sorts all 136 pairs of the seventeen names as written, by computed style", async () => {
    // The name list alone cannot show this: a top-level layer written between
    // two sublayers of `ds` sorts above all of `ds`, which is how a top-level
    // `adapter` sat above the component tiers until it became `ds.adapter`.
    // Each pair gets one element, the later layer's rule written first so that
    // source order would favour the earlier one; the later layer must still
    // win. The two exceptions are a parent against its own sublayers: a rule
    // written directly into `ds.components` sits in its implicit final
    // sublayer, above every tier, which is why nothing is written into it.
    const pairs: [number, number][] = [];
    let css = "";
    let body = "";
    for (let i = 0; i < MIXED_ORDER.length; i += 1)
      for (let j = i + 1; j < MIXED_ORDER.length; j += 1) {
        const id = `pair-${i}-${j}`;
        pairs.push([i, j]);
        css += `@layer ${MIXED_ORDER[j]} { #${id} { color: rgb(2, 2, 2) } } @layer ${MIXED_ORDER[i]} { #${id} { color: rgb(1, 1, 1) } }\n`;
        body += `<i id="${id}"></i>`;
      }
    expect(pairs.length).toBe(136);
    const doc = await render({ root: "", styles: [layersCss, css], body });
    const parentWins = (i: number, j: number): boolean =>
      MIXED_ORDER[j]?.startsWith(`${MIXED_ORDER[i]}.`) ?? false;
    const failures = pairs
      .filter(
        ([i, j]) =>
          computed(doc, `pair-${i}-${j}`).color !==
          (parentWins(i, j) ? "rgb(1, 1, 1)" : "rgb(2, 2, 2)"),
      )
      .map(([i, j]) => `${MIXED_ORDER[i]} < ${MIXED_ORDER[j]}`);
    expect(failures).toEqual([]);
  });

  it("a sub-tier layer declared later sorts above its tier and below `app` on a mixed page", async () => {
    // A package below a tier declares its own layer, flat beside the five,
    // first in its own entry (README, VC.31). Appearing after the statement
    // puts it above the five and still below `app`; the higher layer's rule
    // is written first each time so that source order cannot be the reason.
    const spec = mixedPage("4.58");
    const doc = await render({
      ...spec,
      styles: [
        ...spec.styles,
        [
          "@layer ds.components.apps-lxd;",
          "@layer ds.components.apps-lxd { #tier { color: rgb(2, 2, 2) } }",
          "@layer ds.components.apps { #tier { color: rgb(1, 1, 1) } }",
          "@layer app { #top { color: rgb(3, 3, 3) } }",
          "@layer ds.components.apps-lxd { #top { color: rgb(2, 2, 2) } }",
        ].join("\n"),
      ],
      body: `${spec.body}<i id="tier"></i><i id="top"></i>`,
    });
    expect(computed(doc, "tier").color).toBe("rgb(2, 2, 2)");
    expect(computed(doc, "top").color).toBe("rgb(3, 3, 3)");
  });

  it("order-independence: adapter.css may sit anywhere inside the pragma entry", async () => {
    const spec = mixedPage("4.58", { adapter: "after" });
    const after = await render(spec);
    const before = await render(mixedPage("4.58", { adapter: "before" }));
    const failures = idsIn(spec.body).flatMap((id) =>
      differences(`#${id}`, computed(after, id), computed(before, id)),
    );
    expect(failures).toEqual([]);
  });
});
