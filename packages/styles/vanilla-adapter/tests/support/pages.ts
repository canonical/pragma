/**
 * Builds whole documents in iframes so computed styles can be compared across
 * pages that differ only in which stylesheets they load. Everything here runs
 * in the browser; the CSS strings are resolved by Vite at test time, Vanilla
 * through its `sass` export condition (vite.config.ts), pragma through the
 * packages' own entry points.
 */

import buttonCss from "@canonical/react-ds-global/src/lib/component/Button/styles.css?inline";
import cardCss from "@canonical/react-ds-global/src/lib/component/Card/styles.css?inline";
import formCss from "@canonical/react-ds-global-form/src/index.css?inline";
import selectCss from "@canonical/react-ds-global-form/src/lib/subcomponent/SelectInput/styles.css?inline";
import textareaCss from "@canonical/react-ds-global-form/src/lib/subcomponent/TextareaInput/styles.css?inline";
import textInputCss from "@canonical/react-ds-global-form/src/lib/subcomponent/TextInput/styles.css?inline";
import stylesCss from "@canonical/styles?inline";
import vanilla456 from "vanilla-framework-4.56/scss/build.scss?inline";
import vanilla458 from "vanilla-framework-4.58/scss/build.scss?inline";
import { onTestFinished } from "vitest";
import { commands } from "vitest/browser";
import adapterCss from "../../adapter.css?raw";
import layersCss from "../../layers.css?raw";

/** The Vanilla releases the fixtures run against: the sites' pin and the latest. */
export const VANILLA_VERSIONS = ["4.56", "4.58"] as const;

type VanillaVersion = (typeof VANILLA_VERSIONS)[number];

/**
 * Vanilla's compiled CSS inside its layer. Its `@charset` is dropped because a
 * charset rule is invalid inside a block. Its `@font-face` rules are dropped
 * because fonts are the consumer's under pragma's names (README rule 16), and
 * because a remote font that arrives between two renders would make layout
 * comparisons order-dependent.
 */
const vanillaLayer = (css: string): string =>
  `@layer vanilla{${css
    .replace(/@charset\s+"[^"]*";/, "")
    .replace(/@font-face\s*\{[^}]*\}/g, "")}}`;

const vanillaCss: Record<VanillaVersion, string> = {
  "4.56": vanillaLayer(vanilla456),
  "4.58": vanillaLayer(vanilla458),
};

/** Pragma's CSS as a consumer loads it: the global stylesheet, then components. */
export const PRAGMA_CSS = [
  stylesCss,
  formCss,
  textInputCss,
  selectCss,
  textareaCss,
  buttonCss,
  cardCss,
].join("\n");

const parse = (css: string): CSSStyleSheet => {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
};

/** The layers in which a stylesheet scopes rules to pragma territory. */
const scopedLayers = (css: string): Set<string> => {
  const found = new Set<string>();
  const walk = (rules: CSSRuleList, layer: string): void => {
    for (const rule of rules) {
      if (rule instanceof CSSLayerBlockRule) {
        walk(rule.cssRules, layer ? `${layer}.${rule.name}` : rule.name);
      } else if (rule instanceof CSSScopeRule) {
        if (/(^|[\s(,])\.ds(?![\w-])/.test(rule.start ?? "")) found.add(layer);
        walk(rule.cssRules, layer);
      } else if (rule instanceof CSSGroupingRule) {
        walk(rule.cssRules, layer);
      }
    }
  };
  walk(parse(css).cssRules, "");
  return found;
};

/**
 * Whether the loaded `@canonical/styles` release scopes its element-level layers
 * to pragma territory (pragma-adrs F, band A): a `@scope (.ds)` block inside
 * both `normalize` and `ds.reset`. Fixtures that need it skip with SKIP_REASON
 * until it ships; the boundary's own guarantees do not need it.
 */
export const PRAGMA_IS_SCOPED = ((): boolean => {
  const layers = scopedLayers(stylesCss);
  return layers.has("normalize") && layers.has("ds.reset");
})();

export const SKIP_REASON =
  "needs the @canonical/styles release whose element layers are scoped to .ds (pragma-adrs F, band A)";

/** The pragma block: one of every element the two reported bugs touched. */
export const PRAGMA_BLOCK = `
<div class="ds card" id="ds-root">
  <h2 id="ds-h2">Heading</h2>
  <p id="ds-p">Paragraph</p>
  <p id="ds-p2">Second paragraph</p>
  <div class="ds input text chrome"><input id="ds-input" type="text" placeholder="x"></div>
  <select class="ds input select chrome" id="ds-select"><option>a</option></select>
  <textarea class="ds input textarea chrome" id="ds-textarea"></textarea>
  <label class="ds field-label" id="ds-label">Label</label>
  <button class="ds button" id="ds-button">Button</button>
  <ul id="ds-ul"><li id="ds-li">item</li></ul>
  <table id="ds-table"><tbody><tr><th id="ds-th">h</th><td id="ds-td">d</td></tr></tbody></table>
  <a id="ds-a" href="#">link</a>
  <hr id="ds-hr">
  <svg id="ds-svg" width="16" height="16" aria-hidden="true"><rect id="ds-rect" fill="red" width="8" height="8"></rect></svg>
  <div class="ds card" id="ds-nested"><p id="ds-nested-p">nested</p></div>
</div>`;

/** The Vanilla block: a layout, a form control, a pattern, a typography class. */
export const VANILLA_BLOCK = `
<div class="row" id="vf-row"><div class="col-6" id="vf-col">
  <h2 id="vf-h2" class="p-heading--4">Heading</h2>
  <p id="vf-p">Paragraph</p>
  <p id="vf-p2">Second paragraph</p>
  <input id="vf-input" type="text" placeholder="x">
  <button id="vf-button" class="p-button">Button</button>
  <hr id="vf-hr">
</div></div>`;

/** Vanilla markup inside pragma territory: unsupported, renders without Vanilla's styles. */
const NEGATIVE_BLOCK = `
<div class="ds card" id="neg-root"><form class="p-form">
  <label id="neg-label">Label</label><input id="neg-input" type="text">
</form></div>`;

/**
 * README rule 8: a Vanilla container whose rules target its direct children.
 * A pragma root placed there directly loses that placement; a wrapper keeps it.
 */
const PLACEMENT_BLOCK = `
<form class="p-form p-form--inline" id="place-form">
  <div class="ds card" id="place-direct"></div>
  <div id="place-wrapper"><div class="ds card" id="place-wrapped"></div></div>
</form>`;

/** The theme cases of VC.19 that markup alone can express, plus paper and a nested root. */
const THEME_BLOCK = `
<div class="is-dark"><div class="ds card" id="theme-dark"><p id="theme-dark-p">x</p>
  <div class="ds card" id="theme-dark-nested"></div></div></div>
<div class="p-strip--dark"><div class="ds card" id="theme-strip"></div></div>
<div class="is-dark"><div class="is-light"><div class="ds card" id="theme-light-in-dark"></div></div></div>
<div class="is-paper"><div class="ds card" id="theme-paper"></div></div>`;

export interface PageSpec {
  /** Classes on `<html>`. */
  root: string;
  /** Stylesheets, in document order. */
  styles: string[];
  body: string;
}

/** The mixed page: layers, Vanilla in its layer, pragma, the adapter. */
export const mixedPage = (
  vanilla: VanillaVersion,
  options: { root?: string; adapter?: "before" | "after" | "none" } = {},
): PageSpec => {
  const adapter = options.adapter ?? "after";
  const styles = [layersCss, vanillaCss[vanilla]];
  if (adapter === "before") styles.push(adapterCss);
  styles.push(PRAGMA_CSS);
  if (adapter === "after") styles.push(adapterCss);
  return {
    root: options.root ?? "app comfortable light",
    styles,
    body:
      PRAGMA_BLOCK +
      VANILLA_BLOCK +
      NEGATIVE_BLOCK +
      PLACEMENT_BLOCK +
      THEME_BLOCK,
  };
};

/** The pragma-only page: pragma's CSS alone, root marked `ds`. */
export const pragmaPage = (theme: "light" | "dark" = "light"): PageSpec => ({
  root: `ds app comfortable ${theme}`,
  styles: [PRAGMA_CSS],
  body: PRAGMA_BLOCK,
});

/** The Vanilla-only page: Vanilla alone, in its layer, as the site was before pragma. */
export const vanillaPage = (vanilla: VanillaVersion): PageSpec => ({
  root: "",
  styles: [vanillaCss[vanilla]],
  body: VANILLA_BLOCK,
});

/**
 * The removal step of README rule 19: Vanilla gone, the adapter not yet. The
 * document carries `ds` by then (rule 11); `flipped: false` is the violation.
 */
export const removalPage = (flipped = true): PageSpec => ({
  root: `${flipped ? "ds " : ""}app comfortable light`,
  styles: [layersCss, PRAGMA_CSS, adapterCss],
  body: PRAGMA_BLOCK + THEME_BLOCK,
});

/**
 * Render a page in an iframe and resolve with its document once its fonts are
 * settled. The iframe is removed when the test that rendered it finishes.
 */
export const render = async (
  spec: PageSpec,
  width = 1280,
): Promise<Document> => {
  const iframe = document.createElement("iframe");
  iframe.style.width = `${width}px`;
  iframe.style.height = "800px";
  iframe.style.border = "0";
  const head = spec.styles.map((css) => `<style>${css}</style>`).join("\n");
  iframe.srcdoc = `<!doctype html><html class="${spec.root}"><head><meta charset="utf-8">${head}</head><body>${spec.body}</body></html>`;
  const loaded = new Promise<void>((resolve) => {
    iframe.addEventListener("load", () => resolve(), { once: true });
  });
  document.body.append(iframe);
  onTestFinished(() => iframe.remove());
  await loaded;
  const doc = iframe.contentDocument;
  if (!doc) throw new Error("iframe has no document");
  await doc.fonts.ready;
  return doc;
};

/** Media features the page under test sees; reset when the test finishes. */
export const emulate = async (media: MediaEmulation): Promise<void> => {
  await commands.emulateMedia(media);
  onTestFinished(() =>
    commands.emulateMedia({ colorScheme: null, reducedMotion: null }),
  );
};

export interface MediaEmulation {
  colorScheme?: "light" | "dark" | null;
  reducedMotion?: "reduce" | "no-preference" | null;
}

declare module "vitest/browser" {
  interface BrowserCommands {
    emulateMedia: (media: MediaEmulation) => Promise<void>;
  }
}

/**
 * The computed style of an element, by id or by reference, in its own window.
 * A `::placeholder` read returns the pseudo-element's own style only for an
 * input that carries a `placeholder` attribute.
 */
export const computed = (
  doc: Document,
  target: string | Element,
  pseudo?: string,
): CSSStyleDeclaration => {
  const element =
    typeof target === "string" ? doc.getElementById(target) : target;
  if (!element) throw new Error(`no element #${String(target)}`);
  const view = doc.defaultView;
  if (!view) throw new Error("document has no window");
  return view.getComputedStyle(element, pseudo);
};

/**
 * Resolved layout results, not cascade inputs: they follow from the properties
 * the comparisons still make (`max-width`, `padding-*`, `display`, `margin-*`)
 * and from content, so they differ wherever an expected difference does.
 */
const LAYOUT_OUTPUTS = new Set([
  "width",
  "height",
  "inline-size",
  "block-size",
  "perspective-origin",
  "transform-origin",
  "grid-template-rows",
  "grid-template-columns",
  "top",
  "right",
  "bottom",
  "left",
  "inset-block-start",
  "inset-block-end",
  "inset-inline-start",
  "inset-inline-end",
]);

/**
 * Differences the contract states: Chromium gives table cells their default
 * padding as a presentational hint, which `revert` rolls back (VC.29, in the
 * README's non-guarantees); layout outputs follow.
 */
export const isExpectedDifference = (id: string, property: string): boolean =>
  LAYOUT_OUTPUTS.has(property) ||
  ((id === "ds-th" || id === "ds-td") && property.startsWith("padding"));

/**
 * Every longhand on which two computed styles differ, as `label property: left != right`
 * lines. Custom properties are excluded: they inherit by design and are asserted
 * separately. `ignore` names the properties an expected difference covers.
 */
export const differences = (
  label: string,
  left: CSSStyleDeclaration,
  right: CSSStyleDeclaration,
  ignore: (property: string) => boolean = () => false,
): string[] => {
  const names = new Set([...Array.from(left), ...Array.from(right)]);
  const lines: string[] = [];
  for (const property of names) {
    if (property.startsWith("--") || ignore(property)) continue;
    const a = left.getPropertyValue(property);
    const b = right.getPropertyValue(property);
    if (a !== b) lines.push(`${label} ${property}: ${a} != ${b}`);
  }
  return lines;
};

/** Ids of the elements in a block, from its markup. */
export const idsIn = (markup: string): string[] =>
  Array.from(markup.matchAll(/id="([^"]+)"/g), (match) => match[1]);

/**
 * Names of every layer a stylesheet text declares or opens, nested included.
 * An anonymous layer block is reported as `(anonymous)` so that it fails the
 * declared-order check.
 */
export const layerNames = (css: string): string[] => {
  const names: string[] = [];
  const walk = (rules: CSSRuleList, prefix: string): void => {
    for (const rule of rules) {
      if (rule instanceof CSSLayerStatementRule) {
        for (const name of rule.nameList) names.push(prefix + name);
      } else if (rule instanceof CSSLayerBlockRule) {
        const name = rule.name ? prefix + rule.name : "(anonymous)";
        names.push(name);
        walk(rule.cssRules, rule.name ? `${name}.` : prefix);
      } else if (rule instanceof CSSGroupingRule) {
        walk(rule.cssRules, prefix);
      }
    }
  };
  walk(parse(css).cssRules, "");
  return names;
};

export { adapterCss, layersCss, parse, stylesCss };
