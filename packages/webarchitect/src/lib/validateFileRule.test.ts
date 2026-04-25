import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import validateFileRule from "./validateFileRule.js";

describe("validateFileRule", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(tmpdir(), `webarchitect-file-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("passes when file matches schema", async () => {
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({ name: "test", version: "1.0.0" }),
    );
    const results = await validateFileRule(
      tmp,
      {
        name: "package.json",
        contains: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string" } },
        },
      },
      "pkg",
    );
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(true);
  });

  it("fails when file content violates schema", async () => {
    writeFileSync(join(tmp, "config.json"), JSON.stringify({ name: 42 }));
    const results = await validateFileRule(
      tmp,
      {
        name: "config.json",
        contains: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      },
      "cfg",
    );
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(false);
    expect(results[0].message).toContain("Validation failed");
  });

  it("soft-fails when file not found", async () => {
    const results = await validateFileRule(
      tmp,
      { name: "missing.json", contains: { type: "object" } },
      "missing",
    );
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(false);
    expect(results[0].message).toContain("File not found");
  });

  it("throws on invalid JSON", async () => {
    writeFileSync(join(tmp, "bad.json"), "not json{");
    await expect(
      validateFileRule(
        tmp,
        { name: "bad.json", contains: { type: "object" } },
        "bad",
      ),
    ).rejects.toThrow("Invalid JSON");
  });

  it("throws on directory instead of file", async () => {
    mkdirSync(join(tmp, "adir"));
    await expect(
      validateFileRule(
        tmp,
        { name: "adir", contains: { type: "object" } },
        "dir-as-file",
      ),
    ).rejects.toThrow("Expected file but found directory");
  });

  it("includes context in result", async () => {
    writeFileSync(join(tmp, "data.json"), JSON.stringify({ ok: true }));
    const results = await validateFileRule(
      tmp,
      { name: "data.json", contains: { type: "object" } },
      "data",
    );
    expect(results[0].context).toBeDefined();
    expect(results[0].context?.type).toBe("file");
    expect(results[0].context?.target).toBe(join(tmp, "data.json"));
    expect(results[0].context?.value).toEqual({ ok: true });
  });
});
