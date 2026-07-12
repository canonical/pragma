import { describe, expect, it } from "vitest";
import pickFirstValue from "./pickFirstValue.js";

describe("pickFirstValue", () => {
  it("returns the value of the first predicate present in priority order", () => {
    const values = new Map([
      ["p2", ["second"]],
      ["p3", ["third"]],
    ]);
    expect(pickFirstValue(values, ["p1", "p2", "p3"])).toBe("second");
  });

  it("skips empty values", () => {
    const values = new Map([
      ["p1", [""]],
      ["p2", ["real"]],
    ]);
    expect(pickFirstValue(values, ["p1", "p2"])).toBe("real");
  });

  it("returns null when no predicate matches", () => {
    const values = new Map([["other", ["x"]]]);
    expect(pickFirstValue(values, ["p1", "p2"])).toBeNull();
  });

  it("returns null for an empty map", () => {
    expect(pickFirstValue(new Map(), ["p1"])).toBeNull();
  });
});
