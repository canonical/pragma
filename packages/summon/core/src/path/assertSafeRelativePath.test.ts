import { describe, expect, it } from "vitest";
import assertSafeRelativePath from "./assertSafeRelativePath.js";

describe("assertSafeRelativePath", () => {
  it("accepts a simple relative path", () => {
    expect(() =>
      assertSafeRelativePath("src/components/Button", "componentPath"),
    ).not.toThrow();
  });

  it("accepts a leading-dot relative path", () => {
    expect(() =>
      assertSafeRelativePath("./src/Button", "componentPath"),
    ).not.toThrow();
  });

  it("accepts a bare directory name", () => {
    expect(() => assertSafeRelativePath("my-package", "name")).not.toThrow();
  });

  it("accepts a name that merely starts with dots", () => {
    // `..foo` is a legitimate (if unusual) directory name, not a traversal.
    expect(() =>
      assertSafeRelativePath("..foo/Button", "componentPath"),
    ).not.toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => assertSafeRelativePath("", "componentPath")).toThrow(
      "componentPath must be a non-empty path.",
    );
  });

  it("rejects a non-string value", () => {
    expect(() =>
      assertSafeRelativePath(undefined as unknown as string, "componentPath"),
    ).toThrow("componentPath must be a non-empty path.");
  });

  it("rejects an absolute path", () => {
    expect(() =>
      assertSafeRelativePath("/etc/Button", "componentPath"),
    ).toThrow("must be a relative path");
  });

  it("rejects a leading-slash path (scope-absorption bypass result)", () => {
    // getPackageShortName("@scope//etc") derives "/etc".
    expect(() => assertSafeRelativePath("/etc", "name")).toThrow(
      "must be a relative path",
    );
  });

  it("rejects a Windows drive-letter path", () => {
    expect(() =>
      assertSafeRelativePath("C:\\Windows\\Button", "componentPath"),
    ).toThrow("must be a relative path");
  });

  it("rejects a bare parent segment", () => {
    expect(() => assertSafeRelativePath("..", "componentPath")).toThrow(
      "must not escape the working directory",
    );
  });

  it("rejects a leading traversal", () => {
    expect(() =>
      assertSafeRelativePath("../../etc/Button", "componentPath"),
    ).toThrow("must not escape the working directory");
  });

  it("rejects an interior traversal even if it would normalize away", () => {
    expect(() =>
      assertSafeRelativePath("src/../../etc", "componentPath"),
    ).toThrow("must not escape the working directory");
  });

  it("rejects a backslash traversal (Windows-style, on any platform)", () => {
    expect(() =>
      assertSafeRelativePath("..\\..\\etc", "componentPath"),
    ).toThrow("must not escape the working directory");
  });
});
