/**
 * PROTECTED — the compiled-binary `create` guard.
 *
 * Builds the real standalone `dist/pragma` (`bun build --compile`) and spawns
 * `pragma create component … --yes` for react, svelte AND lit, asserting each
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
const cliNextDir = join(repoRoot, "packages/cli/pragma");
const pragmaBin = join(cliNextDir, "src/bin.ts");
const compiledBin = join(cliNextDir, "dist/pragma");
const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-compiled-"));

// Build the standalone binary ONCE for every describe in this file (create +
// the READ smoke share it), so the tests always exercise the current bundle +
// embedded manifest rather than a stale `dist/pragma`.
beforeAll(() => {
  const result = spawnSync("bun", ["run", "scripts/build.ts"], {
    cwd: cliNextDir,
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(
      `failed to build dist/pragma:\n${result.stderr?.toString() ?? ""}`,
    );
  }
}, 180_000);

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

describe("compiled pragma create component (PROTECTED)", () => {
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

/**
 * PROTECTED — the compiled-binary `create` gate.
 *
 * `create component` runs from the binary (the describe above proves it byte for
 * byte) because summon-component routes every template read through
 * `loadTemplateSync` and passes `content:` into `template()`. `create package` /
 * `create application` do NOT: they call `template({ source })`, summon-core
 * falls through to `readFile(options.source)`, and the run dies with `ENOENT …
 * /$bunfs/templates/package.json.ejs` AFTER `mkdir` has already run — a
 * half-made package left on the user's disk. Measured against a real
 * `dist/pragma` with the gate lifted, for both nouns.
 *
 * A `--dry-run` does NOT test this: it exits 0 without reading a template and
 * merely PRINTS `Read file: /$bunfs/templates/package.json.ejs` as a planned
 * effect. That false positive is why the gate has to be pinned by a real run.
 *
 * The `readdirSync(dir)` assertion is the load-bearing one: it fails with the
 * real symptom if the gate is ever lifted without fixing the generators.
 */
describe("compiled pragma create gate (PROTECTED)", () => {
  // A LITERAL noun list, deliberately not derived from `create`'s own
  // declaration: changing the gate's input must turn this red rather than
  // silently drop the case.
  for (const kind of ["package", "application"] as const) {
    it(`refuses \`create ${kind}\` and leaves the cwd untouched`, () => {
      const dir = freshCwd();
      const result = spawnSync(compiledBin, ["create", kind, "--yes"], {
        cwd: dir,
        stdio: "pipe",
        encoding: "utf-8",
      });
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      // 1, not merely non-zero: UNSUPPORTED is a runtime refusal, which
      // `kernel/error/constants.ts` maps to the generic runtime exit.
      expect(result.status).toBe(1);
      expect(output).toContain("not available in the compiled pragma binary");
      // The clean refusal, not the crash it exists to prevent.
      expect(output).not.toMatch(/ENOENT/);
      expect(output).not.toMatch(/Internal error/);
      // And nothing half-made on disk: the generator's `mkdir` effects run
      // BEFORE its first template read, so a lifted gate leaves a stub tree.
      expect(readdirSync(dir)).toEqual([]);
    }, 30_000);
  }
});

/**
 * PROTECTED — the compiled-binary READ guard (U1-orig).
 *
 * A READ command (`block list`, `--help`) never calls a generator's
 * `generate()`, so — with the generators loading their templates LAZILY on first
 * `generate()` rather than at module-eval — it must never touch a `.ejs`
 * template that the standalone binary lacks. This is the exact gap the
 * create-only smoke above missed: the component generators used to load
 * templates via a top-level `await`, so a READ crashed with `Template not found`
 * on any bun version whose `--compile` code-splitting did not keep the generator
 * modules lazy. The lazy load makes a READ template-free regardless of bun.
 */
describe("compiled pragma READ smoke (PROTECTED)", () => {
  // A cold store cleanly reports STORE_UNAVAILABLE (exit 3); `--help` never needs
  // a store (exit 0). Both fully exercise startup + dispatch — the phase where an
  // eager generator template load would have crashed — without a store or writes.
  const READS: ReadonlyArray<{
    args: readonly string[];
    okExit: readonly number[];
  }> = [
    { args: ["block", "list"], okExit: [0, 3] },
    { args: ["--help"], okExit: [0] },
  ];

  for (const { args, okExit } of READS) {
    it(`\`${args.join(" ")}\` runs without a Template-not-found crash`, () => {
      const result = spawnSync(compiledBin, [...args], {
        cwd: freshCwd(),
        stdio: "pipe",
        encoding: "utf-8",
      });
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      // The exact crash the lazy-template fix closes: a READ never loads a
      // generator, so it never touches a `.ejs` the standalone binary lacks.
      expect(output).not.toMatch(/Template not found/);
      // Nor does it collapse to the internal-bug path (the crash's other tell).
      expect(output).not.toMatch(/Internal error/);
      // It reaches a clean dispatch outcome, not an uncaught startup crash.
      expect(okExit).toContain(result.status);
    }, 30_000);
  }
});
