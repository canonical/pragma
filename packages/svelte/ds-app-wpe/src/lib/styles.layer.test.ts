/**
 * Every component stylesheet this package ships sits in
 * `ds.components.apps-workplaceengineering`. Component-tier layers follow the
 * design system's tier tree, flat: this package is the Workplace Engineering app
 * sub-tier, so it writes into its own layer rather than the shared
 * `ds.components.apps`, and `src/lib/index.css` declares that name.
 *
 * Nothing else in the repository catches an unwrapped sheet: biome has no such
 * rule, webarchitect validates JSON against schemas, and a sheet that is simply
 * not layered is valid CSS that silently outranks every layered rule on the
 * page. This is the whole check — a glob and a string compare, no dependency,
 * no browser, no build.
 *
 * The glob is `*.css`, not `styles.css`, because two of this package's sheets
 * are not named `styles.css` and both need checking.
 *
 * Two sheets are exempt and asserted to be what makes them exempt: they hold
 * nothing but `@import` rules, and an `@import` may not appear inside a layer
 * block. Each sheet they name carries its own layers — `@canonical/styles`
 * carries the order statement itself — so neither takes a `layer()` keyword.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const LAYER = "ds.components.apps-workplaceengineering";

/** This package's CSS entry: an import, then the statement placing its layer. */
const ENTRY = "./index.css";

/** Sheets that open no layer block of their own. */
const IMPORT_ONLY = [ENTRY, "./styles/index.css"];

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
    expect(Object.keys(sheets).length).toBeGreaterThanOrEqual(15);
  });

  it("finds the sheets that open no layer block", () => {
    for (const path of IMPORT_ONLY) expect(Object.keys(sheets)).toContain(path);
  });

  describe(ENTRY, () => {
    const source = rulesOnly(read(ENTRY));

    it(`declares ${LAYER} exactly once, and opens no block`, () => {
      expect(source.match(/@layer[^;{]*[;{]/g)).toEqual([`@layer ${LAYER};`]);
    });

    it("declares it after the styles import, not before", () => {
      // A layer is placed where its name first appears. The import pulls in
      // @canonical/styles, whose own statement places the tiers below this one;
      // declared above that import, this name would be fixed first and
      // ds.components.global would be appended above it instead. Measured in
      // Chromium: the global tier then won three of the four bundle orders.
      expect(source.indexOf("@import")).toBeLessThan(source.indexOf("@layer"));
    });
  });

  for (const path of Object.keys(sheets).sort()) {
    const source = read(path);

    if (IMPORT_ONLY.includes(path)) {
      describe(path, () => {
        it("holds nothing but comments, imports and layer statements", () => {
          expect(
            source
              .replace(/\/\*[\s\S]*?\*\//g, "")
              .replace(/@import[^;]*;/g, "")
              .replace(/@layer[^;{]*;/g, "")
              .trim(),
          ).toBe("");
        });

        it("opens no layer block and layers no import", () => {
          expect(rulesOnly(source)).not.toMatch(/@layer[^;{]*\{/);
          expect(rulesOnly(source)).not.toMatch(/layer\s*\(/);
        });
      });
      continue;
    }

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
