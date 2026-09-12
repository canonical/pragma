import { describe, expect, it } from "vitest";
import applyQueryCommand from "./applyQueryCommand.js";
import DEFAULT_WINDOW from "./defaultWindow.js";
import sliceEquals from "./sliceEquals.js";
import type { Slice } from "./types.js";

const slice = (overrides: Partial<Slice> = {}): Slice => ({
  filter: [],
  search: null,
  sort: [],
  group: [],
  ...overrides,
});

describe("sliceEquals", () => {
  it("is true for identical slices", () => {
    const value = slice({ search: "yak" });
    expect(sliceEquals(value, slice({ search: "yak" }))).toBe(true);
  });

  it("is true when only equality operand order differs", () => {
    const left = slice({
      filter: [
        { field: "status", operator: "eq", operands: ["failed", "cancelled"] },
      ],
    });
    const right = slice({
      filter: [
        { field: "status", operator: "eq", operands: ["cancelled", "failed"] },
      ],
    });
    expect(sliceEquals(left, right)).toBe(true);
  });

  it("is true when only predicate list order differs", () => {
    const left = slice({
      filter: [
        { field: "status", operator: "eq", operands: ["failed"] },
        { field: "zone", operator: "eq", operands: ["north"] },
      ],
    });
    const right = slice({
      filter: [
        { field: "zone", operator: "eq", operands: ["north"] },
        { field: "status", operator: "eq", operands: ["failed"] },
      ],
    });
    expect(sliceEquals(left, right)).toBe(true);
  });

  it("is false when sort order differs", () => {
    const left = slice({
      sort: [
        { field: "status", direction: "asc" },
        { field: "updated", direction: "desc" },
      ],
    });
    const right = slice({
      sort: [
        { field: "updated", direction: "desc" },
        { field: "status", direction: "asc" },
      ],
    });
    expect(sliceEquals(left, right)).toBe(false);
  });

  it("is false when sort direction differs", () => {
    const left = slice({ sort: [{ field: "name", direction: "asc" }] });
    const right = slice({ sort: [{ field: "name", direction: "desc" }] });
    expect(sliceEquals(left, right)).toBe(false);
  });

  it("is false when the sort has a term the other does not", () => {
    const left = slice({ sort: [{ field: "name", direction: "asc" }] });
    expect(sliceEquals(left, slice())).toBe(false);
  });

  it("is false when an operand differs", () => {
    const left = slice({
      filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
    });
    const right = slice({
      filter: [{ field: "status", operator: "eq", operands: ["cancelled"] }],
    });
    expect(sliceEquals(left, right)).toBe(false);
  });

  it("is false when a predicate's field, operator or arity differs", () => {
    const eq = slice({
      filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
    });
    expect(
      sliceEquals(
        eq,
        slice({
          filter: [{ field: "zone", operator: "eq", operands: ["failed"] }],
        }),
      ),
    ).toBe(false);
    expect(
      sliceEquals(
        eq,
        slice({
          filter: [{ field: "status", operator: "isSet", operands: [] }],
        }),
      ),
    ).toBe(false);
    expect(
      sliceEquals(
        eq,
        slice({
          filter: [
            { field: "status", operator: "eq", operands: ["failed", "ready"] },
          ],
        }),
      ),
    ).toBe(false);
    expect(sliceEquals(eq, slice())).toBe(false);
  });

  it("is false when the search differs", () => {
    expect(sliceEquals(slice({ search: "yak" }), slice())).toBe(false);
  });

  it("compares grouping levels in order, not as a set", () => {
    const nested = slice({ group: [{ field: "zone" }, { field: "status" }] });
    expect(
      sliceEquals(
        nested,
        slice({ group: [{ field: "zone" }, { field: "status" }] }),
      ),
    ).toBe(true);
    // The outer level decides what the inner one nests inside.
    expect(
      sliceEquals(
        nested,
        slice({ group: [{ field: "status" }, { field: "zone" }] }),
      ),
    ).toBe(false);
    // A level fewer is a different grouping.
    expect(sliceEquals(nested, slice({ group: [{ field: "zone" }] }))).toBe(
      false,
    );
    expect(sliceEquals(nested, slice())).toBe(false);
  });

  it("treats an empty search as equal to no search", () => {
    expect(sliceEquals(slice({ search: "" }), slice({ search: null }))).toBe(
      true,
    );
  });

  it("compares operands exactly as request fingerprints do", () => {
    const withOperands = (operands: (string | number)[]) =>
      slice({
        filter: [{ field: "cpu", operator: "gte", operands }],
      });
    // The string "0" never equals the number 0.
    expect(sliceEquals(withOperands([0]), withOperands(["0"]))).toBe(false);
    // Negative zero and zero are the same value to a fingerprint.
    expect(sliceEquals(withOperands([-0]), withOperands([0]))).toBe(true);
    // NaN equals itself, exactly like the fingerprint marker.
    expect(
      sliceEquals(withOperands([Number.NaN]), withOperands([Number.NaN])),
    ).toBe(true);
  });

  it("treats a negative-zero replacement as a semantic no-op", () => {
    const base = slice({
      filter: [{ field: "cpu", operator: "gte", operands: [0] }],
    });
    const result = applyQueryCommand(
      base,
      { ...DEFAULT_WINDOW, page: 2 },
      {
        kind: "setPredicate",
        predicate: { field: "cpu", operator: "gte", operands: [-0] },
      },
    );
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.sliceChanged).toBe(false);
    expect(result.window.page).toBe(2);
  });
});
