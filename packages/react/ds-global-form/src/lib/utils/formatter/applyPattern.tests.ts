import { describe, expect, it } from "vitest";
import applyPattern from "./applyPattern.js";

describe("applyPattern", () => {
  it("returns raw digits when no pattern is given", () => {
    expect(applyPattern("5551234567")).toBe("5551234567");
  });

  it("strips non-digits from the input before grouping", () => {
    expect(applyPattern("(555) abc", "###-###")).toBe("555");
  });

  it("inserts literal separators between digit slots", () => {
    expect(applyPattern("5551234567", "(###) ###-####")).toBe("(555) 123-4567");
  });

  it("formats partial input progressively as digits arrive", () => {
    expect(applyPattern("555", "(###) ###-####")).toBe("(555");
    expect(applyPattern("5551", "(###) ###-####")).toBe("(555) 1");
  });

  it("appends digits beyond the pattern length without truncating", () => {
    expect(applyPattern("1234567890123", "### ###")).toBe("123 4567890123");
  });

  it("handles space-only grouping patterns", () => {
    expect(applyPattern("0612345678", "# ## ## ## ##")).toBe("0 61 23 45 678");
  });
});
