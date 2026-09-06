/**
 * Every component stylesheet this package ships sits in `ds.components.apps-landscape`, and
 * `index.css` names that layer before any of them can.
 *
 * The name comes from the tier this package implements. It is one flat name,
 * not a nesting: `@canonical/styles` names the tiers one level up, so this one
 * is appended after them and sits above the tier it specialises.
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
 * Both ends of each sheet are checked, because a rule appended below the
 * wrapper is exactly as unlayered as one written above it and far easier to
 * miss — the file still opens with the block.
 *
 * The README says `@property` and `@font-face` registrations belong above the
 * block, since no layer sorts a registration, so the head check accepts them.
 * No sheet in this package has one today; the allowance is the documented rule
 * written down rather than a live case. An `@import` is accepted only in
 * `index.css`, which is nothing but imports, and there it must carry no
 * `layer()` keyword — the keyword would nest each imported sheet's own block a
 * level deeper than intended.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const LAYER = "ds.components.apps-landscape";
const ENTRY = "./index.css";

const sheets = import.meta.glob("./**/*.css", {
  query: "?url",
  eager: true,
});

// Comments are stripped before every check: each sheet's header names the layer
// in prose, and this file explains the rules in its own, so a match over the
// raw text would be reading the documentation.
const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf-8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );

const paths = Object.keys(sheets).sort();
const componentSheets = paths.filter((path) => path !== ENTRY);

describe("component stylesheets", () => {
  it("finds the package's 2 stylesheets", () => {
    // A glob that silently matched nothing, or a sheet added without a case,
    // would make every case below vacuous.
    expect(paths).toHaveLength(2);
  });

  it("has a CSS entry", () => {
    expect(paths).toContain(ENTRY);
  });

  describe(ENTRY, () => {
    const code = read(ENTRY);

    it(`opens with @layer ${LAYER};`, () => {
      // The layer takes its place in the order the first time its name is seen.
      // Naming it here, before any block can open with it, is what makes that
      // place independent of which sheet a bundler emits first.
      expect(code.trim().startsWith(`@layer ${LAYER};`)).toBe(true);
    });

    it("declares no block of its own", () => {
      expect(code).not.toContain("{");
    });

    it("imports every other stylesheet exactly once", () => {
      const imported = (code.match(/@import\s+url\(\s*"([^"]+)"\s*\)/g) ?? [])
        .map((rule) => rule.replace(/^@import\s+url\(\s*"|"\s*\)$/g, ""))
        .sort();

      expect(imported).toEqual(componentSheets);
    });

    it("imports without a layer() keyword", () => {
      // Each imported sheet opens its own block with this same name; the
      // keyword would nest it at `<layer>.<layer>`, below the block's own rules.
      expect(code).not.toMatch(/\blayer\s*\(/);
    });
  });

  for (const path of componentSheets) {
    const code = read(path);
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
