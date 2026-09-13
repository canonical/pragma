/**
 * The one structural comparison behind the layout's write guards and
 * the interaction's conflict check. It is public because a caller keying a
 * render on declared sizing needs the same answer, not a second one.
 */
import { describe, expect, it } from "vitest";
import areSizingsEqual from "./areSizingsEqual.js";

describe("areSizingsEqual", () => {
  it("compares fixed sizings by their pixels", () => {
    expect(
      areSizingsEqual({ kind: "fixed", px: 80 }, { kind: "fixed", px: 80 }),
    ).toBe(true);
    expect(
      areSizingsEqual({ kind: "fixed", px: 80 }, { kind: "fixed", px: 81 }),
    ).toBe(false);
  });

  it("compares flex sizings by weight and both bounds", () => {
    const unbounded = { kind: "flex", weight: 1, minPx: 96 } as const;
    const flex = { ...unbounded, maxPx: 240 } as const;
    expect(areSizingsEqual(flex, { ...flex })).toBe(true);
    expect(areSizingsEqual(flex, { ...flex, weight: 2 })).toBe(false);
    expect(areSizingsEqual(flex, { ...flex, minPx: 97 })).toBe(false);
    expect(areSizingsEqual(flex, unbounded)).toBe(false);
  });

  it("never equates the two kinds", () => {
    const fixed = { kind: "fixed", px: 96 } as const;
    const flex = { kind: "flex", weight: 1, minPx: 96 } as const;
    expect(areSizingsEqual(fixed, flex)).toBe(false);
    expect(areSizingsEqual(flex, fixed)).toBe(false);
  });
});
