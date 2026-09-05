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
 *
 * Both ends of the file are checked, because a rule appended below the wrapper
 * is exactly as unlayered as one written above it and far easier to miss — the
 * file still opens with the block.
 *
 * The README says `@property` and `@font-face` registrations belong above the
 * block, since no layer sorts a registration, so the head check accepts them.
 * No sheet in this package has one today; the allowance is the documented rule
 * written down rather than a live case. An `@import` is not accepted: none of
 * these sheets has one either, and the first one will have to decide whether it
 * carries a `layer()` keyword — see the equivalent test in
 * `@canonical/react-ds-global-form`, where that keyword turned out to nest the
 * imported sheet a level deeper than intended.
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
    // Comments are stripped first: every sheet's header names the layer in
    // prose, and this file explains the rules in its own, so a match over the
    // raw text would be reading the documentation.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "");
    const open = code.indexOf(`@layer ${LAYER} {`);
    // A missing block leaves the whole file above it, so every case below fails.
    const head = open === -1 ? code : code.slice(0, open);
    // Walk to the brace that closes the wrapper, so what follows it can be
    // checked too.
    let depth = 0;
    let close = -1;
    for (let i = open; open !== -1 && i < code.length; i += 1) {
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

      it("opens the block after the header and any registrations", () => {
        // Only `@property` and `@font-face` may sit above the block. Anything
        // else there would be a rule outside the layer.
        const withoutRegistrations = head.replace(
          /@(?:property|font-face)\b[^{]*\{[^}]*\}/g,
          "",
        );

        expect(withoutRegistrations.trim()).toBe("");
      });

      it("closes the block at the end of the file", () => {
        expect(close).toBeGreaterThan(-1);
        expect(tail.trim()).toBe("");
      });
    });
  }
});
