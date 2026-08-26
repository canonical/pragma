/**
 * PROTECTED — the shipped-entry `create` guard.
 *
 * Spawns the EMITTED entry the published package points at
 * (`node dist/src/bin.js`) and asserts every `create` noun writes a tree
 * BYTE-IDENTICAL to a source run of the same generator (`bun src/bin.ts …`).
 * The source run is the reference: it reads the `.ejs` templates from disk with
 * no indirection.
 *
 * WHAT THIS REPLACES. Until the distribution stopped shipping a
 * `bun build --compile` executable, this guard covered `create component` only,
 * and its sibling describe pinned the REFUSAL of `create package` /
 * `create application`: those generators call `template({ source })`, summon-core
 * fell through to `readFile(options.source)`, and inside the binary's virtual
 * filesystem that died with `ENOENT … /$bunfs/templates/package.json.ejs` after
 * `mkdir` had already run — a half-made package on the user's disk. The gate
 * existed to turn that crash into a clean refusal.
 *
 * There is no virtual filesystem now. Every generator's templates are real
 * files under its own package, so all three nouns run from the shipped entry and
 * all three are asserted here. THE REFUSAL CASES ARE GONE ON PURPOSE: a test
 * asserting `create package` refuses would now be asserting a defect.
 *
 * The svelte + lit cases stay load-bearing: `types.ts.ejs` / `index.ts.ejs` /
 * `styles.css.ejs` / `stories.ts.ejs` exist in react/, svelte/ AND lit/, so a
 * basename-matching regression could emit the WRONG framework's file. A wrong
 * file differs from the source run → red here.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../../..");
const cliNextDir = join(repoRoot, "packages/cli/pragma");
const sourceEntry = join(cliNextDir, "src/bin.ts");
const shippedEntry = join(cliNextDir, "dist/src/bin.js");
const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-shipped-"));

// `dist/` is provisioned by `testing/perf/globalSetup.ts`, which re-emits it
// whenever it is missing or older than `src/**`, `scripts/**`, `pragma.conf.ts`
// or `package.json` — so these tests exercise the current emit without a second
// `beforeAll` writing `dist/` in place while another worker is spawning it.

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

/**
 * The create invocations under guard — a LITERAL table, deliberately not derived
 * from `create`'s own declaration, so dropping a noun from the surface turns
 * this red rather than silently shrinking the guard.
 *
 * No case installs dependencies (`runInstall` defaults false), so every tree is
 * generator output alone and byte-comparable.
 */
const CASES: ReadonlyArray<{ label: string; args: readonly string[] }> = [
  ...(["react", "svelte", "lit"] as const).map((framework) => ({
    label: `component ${framework}`,
    args: [
      "create",
      "component",
      "src/components/Widget",
      "--framework",
      framework,
      "--yes",
    ],
  })),
  {
    label: "package",
    args: ["create", "package", "--name", "@canonical/probe", "--yes"],
  },
  {
    label: "application",
    args: ["create", "application", "probeapp", "--yes"],
  },
];

/** Run one create invocation in its own cwd and snapshot what it wrote. */
function create(
  command: string,
  prefix: readonly string[],
  args: readonly string[],
): Map<string, string> {
  const dir = freshCwd();
  execFileSync(command, [...prefix, ...args], { cwd: dir, stdio: "pipe" });
  return snapshot(dir);
}

describe("shipped pragma create (PROTECTED)", () => {
  for (const { label, args } of CASES) {
    it(`${label}: shipped entry ≡ source run, byte-for-byte`, () => {
      // (1) The shipped entry, exactly as a consumer's `pragma` runs it.
      const shipped = create(process.execPath, [shippedEntry], args);
      // (2) A source run — the reference output.
      const source = create("bun", [sourceEntry], args);

      // Wrote something. Before the distribution stopped shipping a compiled
      // binary, `package` and `application` wrote NOTHING here — they refused.
      expect(shipped.size).toBeGreaterThan(0);
      // Same file set …
      expect([...shipped.keys()].sort()).toEqual([...source.keys()].sort());
      // … and byte-identical contents.
      for (const [path, content] of shipped) {
        expect(source.get(path), `content of ${path}`).toBe(content);
      }
    }, 180_000);
  }
});

/**
 * PROTECTED — the shipped-entry READ guard (U1-orig).
 *
 * A READ command (`block list`, `--help`) never calls a generator's
 * `generate()`, so — with the generators loading their templates LAZILY on first
 * `generate()` rather than at module-eval — it must never touch a `.ejs` at all.
 * This is the exact gap the create-only smoke above missed: the component
 * generators used to load templates via a top-level `await`, so a READ crashed
 * with `Template not found`. The lazy load makes a READ template-free, and this
 * pins it at the process boundary where an eager load would resurface.
 */
describe("shipped pragma READ smoke (PROTECTED)", () => {
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
      const result = spawnSync(process.execPath, [shippedEntry, ...args], {
        cwd: freshCwd(),
        stdio: "pipe",
        encoding: "utf-8",
      });
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      // The exact crash the lazy-template fix closes.
      expect(output).not.toMatch(/Template not found/);
      // Nor does it collapse to the internal-bug path (the crash's other tell).
      expect(output).not.toMatch(/Internal error/);
      // It reaches a clean dispatch outcome, not an uncaught startup crash.
      expect(okExit).toContain(result.status);
    }, 30_000);
  }
});
