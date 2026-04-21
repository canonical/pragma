import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import readGlobalRefs from "./readGlobalRefs.js";

describe("readGlobalRefs", () => {
  let tmpDir: string;
  const origEnv = { ...process.env };

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pragma-global-refs-"));
    // Point XDG_CONFIG_HOME to our temp dir so globalConfigDir() resolves there
    process.env.XDG_CONFIG_HOME = tmpDir;
  });

  afterEach(() => {
    process.env = { ...origEnv };
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty array when refs.json does not exist", () => {
    expect(readGlobalRefs()).toEqual([]);
  });

  it("returns empty array when refs.json is malformed JSON", () => {
    const dir = join(tmpDir, "pragma");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "refs.json"), "{bad json");
    expect(readGlobalRefs()).toEqual([]);
  });

  it("returns empty array when packages field is missing", () => {
    const dir = join(tmpDir, "pragma");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "refs.json"), "{}");
    expect(readGlobalRefs()).toEqual([]);
  });

  it("returns empty array when packages is not an array", () => {
    const dir = join(tmpDir, "pragma");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "refs.json"),
      JSON.stringify({ packages: "not-array" }),
    );
    expect(readGlobalRefs()).toEqual([]);
  });

  it("returns packages array from valid refs.json", () => {
    const dir = join(tmpDir, "pragma");
    mkdirSync(dir, { recursive: true });
    const packages = [
      "@canonical/design-system",
      {
        name: "@canonical/code-standards",
        source: "file:///home/user/code/code-standards",
      },
    ];
    writeFileSync(join(dir, "refs.json"), JSON.stringify({ packages }));
    expect(readGlobalRefs()).toEqual(packages);
  });
});
