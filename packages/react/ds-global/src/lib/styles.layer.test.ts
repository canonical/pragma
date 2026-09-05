/**
 * Every component stylesheet this package ships sits in `ds.components.global`,
 * and nothing sits outside it.
 *
 * Nothing else in the repository catches an unwrapped sheet: biome has no such
 * rule, webarchitect validates JSON against schemas, and a sheet that is simply
 * not layered is valid CSS that silently outranks every layered rule on the
 * page. This is the whole check — a glob, a brace walk and a string compare, no
 * dependency, no browser, no build.
 *
 * Both ends of the block are checked. A rule appended below the wrapper is as
 * unlayered as one written above it, and far easier to miss, because the file
 * still opens with the block and still contains exactly one `@layer`.
 *
 * The aggregate `src/lib/index.css` is exempt by construction: the glob matches
 * `styles.css` only. That file is one `@import` per sheet with no rules of its
 * own, so it must stay unlayered — each sheet it pulls in opens its own block.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const LAYER = "ds.components.global";

/** `@property` and `@font-face` blocks, the two things allowed above the block. */
const REGISTRATION = /@(?:property|font-face)\b[^{]*\{[^}]*\}/g;

const sheets = import.meta.glob("./**/styles.css", {
  query: "?url",
  eager: true,
});

describe("component stylesheets", () => {
  it("finds the package's stylesheets", () => {
    // A glob that silently matched nothing would make every case below vacuous.
    expect(Object.keys(sheets).length).toBeGreaterThan(40);
  });

  for (const path of Object.keys(sheets).sort()) {
    const source = readFileSync(
      fileURLToPath(new URL(path, import.meta.url)),
      "utf-8",
    );
    // Comments are stripped once, up front: every sheet's header names the
    // layer in prose, so a match over the raw text would read the header
    // instead of the code.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "");
    const open = code.indexOf(`@layer ${LAYER} {`);
    // With no block the whole file is above it, so every case below fails.
    const head = open === -1 ? code : code.slice(0, open);

    // Walk to the brace that closes the wrapper, so what follows it can be
    // checked too. Counting braces is enough here because no sheet in this
    // package puts one inside a string or a url() — asserted below, so the
    // day one does, this says so rather than going quietly wrong.
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
    const tail =
      close === -1 ? code.slice(Math.max(open, 0)) : code.slice(close + 1);

    describe(path, () => {
      it(`is wrapped in ${LAYER}`, () => {
        const rules = code.match(/@layer[^;{]*[;{]/g) ?? [];

        expect(rules).toHaveLength(1);
        expect(rules[0]).toBe(`@layer ${LAYER} {`);
      });

      it("opens the block after the header and any registrations", () => {
        // A registration is not a style rule and no layer sorts one, so
        // `@property` and `@font-face` belong above the block; the README says
        // so. Anything else up there would be a rule outside the layer.
        expect(head.replace(REGISTRATION, "").trim()).toBe("");
      });

      it("closes the block at the end of the file", () => {
        expect(close).toBeGreaterThan(-1);
        expect(tail.trim()).toBe("");
      });

      it("puts no brace inside a string or a url(), which the walk assumes", () => {
        expect(code).not.toMatch(/"[^"\n]*[{}][^"\n]*"|'[^'\n]*[{}][^'\n]*'/);
        expect(code).not.toMatch(/url\([^)]*[{}][^)]*\)/);
      });
    });
  }
});
