/**
 * Every component stylesheet this package ships sits in `ds.components.app`.
 *
 * Nothing else in the repository catches an unwrapped sheet: biome has no such
 * rule, webarchitect validates JSON against schemas, and a sheet that is simply
 * not layered is valid CSS that silently outranks every layered rule on the
 * page — including this package's own. This is the whole check: a glob and a
 * string compare, no dependency, no browser, no build.
 *
 * The glob is `*.css`, not `styles.css`: a sheet that is not named
 * `styles.css` is exactly the one a contributor is most likely to add
 * unwrapped.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const LAYER = "ds.components.app";

const sheets = import.meta.glob("./**/*.css", {
  query: "?url",
  eager: true,
});

describe("component stylesheets", () => {
  it("finds the package's 22 stylesheets", () => {
    // A glob that silently matched nothing, or a sheet added without a case,
    // would make every case below vacuous.
    expect(Object.keys(sheets).sort()).toHaveLength(22);
  });

  for (const path of Object.keys(sheets).sort()) {
    const source = readFileSync(
      fileURLToPath(new URL(path, import.meta.url)),
      "utf-8",
    );

    describe(path, () => {
      it(`is wrapped in ${LAYER}`, () => {
        const rules = source.match(/@layer[^;{]*[;{]/g) ?? [];

        expect(rules).toHaveLength(1);
        expect(rules[0]).toBe(`@layer ${LAYER} {`);
      });

      it("opens the block at the top level, after the header only", () => {
        // Anything before the block must be a comment: an `@import` or a rule
        // above it would sit outside the layer.
        const head = source.slice(0, source.indexOf(`@layer ${LAYER} {`));

        expect(head.replace(/\/\*[\s\S]*?\*\//g, "").trim()).toBe("");
      });
    });
  }
});
