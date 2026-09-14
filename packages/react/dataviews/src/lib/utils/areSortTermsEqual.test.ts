import { describe, expect, it } from "vitest";
import areSortTermsEqual from "./areSortTermsEqual.js";

describe("areSortTermsEqual", () => {
  it("holds two terms equal only when field and direction both agree", () => {
    expect(
      areSortTermsEqual(
        { field: "name", direction: "asc" },
        { field: "name", direction: "asc" },
      ),
    ).toBe(true);
    expect(
      areSortTermsEqual(
        { field: "name", direction: "asc" },
        { field: "name", direction: "desc" },
      ),
    ).toBe(false);
    expect(
      areSortTermsEqual(
        { field: "name", direction: "asc" },
        { field: "cores", direction: "asc" },
      ),
    ).toBe(false);
  });
});
