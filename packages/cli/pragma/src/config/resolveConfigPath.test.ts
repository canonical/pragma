import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import resolveConfigPath from "./resolveConfigPath.js";

describe("resolveConfigPath", () => {
  it("appends pragma.config.json to the given directory", () => {
    expect(resolveConfigPath("/home/user/project")).toBe(
      resolve("/home/user/project", "pragma.config.json"),
    );
  });

  it("resolves relative paths against cwd", () => {
    const result = resolveConfigPath(".");
    expect(result).toBe(resolve(process.cwd(), "pragma.config.json"));
  });

  it("handles nested directories", () => {
    expect(resolveConfigPath("/a/b/c")).toBe("/a/b/c/pragma.config.json");
  });
});
