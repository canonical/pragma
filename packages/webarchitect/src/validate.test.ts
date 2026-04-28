import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import validate from "./validate.js";

describe("validate", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(tmpdir(), `webarchitect-validate-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("validates a project against a schema", async () => {
    // Create a minimal project matching the base schema
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({
        name: "@canonical/test",
        version: "1.0.0",
        type: "module",
        license: "LGPL-3.0",
        scripts: {},
        author: { name: "Test", email: "test@test.com" },
        repository: { type: "git", url: "https://github.com/test/test" },
      }),
    );

    // Create a minimal schema that checks for package.json
    const schema = {
      name: "test-schema",
      "pkg-exists": {
        file: {
          name: "package.json",
          contains: {
            type: "object",
            required: ["name"],
            properties: { name: { type: "string" } },
          },
        },
      },
    };
    const schemaPath = join(tmp, "test.ruleset.json");
    writeFileSync(schemaPath, JSON.stringify(schema));

    const results = await validate(tmp, schemaPath);
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("pkg-exists");
    expect(results[0].passed).toBe(true);
  });

  it("returns failure results for invalid project", async () => {
    // Empty project with no package.json
    const schema = {
      name: "test-schema",
      "pkg-check": {
        file: {
          name: "package.json",
          contains: { type: "object" },
        },
      },
    };
    const schemaPath = join(tmp, "test.ruleset.json");
    writeFileSync(schemaPath, JSON.stringify(schema));

    const results = await validate(tmp, schemaPath);
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("pkg-check");
    expect(results[0].passed).toBe(false);
    expect(results[0].message).toContain("File not found");
  });
});
