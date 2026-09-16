import { resolveMessages } from "@canonical/dataviews-core/bindings";
import { describe, expect, it } from "vitest";
import spellCount from "./spellCount.js";

const english = resolveMessages();

describe("spellCount", () => {
  it("spells an exact count as its number", () => {
    expect(spellCount({ kind: "exact", value: 0 }, english)).toBe("0");
    expect(spellCount({ kind: "exact", value: 12 }, english)).toBe("12");
  });

  it("spells a lower bound as at least its number", () => {
    expect(spellCount({ kind: "at-least", value: 5 }, english)).toBe(
      "at least 5",
    );
  });

  it("spells nothing for a count unknown", () => {
    expect(spellCount({ kind: "unknown" }, english)).toBeNull();
  });

  it("spells a count in the messages it is given", () => {
    const messages = resolveMessages({
      facetCount: (count) => `≥ ${count.value}`,
    });
    expect(spellCount({ kind: "at-least", value: 5 }, messages)).toBe("≥ 5");
  });
});
