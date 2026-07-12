import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RawPackageEntry } from "../refs/operations/parseRef.js";
import { mergeAndParseRefs } from "./mergeAndParseRefs.js";
import { DEFAULT_PACKAGES } from "./packages.js";

const DEFAULT_NAMES = DEFAULT_PACKAGES.map((entry) =>
  typeof entry === "string" ? entry : entry.name,
);

function writeGlobalRefs(
  xdgDir: string,
  packages: ReadonlyArray<RawPackageEntry>,
): void {
  const dir = join(xdgDir, "pragma");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "refs.json"), JSON.stringify({ packages }));
}

describe("mergeAndParseRefs", () => {
  let tmpDir: string;
  const origEnv = { ...process.env };

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pragma-merge-refs-"));
    // Point XDG_CONFIG_HOME to our temp dir so readGlobalRefs() resolves there
    process.env.XDG_CONFIG_HOME = tmpDir;
  });

  afterEach(() => {
    process.env = { ...origEnv };
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns parsed defaults when config and global refs are absent", () => {
    const refs = mergeAndParseRefs(undefined);
    expect(refs.map((ref) => ref.pkg)).toEqual(DEFAULT_NAMES);
    expect(refs.every((ref) => ref.kind === "git")).toBe(true);
  });

  it("treats an explicitly empty config list as not configured", () => {
    expect(mergeAndParseRefs([])).toEqual(mergeAndParseRefs(undefined));
  });

  it("falls back to global refs when the config list is empty", () => {
    writeGlobalRefs(tmpDir, [
      { name: "@canonical/design-system", source: "file:///tmp/ds" },
    ]);

    const refs = mergeAndParseRefs([]);

    expect(refs.map((ref) => ref.pkg)).toEqual(DEFAULT_NAMES);
    expect(refs.at(0)).toEqual({
      kind: "file",
      pkg: "@canonical/design-system",
      path: "/tmp/ds",
    });
  });

  it("merges global refs over defaults by package name", () => {
    writeGlobalRefs(tmpDir, [
      { name: "@canonical/design-system", source: "file:///tmp/ds" },
      "@acme/extra",
    ]);

    const refs = mergeAndParseRefs(undefined);

    expect(refs.map((ref) => ref.pkg)).toEqual([
      ...DEFAULT_NAMES,
      "@acme/extra",
    ]);
    expect(refs.at(0)?.kind).toBe("file");
    expect(refs.at(-1)).toEqual({ kind: "npm", pkg: "@acme/extra" });
  });

  it("replaces defaults and global refs with a non-empty config list", () => {
    writeGlobalRefs(tmpDir, ["@acme/global-only"]);

    const refs = mergeAndParseRefs([
      { name: "@acme/only", source: "file:///tmp/only" },
    ]);

    expect(refs).toEqual([
      { kind: "file", pkg: "@acme/only", path: "/tmp/only" },
    ]);
  });
});
