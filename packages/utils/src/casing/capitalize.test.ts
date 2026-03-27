import { describe, expect, it } from "vitest";
import capitalize from "./capitalize.js";

describe("capitalize", () => {
  it("capitalizes the first character", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("preserves the rest of the string", () => {
    expect(capitalize("hello world")).toBe("Hello world");
  });

  it("handles already capitalized strings", () => {
    expect(capitalize("Hello")).toBe("Hello");
  });

  it("returns empty string for empty input", () => {
    expect(capitalize("")).toBe("");
  });
});
