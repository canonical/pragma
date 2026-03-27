import { describe, expect, it } from "vitest";
import toCamelCase from "./toCamelCase.js";

describe("toCamelCase", () => {
  it("converts kebab-case", () => {
    expect(toCamelCase("my-component")).toBe("myComponent");
  });

  it("converts snake_case", () => {
    expect(toCamelCase("some_thing")).toBe("someThing");
  });

  it("converts space-separated", () => {
    expect(toCamelCase("hello world")).toBe("helloWorld");
  });

  it("lowercases leading uppercase", () => {
    expect(toCamelCase("MyComponent")).toBe("myComponent");
  });

  it("returns empty string for empty input", () => {
    expect(toCamelCase("")).toBe("");
  });
});
