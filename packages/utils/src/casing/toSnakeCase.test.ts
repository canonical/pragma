import { describe, expect, it } from "vitest";
import toSnakeCase from "./toSnakeCase.js";

describe("toSnakeCase", () => {
  it("converts camelCase", () => {
    expect(toSnakeCase("myComponent")).toBe("my_component");
  });

  it("converts PascalCase", () => {
    expect(toSnakeCase("MyComponent")).toBe("my_component");
  });

  it("converts kebab-case", () => {
    expect(toSnakeCase("some-thing")).toBe("some_thing");
  });

  it("converts spaces", () => {
    expect(toSnakeCase("hello world")).toBe("hello_world");
  });

  it("returns empty string for empty input", () => {
    expect(toSnakeCase("")).toBe("");
  });
});
