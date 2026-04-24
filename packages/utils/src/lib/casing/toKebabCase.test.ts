import { describe, expect, it } from "vitest";
import toKebabCase from "./toKebabCase.js";

describe("toKebabCase", () => {
  it("converts PascalCase", () => {
    expect(toKebabCase("MyComponent")).toBe("my-component");
  });

  it("converts camelCase", () => {
    expect(toKebabCase("myComponent")).toBe("my-component");
  });

  it("converts snake_case", () => {
    expect(toKebabCase("some_thing")).toBe("some-thing");
  });

  it("converts spaces", () => {
    expect(toKebabCase("hello world")).toBe("hello-world");
  });

  it("handles consecutive uppercase", () => {
    expect(toKebabCase("HTMLParser")).toBe("html-parser");
  });

  it("returns empty string for empty input", () => {
    expect(toKebabCase("")).toBe("");
  });

  it("trims whitespace", () => {
    expect(toKebabCase("  MyComponent  ")).toBe("my-component");
  });
});
