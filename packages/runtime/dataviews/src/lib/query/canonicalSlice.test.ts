import { describe, expect, it } from "vitest";
import canonicalSlice from "./canonicalSlice.js";
import type { Slice } from "./types.js";

const slice = (overrides: Partial<Slice> = {}): Slice => ({
  filter: [],
  search: null,
  sort: [],
  group: null,
  ...overrides,
});

describe("canonicalSlice", () => {
  it("is idempotent", () => {
    const input = slice({
      filter: [
        { field: "status", operator: "eq", operands: ["failed", "cancelled"] },
      ],
      sort: [
        { field: "updated", direction: "desc" },
        { field: "name", direction: "asc" },
      ],
    });
    const once = canonicalSlice(input);
    expect(canonicalSlice(once)).toEqual(once);
  });

  it("treats equality operands as a set regardless of order", () => {
    const left = canonicalSlice(
      slice({
        filter: [
          {
            field: "status",
            operator: "eq",
            operands: ["failed", "cancelled"],
          },
        ],
      }),
    );
    const right = canonicalSlice(
      slice({
        filter: [
          {
            field: "status",
            operator: "eq",
            operands: ["cancelled", "failed"],
          },
        ],
      }),
    );
    expect(left).toEqual(right);
  });

  it("deduplicates repeated equality operands", () => {
    const result = canonicalSlice(
      slice({
        filter: [
          { field: "status", operator: "eq", operands: ["failed", "failed"] },
        ],
      }),
    );
    expect(result.filter[0]?.operands).toEqual(["failed"]);
  });

  it("keeps sort term order untouched", () => {
    const input = slice({
      sort: [
        { field: "updated", direction: "desc" },
        { field: "status", direction: "asc" },
      ],
    });
    expect(canonicalSlice(input).sort).toEqual(input.sort);
  });

  it("collapses duplicate predicate addresses, keeping the last", () => {
    const result = canonicalSlice(
      slice({
        filter: [
          { field: "status", operator: "eq", operands: ["failed"] },
          { field: "status", operator: "eq", operands: ["cancelled"] },
        ],
      }),
    );
    expect(result.filter).toEqual([
      { field: "status", operator: "eq", operands: ["cancelled"] },
    ]);
  });

  it("orders predicates by field then operator", () => {
    const result = canonicalSlice(
      slice({
        filter: [
          { field: "zone", operator: "eq", operands: ["north"] },
          { field: "status", operator: "eq", operands: ["failed"] },
          { field: "status", operator: "isSet", operands: [] },
        ],
      }),
    );
    expect(result.filter.map((predicate) => predicate.field)).toEqual([
      "status",
      "status",
      "zone",
    ]);
    expect(result.filter.map((predicate) => predicate.operator)).toEqual([
      "eq",
      "isSet",
      "eq",
    ]);
  });

  it("treats an empty search as no search", () => {
    expect(canonicalSlice(slice({ search: "" })).search).toBeNull();
    expect(canonicalSlice(slice({ search: "yak" })).search).toBe("yak");
  });

  it("orders equality operands identically regardless of input order", () => {
    // Distinct strings that locale collation may tie (é NFC vs e + combining
    // acute) must still canonicalize to one deterministic order.
    const left = canonicalSlice(
      slice({
        filter: [
          { field: "owner", operator: "eq", operands: ["e\u0301", "é", "ed"] },
        ],
      }),
    );
    const right = canonicalSlice(
      slice({
        filter: [
          { field: "owner", operator: "eq", operands: ["ed", "é", "e\u0301"] },
        ],
      }),
    );
    expect(left).toEqual(right);
  });

  it("keeps mixed-type operands distinct with a stable cross-type order", () => {
    const result = canonicalSlice(
      slice({
        filter: [
          {
            field: "value",
            operator: "eq",
            operands: [1, "1", null, "null", true, "true"],
          },
        ],
      }),
    );
    // The typeof tag keeps every operand distinct; nothing is deduped away.
    expect(result.filter[0]?.operands).toHaveLength(6);
    // Canonical order is total regardless of input order.
    const reordered = canonicalSlice(
      slice({
        filter: [
          {
            field: "value",
            operator: "eq",
            operands: ["true", true, "null", null, "1", 1],
          },
        ],
      }),
    );
    expect(reordered).toEqual(result);
  });

  it("keeps bound and zero-value operand shapes, ordered by address", () => {
    const input = slice({
      filter: [
        { field: "updated", operator: "gte", operands: ["2026-01-01"] },
        { field: "owner", operator: "isSet", operands: [] },
      ],
    });
    expect(canonicalSlice(input).filter).toEqual([
      { field: "owner", operator: "isSet", operands: [] },
      { field: "updated", operator: "gte", operands: ["2026-01-01"] },
    ]);
  });
});
