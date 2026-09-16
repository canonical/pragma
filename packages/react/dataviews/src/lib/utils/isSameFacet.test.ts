import type { Facet } from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import isSameFacet from "./isSameFacet.js";

const values = (count: number): Facet => ({
  kind: "values",
  values: [{ value: "failed", count: { kind: "exact", value: count } }],
});

describe("isSameFacet", () => {
  it("holds two facets claiming the same values and counts equal", () => {
    expect(isSameFacet(values(3), values(3))).toBe(true);
    expect(isSameFacet(values(3), values(4))).toBe(false);
  });

  it("holds two ranges equal by their ends", () => {
    const range = (max: number): Facet => ({ kind: "range", min: 1, max });
    expect(isSameFacet(range(8), range(8))).toBe(true);
    expect(isSameFacet(range(8), range(9))).toBe(false);
  });

  it("holds facets of different kinds apart", () => {
    expect(isSameFacet(values(1), { kind: "range", min: 1, max: 1 })).toBe(
      false,
    );
  });

  it("holds an unanswered facet and a missing one apart, and each equal to itself", () => {
    expect(isSameFacet(null, null)).toBe(true);
    expect(isSameFacet(undefined, undefined)).toBe(true);
    expect(isSameFacet(null, undefined)).toBe(false);
    expect(isSameFacet(null, values(1))).toBe(false);
    expect(isSameFacet(values(1), undefined)).toBe(false);
  });
});
