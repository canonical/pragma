/**
 * PROTECTED — the compiled-binary `create` guard.
 *
 * Builds the real standalone `dist/pragma2` (`bun build --compile`) and spawns
 * `pragma2 create component … --yes` for react, svelte AND lit, asserting each
 * tree is BYTE-IDENTICAL to a source run of the same generator (`bun src/bin.ts
 * …`, which reads the `.ejs` templates from disk).
 *
 * This is what proves PR7's two compiled-`create` fixes end-to-end:
 *   1. Summon is bundled — a computed-specifier import used to keep summon-core +
 *      the generators OUT of the binary; static dynamic imports now include them.
 *   2. The templates are embedded AND resolved by DIRECTORY-QUALIFIED path. The
 *      svelte + lit cases are load-bearing: `types.ts.ejs` / `index.ts.ejs` /
 *      `styles.css.ejs` / `stories.ts.ejs` exist in react/, svelte/ AND lit/, so
 *      the old basename-matching fallback could emit the WRONG framework's file
 *      in the binary. A wrong file would differ from the source run → red here.
 *
 * On base (summon not bundled, templates not embedded) the binary's `create`
 * writes nothing (it errors), so `compiled.size > 0` already fails.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../../..");
const cliNextDir = join(repoRoot, "packages/cli/next");
const pragmaBin = join(cliNextDir, "src/bin.ts");
const compiledBin = join(cliNextDir, "dist/pragma2");
const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma2-compiled-"));

/** Read a directory tree into a sorted map of relative path → contents. */
function snapshot(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string, base: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(d, entry.name), rel);
      else out.set(rel, readFileSync(join(d, entry.name), "utf-8"));
    }
  };
  walk(dir, "");
  return out;
}

/** Run a `create component` in its own cwd and snapshot what it wrote. */
function createComponent(
  bin: string,
  args: readonly string[],
  framework: string,
): Map<string, string> {
  const dir = freshCwd();
  execFileSync(
    bin,
    [
      ...args,
      "create",
      "component",
      "src/components/Widget",
      "--framework",
      framework,
      "--yes",
    ],
    { cwd: dir, stdio: "pipe" },
  );
  return snapshot(dir);
}

describe("compiled pragma2 create component (PROTECTED)", () => {
  beforeAll(() => {
    // Build the standalone binary fresh so the test always exercises the current
    // bundle + embedded manifest (the perf globalSetup only builds if missing).
    const result = spawnSync("bun", ["run", "scripts/build.ts"], {
      cwd: cliNextDir,
      stdio: "pipe",
    });
    if (result.status !== 0) {
      throw new Error(
        `failed to build dist/pragma2:\n${result.stderr?.toString() ?? ""}`,
      );
    }
  }, 180_000);

  for (const framework of ["react", "svelte", "lit"] as const) {
    it(`${framework}: compiled binary ≡ source run, byte-for-byte`, () => {
      // (1) The real standalone binary — templates come from the embedded manifest.
      const compiled = createComponent(compiledBin, [], framework);
      // (2) A source run — templates come from disk. The reference output.
      const source = createComponent("bun", [pragmaBin], framework);

      // Wrote something (fails on base, where the binary's create errors out).
      expect(compiled.size).toBeGreaterThan(0);
      // Same file set …
      expect([...compiled.keys()].sort()).toEqual([...source.keys()].sort());
      // … and byte-identical contents (the collision fix: svelte/lit must NOT
      // carry react's template text).
      for (const [path, content] of compiled) {
        expect(source.get(path), `content of ${path}`).toBe(content);
      }
    }, 120_000);
  }
});
