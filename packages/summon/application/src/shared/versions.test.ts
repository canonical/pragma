import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ownVersion, readVersion } from "./versions.js";

const SEMVER = /^\d+\.\d+\.\d+/;

describe("versions", () => {
  it("resolves this generator's own version from its manifest", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
    ) as { version: string };

    expect(ownVersion()).toBe(manifest.version);
  });

  it("resolves an installed package's version without a ./package.json export", () => {
    // require("<pkg>/package.json") throws ERR_PACKAGE_PATH_NOT_EXPORTED for
    // every workspace package; the resolve-and-walk path must still answer.
    expect(readVersion("@canonical/summon-core")).toMatch(SEMVER);
    expect(readVersion("@canonical/task")).toMatch(SEMVER);
  });

  it('answers "unknown" for a package that is not installed', () => {
    expect(readVersion("@canonical/definitely-not-installed")).toBe("unknown");
  });
});
