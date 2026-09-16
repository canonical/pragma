import { describe, expect, it } from "vitest";
import spellPrimitiveValue from "./spellPrimitiveValue.js";

describe("spellPrimitiveValue", () => {
  it("keeps a string as it is, the empty one included", () => {
    expect(spellPrimitiveValue("alder")).toBe("alder");
    expect(spellPrimitiveValue("")).toBe("");
  });

  it("spells a number, a bigint and a boolean", () => {
    expect(spellPrimitiveValue(8)).toBe("8");
    expect(spellPrimitiveValue(0)).toBe("0");
    expect(spellPrimitiveValue(12n)).toBe("12");
    expect(spellPrimitiveValue(false)).toBe("false");
  });

  it("spells nothing for a value that needs a field's own cell", () => {
    expect(spellPrimitiveValue(null)).toBeNull();
    expect(spellPrimitiveValue(undefined)).toBeNull();
    expect(spellPrimitiveValue({ region: "eu" })).toBeNull();
    expect(spellPrimitiveValue(["a"])).toBeNull();
  });
});
