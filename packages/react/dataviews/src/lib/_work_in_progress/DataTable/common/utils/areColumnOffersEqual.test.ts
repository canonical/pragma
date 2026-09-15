import { describe, expect, it } from "vitest";
import type { ColumnOffers } from "../types.js";
import areColumnOffersEqual from "./areColumnOffersEqual.js";

const NONE: ColumnOffers = {
  hide: false,
  show: false,
  "move-left": false,
  "move-right": false,
};

describe("areColumnOffersEqual", () => {
  it("holds for the same changes, and fails when any one change differs", () => {
    expect(areColumnOffersEqual(NONE, { ...NONE })).toBe(true);
    for (const change of ["hide", "show", "move-left", "move-right"] as const) {
      expect(
        areColumnOffersEqual(NONE, { ...NONE, [change]: true }),
        change,
      ).toBe(false);
    }
  });
});
