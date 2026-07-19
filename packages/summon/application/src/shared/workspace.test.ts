import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findEnclosingWorkspaceRoot } from "./workspace.js";

/**
 * Real-filesystem fixtures: the helper walks the actual disk (the app path
 * may not exist yet), so each test builds a throwaway tree under os.tmpdir()
 * — which itself must not live inside any workspace for the walk to
 * terminate cleanly at "standalone".
 */

let fixtureRoot: string | null = null;

function createFixture(): string {
  fixtureRoot = mkdtempSync(path.join(tmpdir(), "summon-workspace-"));
  return fixtureRoot;
}

function writeManifest(directory: string, manifest: unknown): void {
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "package.json"), JSON.stringify(manifest));
}

afterEach(() => {
  if (fixtureRoot !== null) {
    rmSync(fixtureRoot, { recursive: true, force: true });
    fixtureRoot = null;
  }
});

describe("findEnclosingWorkspaceRoot", () => {
  it("returns the root whose globs cover the app directory", () => {
    const root = createFixture();
    writeManifest(root, { name: "ws", workspaces: ["apps/*"] });
    expect(findEnclosingWorkspaceRoot(path.join(root, "apps", "my-app"))).toBe(
      root,
    );
  });

  it("returns null when no glob covers the path", () => {
    const root = createFixture();
    writeManifest(root, { name: "ws", workspaces: ["apps/*"] });
    // One directory level too deep for `apps/*`.
    expect(
      findEnclosingWorkspaceRoot(path.join(root, "apps", "nested", "my-app")),
    ).toBeNull();
    // A sibling tree the globs never mention.
    expect(
      findEnclosingWorkspaceRoot(path.join(root, "packages", "my-app")),
    ).toBeNull();
  });

  it("returns null when no ancestor declares workspaces", () => {
    const root = createFixture();
    writeManifest(root, { name: "plain-package" });
    expect(
      findEnclosingWorkspaceRoot(path.join(root, "apps", "my-app")),
    ).toBeNull();
  });

  it("accepts the object form { packages: [...] }", () => {
    const root = createFixture();
    writeManifest(root, {
      name: "ws",
      workspaces: { packages: ["packages/*"] },
    });
    expect(
      findEnclosingWorkspaceRoot(path.join(root, "packages", "my-app")),
    ).toBe(root);
  });

  it("matches ** across multiple segments (zero or more)", () => {
    const root = createFixture();
    writeManifest(root, { name: "ws", workspaces: ["apps/**"] });
    expect(
      findEnclosingWorkspaceRoot(path.join(root, "apps", "react", "my-app")),
    ).toBe(root);
    // Standard globstar: `**` also matches zero segments, so `apps/**`
    // covers `apps` itself…
    expect(findEnclosingWorkspaceRoot(path.join(root, "apps"))).toBe(root);
    // …but never a sibling tree.
    expect(
      findEnclosingWorkspaceRoot(path.join(root, "packages", "my-app")),
    ).toBeNull();
  });

  it("walks past an intermediate package.json without workspaces", () => {
    const root = createFixture();
    writeManifest(root, { name: "ws", workspaces: ["apps/*/nested"] });
    writeManifest(path.join(root, "apps", "member"), { name: "member" });
    expect(
      findEnclosingWorkspaceRoot(path.join(root, "apps", "member", "nested")),
    ).toBe(root);
  });

  it("never treats the app directory as its own enclosing root", () => {
    const root = createFixture();
    const appDirectory = path.join(root, "my-app");
    // The app itself is a workspace root — patches resolve from the app, so
    // for emission purposes it is standalone.
    writeManifest(appDirectory, { name: "app", workspaces: ["packages/*"] });
    expect(findEnclosingWorkspaceRoot(appDirectory)).toBeNull();
  });

  it("skips a malformed ancestor package.json without crashing", () => {
    const root = createFixture();
    writeManifest(root, { name: "ws", workspaces: ["apps/*/sub"] });
    const middle = path.join(root, "apps", "broken");
    mkdirSync(middle, { recursive: true });
    writeFileSync(path.join(middle, "package.json"), "{ not json");
    expect(findEnclosingWorkspaceRoot(path.join(middle, "sub"))).toBe(root);
  });

  it("covers the pragma-style layout: apps/react/* matches, deeper paths do not", () => {
    const root = createFixture();
    writeManifest(root, {
      name: "ws",
      workspaces: ["packages/*", "packages/summon/*", "apps/react/*"],
    });
    expect(
      findEnclosingWorkspaceRoot(path.join(root, "apps", "react", "tmp-smoke")),
    ).toBe(root);
    // Where the generator's own unit tests scaffold to: not a member.
    expect(
      findEnclosingWorkspaceRoot(
        path.join(root, "packages", "summon", "application", "my-app"),
      ),
    ).toBeNull();
  });
});
