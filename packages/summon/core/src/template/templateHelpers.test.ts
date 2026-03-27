import { describe, expect, it } from "vitest";
import templateHelpers from "./templateHelpers.js";

describe("templateHelpers", () => {
  describe("camelCase", () => {
    it("converts hyphenated strings", () => { expect(templateHelpers.camelCase("my-component")).toBe("myComponent"); });
    it("converts underscored strings", () => { expect(templateHelpers.camelCase("my_component")).toBe("myComponent"); });
    it("converts space-separated strings", () => { expect(templateHelpers.camelCase("my component")).toBe("myComponent"); });
    it("converts PascalCase to camelCase", () => { expect(templateHelpers.camelCase("MyComponent")).toBe("myComponent"); });
    it("handles multiple separators", () => { expect(templateHelpers.camelCase("my-component_name")).toBe("myComponentName"); });
    it("handles single word", () => { expect(templateHelpers.camelCase("component")).toBe("component"); });
    it("handles empty string", () => { expect(templateHelpers.camelCase("")).toBe(""); });
    it("handles consecutive separators", () => { expect(templateHelpers.camelCase("my--component")).toBe("myComponent"); });
  });

  describe("pascalCase", () => {
    it("converts hyphenated strings", () => { expect(templateHelpers.pascalCase("my-component")).toBe("MyComponent"); });
    it("converts underscored strings", () => { expect(templateHelpers.pascalCase("my_component")).toBe("MyComponent"); });
    it("converts space-separated strings", () => { expect(templateHelpers.pascalCase("my component")).toBe("MyComponent"); });
    it("preserves PascalCase", () => { expect(templateHelpers.pascalCase("MyComponent")).toBe("MyComponent"); });
    it("handles single word", () => { expect(templateHelpers.pascalCase("component")).toBe("Component"); });
    it("handles empty string", () => { expect(templateHelpers.pascalCase("")).toBe(""); });
  });

  describe("kebabCase", () => {
    it("converts camelCase", () => { expect(templateHelpers.kebabCase("myComponent")).toBe("my-component"); });
    it("converts PascalCase", () => { expect(templateHelpers.kebabCase("MyComponent")).toBe("my-component"); });
    it("converts underscored strings", () => { expect(templateHelpers.kebabCase("my_component")).toBe("my-component"); });
    it("converts space-separated strings", () => { expect(templateHelpers.kebabCase("my component")).toBe("my-component"); });
    it("preserves kebab-case", () => { expect(templateHelpers.kebabCase("my-component")).toBe("my-component"); });
    it("handles single word", () => { expect(templateHelpers.kebabCase("Component")).toBe("component"); });
    it("handles empty string", () => { expect(templateHelpers.kebabCase("")).toBe(""); });
    it("handles consecutive uppercase", () => { expect(templateHelpers.kebabCase("XMLParser")).toBe("xml-parser"); });
    it("handles mixed case with boundaries", () => { expect(templateHelpers.kebabCase("parseXMLDocument")).toBe("parse-xml-document"); });
    it("splits on each lowercase to uppercase transition", () => { expect(templateHelpers.kebabCase("parseXmlDocument")).toBe("parse-xml-document"); });
  });

  describe("snakeCase", () => {
    it("converts camelCase", () => { expect(templateHelpers.snakeCase("myComponent")).toBe("my_component"); });
    it("converts PascalCase", () => { expect(templateHelpers.snakeCase("MyComponent")).toBe("my_component"); });
    it("converts hyphenated strings", () => { expect(templateHelpers.snakeCase("my-component")).toBe("my_component"); });
    it("converts space-separated strings", () => { expect(templateHelpers.snakeCase("my component")).toBe("my_component"); });
    it("preserves snake_case", () => { expect(templateHelpers.snakeCase("my_component")).toBe("my_component"); });
    it("handles single word", () => { expect(templateHelpers.snakeCase("Component")).toBe("component"); });
    it("handles empty string", () => { expect(templateHelpers.snakeCase("")).toBe(""); });
  });

  describe("constantCase", () => {
    it("converts camelCase", () => { expect(templateHelpers.constantCase("myComponent")).toBe("MY_COMPONENT"); });
    it("converts PascalCase", () => { expect(templateHelpers.constantCase("MyComponent")).toBe("MY_COMPONENT"); });
    it("converts hyphenated strings", () => { expect(templateHelpers.constantCase("my-component")).toBe("MY_COMPONENT"); });
    it("converts space-separated strings", () => { expect(templateHelpers.constantCase("my component")).toBe("MY_COMPONENT"); });
    it("handles single word", () => { expect(templateHelpers.constantCase("component")).toBe("COMPONENT"); });
    it("handles empty string", () => { expect(templateHelpers.constantCase("")).toBe(""); });
  });

  describe("capitalize", () => {
    it("capitalizes first letter", () => { expect(templateHelpers.capitalize("hello")).toBe("Hello"); });
    it("preserves rest of string", () => { expect(templateHelpers.capitalize("hELLO")).toBe("HELLO"); });
    it("handles single character", () => { expect(templateHelpers.capitalize("h")).toBe("H"); });
    it("handles empty string", () => { expect(templateHelpers.capitalize("")).toBe(""); });
    it("handles already capitalized", () => { expect(templateHelpers.capitalize("Hello")).toBe("Hello"); });
  });

  describe("isoDate", () => {
    it("returns ISO date string", () => {
      expect(templateHelpers.isoDate()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("year", () => {
    it("returns current year", () => {
      expect(templateHelpers.year()).toBe(new Date().getFullYear());
    });
  });

  describe("indent", () => {
    it("indents single line", () => { expect(templateHelpers.indent("hello", 2)).toBe("  hello"); });
    it("indents multiple lines", () => { expect(templateHelpers.indent("line1\nline2\nline3", 2)).toBe("  line1\n  line2\n  line3"); });
    it("handles zero indent", () => { expect(templateHelpers.indent("hello", 0)).toBe("hello"); });
    it("handles large indent", () => { expect(templateHelpers.indent("hello", 10)).toBe("          hello"); });
    it("handles empty string", () => { expect(templateHelpers.indent("", 2)).toBe("  "); });
    it("handles empty lines", () => { expect(templateHelpers.indent("a\n\nb", 2)).toBe("  a\n  \n  b"); });
  });

  describe("join", () => {
    it("joins array with default separator", () => { expect(templateHelpers.join(["a", "b", "c"])).toBe("a, b, c"); });
    it("joins array with custom separator", () => { expect(templateHelpers.join(["a", "b", "c"], " | ")).toBe("a | b | c"); });
    it("handles empty array", () => { expect(templateHelpers.join([])).toBe(""); });
    it("handles single item", () => { expect(templateHelpers.join(["single"])).toBe("single"); });
    it("converts non-string items", () => { expect(templateHelpers.join([1, 2, 3])).toBe("1, 2, 3"); });
    it("handles mixed types", () => { expect(templateHelpers.join([1, "two", true])).toBe("1, two, true"); });
  });

  describe("pluralize", () => {
    it("returns singular for count of 1", () => { expect(templateHelpers.pluralize("item", 1)).toBe("item"); });
    it("returns plural for count of 0", () => { expect(templateHelpers.pluralize("item", 0)).toBe("items"); });
    it("returns plural for count > 1", () => { expect(templateHelpers.pluralize("item", 5)).toBe("items"); });
    it("handles negative counts", () => { expect(templateHelpers.pluralize("item", -1)).toBe("items"); });
  });
});
