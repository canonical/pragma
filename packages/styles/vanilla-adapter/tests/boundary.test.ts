/**
 * What the boundary does not reach on its own, and what answers each gap.
 *
 * Three failures live here, each measured against the page that has no Vanilla
 * on it at all:
 *
 *   - the order statement arriving late, which is total and silent;
 *   - Vanilla's `!important` declarations, which `all: revert` cannot touch;
 *   - an element that is itself an island root, which a scoped rule never
 *     matches and which the root baseline alone leaves half-styled.
 *
 * Every case renders the same markup twice, once on a mixed page and once on a
 * pragma-only page, and compares what the browser computes. A test that only
 * asserted the mixed page's value would pass on a value that is wrong on both.
 */

import { describe, expect, it } from "vitest";
import {
  adapterResolved,
  COMPONENT_CSS,
  computed,
  layersCss,
  PRAGMA_CSS,
  render,
  VANILLA_VERSIONS,
  vanillaCss,
} from "./support/pages.js";

/** An element that is itself an island root, one per element rule the copy carries. */
const ROOT_ELEMENTS = `
<pre class="ds" id="root-pre">x</pre>
<code class="ds" id="root-code">x</code>
<kbd class="ds" id="root-kbd">x</kbd>
<samp class="ds" id="root-samp">x</samp>
<h1 class="ds" id="root-h1">x</h1>
<h2 class="ds" id="root-h2">x</h2>
<h3 class="ds" id="root-h3">x</h3>
<h4 class="ds" id="root-h4">x</h4>
<h5 class="ds" id="root-h5">x</h5>
<h6 class="ds" id="root-h6">x</h6>
<p class="ds" id="root-p">x</p>
<small class="ds" id="root-small">x</small>
<sub class="ds" id="root-sub">x</sub>
<sup class="ds" id="root-sup">x</sup>
<progress class="ds" id="root-progress" value="0.5"></progress>
<fieldset><legend class="ds" id="root-legend">x</legend></fieldset>`;

/** The four Vanilla utilities whose important declarations reach inside an island. */
const ESCAPES = `
<div class="u-text-max-width">
  <div class="ds card" id="esc-card"><ul id="esc-ul"><li>x</li></ul><ol id="esc-ol"><li>x</li></ol></div>
</div>
<div class="u-table-layout--fixed">
  <div class="ds card"><table id="esc-table"><tbody><tr><td>x</td></tr></tbody></table></div>
</div>
<div class="p-content-card__author-and-date">
  <ul class="ds" id="esc-first-child"><li>x</li></ul>
</div>
<div class="u-vertically-center">
  <img class="ds" id="esc-img" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">
</div>`;

/** Inherited properties a Vanilla ancestor pushes at an island root. */
const INHERITANCE = `
<table><thead><tr><th><div class="ds card" id="inh-th"></div></th></tr></thead></table>
<figure><figcaption><div class="ds card" id="inh-caption"></div></figcaption></figure>
<div class="p-muted-heading"><div class="ds card" id="inh-muted"></div></div>
<div class="p-heading--4"><div class="ds card" id="inh-heading"></div></div>
<div class="u-align--center"><div class="ds card" id="inh-center"></div></div>
<ul class="p-list--divided"><li><div class="ds card" id="inh-list"></div></li></ul>
<div class="p-chip"><div class="ds card" id="inh-chip"></div></div>
<table><tbody><tr><td><div class="ds card" id="inh-cell"></div></td></tr></tbody></table>`;

const BODY = ROOT_ELEMENTS + ESCAPES + INHERITANCE;
const ROOT = "app comfortable light";

/** One island, for the pages that are about the order rather than the markup. */
const COLLAPSE_BODY = `<div class="ds card" id="card"><p class="ds" id="text">x</p></div>`;

/** The mixed page, with the statement first as the README's step 1 requires. */
const mixed = (vanilla: (typeof VANILLA_VERSIONS)[number]) => ({
  root: ROOT,
  styles: [layersCss, vanillaCss[vanilla], COMPONENT_CSS, adapterResolved],
  body: BODY,
});

/** The same page with no Vanilla on it: what every comparison is measured against. */
const pragmaOnly = { root: ROOT, styles: [PRAGMA_CSS], body: BODY };

/**
 * The properties each case is about. Read as a set rather than one at a time,
 * so a regression in a neighbouring property is caught by the same assertion.
 */
const read = (
  doc: Document,
  id: string,
  properties: readonly string[],
): Record<string, string> => {
  const style = computed(doc, id);
  return Object.fromEntries(
    properties.map((property) => [property, style.getPropertyValue(property)]),
  );
};

const sameAsPragmaOnly = async (
  vanilla: (typeof VANILLA_VERSIONS)[number],
  ids: readonly string[],
  properties: readonly string[],
): Promise<void> => {
  const [mixedDoc, pragmaDoc] = await Promise.all([
    render(mixed(vanilla)),
    render(pragmaOnly),
  ]);
  const differences: string[] = [];
  for (const id of ids) {
    const a = read(mixedDoc, id, properties);
    const b = read(pragmaDoc, id, properties);
    for (const property of properties)
      if (a[property] !== b[property])
        differences.push(
          `#${id} ${property}: mixed ${a[property]}, pragma ${b[property]}`,
        );
  }
  expect(differences).toEqual([]);
};

describe.each(VANILLA_VERSIONS)(
  "the boundary's three gaps (Vanilla %s)",
  (vanilla) => {
    it("styles an element that is itself an island root as pragma alone would", async () => {
      // `@scope (.ds)` never matches its own scoping root, so an element rule
      // written relative to it leaves `<pre class="ds">` with the root baseline
      // and the browser's defaults. Every element rule in the copy carries a
      // root-reaching twin; this is what the twins are for.
      await sameAsPragmaOnly(
        vanilla,
        [
          "root-pre",
          "root-code",
          "root-kbd",
          "root-samp",
          "root-h1",
          "root-h2",
          "root-h3",
          "root-h4",
          "root-h5",
          "root-h6",
          "root-p",
          "root-small",
          "root-sub",
          "root-sup",
          "root-progress",
          "root-legend",
        ],
        [
          "font-family",
          "font-size",
          "font-weight",
          "line-height",
          "margin-top",
          "margin-bottom",
          "padding-top",
          "padding-bottom",
          "position",
          "vertical-align",
          "display",
          "box-sizing",
          "top",
          "bottom",
        ],
      );
    });

    it("answers the Vanilla !important declarations that reach inside an island", async () => {
      // These are the six rules in Vanilla's build whose subject compound carries
      // no class, so the Vanilla class sits on an ancestor OUTSIDE the island —
      // the arrangement rule 2 recommends. `all: revert` cannot touch them: for
      // important rules the layer order reverses.
      await sameAsPragmaOnly(vanilla, ["esc-ul", "esc-ol"], ["max-width"]);
      await sameAsPragmaOnly(vanilla, ["esc-table"], ["table-layout"]);
      await sameAsPragmaOnly(vanilla, ["esc-first-child"], ["margin-bottom"]);
      await sameAsPragmaOnly(vanilla, ["esc-img"], ["align-self"]);
    });

    it("keeps the second boundary off elements no Vanilla utility reaches", async () => {
      // The cost of answering an important declaration in kind is that the answer
      // is important too, so inside one of these four utilities it also outranks
      // pragma's own value for that one property. It must not fire anywhere else.
      const doc = await render({
        root: ROOT,
        styles: [
          layersCss,
          vanillaCss[vanilla],
          COMPONENT_CSS,
          adapterResolved,
        ],
        body: `<div class="ds card"><ul id="free" style="max-width: 20em"><li>x</li></ul></div>`,
      });
      expect(computed(doc, "free").maxWidth).toBe("320px");
    });

    it("does not let a Vanilla ancestor push inherited properties into an island", async () => {
      // `revert` rolls a property back to the user agent, and for an inherited
      // property the user agent's answer is the parent's value, so the boundary
      // cannot undo inheritance. The island root declares instead.
      await sameAsPragmaOnly(
        vanilla,
        [
          "inh-caption",
          "inh-muted",
          "inh-heading",
          "inh-center",
          "inh-list",
          "inh-chip",
          "inh-cell",
        ],
        [
          "font-size",
          "font-style",
          "font-variant-caps",
          "font-variant-numeric",
          "letter-spacing",
          "word-spacing",
          "text-align",
          "text-indent",
          "text-transform",
          "text-shadow",
          "hyphens",
          "tab-size",
          "word-break",
          "border-collapse",
          "caption-side",
          "user-select",
        ],
      );
    });

    it("does not inherit a table cell's own alignment into an island, which pragma alone does", async () => {
      // The one deliberate difference in the set above, and the price of
      // declaring `text-align` at all. The user agent centres a `<th>`, and on a
      // page running pragma alone an island inside one inherits that; here the
      // root declares `start`, because the same property is how Vanilla's
      // `u-align--*` family would otherwise reach in and nothing can tell the two
      // apart. Named in the README's limitations.
      const [mixedDoc, pragmaDoc] = await Promise.all([
        render(mixed(vanilla)),
        render(pragmaOnly),
      ]);
      expect(computed(pragmaDoc, "inh-th").textAlign).toBe("center");
      expect(computed(mixedDoc, "inh-th").textAlign).toBe("start");
      // The leak it buys off, measured on the same page.
      expect(computed(mixedDoc, "inh-center").textAlign).toBe("start");
    });

    it("collapses when the order statement arrives after a sheet that opens a pragma layer", async () => {
      // The negative case, and the reason the README's step 1 is a requirement
      // rather than advice. A layer takes its place at the first mention of its
      // name; `ds` mentioned before the statement is placed at the bottom of the
      // order, below `boundary`, and the boundary's `all: revert` then erases
      // pragma instead of Vanilla. Nothing warns.
      const late = await render({
        root: ROOT,
        styles: [
          COMPONENT_CSS,
          layersCss,
          vanillaCss[vanilla],
          adapterResolved,
        ],
        body: COLLAPSE_BODY,
      });
      const first = await render({
        root: ROOT,
        styles: [
          layersCss,
          vanillaCss[vanilla],
          COMPONENT_CSS,
          adapterResolved,
        ],
        body: COLLAPSE_BODY,
      });
      // Statement first: pragma's typography reaches the island.
      expect(computed(first, "text").fontSize).toBe("14px");
      expect(computed(first, "text").marginTop).toBe("0px");
      expect(computed(first, "card").borderTopWidth).toBe("1px");
      // Statement late: `ds` was placed below `boundary`, so `all: revert` runs
      // over pragma's own rules and the island renders as bare markup.
      expect(computed(late, "text").fontSize).toBe("16px");
      expect(computed(late, "text").marginTop).toBe("16px");
      expect(computed(late, "card").borderTopWidth).toBe("0px");
    });
  },
);
