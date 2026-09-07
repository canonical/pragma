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
 * The second concern is motion. Every duration this package animates over must
 * be read from a `--motion-duration-*` token, never written as a literal:
 * `@canonical/styles` zeroes those tokens under
 * `@media (prefers-reduced-motion: reduce)`, and that zeroing is the whole of
 * pragma's reduced-motion mechanism (F.VANILLA_COEXISTENCE, VC.11, closing D14).
 * A literal duration is invisible to it and keeps animating for a reader who
 * asked their system not to. The assertion below is written over the shape of
 * the value rather than over the presence of digits, so a bare `0s` and a
 * future `steps()` still pass and only a time literal fails.
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
    const open = code.indexOf(`@layer ${LAYER} {`);
    // A missing block leaves the whole file above it, so every case below fails.
    const head = open === -1 ? code : code.slice(0, open);
    const imports = head.match(/@import\b[^;]*;/g) ?? [];
    // Walk to the brace that closes the wrapper, so what follows it can be
    // checked: an appended rule is as unlayered as one written above the block.
    let depth = 0;
    let close = -1;
    for (let i = open; i < code.length && open !== -1; i += 1) {
      if (code[i] === "{") depth += 1;
      else if (code[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    const tail = close === -1 ? code.slice(open) : code.slice(close + 1);

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

      it("closes the block at the end of the file", () => {
        // A rule appended below the wrapper would be as unlayered as one above
        // it, and far easier to miss: the file still opens with the block.
        expect(close).toBeGreaterThan(-1);
        expect(tail.trim()).toBe("");
      });

      it("reads every duration from a motion token", () => {
        // `transition` / `animation`, shorthand or the duration and delay
        // longhands; `transition-property` carries no time and is not matched.
        const declarations =
          code.match(
            /(?:^|[;{}])\s*(?:transition|animation)(?:-duration|-delay)?\s*:[^;{}]*/g,
          ) ?? [];

        for (const declaration of declarations) {
          const value = declaration.slice(declaration.indexOf(":") + 1);
          // A time literal is the defect. Zero is allowed: it says "no motion"
          // outright and no token can make it move.
          for (const [time] of value.matchAll(/(?<![\w-])\d*\.?\d+m?s\b/g)) {
            expect([time, path]).toEqual(["0s", path]);
          }
          // And whatever is read must be a motion token: a duration from the
          // three steps, an easing from the three curves.
          for (const [, name] of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
            expect([name, path]).toEqual([
              expect.stringMatching(/^--motion-(?:duration|easing)-/),
              path,
            ]);
          }
        }
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
