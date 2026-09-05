/**
 * Every component stylesheet this package ships sits in `ds.components.app`,
 * the tier above `ds.components.global`, so this package's rule for a component
 * a global tier also styles wins by cascade layer rather than by load order.
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

const LAYER = "ds.components.app";

/** Sheets that hold only `@import` rules and therefore open no layer. */
const IMPORT_ONLY = ["./index.css", "./styles/index.css"];

const sheets = import.meta.glob("./**/*.css", {
  query: "?url",
  eager: true,
});

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf-8");

/** Comments explain the layering; only rules decide it. */
const rulesOnly = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "");

describe("stylesheets", () => {
  it("finds the package's stylesheets", () => {
    // A glob that silently matches nothing would make every case below vacuous.
    expect(Object.keys(sheets).length).toBeGreaterThanOrEqual(15);
  });

  it("finds the import-only sheets it exempts", () => {
    for (const path of IMPORT_ONLY) expect(Object.keys(sheets)).toContain(path);
  });

  for (const path of Object.keys(sheets).sort()) {
    const source = read(path);

    if (IMPORT_ONLY.includes(path)) {
      describe(path, () => {
        it("holds nothing but comments and imports", () => {
          expect(
            source
              .replace(/\/\*[\s\S]*?\*\//g, "")
              .replace(/@import[^;]*;/g, "")
              .trim(),
          ).toBe("");
        });

        it("opens no layer and layers no import", () => {
          expect(rulesOnly(source)).not.toMatch(/@layer/);
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

      it("opens the block at the top level, after comments and imports only", () => {
        // Anything else before the block — a style rule, a nested at-rule —
        // would sit outside the layer. An `@import` is legal there and nowhere
        // else, so it is allowed.
        const head = source.slice(0, source.indexOf(`@layer ${LAYER} {`));

        expect(
          head
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/@import[^;]*;/g, "")
            .trim(),
        ).toBe("");
      });
    });
  }
});
