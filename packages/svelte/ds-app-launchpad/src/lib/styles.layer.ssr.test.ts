/**
 * Every stylesheet this package ships sits in `ds.components.app`, the tier
 * above `ds.components.global`, so this package's rule for a component a global
 * tier also styles wins by cascade layer rather than by load order.
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

const LAYER = "ds.components.app";

/** Sheets that hold only `@import` rules and therefore open no layer. */
const IMPORT_ONLY = ["./index.css", "./modifier-families/styles/index.css"];

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

  describe(TWO_LAYERS, () => {
    it("writes into ds.modifiers and then this package's tier, in that order", () => {
      expect(layerRules(read(TWO_LAYERS))).toEqual([
        "@layer ds.modifiers {",
        `@layer ${LAYER} {`,
      ]);
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
  });

  for (const path of Object.keys(sheets).sort()) {
    if (path === REGISTRATIONS_ONLY || path === TWO_LAYERS) continue;

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
        const rules = layerRules(source);

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
