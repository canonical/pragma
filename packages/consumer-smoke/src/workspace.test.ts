/**
 * Tests for workspace enumeration, against a throwaway on-disk fixture tree
 * (mkdtemp under os.tmpdir()) instead of this repo's real workspaces — the
 * glob expansion, skip rules, dedup, and manifest classification are what is
 * under test, not the repo's current package list.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  findRepoRoot,
  getPublishablePackages,
  getWorkspacePackages,
} from "./workspace.js";

const fixtureRoots: string[] = [];

afterEach(() => {
  for (const dir of fixtureRoots.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A fresh fixture root with lerna.json and the given root `workspaces`. */
function makeFixtureRoot(workspaces: string[]): string {
  const root = mkdtempSync(join(tmpdir(), "consumer-smoke-workspace-"));
  fixtureRoots.push(root);
  writeFileSync(join(root, "lerna.json"), JSON.stringify({ version: "0.0.0" }));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "fixture-root", private: true, workspaces }),
  );
  return root;
}

function addPackage(
  root: string,
  relDir: string,
  manifest: Record<string, unknown> | string,
): void {
  const dir = join(root, relDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    typeof manifest === "string" ? manifest : JSON.stringify(manifest),
  );
}

describe("getWorkspacePackages", () => {
  test("expands literal and * patterns, sorted by name, with forward-slash relDir", () => {
    const root = makeFixtureRoot(["tools/cli", "packages/react/*"]);
    addPackage(root, "tools/cli", { name: "@fixture/cli", version: "1.2.3" });
    addPackage(root, "packages/react/zeta", {
      name: "@fixture/zeta",
      version: "0.1.0",
    });
    addPackage(root, "packages/react/alpha", {
      name: "@fixture/alpha",
      version: "0.2.0",
    });

    const packages = getWorkspacePackages(root);
    expect(packages.map((pkg) => pkg.name)).toEqual([
      "@fixture/alpha",
      "@fixture/cli",
      "@fixture/zeta",
    ]);
    expect(packages.map((pkg) => pkg.relDir)).toEqual([
      "packages/react/alpha",
      "tools/cli",
      "packages/react/zeta",
    ]);
    expect(packages[1]?.dir).toBe(join(root, "tools/cli"));
    expect(packages[1]?.version).toBe("1.2.3");
  });

  test("* expansion skips node_modules and dot-directories", () => {
    const root = makeFixtureRoot(["packages/*"]);
    addPackage(root, "packages/real", { name: "@fixture/real" });
    addPackage(root, "packages/node_modules", { name: "@fixture/stowaway" });
    addPackage(root, "packages/.hidden", { name: "@fixture/hidden" });

    expect(getWorkspacePackages(root).map((pkg) => pkg.name)).toEqual([
      "@fixture/real",
    ]);
  });

  test("overlapping patterns yield each package exactly once (seen-set dedup)", () => {
    const root = makeFixtureRoot([
      "packages/react/ds-core",
      "packages/react/*",
    ]);
    addPackage(root, "packages/react/ds-core", { name: "@fixture/ds-core" });

    const packages = getWorkspacePackages(root);
    expect(packages).toHaveLength(1);
    expect(packages[0]?.relDir).toBe("packages/react/ds-core");
  });

  test("skips dirs with a missing, invalid, or name-less package.json", () => {
    const root = makeFixtureRoot(["packages/*"]);
    addPackage(root, "packages/valid", { name: "@fixture/valid" });
    mkdirSync(join(root, "packages/no-manifest"), { recursive: true });
    addPackage(root, "packages/bad-json", "{ not json");
    addPackage(root, "packages/no-name", { version: "1.0.0" });
    addPackage(root, "packages/numeric-name", { name: 42 });

    expect(getWorkspacePackages(root).map((pkg) => pkg.name)).toEqual([
      "@fixture/valid",
    ]);
  });

  test('coerces a missing/non-string version to "" and non-true private to false', () => {
    const root = makeFixtureRoot(["packages/*"]);
    addPackage(root, "packages/versionless", {
      name: "@fixture/versionless",
      private: "yes", // not boolean true → publishable
    });

    const [pkg] = getWorkspacePackages(root);
    expect(pkg?.version).toBe("");
    expect(pkg?.private).toBe(false);
  });

  test("a nonexistent literal pattern contributes nothing", () => {
    const root = makeFixtureRoot(["packages/absent", "packages/*"]);
    addPackage(root, "packages/real", { name: "@fixture/real" });

    expect(getWorkspacePackages(root)).toHaveLength(1);
  });

  test("throws loudly on an unsupported pattern shape like packages/foo*", () => {
    const root = makeFixtureRoot(["packages/foo*"]);
    addPackage(root, "packages/foo-bar", { name: "@fixture/foo-bar" });

    expect(() => getWorkspacePackages(root)).toThrow(
      /unsupported workspace pattern "packages\/foo\*"/,
    );
  });
});

describe("getPublishablePackages", () => {
  test("excludes packages with private: true", () => {
    const root = makeFixtureRoot(["packages/*"]);
    addPackage(root, "packages/public", { name: "@fixture/public" });
    addPackage(root, "packages/secret", {
      name: "@fixture/secret",
      private: true,
    });

    expect(getWorkspacePackages(root)).toHaveLength(2);
    expect(getPublishablePackages(root).map((pkg) => pkg.name)).toEqual([
      "@fixture/public",
    ]);
  });
});

describe("findRepoRoot", () => {
  test("walks upwards to the directory containing lerna.json", () => {
    const root = makeFixtureRoot([]);
    const nested = join(root, "packages/deeply/nested");
    mkdirSync(nested, { recursive: true });

    expect(findRepoRoot(nested)).toBe(root);
    expect(findRepoRoot(root)).toBe(root);
  });

  test("throws when no lerna.json exists on the way to the filesystem root", () => {
    const orphan = mkdtempSync(join(tmpdir(), "consumer-smoke-no-root-"));
    fixtureRoots.push(orphan);

    expect(() => findRepoRoot(orphan)).toThrow(
      /could not locate the repo root/,
    );
  });
});
