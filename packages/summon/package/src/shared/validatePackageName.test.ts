import { describe, expect, it } from "vitest";
import validatePackageName from "./validatePackageName.js";

describe("validatePackageName", () => {
  it("accepts valid package names", () => {
    expect(validatePackageName("my-package")).toBe(true);
    expect(validatePackageName("package")).toBe(true);
    expect(validatePackageName("my-cool-package")).toBe(true);
    expect(validatePackageName("pkg123")).toBe(true);
    expect(validatePackageName("a")).toBe(true);
  });

  it("rejects invalid package names", () => {
    expect(validatePackageName("")).not.toBe(true);
    expect(validatePackageName("-package")).not.toBe(true);
    expect(validatePackageName("package-")).not.toBe(true);
    expect(validatePackageName("My-Package")).not.toBe(true);
    expect(validatePackageName("my_package")).not.toBe(true);
  });

  it("strips @canonical/ prefix for validation", () => {
    expect(validatePackageName("@canonical/my-package")).toBe(true);
  });

  it("validates the scope segment of scoped names", () => {
    expect(validatePackageName("@my-scope/pkg")).toBe(true);
    expect(validatePackageName("@Canonical/pkg")).toContain("scope");
    expect(validatePackageName("@scope!/pkg")).toContain("scope");
    expect(validatePackageName("@-scope/pkg")).toContain("scope");
    expect(validatePackageName("@ /pkg")).toContain("scope");
  });

  it("rejects a scoped name with an empty or missing short name", () => {
    expect(validatePackageName("@/pkg")).toContain("scope");
    expect(validatePackageName("@scope")).toContain("@scope/name");
  });

  it("rejects names longer than 214 characters", () => {
    const longName = `a${"b".repeat(214)}`;
    expect(validatePackageName(longName)).not.toBe(true);
    expect(validatePackageName(longName)).toContain("214");
  });
});
