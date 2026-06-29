import { describe, expect, it } from "vitest";
import applyPhoneMask from "./applyPhoneMask.js";

describe("applyPhoneMask", () => {
  it("returns raw digits when no format is given", () => {
    expect(applyPhoneMask("5551234567")).toBe("5551234567");
  });

  it("strips non-digits from the input before masking", () => {
    expect(applyPhoneMask("(555) abc", "###-###")).toBe("555");
  });

  it("inserts literal separators between digit slots", () => {
    expect(applyPhoneMask("5551234567", "(###) ###-####")).toBe(
      "(555) 123-4567",
    );
  });

  it("formats partial input progressively as digits arrive", () => {
    expect(applyPhoneMask("555", "(###) ###-####")).toBe("(555");
    expect(applyPhoneMask("5551", "(###) ###-####")).toBe("(555) 1");
  });

  it("appends digits beyond the mask length without truncating", () => {
    expect(applyPhoneMask("1234567890123", "### ###")).toBe("123 4567890123");
  });

  it("handles space-only grouping masks", () => {
    expect(applyPhoneMask("0612345678", "# ## ## ## ##")).toBe(
      "0 61 23 45 678",
    );
  });
});
