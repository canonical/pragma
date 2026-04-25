import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Schema } from "../types.js";
import executeValidationRules from "./executeValidationRules.js";

describe("executeValidationRules", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(tmpdir(), `webarchitect-exec-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("skips meta-properties ($schema, name, extends)", async () => {
    const schema: Schema = {
      $schema: "http://example.com",
      name: "test-schema",
      extends: ["base"],
    };
    const results = await executeValidationRules(tmp, schema);
    expect(results).toEqual([]);
  });

  it("skips non-rule values", async () => {
    const schema = {
      name: "test",
      notARule: "string-value",
      alsoNotARule: 42,
    } as unknown as Schema;
    const results = await executeValidationRules(tmp, schema);
    expect(results).toEqual([]);
  });

  it("executes file rules", async () => {
    writeFileSync(join(tmp, "pkg.json"), JSON.stringify({ name: "x" }));
    const schema: Schema = {
      name: "test",
      "pkg-check": {
        file: {
          name: "pkg.json",
          contains: {
            type: "object",
            required: ["name"],
            properties: { name: { type: "string" } },
          },
        },
      },
    };
    const results = await executeValidationRules(tmp, schema);
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(true);
    expect(results[0].rule).toBe("pkg-check");
  });

  it("executes multiple rules in parallel", async () => {
    writeFileSync(join(tmp, "a.json"), JSON.stringify({ v: 1 }));
    writeFileSync(join(tmp, "b.json"), JSON.stringify({ v: 2 }));
    const schema: Schema = {
      name: "multi",
      "rule-a": { file: { name: "a.json", contains: { type: "object" } } },
      "rule-b": { file: { name: "b.json", contains: { type: "object" } } },
    };
    const results = await executeValidationRules(tmp, schema);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it("flattens nested results from directory rules", async () => {
    mkdirSync(join(tmp, "src"));
    writeFileSync(join(tmp, "src", "index.ts"), "");
    const schema: Schema = {
      name: "nested",
      "src-structure": {
        directory: { name: "src" },
      },
    };
    const results = await executeValidationRules(tmp, schema);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
