import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setEmbeddedPackageVersions } from "@canonical/summon-core";
import type { Effect, ExecResult } from "@canonical/task";
import { dryRunWith } from "@canonical/task";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readVersion, resolvePragmaVersion } from "./versions.js";

/**
 * A pass-through `node:fs` mock the `/$bunfs` case flips on: while
 * `interceptReads` is set, every `readFileSync` in this file's module graph
 * records its path and serves a DECOY manifest — simulating the hijacked
 * host where the walk's real-filesystem probes resolve. Off (the default),
 * reads pass through untouched for every other case.
 */
const fsControl = vi.hoisted(() => ({
  interceptReads: false,
  reads: [] as unknown[],
}));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    readFileSync: ((...args: Parameters<typeof actual.readFileSync>) => {
      if (fsControl.interceptReads) {
        fsControl.reads.push(args[0]);
        return JSON.stringify({
          name: "@canonical/summon-application",
          version: "7.7.7",
        });
      }
      return actual.readFileSync(...args);
    }) as typeof actual.readFileSync,
  };
});

/**
 * The workspace manifest, read by PATH (a sibling walk of the one the module
 * performs) — the tree-side expectation comes from here rather than a
 * hardcoded literal. Deliberately not a `require("…/package.json")`: neither
 * production manifest this module resolves exposes a `"./package.json"`
 * subpath in its exports map, so the subpath require throws under plain
 * Node — the very divergence the walk exists to close.
 */
const here = dirname(fileURLToPath(import.meta.url));
const manifestVersion = (manifestPath: string): string =>
  (JSON.parse(readFileSync(manifestPath, "utf-8")) as { version: string })
    .version;

/**
 * The precedence contract, mirrored from summon-package's `resolveOwnVersion`:
 * the installed tree first, the host-injected embedded store second,
 * `"unknown"` last. The cases pin the PRODUCTION names — the walk reads
 * manifests off disk with no `exports` gate, so the pins hold under node and
 * bun alike (the old require-subpath tier resolved these names only under
 * bun, which is how the shipped node runtime silently lost the tree tier).
 */
describe("readVersion (the compiled-binary fallback)", () => {
  afterEach(() => {
    setEmbeddedPackageVersions({});
  });

  it("resolves the generator's OWN name from the tree — a decoy injection must not shadow it", () => {
    // The workspace manifest two levels above this file — what the walk's
    // ancestor-package.json probe must find from src/ and dist/esm/ alike.
    const installed = manifestVersion(resolve(here, "../../package.json"));
    expect(installed).not.toBe("9.9.9");
    setEmbeddedPackageVersions({ "@canonical/summon-application": "9.9.9" });
    expect(readVersion("@canonical/summon-application")).toBe(installed);
  });

  it("resolves an installed DEPENDENCY from the tree via the node_modules probe — injection still must not shadow", () => {
    setEmbeddedPackageVersions({ "@canonical/summon-core": "9.9.9" });
    const version = readVersion("@canonical/summon-core");
    // Layout-agnostic on purpose (the link may live at any ancestor's
    // node_modules): the pin is that the TREE answered — a real semver that
    // is neither the decoy nor the terminal degradation.
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(version).not.toBe("9.9.9");
  });

  it("falls back to the host-injected version when the walk finds no manifest (/$bunfs)", () => {
    setEmbeddedPackageVersions({ "@canonical/summon-nonexistent": "9.9.9" });
    expect(readVersion("@canonical/summon-nonexistent")).toBe("9.9.9");
  });

  it("positive control: the mock DOES intercept this module's walk — a plain anchor is served the decoy", () => {
    // Without this cell, the /$bunfs assertions below are satisfiable by an
    // INERT mock: `reads` is written only by the mock, and on a decoy-free
    // host the unguarded walk exhausts into the same store answer — so a
    // refactor moving the walk off `readFileSync` (openSync/readSync,
    // node:fs/promises) would silently disarm the guard's only pin. With
    // interception ON, a real tmpdir anchor must resolve the decoy AND
    // record the probe, proving the mock reaches the walk it claims to.
    const anchor = mkdtempSync(join(tmpdir(), "versions-control-"));
    fsControl.reads.length = 0;
    fsControl.interceptReads = true;
    try {
      expect(readVersion("@canonical/summon-application", anchor)).toBe(
        "7.7.7",
      );
      expect(fsControl.reads.length).toBeGreaterThan(0);
    } finally {
      fsControl.interceptReads = false;
    }
  });

  it("refuses to walk from a /$bunfs anchor — no real-filesystem probe, the store serves the compiled host", () => {
    // The walk's parent chain from `/$bunfs/root` LEAVES the virtual
    // filesystem (`/$bunfs` → `/`), where `/node_modules/<name>/package.json`
    // is a REAL path a host-level decoy could serve (measured hijack: a
    // transient root-level decoy re-pinned the shipped binary). The fs mock
    // simulates that hijacked host — every probe would resolve the decoy —
    // so the guard must return the injected build-time version WITHOUT
    // reading anything.
    fsControl.reads.length = 0;
    fsControl.interceptReads = true;
    try {
      setEmbeddedPackageVersions({ "@canonical/summon-application": "1.1.1" });
      expect(readVersion("@canonical/summon-application", "/$bunfs/root")).toBe(
        "1.1.1",
      );
      expect(fsControl.reads).toEqual([]);
    } finally {
      fsControl.interceptReads = false;
    }
  });

  it('degrades to "unknown" when neither the tree nor an injection knows the name', () => {
    expect(readVersion("@canonical/summon-nonexistent")).toBe("unknown");
  });
});

/**
 * The registry tier, driven deterministically: interpret the Task with a
 * stubbed `Exec` result (the `dryRunWith` seam sibling task-based tests use,
 * e.g. summon-package's detectMonorepo), so the SUCCESS branch — tier 1, the
 * module's documented primary strategy — is pinned without a real registry.
 * Both offline subprocess cells are green precisely when tier 1 does NOT
 * run; only this describe fails when the tier dies uniformly (a changed
 * `exec` spawn shape, a drifted `npm view` output format, a broken SEMVER
 * parse).
 */
describe("resolvePragmaVersion (the registry tier)", () => {
  const runWithExec = (result: ExecResult) =>
    dryRunWith(
      resolvePragmaVersion(),
      new Map<string, (effect: Effect) => unknown>([["Exec", () => result]]),
    );

  const logLines = (effects: readonly Effect[]): string[] =>
    effects.flatMap((effect) =>
      effect._tag === "Log" ? [effect.message] : [],
    );

  // The offline fallback is the installed generator's own release line —
  // the workspace manifest, read the same way the tree-tier cases read it.
  const releaseLine = `^${manifestVersion(resolve(here, "../../package.json"))}`;

  it("pins ^<latest> and logs the registry line when npm answers a semver", () => {
    const result = runWithExec({ stdout: "1.2.3\n", stderr: "", exitCode: 0 });
    expect(result.value).toBe("^1.2.3");
    expect(logLines(result.effects)).toContain(
      "Pinning @canonical/* packages to ^1.2.3 (latest on npm).",
    );
  });

  it("falls back to the release line on a nonzero exit", () => {
    const result = runWithExec({ stdout: "", stderr: "boom", exitCode: 1 });
    expect(result.value).toBe(releaseLine);
    expect(logLines(result.effects)).toContain(
      `Could not reach npm for the latest @canonical/* version; ` +
        `pinning ${releaseLine} (from the installed generator).`,
    );
  });

  it("falls back to the release line on unparseable output", () => {
    const result = runWithExec({
      stdout: "not-a-version\n",
      stderr: "",
      exitCode: 0,
    });
    expect(result.value).toBe(releaseLine);
    expect(logLines(result.effects)).toContain(
      `Could not reach npm for the latest @canonical/* version; ` +
        `pinning ${releaseLine} (from the installed generator).`,
    );
  });
});
