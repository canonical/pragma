/**
 * The inverse of the check the React and Svelte component packages carry: no
 * stylesheet in this package is in a cascade layer, and none may be.
 *
 * Every sheet here is handed to Lit as `static styles` and adopted into a shadow
 * root, so none of it reaches the document cascade. A shadow tree is its own
 * cascade context: the document's `@layer` order statement does not order layers
 * declared inside one, and a document rule cannot select a shadow-tree element
 * at all. A wrapper would arbitrate nothing — and it would introduce a trap,
 * because inside one sheet an unlayered rule beats a layered one whatever the
 * order, so the next rule added outside the block would win unconditionally.
 *
 * The second case is what keeps the first one true: if a component ever renders
 * into the light DOM, its sheet becomes document CSS and does belong in
 * `@layer ds.components.global`. This fails then, which is the point.
 *
 * The sibling packages find their sheets with `import.meta.glob`; this one walks
 * the directory with `node:fs`, because this package's tsconfig does not pull in
 * Vite's client types and a check has no business asking for them.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
};

const files = walk(here);
const sheets = files.filter((f) => f.endsWith(".css"));
const sources = files.filter((f) => f.endsWith(".ts"));
const show = (path: string) => `./${relative(here, path)}`;

/** Comments explain the layering; only rules decide it. */
const rulesOnly = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "");

describe("stylesheets", () => {
  it("finds the package's stylesheets", () => {
    // A walk that silently matches nothing would make every case below vacuous.
    expect(sheets.length).toBeGreaterThanOrEqual(13);
  });

  for (const path of sheets) {
    it(`${show(path)} is in no cascade layer`, () => {
      expect(rulesOnly(readFileSync(path, "utf-8"))).not.toMatch(/@layer/);
    });
  }
});

describe("render roots", () => {
  it("finds the package's sources", () => {
    expect(sources.length).toBeGreaterThanOrEqual(13);
  });

  it("no component renders into the light DOM", () => {
    // `createRenderRoot` is the only way a LitElement opts out of its shadow
    // root. Overriding it would make this package's sheets document CSS, and
    // they would then need the `ds.components.global` wrapper the other global
    // tier packages carry.
    const offenders = sources
      .filter((path) => path !== fileURLToPath(import.meta.url))
      .filter((path) => /createRenderRoot/.test(readFileSync(path, "utf-8")))
      .map(show);

    expect(offenders).toEqual([]);
  });
});
