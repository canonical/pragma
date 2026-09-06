/**
 * `core.css` is `index.css` without the three files whose rules select plain
 * elements. Two things about that have to stay true, and neither is visible in
 * either file on its own, so they are checked here.
 *
 * The layer order statement has to be identical in both. It is the first rule of
 * whichever of the two a page loads, and it fixes the order of every layer for
 * that page; if the two lists ever drifted, the same stylesheet would arbitrate
 * differently depending on which entry point a consumer picked.
 *
 * And `core.css` has to import none of the three element files, which is the
 * whole reason it exists: a page that loads it takes those rules from somewhere
 * else — today, from the coexistence adapter's confined copy — and importing
 * them here as well would deliver each rule twice, unconfined.
 */
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  fingerprint,
  graph,
  inventory,
  layersOpened,
  resolve,
} from "./support/css.js";

/**
 * A selector has a type selector when one of its compounds starts with an
 * element name. The universal selector is not one: `*` matches everything and
 * the design tokens use it to hang custom properties, which style nothing on
 * their own.
 */
const hasTypeSelector = (selector: string): boolean => {
  // `:is(pre, textarea)` selects by tag name as surely as `pre, textarea` does,
  // so a functional pseudo-class is unwrapped and its contents read too.
  const unwrapped = selector.replace(
    /:(?:is|where|not|has|matches|any)\(/g,
    ",",
  );
  return unwrapped.split(/[,()]/).some((part) =>
    part
      .trim()
      .split(/[\s>+~]+/)
      .some((compound) => /^[a-zA-Z][a-zA-Z0-9-]*/.test(compound)),
  );
};

const typographyFile = (file: string): string =>
  join(
    import.meta.dirname,
    "..",
    "node_modules",
    "@canonical",
    "styles-typography",
    "src",
    file,
  );

const srcPath = (file: string): string =>
  join(import.meta.dirname, "..", "src", file);

const src = (file: string): string => readFileSync(srcPath(file), "utf8");

const INDEX = src("index.css");
const CORE = src("core.css");

/** The names in the first `@layer` statement, in order. */
const statement = (css: string): string[] => {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const match = withoutComments.match(/@layer\s+([^;{]+);/);
  if (!match) throw new Error("no layer order statement found");
  return match[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
};

/** Every specifier the file imports. */
const imports = (css: string): string[] =>
  Array.from(
    css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .matchAll(/@import\s+url\(\s*["']([^"']+)["']\s*\)/g),
    (match) => match[1],
  );

/** The first rule of a stylesheet, ignoring comments and blank lines. */
const firstRule = (css: string): string =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/[;{]/)[0]
    .trim();

describe("core.css against index.css", () => {
  it("opens with the same layer order statement", () => {
    expect(statement(CORE)).toEqual(statement(INDEX));
  });

  it.each(["index.css", "core.css"] as const)(
    "%s makes the statement its first rule",
    (file) => {
      expect(firstRule(src(file)).startsWith("@layer ")).toBe(true);
    },
  );

  it("imports none of the three element files", () => {
    const elementFiles = [
      "./normalize.css",
      "./reset.css",
      "@canonical/styles-typography",
    ];
    for (const file of elementFiles) {
      expect(imports(INDEX)).toContain(file);
      expect(imports(CORE)).not.toContain(file);
    }
  });

  it("takes the typography mapper on its own", () => {
    expect(imports(CORE)).toContain("@canonical/styles-typography/mapper.css");
  });

  it("imports everything else the full stylesheet imports, in the same order", () => {
    const elementFiles = new Set([
      "./normalize.css",
      "./reset.css",
      "@canonical/styles-typography",
    ]);
    // core.css takes the typography package in two pieces where index.css takes
    // it whole: the mapping that styles nothing, and the registration each
    // engine would otherwise carry.
    const typographyPieces = new Set([
      "@canonical/styles-typography/mapper.css",
      "@canonical/styles-typography/baseline-shim.css",
    ]);
    const expected = imports(INDEX).filter((file) => !elementFiles.has(file));
    const actual = imports(CORE).filter((file) => !typographyPieces.has(file));
    expect(actual).toEqual(expected);
  });
});

/**
 * The reason `core.css` exists is that a page which also runs another CSS
 * framework takes its element rules from that framework's adapter, in a confined
 * copy, rather than from here. So the load-bearing property is not which files
 * `core.css` names — that is the check above — but what it delivers once every
 * `@import` is followed: no rule that selects an element by tag name, and none
 * that claims one of the engine's classes. Either would restyle the host page's
 * own headings and paragraphs on every mixed page.
 */
describe("resolved core.css", () => {
  const css = resolve(join(import.meta.dirname, "..", "src", "core.css"));

  it("opens no element layer", () => {
    for (const layer of ["normalize", "ds.reset", "ds.typography"]) {
      expect(layersOpened(css)).not.toContain(layer);
    }
  });

  it("has no rule that selects an element by tag name", () => {
    const offenders = inventory(css)
      .filter((rule) => hasTypeSelector(rule.selector))
      .map((rule) => `${rule.layer} | ${rule.selector}`);
    expect(offenders).toEqual([]);
  });

  it("has no rule that claims one of the engine's classes", () => {
    const engineClasses = /(^|[\s,>+~(])\.(p|code|editorial)\b/;
    const offenders = inventory(css)
      .filter((rule) => engineClasses.test(rule.selector))
      .map((rule) => `${rule.layer} | ${rule.selector}`);
    expect(offenders).toEqual([]);
  });
});

/**
 * The full stylesheet has to be unaffected by all of this. `index.css` is what
 * an ordinary page loads, and splitting the typography package's mapper into a
 * token half and an element half must not change one rule of what it delivers.
 * The snapshot is the rule inventory — every selector with its layer and the
 * properties it sets, sorted, so a reordering is not a failure and a lost or
 * gained declaration is.
 */
describe("resolved index.css", () => {
  const css = resolve(join(import.meta.dirname, "..", "src", "index.css"));

  /**
   * The full stylesheet is the entry without the element rules, plus the element
   * rules. Every rule `index.css` delivers comes from `core.css` or from one of
   * the four files the adapter's confined copy is built out of, and every rule
   * those five deliver is in `index.css`. That is the relationship `core.css`
   * exists to have, it is what makes the adapter's copy a copy of something, and
   * unlike a snapshot of the whole inventory it does not move when a token is
   * added or a reset rule is reworded.
   */
  it("is core.css plus the four files that carry element rules", () => {
    const parts = [
      srcPath("core.css"),
      srcPath("normalize.css"),
      srcPath("reset.css"),
      typographyFile("mapper.elements.css"),
      typographyFile("baseline-cap.css"),
    ];
    const fromParts = new Set(
      parts.flatMap((part) => fingerprint(resolve(part))),
    );
    const delivered = new Set(fingerprint(css));
    expect({
      inIndexOnly: [...delivered].filter((rule) => !fromParts.has(rule)).sort(),
      inPartsOnly: [...fromParts].filter((rule) => !delivered.has(rule)).sort(),
    }).toEqual({ inIndexOnly: [], inPartsOnly: [] });
  });
});

/**
 * A browser treats every `@import` as its own stylesheet and does not
 * de-duplicate: a file two imports reach is fetched, parsed and applied twice.
 * So the import graph of each entry point has to name each file once. It did
 * not, before this test: the typographic scale and the `--baseline-height`
 * registration each arrived from two directions, and the resolved entry carried
 * 48,270 duplicated bytes and two `@property` rules for one custom property.
 */
describe.each(["index.css", "core.css"])("the import graph of %s", (file) => {
  it("inlines each file exactly once", () => {
    const counted = new Map<string, number>();
    for (const inlined of graph(srcPath(file)))
      counted.set(inlined, (counted.get(inlined) ?? 0) + 1);
    const twice = [...counted]
      .filter(([, count]) => count > 1)
      .map(([inlined, count]) => `${basename(inlined)} x${count}`)
      .sort();
    expect(twice).toEqual([]);
  });
});
