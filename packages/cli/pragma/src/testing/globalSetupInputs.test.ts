/**
 * `perf/globalSetup.ts`'s input derivation, unit-tested.
 *
 * The module had no test file at all, which mattered for one reason: its
 * `entryRoot` carries branches no live manifest reaches. All ten workspace
 * dependencies declare either a FLAT `exports["."]` whose `import` is a string
 * (nine of them) or no `exports` at all with `main: "src/index.ts"` (one), so
 * an instrumented copy of the recursion reports max depth 1, the `default`
 * branch taken 0 times, and the `".."`/`""` segment guards never tripped. Prose
 * asserting that a guard is correct is not evidence; these rows drive each
 * branch with a hand-written manifest.
 *
 * The failure they prevent is silent, not loud. `entryRoot` falling through to
 * its `dist` default for a dependency that ships from `src` points the
 * staleness walk at a directory that does not exist, `newestMtime` answers 0,
 * and every spawned-binary guard grades a stale `dist/pragma` — the hole
 * `workspaceDependencyRoots` exists to close.
 *
 * It lives here rather than beside the module because `vitest.config.ts`
 * excludes `src/testing/perf/**` from the default pass (those are the serial
 * spawn-latency budgets) and this is a pure, sub-millisecond unit test that
 * belongs in the parallel one.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { entryRoot } from "./perf/globalSetup.js";

const roots: string[] = [];

afterEach(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

/** A throwaway package directory declaring `manifest`, or no manifest at all. */
function packageWith(manifest: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "pragma-entryroot-"));
  roots.push(dir);
  if (manifest !== undefined) {
    writeFileSync(join(dir, "package.json"), JSON.stringify(manifest));
  }
  return dir;
}

describe("entryRoot — the directory a linked dependency's code lives under", () => {
  it("reads a FLAT export condition, the shape nine of ten workspace deps use", () => {
    expect(
      entryRoot(
        packageWith({
          exports: {
            ".": {
              types: "./dist/types/index.d.ts",
              import: "./dist/esm/index.js",
            },
          },
        }),
      ),
    ).toBe("dist");
  });

  it("unwraps a NESTED condition object rather than defaulting to dist", () => {
    // `{ import: { types, default } }` is a legal second writing of the same
    // map and no dependency here uses it. Without the recursion the value is an
    // object, the segment read is skipped, and this answers `dist` — which for
    // a src-shipping package is a directory that does not exist.
    expect(
      entryRoot(
        packageWith({
          exports: {
            ".": {
              import: { types: "./src/index.d.ts", default: "./src/index.js" },
            },
          },
        }),
      ),
    ).toBe("src");
  });

  it("falls back to the `default` condition when there is no `import`", () => {
    expect(
      entryRoot(
        packageWith({ exports: { ".": { default: "./lib/index.js" } } }),
      ),
    ).toBe("lib");
  });

  it("reads `main` when no exports map is declared — summon-package's shape", () => {
    expect(entryRoot(packageWith({ main: "src/index.ts" }))).toBe("src");
  });

  it("prefers `module` over `main`", () => {
    expect(
      entryRoot(
        packageWith({ module: "./esm/index.js", main: "./cjs/index.js" }),
      ),
    ).toBe("esm");
  });

  it("answers `dist` for a manifest that declares no entry at all", () => {
    expect(entryRoot(packageWith({ name: "@scope/nothing" }))).toBe("dist");
  });

  it("answers `dist` for an unreadable manifest", () => {
    expect(entryRoot(packageWith(undefined))).toBe("dist");
  });

  it("refuses an entry that escapes the package root or names nothing", () => {
    // A `..` segment would point the walk OUTSIDE the dependency; an entry that
    // is bare (`"index.js"` splits to a file, not a directory, and `"./"` to
    // the empty string) has no directory to watch.
    expect(entryRoot(packageWith({ main: "../elsewhere/index.js" }))).toBe(
      "dist",
    );
    expect(entryRoot(packageWith({ main: "./" }))).toBe("dist");
  });

  it("unwraps to the depth cap, and stops one level past it", () => {
    // Five nested conditions resolve (the cap is `depth > 4`, counting the
    // top-level map as 0); a sixth answers `dist` rather than recursing on
    // whatever a pathological manifest declares.
    const nest = (levels: number): unknown =>
      levels === 0 ? "./a/b.js" : { import: nest(levels - 1) };
    expect(entryRoot(packageWith({ exports: { ".": nest(5) } }))).toBe("a");
    expect(entryRoot(packageWith({ exports: { ".": nest(6) } }))).toBe("dist");
  });
});
