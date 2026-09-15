import { describe, expect, it } from "vitest";
import areFacetsEqual from "./areFacetsEqual.js";

const failedTwice = {
  kind: "values" as const,
  values: [{ value: "failed", count: { kind: "exact" as const, value: 2 } }],
};

describe("areFacetsEqual", () => {
  it("holds the same fields, values, counts and bounds equal, in fresh objects", () => {
    expect(
      areFacetsEqual(
        { status: failedTwice, cpu: { kind: "range", min: 1, max: 8 } },
        {
          status: { ...failedTwice, values: [...failedTwice.values] },
          cpu: { kind: "range", min: 1, max: 8 },
        },
      ),
    ).toBe(true);
  });

  it("tells apart another field, count, bound or kind", () => {
    expect(
      areFacetsEqual({ status: failedTwice }, { region: failedTwice }),
    ).toBe(false);
    expect(
      areFacetsEqual(
        { status: failedTwice },
        {
          status: {
            kind: "values",
            values: [
              { value: "failed", count: { kind: "at-least", value: 2 } },
            ],
          },
        },
      ),
    ).toBe(false);
    expect(
      areFacetsEqual(
        { cpu: { kind: "range", min: 1, max: 8 } },
        { cpu: { kind: "range", min: 1, max: 16 } },
      ),
    ).toBe(false);
    expect(
      areFacetsEqual(
        { cpu: { kind: "range", min: null, max: null } },
        { cpu: { kind: "values", values: [] } },
      ),
    ).toBe(false);
  });

  it("reads facets a page left out as none", () => {
    expect(areFacetsEqual({}, undefined)).toBe(true);
    expect(areFacetsEqual({ status: failedTwice }, undefined)).toBe(false);
  });
});
