import { describe, expect, it } from "vitest";
import { defineFacet } from "./defineFacet.js";

/** A facet whose parser throws a message of its own — the property that a
 * boolean type guard could not have carried (see `defineFacet`'s header). */
const countFacet = defineFacet<number, "count">("count", (value, key) => {
  if (typeof value !== "number") {
    throw new Error(`route meta ${key} is not a number`);
  }
  return value;
});

const labelFacet = defineFacet<string, "label">("label", (value, key) => {
  if (typeof value !== "string") {
    throw new Error(`route meta ${key} is not a string`);
  }
  return value;
});

describe("defineFacet", () => {
  it("exposes the key it owns", () => {
    expect(countFacet.key).toBe("count");
  });

  it("returns undefined for absent meta or an absent entry", () => {
    expect(countFacet.read(undefined)).toBeUndefined();
    expect(countFacet.read({})).toBeUndefined();
    expect(countFacet.read({ otherKey: 1 })).toBeUndefined();
  });

  it("returns a well-formed value by identity", () => {
    // Identity, not equality: `readStripSlots` promised the caller gets the
    // very object the route parked, and `stripFacet` still does.
    const entry = { nested: true };
    const objectFacet = defineFacet<object, "entry">("entry", (value) => {
      if (typeof value !== "object" || value === null) {
        throw new Error("route meta entry is not an object");
      }
      return value;
    });
    expect(objectFacet.read({ entry })).toBe(entry);
  });

  it("propagates the tenant's own message on a malformed value", () => {
    expect(() => countFacet.read({ count: "seven" })).toThrow(
      "route meta count is not a number",
    );
    expect(() => labelFacet.read({ label: 7 })).toThrow(
      "route meta label is not a string",
    );
  });

  it("authors a claim under its own key, and only that key", () => {
    // `of()`'s other half — that the ARGUMENT is type-checked — is a
    // compile-time property; `tsc --noEmit` is its test, not this file.
    expect(countFacet.of(3)).toEqual({ count: 3 });
    expect(Object.keys(countFacet.of(3))).toEqual([countFacet.key]);
  });

  it("round-trips of() through read()", () => {
    expect(countFacet.read(countFacet.of(3))).toBe(3);
  });

  it("lets two facets share one meta bag without clobbering", () => {
    // The real shape of a route's `meta`: several tenants, one literal.
    const meta = { ...countFacet.of(3), ...labelFacet.of("Home") };
    expect(countFacet.read(meta)).toBe(3);
    expect(labelFacet.read(meta)).toBe("Home");
  });
});
