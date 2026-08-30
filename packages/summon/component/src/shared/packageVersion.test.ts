import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { findOwnVersion, packageVersion } from "./packageVersion.js";

describe("packageVersion", () => {
  it("resolves this package's own manifest version", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
    ) as { version: string };

    expect(packageVersion()).toBe(manifest.version);
  });

  it("throws when no ancestor names this package", () => {
    // tmpdir sits outside the workspace, so the walk exhausts its parents.
    expect(() => findOwnVersion(tmpdir())).toThrow(/no package\.json naming/);
  });
});
