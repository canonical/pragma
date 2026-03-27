import { describe, expect, it } from "vitest";
import validateComponentPath from "./validateComponentPath.js";

describe("validateComponentPath", () => {
  it("accepts valid path with PascalCase name", () => {
    expect(validateComponentPath("src/components/Button")).toBe(true);
  });

  it("accepts valid path with numbers in name", () => {
    expect(validateComponentPath("src/components/Button2")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(validateComponentPath("")).not.toBe(true);
    expect(typeof validateComponentPath("")).toBe("string");
  });

  it("rejects undefined", () => {
    expect(validateComponentPath(undefined)).not.toBe(true);
  });

  it("rejects null", () => {
    expect(validateComponentPath(null)).not.toBe(true);
  });

  it("rejects non-string value", () => {
    expect(validateComponentPath(42)).not.toBe(true);
  });

  it("rejects non-PascalCase component name", () => {
    const result = validateComponentPath("src/components/my-button");
    expect(result).not.toBe(true);
    expect(result).toContain("PascalCase");
  });

  it("rejects camelCase component name", () => {
    const result = validateComponentPath("src/components/myButton");
    expect(result).not.toBe(true);
  });
});
