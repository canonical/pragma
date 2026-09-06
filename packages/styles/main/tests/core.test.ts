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
