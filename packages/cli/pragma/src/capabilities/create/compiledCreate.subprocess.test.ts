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
import {
  accessSync,
  constants,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { blankCanonicalRanges } from "../../testing/helpers/blankCanonicalRanges.js";
import {
  newestMtime,
  workspaceDepRoots,
} from "../../testing/perf/globalSetup.js";
import { PACKAGE_VERSIONS } from "./templates.embedded.generated.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../../..");
const cliNextDir = join(repoRoot, "packages/cli/pragma");
const pragmaBin = join(cliNextDir, "src/bin.ts");
const compiledBin = join(cliNextDir, "dist/pragma");
const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-compiled-"));

// The binary is provisioned by `testing/perf/globalSetup.ts`, which rebuilds it
// whenever it is missing or older than `src/**`, `scripts/**`, `pragma.conf.ts`
// or `package.json` — so these tests exercise the current bundle + embedded
// manifest without a second `beforeAll` writing `dist/pragma` in place while
// another worker's test is spawning it.

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
      framework,
      "src/components/Widget",
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
 * PROTECTED — the compiled binary GENERATES every binding (the PRA-14 gate's
 * strongest replacement).
 *
 * `create package` / `create application` used to refuse in the compiled
 * binary: their generators read templates from disk, which the binary does not
 * carry. Every generator now routes reads through summon-core's embedded seam
 * and the build embeds every declared root, so the gate is superseded by the
 * strongest form of the claim it guarded: for BOTH nouns, a compiled-binary
 * run is byte-identical to a source run of the same invocation, and non-empty.
 *
 * A `--dry-run` would NOT prove this (it can exit 0 without reading every
 * template); these are real runs. `--no-run-install` keeps them offline and
 * the trees deterministic (the generators default install ON now).
 */
describe("compiled pragma create package/application ≡ source run (PROTECTED)", () => {
  // A LITERAL case list, deliberately not derived from `create`'s own
  // declaration: changing the surface must turn this red rather than silently
  // drop a case. Flags mirror the shared conformance fixtures.
  const cases: ReadonlyArray<{ kind: string; args: readonly string[] }> = [
    {
      kind: "package",
      args: [
        "create",
        "package",
        "--name",
        "@canonical/my-lib",
        "--type",
        "library",
        "--description",
        "A library.",
        "--no-run-install",
        "--yes",
      ],
    },
    {
      kind: "application",
      args: [
        "create",
        "application",
        "react",
        "my-app",
        "--no-run-install",
        "--yes",
      ],
    },
  ];

  for (const { kind, args } of cases) {
    it(`create ${kind}: compiled binary ≡ source run, byte-for-byte`, () => {
      // (1) The real standalone binary — templates come from the embedded manifest.
      const compiledDir = freshCwd();
      execFileSync(compiledBin, [...args], { cwd: compiledDir, stdio: "pipe" });
      let compiled = snapshot(compiledDir);

      // (2) A source run — templates come from disk. The reference output.
      const sourceDir = freshCwd();
      execFileSync("bun", [pragmaBin, ...args], {
        cwd: sourceDir,
        stdio: "pipe",
      });
      let source = snapshot(sourceDir);

      // This NETWORKED case proves the TEMPLATE surface: the ranges each
      // side's own `npm view` resolved are blanked identically (see the
      // helper) and asserted by the offline cases, where they are forced.
      if (kind === "application") {
        compiled = blankCanonicalRanges(compiled);
        source = blankCanonicalRanges(source);
      }

      // Wrote something (fails loudly if either run refuses or crashes).
      expect(compiled.size).toBeGreaterThan(0);
      // Same file set …
      expect([...compiled.keys()].sort()).toEqual([...source.keys()].sort());
      // … and byte-identical contents.
      for (const [path, content] of compiled) {
        expect(source.get(path), `content of ${path}`).toBe(content);
      }
    }, 120_000);
  }
});

/** Resolve an executable by name on THIS process's PATH (absolute path). */
function findOnPath(name: string): string {
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, name);
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Not here — keep scanning.
    }
  }
  throw new Error(`${name} not found on PATH`);
}

/**
 * A minimal PATH for offline runs: one fresh directory holding ONLY `bun` and
 * `node` symlinks, so `npm` is unresolvable no matter where the host installed
 * it (some layouts co-locate npm with bun or node, which a "drop npm's
 * directory" subtraction would silently miss).
 */
function offlineBinDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "pragma-offline-bin-"));
  symlinkSync(findOnPath("bun"), join(dir, "bun"));
  symlinkSync(findOnPath("node"), join(dir, "node"));
  return dir;
}

/**
 * PROTECTED — the OFFLINE version pin (round-4 F1).
 *
 * `create application` resolves the @canonical/* range via `npm view`, with
 * "the installed generator's own version" as the offline fallback. In the
 * compiled binary the generator's `package.json` does not exist under
 * `/$bunfs`, so before the fix the fallback degraded to the floating tag
 * `latest` — an offline (or registry-timeout) run of the SHIPPED binary
 * scaffolded every @canonical dependency of a lockstep release line onto
 * `latest`, while a source run of the same invocation pinned `^<version>`.
 * `readVersion` now falls back to the host-injected embedded store (the same
 * seam summon-package already used), so this case spawns both hosts with npm
 * unreachable and pins the invariant the networked case above cannot: the
 * fallback range is the release line EXACTLY, never `latest`, and offline
 * compiled ≡ offline source byte-for-byte. Each side must also emit the
 * fallback's own stderr line — the proof npm was actually unreachable, since
 * a networked leak would resolve a `^`-shaped range too and quietly turn
 * this case into a duplicate of the networked one.
 */
describe("compiled pragma create application, npm unreachable (PROTECTED)", () => {
  it("pins the release line exactly — never `latest` — and ≡ source run, byte-for-byte", () => {
    const env = { ...process.env, PATH: offlineBinDir() };
    const releaseLine = `^${PACKAGE_VERSIONS["@canonical/summon-application"]}`;
    const fallbackLine =
      `Could not reach npm for the latest @canonical/* version; ` +
      `pinning ${releaseLine} (from the installed generator).`;
    const args = [
      "create",
      "application",
      "react",
      "my-app",
      "--no-run-install",
      "--yes",
    ] as const;

    // (1) The real standalone binary — versions come from the embedded store.
    const compiledDir = freshCwd();
    const compiledRun = spawnSync(compiledBin, [...args], {
      cwd: compiledDir,
      stdio: "pipe",
      encoding: "utf-8",
      env,
      input: "",
    });
    expect(compiledRun.status, compiledRun.stderr).toBe(0);
    expect(compiledRun.stderr).toContain(fallbackLine);
    const compiled = snapshot(compiledDir);

    // (2) A source run under the SAME offline PATH — versions come from the
    // installed tree. Spawned via the symlink so both children share one env.
    const sourceDir = freshCwd();
    const sourceRun = spawnSync(join(env.PATH, "bun"), [pragmaBin, ...args], {
      cwd: sourceDir,
      stdio: "pipe",
      encoding: "utf-8",
      env,
      input: "",
    });
    expect(sourceRun.status, sourceRun.stderr).toBe(0);
    expect(sourceRun.stderr).toContain(fallbackLine);
    const source = snapshot(sourceDir);

    // The manifest pins the generator's release line EXACTLY for every
    // @canonical dependency — `latest` and a network-resolved newer range
    // both fail here.
    const manifest = JSON.parse(
      compiled.get("my-app/package.json") ?? "{}",
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const canonicalDeps = Object.entries({
      ...manifest.dependencies,
      ...manifest.devDependencies,
    }).filter(([name]) => name.startsWith("@canonical/"));
    expect(canonicalDeps.length).toBeGreaterThan(0);
    for (const [name, range] of canonicalDeps) {
      expect(range, `range of ${name}`).toBe(releaseLine);
    }

    // Wrote something (fails loudly if either run refuses or crashes).
    expect(compiled.size).toBeGreaterThan(0);
    // Same file set …
    expect([...compiled.keys()].sort()).toEqual([...source.keys()].sort());
    // … and byte-identical contents — offline is not a second dialect.
    for (const [path, content] of compiled) {
      expect(source.get(path), `content of ${path}`).toBe(content);
    }
  }, 120_000);
});

const summonCliDir = join(repoRoot, "packages/cli/summon");
const summonDistBin = join(summonCliDir, "dist/src/bin.js");

/** What each gated package's dist is built from (a missing entry stats 0). */
const DIST_INPUTS = [
  "src",
  "generators",
  "package.json",
  "tsconfig.build.json",
];

/**
 * The served entry artifact of one workspace package (`module` ?? `main`),
 * absolute — or undefined for a package that serves no compiled dist (no
 * `build` script, or an entry outside `dist/`, e.g. webarchitect's
 * source-served `src/index.ts`), which the gate skips.
 */
function servedDistArtifact(root: string): string | undefined {
  let manifest: {
    module?: string;
    main?: string;
    scripts?: Record<string, string>;
  };
  try {
    manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
  } catch {
    return undefined;
  }
  const entry = manifest.module ?? manifest.main;
  if (!entry || !entry.startsWith("dist") || !manifest.scripts?.build) {
    return undefined;
  }
  return join(root, entry);
}

/**
 * (Re)build every workspace dist the node-runtime cell below EXECUTES, when
 * stale: the dists this file spawns directly — the summon CLI's bin and the
 * summon-application dist the fixture re-exports — plus their transitively
 * linked workspace deps (summon-core, task, utils…), discovered by the perf
 * globalSetup's own `workspaceDepRoots` walk rather than a narrowed copy.
 * Each package is gated by the same honest mtime rule the globalSetup
 * applies to `dist/pragma`: its served entry artifact must be newer than its
 * `src`/`generators`/`package.json`/`tsconfig.build.json`. Dependencies
 * build before dependents (application's tsc reads core's `dist/types`).
 * Only this file spawns those dists, so a build here cannot race another
 * worker's spawn.
 *
 * Scope, stated honestly: the COMPILED side of the cell runs `dist/pragma`,
 * whose freshness — embedded dep dists included — is the globalSetup's
 * contract, and the globalSetup bundles whatever dep dists are on disk at
 * suite start. A dist this gate refreshes reaches the binary on the NEXT
 * suite start; within the same run the node side already executes the
 * current code, so a behavioral dist-level regression reddens the
 * node-vs-compiled comparison instead of both sides agreeing on stale code.
 */
function buildSpawnedDistsIfStale(): void {
  const spawnedRoots = [
    summonCliDir,
    join(repoRoot, "packages/summon/application"),
  ].map((dir) => realpathSync(dir));
  const all = new Set(spawnedRoots);
  for (const root of spawnedRoots) {
    for (const dep of workspaceDepRoots(root)) all.add(dep);
  }
  // Dependencies before dependents: a root is ready once none of ITS deps
  // are still pending (the walk is acyclic; the find always succeeds).
  const depsOf = new Map(
    [...all].map((root) => [root, new Set(workspaceDepRoots(root))] as const),
  );
  const remaining = new Set(all);
  const ordered: string[] = [];
  while (remaining.size > 0) {
    const next = [...remaining].find((root) =>
      [...(depsOf.get(root) ?? [])].every((dep) => !remaining.has(dep)),
    ) as string;
    ordered.push(next);
    remaining.delete(next);
  }
  for (const root of ordered) {
    const artifact = servedDistArtifact(root);
    if (!artifact) continue;
    const built = newestMtime(artifact);
    const fresh =
      built > 0 &&
      DIST_INPUTS.every((input) => newestMtime(join(root, input)) < built);
    if (fresh) continue;
    const result = spawnSync("bun", ["run", "build"], {
      cwd: root,
      stdio: "pipe",
      encoding: "utf-8",
    });
    if (result.status !== 0) {
      throw new Error(
        `failed to build ${root}'s dist:\n${result.stdout}${result.stderr}`,
      );
    }
  }
}

/**
 * A one-file barrel package the summon bin discovers via `--generators`,
 * serving the BUILT application generators (`dist/esm`, exactly what a
 * published install serves) — the crossCli suite's fixture, narrowed to the
 * one generator this cell spawns. `type: module` keeps the import lexing
 * independent of node's syntax detection.
 */
function writeApplicationFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "pragma-offline-generators-"));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "summon-offline-fixture",
      type: "module",
      main: "index.js",
    }),
  );
  const dist = join(repoRoot, "packages/summon/application/dist/esm/index.js");
  writeFileSync(
    join(dir, "index.js"),
    `export { generators } from ${JSON.stringify(`file://${dist}`)};\n`,
  );
  return dir;
}

/**
 * PROTECTED — the SHIPPED summon runtime, offline (round-5 F1).
 *
 * The summon CLI ships `#!/usr/bin/env node` with `bin: dist/src/bin.js` —
 * its production runtime is plain NODE, yet every other summon spawn in the
 * suite is `bun`. Under node, the old tree tier
 * (`require("<pkg>/package.json")`) threw ERR_PACKAGE_PATH_NOT_EXPORTED for
 * the manifests it resolves (neither summon-core nor summon-application
 * exposes a `"./package.json"` exports subpath), so an offline
 * node-run summon pinned every @canonical/* range to the floating `latest`
 * while every bun host pinned `^<version>` — the two shipped products
 * diverged on the exact trees the parity contract promises byte-identical.
 * `readVersion` now WALKS manifests off disk (no `exports` gate), and this
 * cell is the only guard that can see it: the built summon bin under `node`,
 * npm unreachable, must pin the release line exactly and match the compiled
 * pragma binary byte-for-byte.
 */
describe("node-run summon bin create application, npm unreachable (PROTECTED)", () => {
  beforeAll(() => {
    buildSpawnedDistsIfStale();
  }, 240_000);

  it("pins the release line exactly — never `latest` — and ≡ compiled pragma binary, byte-for-byte", () => {
    const env = { ...process.env, PATH: offlineBinDir() };
    const releaseLine = `^${PACKAGE_VERSIONS["@canonical/summon-application"]}`;

    // (1) The shipped runtime: plain node running the BUILT summon bin, the
    // generators served from their built dist through `--generators`.
    const summonDir = freshCwd();
    const summonRun = spawnSync(
      join(env.PATH, "node"),
      [
        summonDistBin,
        "--generators",
        writeApplicationFixture(),
        "application",
        "react",
        "my-app",
        "--no-run-install",
        "--yes",
      ],
      { cwd: summonDir, stdio: "pipe", encoding: "utf-8", env, input: "" },
    );
    expect(summonRun.status, summonRun.stderr).toBe(0);
    // The fallback's own line proves npm was actually UNREACHABLE — without
    // it, a networked leak (node ships next to npm in most layouts) would
    // resolve the same `^`-shape and pass silently. Ink logs to stdout and
    // wraps at the render width, so the pin is the line's head.
    expect(summonRun.stdout).toContain(
      "Could not reach npm for the latest @canonical/* version;",
    );

    // (2) The compiled pragma binary under the SAME offline PATH.
    const compiledDir = freshCwd();
    const compiledRun = spawnSync(
      compiledBin,
      ["create", "application", "react", "my-app", "--no-run-install", "--yes"],
      { cwd: compiledDir, stdio: "pipe", encoding: "utf-8", env, input: "" },
    );
    expect(compiledRun.status, compiledRun.stderr).toBe(0);
    expect(compiledRun.stderr).toContain(
      `Could not reach npm for the latest @canonical/* version; ` +
        `pinning ${releaseLine} (from the installed generator).`,
    );

    // The node-run manifest pins the release line EXACTLY for every
    // @canonical dependency — `latest` (the shipped-runtime regression) and a
    // network-resolved newer range would both fail here.
    const summon = snapshot(summonDir);
    const manifest = JSON.parse(summon.get("my-app/package.json") ?? "{}") as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const canonicalDeps = Object.entries({
      ...manifest.dependencies,
      ...manifest.devDependencies,
    }).filter(([name]) => name.startsWith("@canonical/"));
    expect(canonicalDeps.length).toBeGreaterThan(0);
    for (const [name, range] of canonicalDeps) {
      expect(range, `range of ${name}`).toBe(releaseLine);
    }

    // Wrote something, same file set, byte-identical contents — the shipped
    // node runtime is not a second dialect of the compiled binary.
    const compiled = snapshot(compiledDir);
    expect(summon.size).toBeGreaterThan(0);
    expect([...summon.keys()].sort()).toEqual([...compiled.keys()].sort());
    for (const [path, content] of summon) {
      expect(compiled.get(path), `content of ${path}`).toBe(content);
    }
  }, 120_000);
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
