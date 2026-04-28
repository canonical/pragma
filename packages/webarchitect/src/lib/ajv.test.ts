import { describe, expect, it } from "vitest";
import ajv from "./ajv.js";

describe("ajv", () => {
  it("validates regex format with valid regex", () => {
    const validate = ajv.compile({
      type: "string",
      format: "regex",
    });
    expect(validate("^foo$")).toBe(true);
  });

  it("rejects invalid regex", () => {
    const validate = ajv.compile({
      type: "string",
      format: "regex",
    });
    expect(validate("[invalid")).toBe(false);
  });

  it("validates email format", () => {
    const validate = ajv.compile({
      type: "string",
      format: "email",
    });
    expect(validate("test@example.com")).toBe(true);
    expect(validate("notanemail")).toBe(false);
  });

  it("validates uri format", () => {
    const validate = ajv.compile({
      type: "string",
      format: "uri",
    });
    expect(validate("https://example.com")).toBe(true);
  });
});
