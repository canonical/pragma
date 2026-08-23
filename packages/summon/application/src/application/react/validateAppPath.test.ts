import { describe, expect, it } from "vitest";
import validateAppPath from "./validateAppPath.js";

describe("validateAppPath", () => {
  it("accepts a bare directory name", () => {
    expect(validateAppPath("my-app")).toBe(true);
  });

  it("accepts a nested relative path", () => {
    expect(validateAppPath("apps/my-app")).toBe(true);
  });

  it("accepts `.` (scaffold into the current directory)", () => {
    expect(validateAppPath(".")).toBe(true);
  });

  it("accepts an empty string (generate()'s default coalesce owns it)", () => {
    expect(validateAppPath("")).toBe(true);
  });

  it("skips a non-string value, exactly as the jail does", () => {
    expect(validateAppPath(undefined)).toBe(true);
    expect(validateAppPath(42)).toBe(true);
  });

  it("rejects an absolute path (out-of-tree write)", () => {
    const result = validateAppPath("/tmp/evil-app");
    expect(result).not.toBe(true);
    expect(result).toContain("absolute");
  });

  it("rejects a path escaping the project via ..", () => {
    const result = validateAppPath("../outside/app");
    expect(result).not.toBe(true);
    expect(result).toContain("..");
  });

  it("rejects a .. escape hidden behind a descending prefix", () => {
    const result = validateAppPath("./sub/../../outside/app2");
    expect(result).not.toBe(true);
    expect(result).toContain("..");
  });

  it("rejects a backslash-separated .. escape", () => {
    expect(validateAppPath("..\\outside")).not.toBe(true);
  });
});
