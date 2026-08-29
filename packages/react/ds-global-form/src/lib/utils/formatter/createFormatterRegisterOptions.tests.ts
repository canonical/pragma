import { describe, expect, it } from "vitest";
import createFormatterRegisterOptions from "./createFormatterRegisterOptions.js";
import createPatternFormatter from "./createPatternFormatter.js";

describe("createFormatterRegisterOptions", () => {
  it("provides a setValueAs that parses the display value", () => {
    const options = createFormatterRegisterOptions(
      createPatternFormatter("(###) ###-####"),
    );
    const setValueAs = options.setValueAs as (value: unknown) => string;
    expect(setValueAs("(555) 123-4567")).toBe("5551234567");
  });

  it("coerces a missing value rather than throwing", () => {
    const options = createFormatterRegisterOptions(createPatternFormatter());
    const setValueAs = options.setValueAs as (value: unknown) => string;
    expect(setValueAs(undefined)).toBe("");
  });
});
