import { describe, expect, it } from "vitest";
import toKebabCase from "./kebab.js";

describe("toKebabCase", () => {
  it("converts camelCase prompt names to kebab-case flag names", () => {
    expect(toKebabCase("withTests")).toBe("with-tests");
    expect(toKebabCase("componentPath")).toBe("component-path");
    expect(toKebabCase("useTsStories")).toBe("use-ts-stories");
  });

  it("leaves single-word names untouched", () => {
    expect(toKebabCase("name")).toBe("name");
    expect(toKebabCase("ssr")).toBe("ssr");
  });

  it("breaks after digits too (es2015Style -> es2015-style)", () => {
    expect(toKebabCase("es2015Style")).toBe("es2015-style");
  });
});
