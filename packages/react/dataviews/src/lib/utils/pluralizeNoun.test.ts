import { describe, expect, it } from "vitest";
import pluralizeNoun from "./pluralizeNoun.js";

describe("pluralizeNoun", () => {
  it("is singular for one and plural for any other number", () => {
    expect(pluralizeNoun(1, "item")).toBe("item");
    expect(pluralizeNoun(0, "item")).toBe("items");
    expect(pluralizeNoun(2, "page")).toBe("pages");
  });
});
