import { describe, expect, it } from "vitest";
import createPatternFormatter from "./createPatternFormatter.js";

describe("createPatternFormatter", () => {
  it("pairs the pattern's format with the digit-stripping parse", () => {
    const formatter = createPatternFormatter("(###) ###-####");
    expect(formatter.format("5551234567")).toBe("(555) 123-4567");
    expect(formatter.parse("(555) 123-4567")).toBe("5551234567");
  });

  it("satisfies parse(format(model)) === model for partial models", () => {
    // The left-inverse property useFormattedValue relies on to place the caret.
    const formatter = createPatternFormatter("(###) ###-####");
    for (const model of ["", "5", "555", "55512", "5551234567"]) {
      expect(formatter.parse(formatter.format(model))).toBe(model);
    }
  });

  it("still normalises to digits when no pattern is given", () => {
    const formatter = createPatternFormatter();
    expect(formatter.format("(555) 123-4567")).toBe("5551234567");
  });
});
