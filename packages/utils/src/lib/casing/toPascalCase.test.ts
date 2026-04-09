import { describe, expect, it } from "vitest";
import toPascalCase from "./toPascalCase.js";

describe("toPascalCase", () => {
  it("converts kebab-case", () => {
    expect(toPascalCase("my-component")).toBe("MyComponent");
  });

  it("converts snake_case", () => {
    expect(toPascalCase("some_thing")).toBe("SomeThing");
  });

  it("converts space-separated", () => {
    expect(toPascalCase("hello world")).toBe("HelloWorld");
  });

  it("handles already PascalCase", () => {
    expect(toPascalCase("MyComponent")).toBe("MyComponent");
  });

  it("returns empty string for empty input", () => {
    expect(toPascalCase("")).toBe("");
  });

  it("handles trailing separators", () => {
    expect(toPascalCase("hello-")).toBe("Hello");
  });
});
