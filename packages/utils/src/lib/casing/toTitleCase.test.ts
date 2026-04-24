import { describe, expect, it } from "vitest";
import toTitleCase from "./toTitleCase.js";

describe("toTitleCase", () => {
  it("converts kebab-case", () => {
    expect(toTitleCase("my-component")).toBe("My Component");
  });

  it("converts snake_case", () => {
    expect(toTitleCase("some_thing")).toBe("Some Thing");
  });

  it("converts space-separated", () => {
    expect(toTitleCase("hello world")).toBe("Hello World");
  });

  it("converts slash-separated", () => {
    expect(toTitleCase("billing/invoices")).toBe("Billing Invoices");
  });

  it("returns empty string for empty input", () => {
    expect(toTitleCase("")).toBe("");
  });

  it("handles single word", () => {
    expect(toTitleCase("billing")).toBe("Billing");
  });
});
