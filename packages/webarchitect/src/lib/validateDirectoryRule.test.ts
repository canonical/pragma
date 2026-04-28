import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import validateDirectoryRule from "./validateDirectoryRule.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, stat: vi.fn().mockImplementation(actual.stat) };
});

const mockStat = stat as unknown as MockInstance;

describe("validateDirectoryRule", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(tmpdir(), `webarchitect-dir-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("passes when directory exists and has no rules", async () => {
    mkdirSync(join(tmp, "src"));
    const results = await validateDirectoryRule(
      tmp,
      { name: "src" },
      "src-dir",
    );
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("src-dir");
    expect(results[0].passed).toBe(true);
  });

  it("soft-fails when directory not found", async () => {
    const results = await validateDirectoryRule(
      tmp,
      { name: "missing" },
      "missing-dir",
    );
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(false);
    expect(results[0].message).toContain("Directory not found");
  });

  it("soft-fails when path is a file instead of directory", async () => {
    writeFileSync(join(tmp, "notadir"), "content");
    const results = await validateDirectoryRule(
      tmp,
      { name: "notadir" },
      "file-as-dir",
    );
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(false);
    expect(results[0].message).toContain("Expected directory but found file");
  });

  it("validates contained files", async () => {
    mkdirSync(join(tmp, "pkg"));
    writeFileSync(
      join(tmp, "pkg", "package.json"),
      JSON.stringify({ name: "test" }),
    );
    const results = await validateDirectoryRule(
      tmp,
      {
        name: "pkg",
        contains: {
          files: [
            {
              name: "package.json",
              contains: {
                type: "object",
                required: ["name"],
                properties: { name: { type: "string" } },
              },
            },
          ],
        },
      },
      "pkg-dir",
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it("validates contained subdirectories recursively", async () => {
    mkdirSync(join(tmp, "root", "sub"), { recursive: true });
    const results = await validateDirectoryRule(
      tmp,
      {
        name: "root",
        contains: {
          directories: [{ name: "sub" }],
        },
      },
      "recursive",
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it("strict mode detects extra files", async () => {
    mkdirSync(join(tmp, "strict"));
    writeFileSync(join(tmp, "strict", "expected.json"), "{}");
    writeFileSync(join(tmp, "strict", "extra.txt"), "");
    const results = await validateDirectoryRule(
      tmp,
      {
        name: "strict",
        strict: true,
        contains: {
          files: [{ name: "expected.json", contains: { type: "object" } }],
        },
      },
      "strict-dir",
    );
    const strictResult = results.find((r) =>
      r.message?.includes("extra files"),
    );
    expect(strictResult).toBeDefined();
    expect(strictResult?.passed).toBe(false);
    expect(strictResult?.message).toContain("extra.txt");
  });

  it("strict mode detects extra directories", async () => {
    mkdirSync(join(tmp, "strict2"));
    mkdirSync(join(tmp, "strict2", "unexpected"));
    const results = await validateDirectoryRule(
      tmp,
      {
        name: "strict2",
        strict: true,
      },
      "strict2-dir",
    );
    const strictResult = results.find((r) =>
      r.message?.includes("extra directories"),
    );
    expect(strictResult).toBeDefined();
    expect(strictResult?.passed).toBe(false);
  });

  it("strict mode detects both extra files and directories", async () => {
    mkdirSync(join(tmp, "strict3"));
    writeFileSync(join(tmp, "strict3", "extra.txt"), "");
    mkdirSync(join(tmp, "strict3", "extradir"));
    const results = await validateDirectoryRule(
      tmp,
      { name: "strict3", strict: true },
      "strict3-dir",
    );
    const strictResult = results.find((r) =>
      r.message?.includes("extra files"),
    );
    expect(strictResult).toBeDefined();
    expect(strictResult?.message).toContain("extra directories");
  });

  it("strict mode passes when no extra entries", async () => {
    mkdirSync(join(tmp, "clean"));
    writeFileSync(join(tmp, "clean", "expected.json"), "{}");
    const results = await validateDirectoryRule(
      tmp,
      {
        name: "clean",
        strict: true,
        contains: {
          files: [{ name: "expected.json", contains: { type: "object" } }],
        },
      },
      "clean-dir",
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it("strict mode with only extra dirs (no extra files)", async () => {
    mkdirSync(join(tmp, "onlydirs"));
    mkdirSync(join(tmp, "onlydirs", "extra"));
    const results = await validateDirectoryRule(
      tmp,
      {
        name: "onlydirs",
        strict: true,
        contains: {},
      },
      "onlydirs",
    );
    const strictResult = results.find((r) =>
      r.message?.includes("extra directories"),
    );
    expect(strictResult).toBeDefined();
    expect(strictResult?.message).not.toContain("extra files");
  });

  it("strict mode with expected directories passes", async () => {
    mkdirSync(join(tmp, "withsub"));
    mkdirSync(join(tmp, "withsub", "expected"));
    const results = await validateDirectoryRule(
      tmp,
      {
        name: "withsub",
        strict: true,
        contains: {
          directories: [{ name: "expected" }],
        },
      },
      "withsub-dir",
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it("includes context with directory type", async () => {
    mkdirSync(join(tmp, "ctx"));
    const results = await validateDirectoryRule(
      tmp,
      { name: "ctx" },
      "ctx-dir",
    );
    expect(results).toHaveLength(1);
    expect(results[0].context?.type).toBe("directory");
    expect(results[0].context?.target).toBe(join(tmp, "ctx"));
  });
});

describe("validateDirectoryRule error paths", () => {
  it("throws permission denied for EACCES on stat", async () => {
    mockStat.mockRejectedValueOnce(
      Object.assign(new Error("EACCES"), { code: "EACCES" }),
    );
    await expect(
      validateDirectoryRule("/project", { name: "restricted" }, "perm"),
    ).rejects.toThrow("Permission denied accessing directory");
  });

  it("throws generic error for unknown stat error", async () => {
    mockStat.mockRejectedValueOnce(
      Object.assign(new Error("Disk failure"), { code: "EIO" }),
    );
    await expect(
      validateDirectoryRule("/project", { name: "broken" }, "io"),
    ).rejects.toThrow("Error accessing directory");
  });
});
