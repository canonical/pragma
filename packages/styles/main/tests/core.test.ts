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
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  fingerprint,
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
const hasTypeSelector = (selector: string): boolean =>
  selector.split(",").some((part) =>
    part
      .trim()
      .split(/[\s>+~]+/)
      .some((compound) => /^[a-zA-Z][a-zA-Z0-9-]*/.test(compound)),
  );

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

const src = (file: string): string =>
  readFileSync(join(import.meta.dirname, "..", "src", file), "utf8");

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

  it("declares every layer the full stylesheet declares", () => {
    // Spelled out so a failure names the layer rather than a whole array.
    for (const layer of statement(INDEX)) {
      expect(statement(CORE)).toContain(layer);
    }
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
    const expected = imports(INDEX).filter((file) => !elementFiles.has(file));
    const actual = imports(CORE).filter(
      (file) => file !== "@canonical/styles-typography/mapper.css",
    );
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
   * The split's own invariant, and the one that does not move when anything
   * else in this package does: what the full stylesheet delivers in the two
   * layers the typography package writes to is exactly what its two halves
   * deliver between them. A rule lost in the split, or delivered twice, fails
   * here and names itself.
   */
  it("loses nothing, and repeats nothing, from either half", () => {
    const halves = [
      ...new Set(
        ["mapper.css", "elements.css"].flatMap((half) =>
          fingerprint(resolve(typographyFile(half))),
        ),
      ),
    ];
    const delivered = fingerprint(css);
    const lost = halves.filter((line) => !delivered.includes(line));
    const repeated = halves.filter(
      (line) => delivered.filter((other) => other === line).length > 1,
    );
    expect({ lost, repeated }).toEqual({ lost: [], repeated: [] });
  });

  /**
   * And the whole inventory, as a record of what an ordinary page gets: every
   * selector with its layer and the properties it sets, sorted, so a reordering
   * is not a failure and a lost or gained declaration is.
   */
  it("delivers the rules recorded for it", () => {
    expect(fingerprint(css)).toMatchSnapshot();
  });
});
