/**
 * PROTECTED — the projection's import-graph guards, one per seam.
 *
 * Both subpaths are what a host may import STATICALLY on its
 * `--help`/`__complete` fast path, so their runtime graphs must stay light —
 * and each seam gets its own pin:
 *
 * - `@canonical/summon-core/projection` (the DATA seam) reaches ZERO bare
 *   dependencies — Node built-ins only, never `commander`, and no module
 *   under `commander/` on its graph.
 * - `@canonical/summon-core/projection/commander` (the ADAPTER seam) keeps
 *   the `commander` ceiling.
 *
 * Neither may reach react/ink/ejs/chalk/`@canonical/task`, or a summon-core
 * module outside `src/projection/` (type-only imports are erased at runtime
 * and are exempt).
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, "..");

/**
 * Strip comments (docblocks quote `from "..."` in prose) and type-only
 * imports (erased at runtime) before reading specifiers.
 */
function runtimeSource(file: string): string {
  return readFileSync(file, "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1")
    .replace(/\bimport\s+type\b[^;]*;/g, "")
    .replace(/\bexport\s+type\b[^;]*;/g, "");
}

/** All import/export-from specifiers that survive compilation. */
function runtimeSpecifiers(file: string): string[] {
  const source = runtimeSource(file);
  const specifiers: string[] = [];
  for (const match of source.matchAll(
    /(?:\bfrom\s*|(?:^|\n)\s*import\s*)["']([^"']+)["']/g,
  )) {
    if (match[1]) specifiers.push(match[1]);
  }
  return specifiers;
}

/**
 * Resolve a relative specifier to its source file — `.ts`, `.tsx`, and the
 * `/index.ts(x)` directory forms. A specifier resolving to NONE of them is a
 * hard failure, never a silent skip: an early-return here once made every
 * `.tsx` module (React/Ink — the exact modules this guard exists to forbid)
 * invisible to the graph.
 */
function resolveRelative(fromDir: string, spec: string): string {
  const base = resolve(fromDir, spec.replace(/\.js$/, ""));
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    resolve(base, "index.ts"),
    resolve(base, "index.tsx"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (found === undefined) {
    throw new Error(
      `unresolvable relative specifier "${spec}" from ${fromDir} — a module the guard cannot resolve is a module it cannot check`,
    );
  }
  return found;
}

/** Walk the static runtime import graph from an entry file. */
function runtimeGraph(entry: string, seen = new Set<string>()): Set<string> {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  for (const spec of runtimeSpecifiers(entry)) {
    if (!spec.startsWith(".")) continue;
    runtimeGraph(resolveRelative(dirname(entry), spec), seen);
  }
  return seen;
}

/** The bare (non-relative, non-builtin) specifiers across a graph. */
function bareSpecifiers(graph: ReadonlySet<string>): string[] {
  const bare = new Set<string>();
  for (const file of graph) {
    for (const spec of runtimeSpecifiers(file)) {
      if (spec.startsWith(".") || spec.startsWith("node:")) continue;
      bare.add(spec);
    }
  }
  return [...bare];
}

describe("the graph's resolver — .tsx visible, unresolvable fatal", () => {
  it("sees .ts, .tsx and index modules, and throws on a specifier resolving to none", () => {
    const dir = mkdtempSync(join(tmpdir(), "lazy-graph-probe-"));
    try {
      writeFileSync(join(dir, "ui.tsx"), "export const x = 1;\n");
      mkdirSync(join(dir, "nested"));
      writeFileSync(join(dir, "nested", "index.ts"), "export {};\n");
      // A React/Ink module is .tsx — the guard must SEE it, not skip it.
      expect(resolveRelative(dir, "./ui.js")).toBe(join(dir, "ui.tsx"));
      expect(resolveRelative(dir, "./nested")).toBe(
        join(dir, "nested", "index.ts"),
      );
      expect(() => resolveRelative(dir, "./ghost.js")).toThrow(
        /unresolvable relative specifier/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe.each([
  {
    seam: "data (projection)",
    entry: resolve(here, "index.ts"),
    allowedBare: [] as string[],
  },
  {
    seam: "adapter (projection/commander)",
    entry: resolve(here, "commander", "index.ts"),
    allowedBare: ["commander"],
  },
])("$seam import graph (PROTECTED)", ({ entry, allowedBare }) => {
  const graph = runtimeGraph(entry);

  it("every runtime module on the graph lives inside src/projection/", () => {
    const outside = [...graph]
      .filter((file) => !file.startsWith(here + sep))
      .map((file) => relative(srcRoot, file));
    expect(outside).toEqual([]);
  });

  it(`bare runtime dependencies stay within the seam's ceiling: [${allowedBare.join(", ")}]`, () => {
    // The assertion is the CEILING, not the floor (the data seam's runtime
    // graph is dependency-FREE; the adapter's reaches only commander).
    expect(
      bareSpecifiers(graph).filter((spec) => !allowedBare.includes(spec)),
    ).toEqual([]);
  });

  it("never reaches react, ink, ejs, chalk, or @canonical/task at runtime", () => {
    const forbidden = [
      "react",
      "ink",
      "ink-select-input",
      "ink-text-input",
      "ejs",
      "chalk",
      "@canonical/task",
    ];
    for (const file of graph) {
      const source = runtimeSource(file);
      for (const pkg of forbidden) {
        const esc = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        expect(
          new RegExp(`from\\s*["']${esc}["']`).test(source),
          `${relative(srcRoot, file)} statically imports ${pkg}`,
        ).toBe(false);
      }
    }
  });
});

describe("the data seam stays Commander-free", () => {
  it("no module under commander/ appears on the data entry's graph", () => {
    const commanderDir = resolve(here, "commander") + sep;
    const graph = runtimeGraph(resolve(here, "index.ts"));
    const adapterModules = [...graph]
      .filter((file) => file.startsWith(commanderDir))
      .map((file) => relative(srcRoot, file));
    expect(adapterModules).toEqual([]);
  });
});
