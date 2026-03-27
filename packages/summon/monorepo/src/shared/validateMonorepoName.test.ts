import { describe, expect, it } from "vitest";
import validateMonorepoName from "./validateMonorepoName.js";

describe("validateMonorepoName", () => {
  it("accepts valid names", () => {
    expect(validateMonorepoName("my-monorepo")).toBe(true);
    expect(validateMonorepoName("a")).toBe(true);
  });

  it("rejects empty values", () => {
    expect(validateMonorepoName("")).not.toBe(true);
  });

  it("rejects non-kebab-case names", () => {
    expect(validateMonorepoName("My-Repo")).not.toBe(true);
    expect(validateMonorepoName("-invalid")).not.toBe(true);
  });
});
