/**
 * Builds whole documents in iframes so computed styles can be compared across
 * pages that differ only in which stylesheets they load. Everything here runs
 * in the browser; the CSS strings are resolved by Vite at test time.
 */

import stylesCss from "@canonical/styles?inline";
import buttonCss from "../../../../react/ds-global/src/lib/component/Button/styles.css?inline";
import formCss from "../../../../react/ds-global-form/src/index.css?inline";
import textInputCss from "../../../../react/ds-global-form/src/lib/subcomponent/TextInput/styles.css?inline";
import adapterCss from "../../adapter.css?raw";
import layersCss from "../../layers.css?raw";
import vanilla456 from "../../node_modules/vanilla-framework-4.56/scss/build.scss?inline";
import vanilla458 from "../../node_modules/vanilla-framework-4.58/scss/build.scss?inline";

export const VANILLA_VERSIONS = {
  "4.56": vanilla456,
  "4.58": vanilla458,
} as const;

export type VanillaVersion = keyof typeof VANILLA_VERSIONS;

/** Pragma's CSS as a consumer loads it: the global stylesheet, then components. */
export const PRAGMA_CSS = [stylesCss, formCss, textInputCss, buttonCss].join(
  "\n",
);

/**
 * Whether the loaded `@canonical/styles` release scopes its element-level layers
 * to pragma territory (pragma-adrs F, band A). Fixtures that need it skip with a
 * reason until it ships; the boundary's own guarantees do not need it.
 */
export const PRAGMA_IS_SCOPED = /@scope\s*\(\s*\.ds\s*\)/.test(stylesCss);

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

/** Vanilla markup inside pragma territory: unsupported, renders browser defaults. */
export const NEGATIVE_BLOCK = `
<div class="ds card" id="neg-root"><form class="p-form">
  <label id="neg-label">Label</label><input id="neg-input" type="text">
</form></div>`;

/** The four theme cases of rule 12, plus paper and a nested root. */
export const THEME_BLOCK = `
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
  const vanillaCss = `@layer vanilla{${VANILLA_VERSIONS[vanilla]}}`;
  const styles = [layersCss, vanillaCss];
  if (adapter === "before") styles.push(adapterCss);
  styles.push(PRAGMA_CSS);
  if (adapter === "after") styles.push(adapterCss);
  return {
    root: options.root ?? "app comfortable light",
    styles,
    body: PRAGMA_BLOCK + VANILLA_BLOCK + NEGATIVE_BLOCK + THEME_BLOCK,
  };
};

/** The pragma-only page: pragma's CSS alone, root marked `ds`. */
export const pragmaPage = (theme: "light" | "dark" = "light"): PageSpec => ({
  root: `ds app comfortable ${theme}`,
  styles: [PRAGMA_CSS],
  body: PRAGMA_BLOCK,
});

/** The Vanilla-only page: Vanilla alone, in its layer. */
export const vanillaPage = (vanilla: VanillaVersion): PageSpec => ({
  root: "",
  styles: [`@layer vanilla{${VANILLA_VERSIONS[vanilla]}}`],
  body: VANILLA_BLOCK,
});

const frames: HTMLIFrameElement[] = [];

/** Render a page in an iframe and resolve with its document. */
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
  frames.push(iframe);
  await loaded;
  const doc = iframe.contentDocument;
  if (!doc) throw new Error("iframe has no document");
  return doc;
};

/** Remove every iframe rendered so far. */
export const cleanup = (): void => {
  for (const frame of frames.splice(0)) frame.remove();
};

export const byId = (doc: Document, id: string): Element => {
  const element = doc.getElementById(id);
  if (!element) throw new Error(`no element #${id}`);
  return element;
};

export const computed = (
  doc: Document,
  id: string,
  pseudo?: string,
): CSSStyleDeclaration => {
  const view = doc.defaultView;
  if (!view) throw new Error("document has no window");
  return view.getComputedStyle(byId(doc, id), pseudo);
};

export interface Difference {
  property: string;
  left: string;
  right: string;
}

/**
 * Every longhand on which two elements' computed styles differ. Custom
 * properties are excluded: they inherit by design and are asserted separately.
 */
export const diffComputed = (
  left: CSSStyleDeclaration,
  right: CSSStyleDeclaration,
  exclude: readonly string[] = [],
): Difference[] => {
  const names = new Set<string>();
  for (let index = 0; index < left.length; index += 1) names.add(left[index]);
  for (let index = 0; index < right.length; index += 1) names.add(right[index]);
  const differences: Difference[] = [];
  for (const property of names) {
    if (property.startsWith("--") || exclude.includes(property)) continue;
    const a = left.getPropertyValue(property);
    const b = right.getPropertyValue(property);
    if (a !== b) differences.push({ property, left: a, right: b });
  }
  return differences;
};

/** Ids of the elements in a block, from its markup. */
export const idsIn = (markup: string): string[] =>
  [...markup.matchAll(/id="([^"]+)"/g)].map((match) => match[1] as string);

/** Names of every layer a stylesheet text declares or opens, nested included. */
export const layerNames = (css: string): string[] => {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  const names: string[] = [];
  const walk = (rules: CSSRuleList, prefix: string): void => {
    for (const rule of rules) {
      if (rule instanceof CSSLayerStatementRule) {
        for (const name of rule.nameList) names.push(prefix + name);
      } else if (rule instanceof CSSLayerBlockRule) {
        const name = rule.name ? prefix + rule.name : "";
        if (name) names.push(name);
        walk(rule.cssRules, name ? `${name}.` : prefix);
      } else if (rule instanceof CSSGroupingRule) {
        walk(rule.cssRules, prefix);
      }
    }
  };
  walk(sheet.cssRules, "");
  return names;
};

export { adapterCss, layersCss, stylesCss };
