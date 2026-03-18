import chalk from "chalk";
import { describe, expect, it } from "vitest";
import {
  formatField,
  formatHeading,
  formatList,
  formatSection,
} from "./formatTerminal.js";

describe("formatHeading", () => {
  it("applies bold and underline", () => {
    expect(formatHeading("Title")).toBe(chalk.bold.underline("Title"));
  });
});

describe("formatField", () => {
  it("renders dim label with value", () => {
    expect(formatField("Name:", "Button")).toBe(`${chalk.dim("Name:")} Button`);
  });
});

describe("formatList", () => {
  it("renders items with default bullet", () => {
    const result = formatList(["one", "two", "three"]);
    expect(result).toBe("  - one\n  - two\n  - three");
  });

  it("uses custom bullet", () => {
    const result = formatList(["a", "b"], "*");
    expect(result).toBe("  * a\n  * b");
  });

  it("returns empty string for empty array", () => {
    expect(formatList([])).toBe("");
  });
});

describe("formatSection", () => {
  it("combines heading and body", () => {
    const result = formatSection("Details", "some content");
    expect(result).toBe(`${chalk.bold.underline("Details")}\nsome content`);
  });
});
