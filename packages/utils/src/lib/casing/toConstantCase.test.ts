import { describe, expect, it } from "vitest";
import toConstantCase from "./toConstantCase.js";

describe("toConstantCase", () => {
  it("converts camelCase", () => {
    expect(toConstantCase("myComponent")).toBe("MY_COMPONENT");
  });

  it("converts kebab-case", () => {
    expect(toConstantCase("some-thing")).toBe("SOME_THING");
  });

  it("converts PascalCase", () => {
    expect(toConstantCase("MyComponent")).toBe("MY_COMPONENT");
  });

  it("returns empty string for empty input", () => {
    expect(toConstantCase("")).toBe("");
  });
});
