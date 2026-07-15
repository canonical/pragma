import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import readPackageDir from "./readPackageDir.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pragma-readpkg-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Write a package.json into the temp package root. */
function writeManifest(manifest: unknown): void {
  writeFileSync(join(dir, "package.json"), JSON.stringify(manifest), "utf-8");
}

describe("readPackageDir — prefixes", () => {
  it("reads package-declared prefixes from package.json pragma.prefixes", () => {
    writeManifest({
      version: "1.2.3",
      pragma: { prefixes: { ds: "https://ds.canonical.com/" } },
    });
    const { version, prefixes } = readPackageDir(dir);
    expect(version).toBe("1.2.3");
    expect(prefixes).toEqual({ ds: "https://ds.canonical.com/" });
  });

  it("omits prefixes when the package declares none", () => {
    writeManifest({ version: "1.0.0" });
    expect(readPackageDir(dir).prefixes).toBeUndefined();
  });

  it("ignores a malformed pragma.prefixes field", () => {
    writeManifest({ version: "1.0.0", pragma: { prefixes: "not-an-object" } });
    expect(readPackageDir(dir).prefixes).toBeUndefined();
  });

  it("keeps only string-valued prefix entries", () => {
    writeManifest({
      version: "1.0.0",
      pragma: { prefixes: { ds: "https://ds.canonical.com/", bad: 42 } },
    });
    expect(readPackageDir(dir).prefixes).toEqual({
      ds: "https://ds.canonical.com/",
    });
  });

  it("returns a default version and no prefixes when package.json is absent", () => {
    const contents = readPackageDir(dir);
    expect(contents.version).toBe("0.0.0");
    expect(contents.prefixes).toBeUndefined();
  });
});
