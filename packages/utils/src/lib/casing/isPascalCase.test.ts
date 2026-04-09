import { describe, expect, it } from "vitest";
import isPascalCase from "./isPascalCase.js";

describe("isPascalCase", () => {
  it("returns true for PascalCase strings", () => {
    expect(isPascalCase("MyComponent")).toBe(true);
    expect(isPascalCase("Hello")).toBe(true);
    expect(isPascalCase("A")).toBe(true);
  });

  it("returns false for camelCase", () => {
    expect(isPascalCase("myComponent")).toBe(false);
  });

  it("returns false for kebab-case", () => {
    expect(isPascalCase("my-component")).toBe(false);
  });

  it("returns false for snake_case", () => {
    expect(isPascalCase("my_component")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isPascalCase("")).toBe(false);
  });
});
