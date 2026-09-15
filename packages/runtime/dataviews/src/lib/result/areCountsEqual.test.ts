import { describe, expect, it } from "vitest";
import areCountsEqual from "./areCountsEqual.js";

describe("areCountsEqual", () => {
  it("holds counts of one kind and value equal, and unknown equal to unknown", () => {
    expect(
      areCountsEqual({ kind: "exact", value: 3 }, { kind: "exact", value: 3 }),
    ).toBe(true);
    expect(areCountsEqual({ kind: "unknown" }, { kind: "unknown" })).toBe(true);
  });

  it("tells apart another kind or value", () => {
    expect(
      areCountsEqual(
        { kind: "exact", value: 3 },
        { kind: "at-least", value: 3 },
      ),
    ).toBe(false);
    expect(
      areCountsEqual({ kind: "exact", value: 3 }, { kind: "exact", value: 4 }),
    ).toBe(false);
    expect(
      areCountsEqual({ kind: "exact", value: 3 }, { kind: "unknown" }),
    ).toBe(false);
  });
});
