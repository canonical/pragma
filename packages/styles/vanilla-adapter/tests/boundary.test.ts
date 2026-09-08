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
  COMPONENT_CSS,
  computed,
  mixedPage,
  pragmaPage,
  render,
  VANILLA_VERSIONS,
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
<fieldset><legend class="ds" id="root-legend">x</legend></fieldset>
<em class="ds" id="root-em">x</em>
<cite class="ds" id="root-cite">x</cite>
<address class="ds" id="root-address">x</address>
<table><tbody><tr><th class="ds" id="root-th">x</th></tr></tbody></table>
<button class="ds" id="root-button">x</button>
<ul class="ds" id="root-ul"><li id="root-ul-item">x</li></ul>
<ol class="ds" id="root-ol"><li id="root-ol-item">x</li></ol>`;

/** The four Vanilla utilities whose important declarations reach inside an island. */
const ESCAPES = `
<div class="u-text-max-width">
  <div class="ds card" id="esc-card"><ul id="esc-ul"><li>x</li></ul><ol id="esc-ol"><li>x</li></ol></div>
</div>
<div class="u-table-layout--fixed">
  <div class="ds card"><table id="esc-table"><tbody><tr><td>x</td></tr></tbody></table></div>
</div>
<div class="u-table-layout--auto">
  <div class="ds card"><table id="esc-table-auto"><tbody><tr><td>x</td></tr></tbody></table></div>
</div>
<div class="p-content-card__author-and-date">
  <ul class="ds" id="esc-first-child"><li>x</li></ul>
  <div class="ds card" id="esc-later-child"></div>
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
<table><tbody><tr><td><div class="ds card" id="inh-cell"></div></td></tr></tbody></table>
<pre><div class="ds card" id="inh-pre"></div></pre>
<nav class="p-breadcrumbs"><ol class="p-breadcrumbs__items"><li class="p-breadcrumbs__item">a</li><li class="p-breadcrumbs__item"><div class="ds card" id="inh-crumb"></div></li></ol></nav>
<ul class="p-list"><li class="ds" id="inh-marker">x</li></ul>`;

/**
 * Island roots inside a host that sizes, wraps or weights its own text. This is
 * where a relative value bites: excluding an element from a root declaration
 * hands it back to `normalize`, whose sizes are `1em`, `80%` and `75%` — all of
 * them resolved against the host rather than the island.
 */
const HOSTILE = `
<div class="p-heading--4">
  <pre class="ds" id="host-pre">x</pre>
  <small class="ds" id="host-small">x</small>
  <sub class="ds" id="host-sub">x</sub>
  <b class="ds" id="host-b">x</b>
  <strong class="ds" id="host-strong">x</strong>
</div>
<div class="p-muted-heading">
  <b class="ds" id="muted-b">x</b>
</div>
<div class="u-truncate">
  <code class="ds" id="trunc-code">x</code>
  <kbd class="ds" id="trunc-kbd">x</kbd>
</div>
<hr class="ds" id="host-hr">
<form>
  <input type="submit" class="ds" id="host-submit" value="x">
  <input type="file" class="ds" id="host-file">
</form>`;

const BODY = ROOT_ELEMENTS + ESCAPES + INHERITANCE + HOSTILE;
const ROOT = "app comfortable light";

/** One island, for the pages that are about the order rather than the markup. */
const COLLAPSE_BODY = `<div class="ds card" id="card"><p class="ds" id="text">x</p></div>`;

/** The mixed page, with the statement first as the README's step 3 requires. */
const mixed = (vanilla: (typeof VANILLA_VERSIONS)[number]) =>
  mixedPage(vanilla, { root: ROOT, body: BODY });

/** The same page with no Vanilla on it: what every comparison is measured against. */
const pragmaOnly = pragmaPage("light", BODY);

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
      //
      // The last seven roots are the other half of the problem: elements whose
      // own value comes from the user agent rather than from `normalize`, which
      // the root baseline would otherwise flatten. An `<em>` is italic, a `<th>`
      // and a button's label are centred, and a list has a marker.
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
          "root-em",
          "root-cite",
          "root-address",
          "root-button",
          "root-ul",
          "root-ol",
          "root-ul-item",
          "root-ol-item",
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
          "font-style",
          "text-align",
          "list-style-type",
        ],
      );
    });

    it("holds an island root's own value against a host that sizes or weights its text", async () => {
      // The hard half of the root declarations. Where the browser's value for
      // an element is RELATIVE — `1em` on a `<pre>`, `80%` on a `<small>`,
      // `bolder` on a `<b>` — excluding that element from a root declaration
      // hands it to the host, which is what the declaration existed to stop.
      // Measured before the fix, inside a Vanilla heading whose text is 24px: a
      // `<pre class="ds">` computed 24px against pragma's 16px, a `<small>`
      // 19.2px against 12.8px, and a `<b>` weight 400 against 700.
      await sameAsPragmaOnly(
        vanilla,
        [
          "host-pre",
          "host-small",
          "host-sub",
          "host-b",
          "host-strong",
          "muted-b",
          "trunc-code",
          "trunc-kbd",
          "host-hr",
          "host-submit",
          "host-file",
        ],
        [
          "font-size",
          "font-weight",
          "font-style",
          "text-align",
          "white-space-collapse",
          "text-wrap-mode",
          "user-select",
          "color",
          "border-top-color",
        ],
      );
    });

    it("styles a table header that is an island root, bar the padding the browser hints", async () => {
      // A `<th class="ds">` is the one root element with a difference left, and
      // it is the documented one: `revert` rolls back presentational hints as
      // well as declarations, and Chromium's 1px default cell padding is a hint.
      // Everything else about it matches, the boldness the browser gives a
      // header cell included, which is why `th` is excluded from the root
      // baseline's `font-weight`.
      const [mixedDoc, pragmaDoc] = await Promise.all([
        render(mixed(vanilla)),
        render(pragmaOnly),
      ]);
      for (const property of ["font-weight", "text-align", "font-family"])
        expect(
          computed(mixedDoc, "root-th").getPropertyValue(property),
          property,
        ).toBe(computed(pragmaDoc, "root-th").getPropertyValue(property));
      expect(computed(pragmaDoc, "root-th").paddingTop).toBe("1px");
      expect(computed(mixedDoc, "root-th").paddingTop).toBe("0px");
    });

    it("lets a list keep its host's markers, which is the list's business", async () => {
      // `list-style-type` is left to cross. An island root that is a list item
      // belongs to the host's list, and no constant is right both inside a host
      // `<ol>`, where the marker is `decimal`, and inside a Vanilla `.p-list`,
      // where the list has asked for none. Named in the README.
      const [mixedDoc, pragmaDoc] = await Promise.all([
        render(mixed(vanilla)),
        render(pragmaOnly),
      ]);
      for (const id of ["inh-marker", "inh-crumb", "inh-list"])
        expect(computed(mixedDoc, id).listStyleType, id).toBe("none");
      expect(computed(pragmaDoc, "inh-marker").listStyleType).toBe("disc");
      expect(computed(pragmaDoc, "inh-crumb").listStyleType).toBe("decimal");
    });

    it("answers the Vanilla !important declarations that reach inside an island", async () => {
      // Five rules in Vanilla's build carry an important declaration that can
      // reach an element inside an island, because their subject compound has no
      // class and the Vanilla class sits on an ancestor OUTSIDE the island — the
      // arrangement rule 2 recommends. Four counters answer them, one covering
      // both table-layout utilities. `all: revert` cannot touch an important
      // declaration: for important rules the layer order reverses.
      await sameAsPragmaOnly(vanilla, ["esc-ul", "esc-ol"], ["max-width"]);
      await sameAsPragmaOnly(
        vanilla,
        ["esc-table", "esc-table-auto"],
        ["table-layout"],
      );
      await sameAsPragmaOnly(vanilla, ["esc-first-child"], ["margin-bottom"]);
      // The counter mirrors `:first-child`, so a later `.ds` child of the same
      // container — which Vanilla never touches — keeps its own margin.
      await sameAsPragmaOnly(vanilla, ["esc-later-child"], ["margin-bottom"]);
      await sameAsPragmaOnly(vanilla, ["esc-img"], ["align-self"]);
    });

    it("fires nowhere but the exact place Vanilla's own rule reaches", async () => {
      // The cost of answering an important declaration in kind is that the
      // answer is important too: wherever it fires it also outranks the page's
      // own value for that property. So each counter has to mirror Vanilla's
      // selector exactly, `:first-child` included. An inline style is the probe,
      // because an important declaration beats one and a correctly scoped
      // counter leaves it alone — and because no component in this fixture set
      // declares a margin or a max width of its own, so the comparison against
      // the pragma-only page cannot see an over-reach here.
      const doc = await render(
        mixedPage(vanilla, {
          root: ROOT,
          body: `
          <div class="ds card">
            <ul id="free" style="max-width: 20em"><li>x</li></ul>
          </div>
          <div class="p-content-card__author-and-date">
            <ul class="ds" id="pcc-first"><li>x</li></ul>
            <div class="ds card" id="pcc-later" style="margin-bottom: 12px"></div>
          </div>`,
        }),
      );
      // Outside every Vanilla utility: untouched.
      expect(computed(doc, "free").maxWidth).toBe("320px");
      // The first child is where Vanilla's rule reaches, so the counter fires
      // and the page's own value goes with it. That is the documented cost.
      expect(computed(doc, "pcc-first").marginBottom).toBe("16px");
      // A later child of the same container is not where it reaches. Without
      // `:first-child` in the counter this reads 0px.
      expect(computed(doc, "pcc-later").marginBottom).toBe("12px");
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
          "inh-pre",
          "inh-crumb",
          "inh-marker",
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
          "text-underline-offset",
          "font-style",
        ],
      );
    });

    it("does not inherit a table cell's own alignment into an island, which pragma alone does", async () => {
      // The one deliberate difference in the set above, and the price of
      // declaring `text-align` at all. The user agent centres a `<th>`, and on a
      // page running pragma alone an island inside one inherits that; here the
      // root declares `start`, because the same property is how Vanilla's
      // `u-align--*` family would otherwise reach in and nothing can tell the two
      // apart. Named in the README's "What this package does not fix".
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
      // The negative case, and the reason the README's step 3 is a requirement
      // rather than advice. A layer takes its place at the first mention of its
      // name; `ds` mentioned before the statement is placed at the bottom of the
      // order, below `boundary`, and the boundary's `all: revert` then erases
      // pragma instead of Vanilla. Nothing warns.
      const late = await render(
        mixedPage(vanilla, {
          root: ROOT,
          body: COLLAPSE_BODY,
          before: [COMPONENT_CSS],
        }),
      );
      const first = await render(
        mixedPage(vanilla, { root: ROOT, body: COLLAPSE_BODY }),
      );
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

    it("carries its own order statement, so importing adapter.css alone is enough", async () => {
      // adapter.css imports layers.css as its first rule. A page that links
      // layers.css itself reads a second identical statement and nothing
      // happens; a page that imports only adapter.css gets the order from here,
      // and without it the first `ds` name any sheet mentions would place `ds`
      // below `boundary`. Neither arrangement above can see that, because both
      // link the statement, so this case renders without it.
      const carried = await render(
        mixedPage(vanilla, {
          root: ROOT,
          body: COLLAPSE_BODY,
          adapter: "before",
          statement: "self",
        }),
      );
      expect(computed(carried, "text").fontSize).toBe("14px");
      expect(computed(carried, "card").borderTopWidth).toBe("1px");

      // The same page with that statement taken out: the component sheet then
      // places `ds`, and the island collapses.
      const missing = await render(
        mixedPage(vanilla, {
          root: ROOT,
          body: COLLAPSE_BODY,
          adapter: "before",
          statement: "none",
        }),
      );
      expect(computed(missing, "text").fontSize).toBe("16px");
      expect(computed(missing, "card").borderTopWidth).toBe("0px");
    });
  },
);
