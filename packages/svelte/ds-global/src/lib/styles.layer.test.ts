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
