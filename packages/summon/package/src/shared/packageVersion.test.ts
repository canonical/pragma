import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { setEmbeddedPackageVersions } from "@canonical/summon-core";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import pkg from "../../package.json" with { type: "json" };
import {
  findOwnVersion,
  packageVersion,
  resolveOwnVersion,
} from "./packageVersion.js";

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

  it("falls back to the host-injected version when the walk exhausts (/$bunfs)", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "own-version-embedded-"));
    setEmbeddedPackageVersions({ "@canonical/summon-package": "9.9.9" });
    expect(resolveOwnVersion(dir)).toBe("9.9.9");
  });

  it("still throws the walk's error when nothing was injected", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "own-version-none-"));
    expect(() => resolveOwnVersion(dir)).toThrow(
      /no package\.json naming @canonical\/summon-package/,
    );
  });
});
