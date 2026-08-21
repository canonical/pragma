/**
 * PROTECTED — the projection's import-graph guard.
 *
 * `@canonical/summon-core/projection` is what a host may import STATICALLY on
 * its `--help`/`__complete` fast path, so its runtime graph must stay light:
 * only `commander` and Node built-ins, never react/ink/ejs/chalk/
 * `@canonical/task`, and never a summon-core module outside `src/projection/`
 * (type-only imports are erased at runtime and are exempt).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
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

/** Walk the static runtime import graph from an entry file. */
function runtimeGraph(entry: string, seen = new Set<string>()): Set<string> {
  if (seen.has(entry) || !existsSync(entry)) return seen;
  seen.add(entry);
  for (const spec of runtimeSpecifiers(entry)) {
    if (!spec.startsWith(".")) continue;
    runtimeGraph(resolve(dirname(entry), spec.replace(/\.js$/, ".ts")), seen);
  }
  return seen;
}

describe("projection import graph (PROTECTED)", () => {
  const graph = runtimeGraph(resolve(here, "index.ts"));

  it("every runtime module on the graph lives inside src/projection/", () => {
    const outside = [...graph]
      .filter((file) => !file.startsWith(here + sep))
      .map((file) => relative(srcRoot, file));
    expect(outside).toEqual([]);
  });

  it("the only bare runtime dependency allowed is commander (plus node builtins)", () => {
    const bare = new Set<string>();
    for (const file of graph) {
      for (const spec of runtimeSpecifiers(file)) {
        if (spec.startsWith(".") || spec.startsWith("node:")) continue;
        bare.add(spec);
      }
    }
    // Today the graph is even lighter than the budget (commander appears only
    // as erased type imports); the assertion is the CEILING, not the floor.
    expect([...bare].filter((spec) => spec !== "commander")).toEqual([]);
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
