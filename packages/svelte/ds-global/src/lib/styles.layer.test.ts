/**
 * Every stylesheet this package ships sits in `ds.components.global`.
 *
 * Nothing else in the repository catches an unwrapped sheet: biome has no such
 * rule, webarchitect validates JSON against schemas, and a sheet that is simply
 * not layered is valid CSS that silently outranks every layered rule on the
 * page. This is the whole check — a glob and a string compare, no dependency,
 * no browser, no build.
 *
 * The glob is `*.css`, not `styles.css`: this package happens to name every
 * sheet `styles.css`, but its siblings do not, and a sheet added under another
 * name has to be caught here too.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const LAYER = "ds.components.global";

const sheets = import.meta.glob("./**/*.css", {
  query: "?url",
  eager: true,
});

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf-8");

/** Comments explain the layering; only rules decide it. */
const rulesOnly = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Where the matching `}` of the block opened at `open` ends, so a block's own
 * nested braces — a `@media`, a nesting selector — cannot end it early.
 */
const endOfBlock = (source: string, open: number) => {
  let depth = 0;
  let quote = "";
  for (let i = open; i < source.length; i += 1) {
    const c = source[i];
    if (quote) {
      if (c === "\\") i += 1;
      else if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (source.startsWith("/*", i)) {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 1;
      continue;
    }
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return source.length;
};

/**
 * What is left of a sheet once every top-level `@layer … { … }` block is removed
 * — brace-matched, so a trailing rule after the wrapper is not mistaken for part
 * of it — along with the three things that are allowed outside one: comments,
 * `@import` rules and layer statements, and `@font-face` registrations, which no
 * layer sorts. Anything that survives is a style rule outside every layer, which
 * is the regression this file exists to catch.
 */
const outsideLayers = (source: string) => {
  let rest = "";
  let i = 0;
  while (i < source.length) {
    if (source.startsWith("/*", i)) {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    const block = /^@(?:layer|font-face)\b[^;{]*\{/.exec(source.slice(i));
    if (block) {
      i = endOfBlock(source, i + block[0].length - 1);
      continue;
    }
    const statement = /^@(?:import|layer)\b[^;{]*;/.exec(source.slice(i));
    if (statement) {
      i += statement[0].length;
      continue;
    }
    rest += source[i];
    i += 1;
  }
  return rest.trim();
};

describe("stylesheets", () => {
  it("finds the package's stylesheets", () => {
    // A glob that silently matches nothing would make every case below vacuous.
    expect(Object.keys(sheets).length).toBeGreaterThanOrEqual(4);
  });

  for (const path of Object.keys(sheets).sort()) {
    const source = read(path);

    describe(path, () => {
      it(`is wrapped in ${LAYER}`, () => {
        const rules = rulesOnly(source).match(/@layer[^;{]*[;{]/g) ?? [];

        expect(rules).toHaveLength(1);
        expect(rules[0]).toBe(`@layer ${LAYER} {`);
      });

      it("has no rule outside that block", () => {
        // Both ends matter. A style rule above the block would sit outside the
        // layer; so would one appended below it, which a check on the opening
        // line alone cannot see.
        expect(outsideLayers(source)).toBe("");
      });
    });
  }
});
