import { describe, expect, it } from "vitest";
import pluralNoun from "./pluralNoun.js";

describe("pluralNoun", () => {
  it("is singular for one and plural for any other number", () => {
    expect(pluralNoun(1, "item")).toBe("item");
    expect(pluralNoun(0, "item")).toBe("items");
    expect(pluralNoun(2, "page")).toBe("pages");
  });
});
