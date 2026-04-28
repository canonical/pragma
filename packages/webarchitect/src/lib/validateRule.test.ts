import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import validateRule from "./validateRule.js";

describe("validateRule", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(tmpdir(), `webarchitect-rule-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("dispatches file rules to validateFileRule", async () => {
    writeFileSync(join(tmp, "test.json"), JSON.stringify({ ok: true }));
    const results = await validateRule(
      tmp,
      { file: { name: "test.json", contains: { type: "object" } } },
      "file-rule",
    );
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(true);
  });

  it("dispatches directory rules to validateDirectoryRule", async () => {
    mkdirSync(join(tmp, "src"));
    const results = await validateRule(
      tmp,
      { directory: { name: "src" } },
      "dir-rule",
    );
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("dir-rule");
    expect(results[0].passed).toBe(true);
  });

  it("throws for invalid rule type", async () => {
    await expect(validateRule(tmp, {} as any, "bad-rule")).rejects.toThrow(
      "Invalid rule type",
    );
  });
});
