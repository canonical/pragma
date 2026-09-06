/**
 * Every stylesheet this package ships sits in `ds.components.apps-launchpad`.
 * Component-tier layers follow the design system's tier tree, flat: this package
 * is the Launchpad app sub-tier, so it writes into its own layer rather than the
 * shared `ds.components.apps`, and `src/lib/index.css` opens with a statement
 * naming it, which is what fixes that layer's position whatever order a bundler
 * emits the component sheets in.
 *
 * Nothing else in the repository catches an unwrapped sheet: biome has no such
 * rule, webarchitect validates JSON against schemas, and a sheet that is simply
 * not layered is valid CSS that silently outranks every layered rule on the
 * page. This is the whole check — a glob and a string compare, no dependency,
 * no browser, no build.
 *
 * It is named `.ssr.test.ts` because this package's `test` script runs only the
 * `ssr` project, which is a plain node environment; a `.test.ts` here would run
 * under `test:server` and so not in CI's `bun run test`.
 *
 * The glob is `*.css`, not `styles.css`: eleven of this package's sheets are
 * named something else and all of them need checking.
 *
 * Three sheets are exempt and asserted to be what makes them exempt: two hold
 * nothing but `@import` rules, and an `@import` may not appear inside a layer
 * block (each sheet they name carries its own layers, so neither takes a
 * `layer()` keyword); one holds nothing but `@font-face` registrations, and no
 * layer sorts a registration. A fourth, `styles/ds-shim.css`, writes into two
 * layers and has its sequence pinned rather than exempted.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const LAYER = "ds.components.apps-launchpad";

/** This package's CSS entry: a layer statement, then imports, and no rules. */
const ENTRY = "./index.css";

/** Sheets that hold only `@import` rules and therefore open no layer. */
const IMPORT_ONLY = [ENTRY, "./modifier-families/styles/index.css"];

/** A sheet of `@font-face` registrations only: no layer sorts a registration. */
const REGISTRATIONS_ONLY = "./styles/font-faces.css";

/**
 * The criticality shim writes into `ds.modifiers`, where the design-tokens
 * values it stands in for are generated, as well as into this package's tier.
 * The order is pinned so the two blocks cannot be swapped by accident.
 */
const TWO_LAYERS = "./styles/ds-shim.css";

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

const layerRules = (source: string) =>
  rulesOnly(source).match(/@layer[^;{]*[;{]/g) ?? [];

describe("stylesheets", () => {
  it("finds the package's stylesheets", () => {
    // A glob that silently matches nothing would make every case below vacuous.
    expect(Object.keys(sheets).length).toBeGreaterThanOrEqual(53);
  });

  it("finds the sheets it treats specially", () => {
    for (const path of [...IMPORT_ONLY, REGISTRATIONS_ONLY, TWO_LAYERS])
      expect(Object.keys(sheets)).toContain(path);
  });

  describe(ENTRY, () => {
    const source = rulesOnly(read(ENTRY));

    it("opens with the statement that orders the component tiers", () => {
      // A layer's order is fixed where the name first appears. Left to the
      // component sheets, that would be whichever one a bundler emitted first;
      // the statement here is this package's first rule, so it decides instead.
      // It names the tiers below this one too, because this entry does not
      // import @canonical/styles and so is the only statement on a page built
      // from this package alone.
      expect(source.trim().split("\n")[0].trim()).toBe(
        `@layer ds.components.global, ds.components.apps, ${LAYER};`,
      );
    });

    it("declares those layers once and opens no block", () => {
      expect(source.match(/@layer[^;{]*[;{]/g)).toEqual([
        `@layer ds.components.global, ds.components.apps, ${LAYER};`,
      ]);
    });
  });

  describe(TWO_LAYERS, () => {
    it("writes into ds.modifiers and then this package's tier, in that order", () => {
      expect(layerRules(read(TWO_LAYERS))).toEqual([
        "@layer ds.modifiers {",
        `@layer ${LAYER} {`,
      ]);
    });

    it("has no rule outside those two blocks", () => {
      expect(outsideLayers(read(TWO_LAYERS))).toBe("");
    });
  });

  describe(REGISTRATIONS_ONLY, () => {
    const source = read(REGISTRATIONS_ONLY);

    it("holds nothing but comments and @font-face registrations", () => {
      expect(
        source
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/@font-face\s*\{[^}]*\}/g, "")
          .trim(),
      ).toBe("");
    });

    it("opens no layer", () => {
      expect(rulesOnly(source)).not.toMatch(/@layer/);
    });

    it("holds no rule a layer would have to sort", () => {
      expect(outsideLayers(source)).toBe("");
    });
  });

  for (const path of Object.keys(sheets).sort()) {
    if (path === REGISTRATIONS_ONLY || path === TWO_LAYERS) continue;

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
          expect(rulesOnly(source)).not.toMatch(/@layer[^;]*\{/);
          expect(rulesOnly(source)).not.toMatch(/layer\s*\(/);
        });
      });
      continue;
    }

    describe(path, () => {
      it(`is wrapped in ${LAYER}`, () => {
        const rules = layerRules(source);

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
