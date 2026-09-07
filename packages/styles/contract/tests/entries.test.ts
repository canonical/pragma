/**
 * This package has four entry points: `index.css`, the whole stylesheet, and
 * `tokens.css`, `elements.css` and `layout.css`, which are it in three parts.
 * The parts exist because a page that also runs another CSS framework cannot
 * take the element rules — the other framework has its own `p` rule and only one
 * of the two can own `line-height` — so it takes the values and the layout
 * presets and gets its element rules from that framework's adapter instead, in a
 * confined copy.
 *
 * Four things have to hold for that to work, and none of them is visible in any
 * one file. They are checked here, against the resolved stylesheet each entry
 * builds rather than against the text a maintainer reads.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  fingerprint,
  graph,
  inventory,
  layersOpened,
  resolve,
} from "./support/css.js";

const ENTRIES = [
  "index.css",
  "tokens.css",
  "elements.css",
  "layout.css",
] as const;

/**
 * The subject lives in another package, so it is resolved through the workspace
 * rather than by walking up from here: `@canonical/styles` exports its own
 * manifest, and its stylesheets sit beside it in `src`. That keeps this file
 * honest about what it is testing — the installed package, by its public name,
 * not a path that happens to work from this directory.
 */
const stylesRoot = dirname(
  createRequire(import.meta.url).resolve("@canonical/styles/package.json"),
);

const srcPath = (file: string): string => join(stylesRoot, "src", file);

/** The names in a stylesheet's first `@layer` statement, in order. */
const statement = (css: string): string[] => {
  const match = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .match(/@layer\s+([^;{]+);/);
  if (!match) throw new Error("no layer order statement found");
  return match[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
};

/**
 * The first rule of a stylesheet, ignoring comments and blank lines, with the
 * character that ended it. The terminator is the point: `@layer a, b;` is an
 * order statement and `@layer a { … }` is a block, they are spelled almost the
 * same, and only the first may be followed by `@import`. Reporting the rule
 * without it would let a block pass for a statement.
 */
const firstRule = (css: string): { rule: string; terminator: string } => {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const end = text.search(/[;{]/);
  return {
    rule: (end === -1 ? text : text.slice(0, end)).trim(),
    terminator: end === -1 ? "" : text[end],
  };
};

/** Every specifier a stylesheet imports, before any of them is followed. */
const imports = (css: string): string[] =>
  Array.from(
    css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .matchAll(/@import\s+url\(\s*["']([^"']+)["']\s*\)/g),
    (match) => match[1],
  );

/**
 * A selector has a type selector when one of its compounds starts with an
 * element name. `:is(pre, textarea)` selects by tag name as surely as
 * `pre, textarea` does, so a functional pseudo-class is unwrapped and its
 * contents read too. The universal selector is not a type selector: `*` matches
 * everything and the design tokens use it to hang custom properties, which style
 * nothing on their own.
 */
const hasTypeSelector = (selector: string): boolean =>
  selector
    .replace(/:(?:is|where|not|has|matches|any)\(/g, ",")
    .split(/[,()]/)
    .some((part) =>
      part
        .trim()
        .split(/[\s>+~]+/)
        .some((compound) => /^[a-zA-Z][a-zA-Z0-9-]*/.test(compound)),
    );

describe("the layer order statement", () => {
  it.each(ENTRIES)("is the first rule of %s, as a statement", (file) => {
    // Both halves matter. An `@import` is only valid before other rules, a
    // layer statement and `@charset` excepted, so the statement has to come
    // first — and it has to be a statement: `@layer normalize { … }` opens a
    // block, which is a rule, and every `@import` after it would be dropped.
    const first = firstRule(readFileSync(srcPath(file), "utf8"));
    expect({
      rule: first.rule.split(/\s+/)[0],
      terminator: first.terminator,
    }).toEqual({
      rule: "@layer",
      terminator: ";",
    });
  });

  it.each(ENTRIES)(
    "names the same layers, in the same order, in %s",
    (file) => {
      expect(statement(readFileSync(srcPath(file), "utf8"))).toEqual(
        statement(readFileSync(srcPath("index.css"), "utf8")),
      );
    },
  );

  it.each(ENTRIES)("is not nested inside a layer in %s", (file) => {
    // An `@layer` statement inside a layer block declares sublayers of it, not
    // top-level layers. That is why no entry imports another.
    const others = ENTRIES.filter((other) => other !== file);
    expect(
      imports(readFileSync(srcPath(file), "utf8")).filter((specifier) =>
        others.some((other) => specifier.endsWith(other)),
      ),
    ).toEqual([]);
  });
});

describe("tokens.css", () => {
  const css = resolve(srcPath("tokens.css"));

  it("imports no file that carries element rules", () => {
    const elementFiles = [
      "./normalize.css",
      "./reset.css",
      "@canonical/styles-typography/elements.css",
      "@canonical/styles-typography/baseline-cap.css",
    ];
    const own = imports(readFileSync(srcPath("tokens.css"), "utf8"));
    for (const file of elementFiles) expect(own).not.toContain(file);
  });

  it("opens no element layer", () => {
    for (const layer of ["normalize", "ds.reset", "ds.typography"]) {
      expect(layersOpened(css)).not.toContain(layer);
    }
  });

  it("opens these layers and no others", () => {
    // Pinned exactly, not just checked for the three element layers, because a
    // rule that styles an element can hide in a layer that is not one of them:
    // a component-tier rule reached through a file this entry imports for its
    // tokens would open ds.components.global here and go unnoticed.
    expect(layersOpened(css)).toEqual([
      "ds.modifiers",
      "ds.states",
      "ds.surfaces",
      "ds.tokens",
    ]);
  });

  it("has no rule that selects an element by tag name", () => {
    expect(
      inventory(css)
        .filter((rule) => hasTypeSelector(rule.selector))
        .map((rule) => `${rule.layer} | ${rule.selector}`),
    ).toEqual([]);
  });

  it("declares no property that is not a custom property", () => {
    // The layer pin above says which layers the entry opens; this says what it
    // is allowed to declare inside them, which is the claim its header and the
    // README actually make. Without it a real declaration added to a layer the
    // entry already opens — a colour on a surface, say — passes every other
    // check here, and the only thing contradicting it is prose.
    //
    // One exception, and it is the theme file's documented one: `color-scheme`
    // on the root and on the two theme classes. It is not a style so much as the
    // switch every `light-dark()` token resolves against, it has to reach the
    // document element for the browser's own controls to follow it, and it
    // paints nothing by itself.
    // `color-scheme` on the root or on either theme class is the one exception,
    // and it is the theme file's documented one: it is not a style so much as
    // the switch every `light-dark()` token resolves against, it has to reach
    // the document element for the browser's own controls to follow it, and it
    // paints nothing by itself. Those rules declare custom properties too, so
    // the exception is per declaration rather than per rule.
    const allowed = new Set([
      ":root | color-scheme",
      ".light | color-scheme",
      ".dark | color-scheme",
    ]);
    expect(
      inventory(css).flatMap((rule) =>
        rule.properties
          .filter((property) => !property.startsWith("--"))
          .map((property) => `${rule.selector} | ${property}`)
          .filter((declaration) => !allowed.has(declaration))
          .map((declaration) => `${rule.layer} | ${declaration}`),
      ),
    ).toEqual([]);
  });

  it("has no rule that claims one of the engine's classes", () => {
    const engineClasses = /(^|[\s,>+~(])\.(p|code|editorial)\b/;
    expect(
      inventory(css)
        .filter((rule) => engineClasses.test(rule.selector))
        .map((rule) => `${rule.layer} | ${rule.selector}`),
    ).toEqual([]);
  });
});

describe("elements.css", () => {
  it("opens the three element layers and nothing else", () => {
    expect(layersOpened(resolve(srcPath("elements.css"))).sort()).toEqual([
      "ds.reset",
      "ds.typography",
      "normalize",
    ]);
  });
});

describe("layout.css", () => {
  it("opens the component tier and nothing else", () => {
    expect(layersOpened(resolve(srcPath("layout.css")))).toEqual([
      "ds.components.global",
    ]);
  });
});

/**
 * A browser treats every `@import` as its own stylesheet and de-duplicates
 * nothing: a file two imports reach is fetched, parsed and applied twice. So the
 * import graph of each entry has to name each file once. The resolver these
 * tests use does not de-duplicate either, or this would be checking the
 * resolver rather than the stylesheet.
 */
describe.each(ENTRIES)("the import graph of %s", (file) => {
  it("inlines each file exactly once", () => {
    const counted = new Map<string, number>();
    for (const inlined of graph(srcPath(file)))
      counted.set(inlined, (counted.get(inlined) ?? 0) + 1);
    expect(
      [...counted]
        .filter(([, count]) => count > 1)
        .map(([inlined, count]) => `${basename(inlined)} x${count}`)
        .sort(),
    ).toEqual([]);
  });
});

/**
 * And the relationship the three parts exist to have: together they are the
 * whole. Every rule `index.css` delivers comes from one of them, and every rule
 * they deliver is in `index.css`. Nothing lost, nothing invented, nothing left
 * only in the whole.
 */
describe("index.css", () => {
  it("delivers exactly what the three parts deliver between them", () => {
    const whole = new Set(fingerprint(resolve(srcPath("index.css"))));
    const parts = new Set(
      ["tokens.css", "elements.css", "layout.css"].flatMap((file) =>
        fingerprint(resolve(srcPath(file))),
      ),
    );
    expect({
      inTheWholeOnly: [...whole].filter((rule) => !parts.has(rule)).sort(),
      inThePartsOnly: [...parts].filter((rule) => !whole.has(rule)).sort(),
    }).toEqual({ inTheWholeOnly: [], inThePartsOnly: [] });
  });
});
