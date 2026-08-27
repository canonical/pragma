import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
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
