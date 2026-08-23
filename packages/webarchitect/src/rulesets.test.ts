import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUNDLED_RULESETS_DIR } from "./constants.js";
import validate from "./validate.js";

interface ScriptsSchema {
  properties?: Record<string, unknown>;
  if?: { required?: string[] };
  then?: { required?: string[] };
}

interface FileRuleSection {
  file?: {
    name?: string;
    contains?: { properties?: { scripts?: ScriptsSchema } };
  };
}

describe("shipped rulesets — the build:all convention", () => {
  it("every package.json scripts schema ties build to build:all", () => {
    let scriptsSchemasSeen = 0;
    for (const entry of readdirSync(BUNDLED_RULESETS_DIR)) {
      if (!entry.endsWith(".ruleset.json")) continue;
      const ruleset = JSON.parse(
        readFileSync(join(BUNDLED_RULESETS_DIR, entry), "utf8"),
      ) as Record<string, unknown>;
      for (const section of Object.values(ruleset)) {
        if (typeof section !== "object" || section === null) continue;
        const { file } = section as FileRuleSection;
        if (file?.name !== "package.json") continue;
        const scripts = file.contains?.properties?.scripts;
        if (!scripts) continue;
        scriptsSchemasSeen += 1;
        // if/then, not 2020-12's dependentRequired — the engine is ajv's
        // draft-07 class, which silently ignores unknown keywords.
        expect(
          scripts.if?.required,
          `${entry}: the build:all rule must condition on build`,
        ).toEqual(["build"]);
        expect(
          scripts.then?.required,
          `${entry}: a scripts schema must require build:all whenever build exists`,
        ).toEqual(["build:all"]);
        expect(
          scripts.properties?.["build:all"],
          `${entry}: build:all must be a described property`,
        ).toBeDefined();
      }
    }
    // package, tool-ts, and package-svelte carry scripts schemas today; a
    // future ruleset may add more, but the sweep must never match nothing.
    expect(scriptsSchemasSeen).toBeGreaterThanOrEqual(3);
  });

  describe("enforced through validate()", () => {
    let tmp: string;

    beforeEach(() => {
      tmp = join(tmpdir(), `webarchitect-rulesets-${Date.now()}`);
      mkdirSync(tmp, { recursive: true });
      vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      rmSync(tmp, { recursive: true, force: true });
      vi.restoreAllMocks();
    });

    const scripts: Record<string, string> = {
      build: "tsc -p tsconfig.build.json",
      test: "vitest run",
      "check:ts": "tsc --noEmit",
    };
    const fixture = {
      name: "@canonical/fixture",
      version: "1.0.0",
      type: "module",
      module: "dist/esm/index.js",
      types: "dist/types/index.d.ts",
      files: ["dist"],
      scripts,
    };

    it("build without build:all fails package-structure; adding it passes", async () => {
      writeFileSync(
        join(tmp, "biome.json"),
        JSON.stringify({ extends: ["@canonical/biome-config"] }),
      );
      writeFileSync(join(tmp, "package.json"), JSON.stringify(fixture));
      let results = await validate(tmp, "package");
      expect(results.find((r) => r.rule === "package-structure")?.passed).toBe(
        false,
      );

      writeFileSync(
        join(tmp, "package.json"),
        JSON.stringify({
          ...fixture,
          scripts: { ...scripts, "build:all": "bun run build" },
        }),
      );
      results = await validate(tmp, "package");
      expect(results.find((r) => r.rule === "package-structure")?.passed).toBe(
        true,
      );
    });
  });
});
