import { describe, expect, expectTypeOf, it } from "vitest";
import { byId } from "../../../testing/fixtures.js";
import { createCollection } from "../collection/index.js";
import { EMPTY_SLICE } from "../query/index.js";
import readSlice from "./readSlice.js";

const machines = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "ready"] },
    { field: "cpu", kind: "number" },
    { field: "updated", kind: "date" },
    { field: "owner", kind: "flag" },
    { field: "name", kind: "text" },
  ],
});

describe("readSlice", () => {
  it("reads each filter by field through its kind", () => {
    const reading = readSlice(machines, {
      ...EMPTY_SLICE,
      filter: [
        { field: "cpu", operator: "lte", operands: [16] },
        { field: "status", operator: "isAny", operands: ["ready", "failed"] },
        { field: "cpu", operator: "gte", operands: [4] },
        { field: "owner", operator: "isSet", operands: [] },
        { field: "updated", operator: "gte", operands: ["2026-01-01"] },
        { field: "name", operator: "contains", operands: ["web"] },
        { field: "name", operator: "startsWith", operands: ["api"] },
        { field: "status", operator: "isNone", operands: ["failed"] },
      ],
      search: "yak",
      sort: [
        { field: "cpu", direction: "desc" },
        { field: "cpu", direction: "asc" },
      ],
    });
    expect(reading).toEqual({
      filters: {
        status: {
          isAny: new Set(["failed", "ready"]),
          isNone: new Set(["failed"]),
        },
        cpu: { gte: 4, lte: 16 },
        owner: true,
        updated: { gte: "2026-01-01" },
        name: { contains: "web", startsWith: "api" },
      },
      search: "yak",
      sort: [{ field: "cpu", direction: "desc" }],
    });
  });

  it("reads the query that restricts nothing as no filters", () => {
    expect(readSlice(machines, EMPTY_SLICE)).toEqual({
      filters: {},
      search: null,
      sort: [],
    });
  });

  it("leaves out a predicate on a field the schema does not define", () => {
    expect(
      readSlice(machines, {
        ...EMPTY_SLICE,
        filter: [{ field: "zone", operator: "isAny", operands: ["eu"] }],
      }).filters,
    ).toEqual({});
  });

  it("types each filter from the schema", () => {
    const reading = readSlice(machines, EMPTY_SLICE);
    expectTypeOf(reading.filters.status).toEqualTypeOf<
      | {
          readonly isAny?: ReadonlySet<"failed" | "ready">;
          readonly isNone?: ReadonlySet<"failed" | "ready">;
        }
      | undefined
    >();
    expectTypeOf(reading.filters.cpu).toEqualTypeOf<
      { readonly gte?: number; readonly lte?: number } | undefined
    >();
    expectTypeOf(reading.filters.owner).toEqualTypeOf<boolean | undefined>();
    expectTypeOf(reading.filters.name).toEqualTypeOf<
      { readonly contains?: string; readonly startsWith?: string } | undefined
    >();
  });
});
