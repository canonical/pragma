import { describe, expect, it } from "vitest";
import {
  validateAppPath,
  validateCommandPath,
  validateKebabName,
} from "./validators.js";

describe("validateCommandPath", () => {
  const routePath = validateCommandPath({
    label: "Route path",
    minSegments: 2,
    example: "account/settings",
  });
  const singleName = validateCommandPath({
    label: "Domain name",
    maxSegments: 1,
    example: "billing",
  });

  it("accepts well-formed paths", () => {
    expect(routePath("account/settings")).toBe(true);
    expect(routePath(" /billing/invoices/ ")).toBe(true);
    expect(singleName("billing")).toBe(true);
    expect(singleName("my-domain")).toBe(true);
  });

  it("rejects empty or non-string values", () => {
    expect(routePath("")).toContain("required");
    expect(routePath("   ")).toContain("required");
    expect(routePath(undefined)).toContain("required");
    expect(routePath("///")).toContain("required");
  });

  it("enforces the minimum segment count", () => {
    expect(routePath("settings")).toContain("at least 2");
  });

  it("enforces the maximum segment count", () => {
    expect(singleName("a/b")).toContain("single name");
    const pagePath = validateCommandPath({
      label: "Page path",
      minSegments: 2,
      maxSegments: 2,
      example: "invoices/detail",
    });
    expect(pagePath("invoices/detail")).toBe(true);
    expect(pagePath("invoices/detail/lines")).toContain("at most 2 segments");
  });

  it("rejects segments that would not survive as identifiers", () => {
    // toPascalCase("2fa") keeps the leading digit → `function 2faPage()`.
    expect(routePath("account/2fa")).toContain('"2fa"');
    expect(routePath("account/se ttings")).not.toBe(true);
    expect(singleName("_billing")).not.toBe(true);
  });
});

describe("validateKebabName", () => {
  const pageName = validateKebabName({
    label: "Page name",
    example: "order-lines",
  });

  it("accepts kebab-case names", () => {
    expect(pageName("detail")).toBe(true);
    expect(pageName("order-lines")).toBe(true);
    expect(pageName("step-2")).toBe(true);
  });

  it("refuses anything a name mapping would have to guess at", () => {
    for (const name of [
      "DETAIL",
      "Detail",
      "orderLines",
      "order--lines",
      "-x",
      "x-",
      "2fa",
      "",
    ]) {
      expect(pageName(name)).toContain("must be kebab-case");
    }
    expect(pageName(undefined)).toContain("must be kebab-case");
  });
});

describe("validateAppPath", () => {
  it("accepts relative directory paths", () => {
    expect(validateAppPath("my-app")).toBe(true);
    expect(validateAppPath("apps/my-app")).toBe(true);
  });

  it("rejects empty, absolute, and traversal paths", () => {
    expect(validateAppPath("")).toContain("required");
    expect(validateAppPath(undefined)).toContain("required");
    expect(validateAppPath("/tmp/app")).toContain("relative");
    expect(validateAppPath("C:\\apps\\x")).toContain("relative");
    expect(validateAppPath("../escape")).toContain('".."');
    expect(validateAppPath("a//b")).not.toBe(true);
  });
});
