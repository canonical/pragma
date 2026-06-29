import { describe, expect, it } from "vitest";
import applyPhoneMask from "./applyPhoneMask.js";
import phoneRegisterOptions from "./phoneRegisterOptions.js";
import removePhoneMask from "./removePhoneMask.js";

describe("removePhoneMask", () => {
  it("strips separators back to raw digits", () => {
    expect(removePhoneMask("(555) 123-4567")).toBe("5551234567");
  });

  it("is the inverse of applyPhoneMask (round-trips the digits)", () => {
    const digits = "5551234567";
    const masked = applyPhoneMask(digits, "(###) ###-####");
    expect(removePhoneMask(masked)).toBe(digits);
  });

  it("returns an empty string for non-digit input", () => {
    expect(removePhoneMask("()- ")).toBe("");
  });
});

describe("phoneRegisterOptions", () => {
  it("provides a setValueAs that strips the mask to digits", () => {
    const opts = phoneRegisterOptions();
    const setValueAs = opts.setValueAs as (v: unknown) => string;
    expect(setValueAs("(555) 123-4567")).toBe("5551234567");
    expect(setValueAs(undefined)).toBe("");
  });
});
