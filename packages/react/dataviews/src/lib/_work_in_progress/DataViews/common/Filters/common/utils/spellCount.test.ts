import { describe, expect, it } from "vitest";
import spellCount from "./spellCount.js";

describe("spellCount", () => {
  it("spells an exact count as its number", () => {
    expect(spellCount({ kind: "exact", value: 0 })).toBe("0");
    expect(spellCount({ kind: "exact", value: 12 })).toBe("12");
  });

  it("spells a lower bound as at least its number", () => {
    expect(spellCount({ kind: "at-least", value: 5 })).toBe("at least 5");
  });

  it("spells nothing for a count unknown", () => {
    expect(spellCount({ kind: "unknown" })).toBeNull();
  });
});
