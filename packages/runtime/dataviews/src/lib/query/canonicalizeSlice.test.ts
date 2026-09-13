import { describe, expect, it } from "vitest";
import canonicalizeSlice from "./canonicalizeSlice.js";
import type { Slice } from "./types.js";

const slice = (overrides: Partial<Slice> = {}): Slice => ({
  filter: [],
  search: null,
  sort: [],
  group: [],
  ...overrides,
});

describe("canonicalizeSlice", () => {
  it("is idempotent", () => {
    const input = slice({
      filter: [
        { field: "status", operator: "eq", operands: ["failed", "cancelled"] },
      ],
      sort: [
        { field: "updated", direction: "desc" },
        { field: "name", direction: "asc" },
      ],
      group: [{ field: "zone" }, { field: "status" }],
    });
    const once = canonicalizeSlice(input);
    expect(canonicalizeSlice(once)).toEqual(once);
  });

  it("treats equality operands as a set regardless of order", () => {
    const left = canonicalizeSlice(
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
    const right = canonicalizeSlice(
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
    const result = canonicalizeSlice(
      slice({
        filter: [
          { field: "status", operator: "eq", operands: ["failed", "failed"] },
        ],
      }),
    );
    expect(result.filter[0]?.operands).toEqual(["failed"]);
  });

  it("keeps grouping levels in their nesting order", () => {
    const input = slice({
      group: [{ field: "zone" }, { field: "status" }],
    });
    expect(canonicalizeSlice(input).group).toEqual([
      { field: "zone" },
      { field: "status" },
    ]);
    // Rebuilt, so a caller's later mutation cannot reach the canonical form.
    expect(canonicalizeSlice(input).group[0]).not.toBe(input.group[0]);
  });

  it("keeps an ungrouped slice ungrouped", () => {
    expect(canonicalizeSlice(slice()).group).toEqual([]);
  });

  it("keeps repeated grouping levels, which nest rather than collapse", () => {
    const input = slice({ group: [{ field: "zone" }, { field: "zone" }] });
    expect(canonicalizeSlice(input).group).toHaveLength(2);
  });

  it("keeps sort term order untouched", () => {
    const input = slice({
      sort: [
        { field: "updated", direction: "desc" },
        { field: "status", direction: "asc" },
      ],
    });
    expect(canonicalizeSlice(input).sort).toEqual(input.sort);
  });

  it("collapses a sort field spelled twice to its first term, in place", () => {
    const result = canonicalizeSlice(
      slice({
        sort: [
          { field: "updated", direction: "desc" },
          { field: "status", direction: "asc" },
          { field: "updated", direction: "asc" },
        ],
      }),
    );
    expect(result.sort).toEqual([
      { field: "updated", direction: "desc" },
      { field: "status", direction: "asc" },
    ]);
  });

  it("collapses duplicate predicate addresses, keeping the last", () => {
    const result = canonicalizeSlice(
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
    const result = canonicalizeSlice(
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
    expect(canonicalizeSlice(slice({ search: "" })).search).toBeNull();
    expect(canonicalizeSlice(slice({ search: "yak" })).search).toBe("yak");
  });

  it("orders equality operands identically regardless of input order", () => {
    // Distinct strings that locale collation may tie (é NFC vs e + combining
    // acute) must still canonicalize to one deterministic order.
    const left = canonicalizeSlice(
      slice({
        filter: [
          { field: "owner", operator: "eq", operands: ["e\u0301", "é", "ed"] },
        ],
      }),
    );
    const right = canonicalizeSlice(
      slice({
        filter: [
          { field: "owner", operator: "eq", operands: ["ed", "é", "e\u0301"] },
        ],
      }),
    );
    expect(left).toEqual(right);
  });

  it("keeps mixed-type operands distinct with a stable cross-type order", () => {
    const result = canonicalizeSlice(
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
    const reordered = canonicalizeSlice(
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
    expect(canonicalizeSlice(input).filter).toEqual([
      { field: "owner", operator: "isSet", operands: [] },
      { field: "updated", operator: "gte", operands: ["2026-01-01"] },
    ]);
  });
});
