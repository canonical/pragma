/**
 * Every stylesheet this package ships sits in `ds.components.global`.
 *
 * Nothing else in the repository catches an unwrapped sheet: biome has no such
 * rule, webarchitect validates JSON against schemas, and a sheet that is simply
 * not layered is valid CSS that silently outranks every layered rule on the
 * page. This is the whole check — a glob and a string compare, no dependency,
 * no browser, no build.
 *
 * The glob covers `src/`, which is what the package publishes (`build:package`
 * copies `src/**\/*.css` into `dist/esm`). `.storybook/styles.css` is outside it
 * and exempt on purpose: it is the Storybook harness, it is not published
 * (`files: ["dist"]`), and it exists to layer nothing — two `@import`s and one
 * `.rtl` utility for the preview page.
 *
 * The `@import` case is this package's own. `src/index.css` imports
 * `density.css`, and that import must NOT carry a `layer()` keyword: measured in
 * Chromium 151, `@import url(x) layer(L)` on a sheet that itself declares
 * `@layer L` puts its rules in `L.L` — a sublayer that loses to `L`'s own rules
 * at any specificity. The keyword would silently demote the whole density and
 * baseline system below `index.css`. The assertion below makes that permanent.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const LAYER = "ds.components.global";

const sheets = import.meta.glob("./**/*.css", {
  query: "?url",
  eager: true,
});

describe("stylesheets", () => {
  it("finds every stylesheet under src/", () => {
    // A glob that silently matched fewer files would make every case below
    // vacuous, so the count is asserted rather than a lower bound.
    expect(Object.keys(sheets).length).toBe(32);
  });

  for (const path of Object.keys(sheets).sort()) {
    const source = readFileSync(
      fileURLToPath(new URL(path, import.meta.url)),
      "utf-8",
    );
    // Comments are stripped first: this file explains the layer and the
    // `layer()` trap in prose, and `src/index.css` quotes both in its own
    // header, so a match over the raw text would read the documentation.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "");
    const head = code.slice(0, code.indexOf(`@layer ${LAYER} {`));
    const imports = head.match(/@import\b[^;]*;/g) ?? [];

    describe(path, () => {
      it(`is wrapped in ${LAYER}`, () => {
        const rules = code.match(/@layer[^;{]*[;{]/g) ?? [];

        expect(rules).toHaveLength(1);
        expect(rules[0]).toBe(`@layer ${LAYER} {`);
      });

      it("opens the block after the header and at most one @import", () => {
        // An `@import` is only valid before other rules, so it is the one thing
        // besides a comment that may sit above the block. Anything else there
        // would be a rule outside the layer.
        expect(imports.length).toBeLessThanOrEqual(1);
        expect(head.replace(/@import\b[^;]*;/g, "").trim()).toBe("");
      });

      it("imports without a layer() keyword", () => {
        // See the file header: the keyword would nest the imported sheet's own
        // block one level deeper, at `ds.components.global.ds.components.global`.
        for (const rule of imports) {
          expect(rule).not.toMatch(/\blayer\s*\(/);
        }
      });
    });
  }
});
