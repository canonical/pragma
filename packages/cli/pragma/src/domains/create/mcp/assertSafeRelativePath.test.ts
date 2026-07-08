import { describe, expect, it } from "vitest";
import assertSafeRelativePath from "./assertSafeRelativePath.js";

describe("assertSafeRelativePath", () => {
  it("accepts a normal relative component path", () => {
    expect(() =>
      assertSafeRelativePath("componentPath", "src/components/Button"),
    ).not.toThrow();
  });

  it("accepts a scoped package name", () => {
    expect(() =>
      assertSafeRelativePath("name", "@canonical/my-package"),
    ).not.toThrow();
  });

  it("rejects a parent-traversal path", () => {
    expect(() =>
      assertSafeRelativePath("componentPath", "../../etc/Button"),
    ).toThrow(/Invalid componentPath/);
  });

  it("rejects a scoped name that traverses through the scope", () => {
    expect(() => assertSafeRelativePath("name", "@scope/../../etc")).toThrow(
      /Invalid name/,
    );
  });

  it("rejects an interior .. segment", () => {
    expect(() =>
      assertSafeRelativePath("componentPath", "src/../../secret/Button"),
    ).toThrow();
  });

  it("rejects an absolute path", () => {
    expect(() =>
      assertSafeRelativePath("componentPath", "/etc/passwd"),
    ).toThrow();
  });

  it("rejects a backslash traversal", () => {
    expect(() =>
      assertSafeRelativePath("componentPath", "..\\..\\etc"),
    ).toThrow();
  });

  it("rejects a bare .. value", () => {
    expect(() => assertSafeRelativePath("name", "..")).toThrow();
  });
});
