import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { setEmbeddedPackageVersions } from "@canonical/summon-core";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import pkg from "../../package.json" with { type: "json" };
import {
  findOwnVersion,
  packageVersion,
  resolveOwnVersion,
} from "./packageVersion.js";

/**
 * A pass-through `node:fs` mock the `/$bunfs` case flips on: while
 * `interceptReads` is set, every `readFileSync` in this file's module graph
 * records its path and serves a DECOY manifest naming THIS package —
 * simulating the hijacked host where the walk's real-filesystem probes
 * resolve (`/$bunfs/root` → `/$bunfs` → `/`, all REAL paths once the chain
 * leaves the virtual filesystem). Off (the default), reads pass through
 * untouched for every other case.
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
          name: "@canonical/summon-package",
          version: "7.7.7",
        });
      }
      return actual.readFileSync(...args);
    }) as typeof actual.readFileSync,
  };
});

const roots: string[] = [];
afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

describe("packageVersion", () => {
  it("returns this package's manifest version, from src and dist layouts alike", () => {
    // The cached entry point — and the regression this module exists to fix:
    // a `../../package.json` JSON import resolved correctly from `src/shared`
    // but not from the emitted `dist/esm/shared`, one level deeper. The walk
    // is depth-independent, so both layouts find the same manifest.
    expect(packageVersion()).toBe(pkg.version);
    expect(packageVersion()).toBe(pkg.version); // second call: the cache line
    const here = path.dirname(fileURLToPath(import.meta.url));
    expect(findOwnVersion(here)).toBe(pkg.version);
    const distEsmShared = path.resolve(here, "../..", "dist", "esm", "shared");
    expect(findOwnVersion(distEsmShared)).toBe(pkg.version);
  });

  it("walks past a manifest naming another package, and throws when the walk runs out", () => {
    // A decoy manifest must not satisfy the lookup — the workspace root's own
    // package.json is exactly such an ancestor in production.
    const root = mkdtempSync(path.join(tmpdir(), "summon-pkg-version-"));
    roots.push(root);
    const nested = path.join(root, "a", "b");
    mkdirSync(nested, { recursive: true });
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "not-this-package", version: "9.9.9" }),
    );
    expect(() => findOwnVersion(nested)).toThrow(
      /no package\.json naming @canonical\/summon-package/,
    );
  });

  it("walks past a manifest with the right name but no version", () => {
    const root = mkdtempSync(path.join(tmpdir(), "summon-pkg-version-"));
    roots.push(root);
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "@canonical/summon-package" }),
    );
    expect(() => findOwnVersion(root)).toThrow(/no package\.json naming/);
  });
});

describe("resolveOwnVersion (the compiled-binary fallback)", () => {
  afterEach(() => {
    setEmbeddedPackageVersions({});
  });

  it("prefers the disk walk when a manifest is reachable", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "own-version-disk-"));
    writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "@canonical/summon-package", version: "7.7.7" }),
    );
    setEmbeddedPackageVersions({ "@canonical/summon-package": "9.9.9" });
    expect(resolveOwnVersion(dir)).toBe("7.7.7");
  });

  it("positive control: the mock DOES intercept this module's walk — a plain anchor is served the decoy", () => {
    // Without this cell, the /$bunfs assertions below are satisfiable by an
    // INERT mock: `reads` is written only by the mock, and on a decoy-free
    // host the unguarded walk exhausts into the same store answer — so a
    // refactor moving the walk off `readFileSync` (openSync/readSync,
    // node:fs/promises) would silently disarm the guard's only pin. With
    // interception ON, a real tmpdir anchor must resolve the decoy AND
    // record the probe, proving the mock reaches the walk it claims to.
    const dir = mkdtempSync(path.join(tmpdir(), "own-version-control-"));
    fsControl.reads.length = 0;
    fsControl.interceptReads = true;
    try {
      expect(findOwnVersion(dir)).toBe("7.7.7");
      expect(fsControl.reads.length).toBeGreaterThan(0);
    } finally {
      fsControl.interceptReads = false;
    }
  });

  it("refuses to walk from a /$bunfs anchor — no real-filesystem probe, the store serves the compiled host", () => {
    // The walk's parent chain from `/$bunfs/root` LEAVES the virtual
    // filesystem (`/$bunfs` → `/`), where `/package.json` is a REAL path a
    // host-level decoy could serve (measured hijack: a transient root-level
    // decoy re-pinned the shipped binary's `create package` ranges). The fs
    // mock simulates that hijacked host — every probe would resolve the
    // decoy — so the guard must throw WITHOUT reading anything and the
    // injected build-time version must win.
    fsControl.reads.length = 0;
    fsControl.interceptReads = true;
    try {
      setEmbeddedPackageVersions({ "@canonical/summon-package": "1.1.1" });
      expect(resolveOwnVersion("/$bunfs/root")).toBe("1.1.1");
      expect(fsControl.reads).toEqual([]);
    } finally {
      fsControl.interceptReads = false;
    }
  });

  it("still throws the walk's error when nothing was injected", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "own-version-none-"));
    expect(() => resolveOwnVersion(dir)).toThrow(
      /no package\.json naming @canonical\/summon-package/,
    );
  });
});
