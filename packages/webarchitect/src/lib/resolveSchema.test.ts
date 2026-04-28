import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import resolveSchema from "./resolveSchema.js";

describe("resolveSchema", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(tmpdir(), `webarchitect-resolve-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("loads schema from local .ruleset.json file", async () => {
    const schema = { name: "test-local" };
    const path = join(tmp, "local.ruleset.json");
    writeFileSync(path, JSON.stringify(schema));
    const result = await resolveSchema(path);
    expect(result.name).toBe("test-local");
  });

  it("loads schema from local .json file", async () => {
    const schema = { name: "test-json" };
    const path = join(tmp, "local.json");
    writeFileSync(path, JSON.stringify(schema));
    const result = await resolveSchema(path);
    expect(result.name).toBe("test-json");
  });

  it("appends .ruleset.json when no extension", async () => {
    const schema = { name: "test-no-ext" };
    writeFileSync(join(tmp, "myschema.ruleset.json"), JSON.stringify(schema));
    const result = await resolveSchema(join(tmp, "myschema"));
    expect(result.name).toBe("test-no-ext");
  });

  it("falls back to bundled rulesets", async () => {
    const result = await resolveSchema("base");
    expect(result.name).toBe("base");
  });

  it("throws when schema not found locally or bundled", async () => {
    await expect(
      resolveSchema("nonexistent-schema-that-does-not-exist"),
    ).rejects.toThrow("Could not find ruleset");
  });

  it("throws when schema fails validation", async () => {
    // Write a file that is valid JSON but not a valid schema
    const path = join(tmp, "invalid.ruleset.json");
    writeFileSync(path, JSON.stringify({ notAValidSchema: true }));
    await expect(resolveSchema(path)).rejects.toThrow("Invalid ruleset");
  });

  it("loads schema from URL", async () => {
    const schema = { name: "remote" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(schema),
      }),
    );
    const result = await resolveSchema("https://example.com/schema.json");
    expect(result.name).toBe("remote");
    vi.unstubAllGlobals();
  });

  it("loads schema from http URL", async () => {
    const schema = { name: "http-remote" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(schema),
      }),
    );
    const result = await resolveSchema("http://example.com/schema.json");
    expect(result.name).toBe("http-remote");
    vi.unstubAllGlobals();
  });

  it("error message includes available bundled rulesets", async () => {
    await expect(resolveSchema("nonexistent-schema-xyz-abc")).rejects.toThrow(
      /Could not find ruleset.*Available bundled rulesets/s,
    );
  });
});

describe("resolveSchema validation edge cases (mocked ajv)", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(tmpdir(), `webarchitect-resolve-edge-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
    vi.resetModules();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    vi.doUnmock("./ajv.js");
    vi.restoreAllMocks();
  });

  it("uses fallback message when AJV error has no message", async () => {
    const mockValidate = Object.assign(() => false, {
      errors: [{ instancePath: "/bad", message: undefined }],
    });
    vi.doMock("./ajv.js", () => ({
      default: { compile: vi.fn().mockReturnValue(mockValidate) },
    }));
    const schemaPath = join(tmp, "edge.ruleset.json");
    writeFileSync(schemaPath, JSON.stringify({ name: "edge" }));
    const { default: fn } = await import("./resolveSchema.js");
    await expect(fn(schemaPath)).rejects.toThrow("validation failed");
  });

  it("handles null validateSchema.errors gracefully", async () => {
    const mockValidate = Object.assign(() => false, {
      errors: null,
    });
    vi.doMock("./ajv.js", () => ({
      default: { compile: vi.fn().mockReturnValue(mockValidate) },
    }));
    const schemaPath = join(tmp, "null-errors.ruleset.json");
    writeFileSync(schemaPath, JSON.stringify({ name: "null-errors" }));
    const { default: fn } = await import("./resolveSchema.js");
    await expect(fn(schemaPath)).rejects.toThrow("Invalid ruleset");
  });
});
