import { describe, expect, it } from "vitest";
import type { Slice } from "../query/types.js";
import executeSlice, { readProperty } from "./executeSlice.js";

const emptySlice: Slice = { filter: [], search: null, sort: [], group: [] };

const slice = (overrides: Partial<Slice> = {}): Slice => ({
  ...emptySlice,
  ...overrides,
});

/** Neutral fixture records. */
const rows = [
  { id: "a", name: "Alpha", cpu: 4, ready: true, owner: "ex:ada" },
  { id: "b", name: "beta", cpu: 12, ready: false, owner: null },
  { id: "c", name: "Gamma", cpu: 8, ready: true },
  { id: "d", name: "delta", cpu: 8, ready: false, owner: "ex:bo" },
];

const ids = (result: readonly unknown[]) =>
  result.map((row) => (row as { id: string }).id);

describe("executeSlice", () => {
  it("returns every row for the empty query", () => {
    expect(executeSlice(rows, emptySlice)).toEqual(rows);
  });

  it("matches equality against the operand set", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "cpu", operator: "eq", operands: [8, 4] }],
          }),
        ),
      ),
    ).toEqual(["a", "c", "d"]);
  });

  it("never coerces across operand types", () => {
    expect(
      executeSlice(
        rows,
        slice({ filter: [{ field: "cpu", operator: "eq", operands: ["4"] }] }),
      ),
    ).toEqual([]);
  });

  it("matches a null operand against a null value, absent fields never", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "owner", operator: "eq", operands: [null] }],
          }),
        ),
      ),
    ).toEqual(["b"]);
  });

  it("never matches equality on a value outside the operand domain", () => {
    expect(
      executeSlice(
        [{ id: "a", tags: ["x"] }],
        slice({ filter: [{ field: "tags", operator: "eq", operands: ["x"] }] }),
      ),
    ).toEqual([]);
  });

  it("reads presence with isSet, counting absent and null as unset", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "owner", operator: "isSet", operands: [] }],
          }),
        ),
      ),
    ).toEqual(["a", "d"]);
  });

  it("bounds numbers inclusively at both ends", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [
              { field: "cpu", operator: "gte", operands: [8] },
              { field: "cpu", operator: "lte", operands: [8] },
            ],
          }),
        ),
      ),
    ).toEqual(["c", "d"]);
  });

  it("bounds text by code point", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "name", operator: "gte", operands: ["b"] }],
          }),
        ),
      ),
    ).toEqual(["b", "d"]);
  });

  it("never satisfies a range with an absent or null value", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "owner", operator: "gte", operands: ["ex:"] }],
          }),
        ),
      ),
    ).toEqual(["a", "d"]);
    expect(
      executeSlice(
        rows,
        slice({
          filter: [{ field: "owner", operator: "lte", operands: [null] }],
        }),
      ),
    ).toEqual([]);
  });

  it("never satisfies a range across value types", () => {
    expect(
      executeSlice(
        rows,
        slice({ filter: [{ field: "cpu", operator: "gte", operands: ["4"] }] }),
      ),
    ).toEqual([]);
  });

  it("refuses a range predicate carrying no operand", () => {
    expect(
      executeSlice(
        rows,
        slice({ filter: [{ field: "cpu", operator: "gte", operands: [] }] }),
      ),
    ).toEqual([]);
  });

  it("searches case-insensitively over the declared fields only", () => {
    expect(
      ids(
        executeSlice(rows, slice({ search: "AMM" }), {
          searchFields: ["name"],
        }),
      ),
    ).toEqual(["c"]);
    expect(
      executeSlice(rows, slice({ search: "AMM" }), { searchFields: ["owner"] }),
    ).toEqual([]);
  });

  it("searches numeric values and never boolean or absent ones", () => {
    expect(
      ids(
        executeSlice(rows, slice({ search: "12" }), { searchFields: ["cpu"] }),
      ),
    ).toEqual(["b"]);
    expect(
      executeSlice(rows, slice({ search: "true" }), {
        searchFields: ["ready", "owner"],
      }),
    ).toEqual([]);
  });

  it("searches nothing when no field is declared", () => {
    expect(executeSlice(rows, slice({ search: "alpha" }))).toEqual([]);
  });

  it("treats an empty search string as no search", () => {
    expect(executeSlice(rows, slice({ search: "" }))).toEqual(rows);
  });

  it("applies filter and search together", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "ready", operator: "eq", operands: [true] }],
            search: "a",
          }),
          { searchFields: ["name"] },
        ),
      ),
    ).toEqual(["a", "c"]);
  });

  it("sorts numbers ascending and descending", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({ sort: [{ field: "cpu", direction: "asc" }] }),
        ),
      ),
    ).toEqual(["a", "c", "d", "b"]);
    expect(
      ids(
        executeSlice(
          rows,
          slice({ sort: [{ field: "cpu", direction: "desc" }] }),
        ),
      ),
    ).toEqual(["b", "c", "d", "a"]);
  });

  it("sorts text by code point, so case is not folded", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({ sort: [{ field: "name", direction: "asc" }] }),
        ),
      ),
    ).toEqual(["a", "c", "b", "d"]);
  });

  it("sorts booleans false before true", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({ sort: [{ field: "ready", direction: "asc" }] }),
        ),
      ),
    ).toEqual(["b", "d", "a", "c"]);
  });

  it("orders a mixed-type column by bucket, so the sort stays total", () => {
    const mixed = [
      { id: "n", v: 2 },
      { id: "s", v: "x" },
      { id: "b", v: true },
      { id: "nan", v: Number.NaN },
      { id: "o", v: {} },
      { id: "o2", v: {} },
    ];
    const asc = ids(
      executeSlice(mixed, slice({ sort: [{ field: "v", direction: "asc" }] })),
    );
    // Buckets order by type name: boolean < number < number:nan < object < string.
    expect(asc).toEqual(["b", "n", "nan", "o", "o2", "s"]);
    // Two values in one bucket that cannot be ordered keep their input order.
    expect(asc.indexOf("o")).toBeLessThan(asc.indexOf("o2"));
  });

  it("sorts absent and null values last in both directions", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({ sort: [{ field: "owner", direction: "asc" }] }),
        ),
      ),
    ).toEqual(["a", "d", "b", "c"]);
    expect(
      ids(
        executeSlice(
          rows,
          slice({ sort: [{ field: "owner", direction: "desc" }] }),
        ),
      ),
    ).toEqual(["d", "a", "b", "c"]);
  });

  it("keeps input order for rows whose term values are equal", () => {
    const duplicates = [
      { id: "x", name: "same" },
      { id: "y", name: "same" },
    ];
    expect(
      ids(
        executeSlice(
          duplicates,
          slice({ sort: [{ field: "name", direction: "desc" }] }),
        ),
      ),
    ).toEqual(["x", "y"]);
  });

  it("breaks a tie on a text term with the next term", () => {
    // Two equal strings must compare equal, not merely consistently: a tie
    // that never falls through leaves the second term unread.
    const duplicates = [
      { id: "x", name: "same", cpu: 8 },
      { id: "y", name: "same", cpu: 2 },
      { id: "z", name: "same", cpu: 5 },
    ];
    expect(
      ids(
        executeSlice(
          duplicates,
          slice({
            sort: [
              { field: "name", direction: "asc" },
              { field: "cpu", direction: "asc" },
            ],
          }),
        ),
      ),
    ).toEqual(["y", "z", "x"]);
  });

  it("breaks a tie between two values of one incomparable bucket", () => {
    // Neither value orders against the other, so both land in the same
    // bucket and the next term is what decides between them.
    const unordered = [
      { id: "x", name: Number.NaN, cpu: 8 },
      { id: "y", name: Number.NaN, cpu: 2 },
      { id: "z", name: Number.NaN, cpu: 5 },
    ];
    expect(
      ids(
        executeSlice(
          unordered,
          slice({
            sort: [
              { field: "name", direction: "asc" },
              { field: "cpu", direction: "asc" },
            ],
          }),
        ),
      ),
    ).toEqual(["y", "z", "x"]);
  });

  it("keeps input order for rows absent on every term", () => {
    expect(
      ids(
        executeSlice(
          [{ id: "x" }, { id: "y" }],
          slice({ sort: [{ field: "owner", direction: "asc" }] }),
        ),
      ),
    ).toEqual(["x", "y"]);
  });

  it("breaks ties with the next term, then with input order", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            sort: [
              { field: "cpu", direction: "asc" },
              { field: "name", direction: "desc" },
            ],
          }),
        ),
      ),
    ).toEqual(["a", "d", "c", "b"]);
  });

  it("orders values of different types by type name, so the order is total", () => {
    const mixed = [
      { id: "a", value: "1" },
      { id: "b", value: true },
      { id: "c", value: 2 },
      { id: "d", value: 1 },
    ];
    expect(
      ids(
        executeSlice(
          mixed,
          slice({ sort: [{ field: "value", direction: "asc" }] }),
        ),
      ),
    ).toEqual(["b", "d", "c", "a"]);
  });

  it("sorts NaN after every number and never inside a range", () => {
    const metrics = [
      { id: "a", rate: 2 },
      { id: "b", rate: Number.NaN },
      { id: "c", rate: 1 },
    ];
    expect(
      ids(
        executeSlice(
          metrics,
          slice({ sort: [{ field: "rate", direction: "asc" }] }),
        ),
      ),
    ).toEqual(["c", "a", "b"]);
    expect(
      executeSlice(
        metrics,
        slice({
          filter: [{ field: "rate", operator: "gte", operands: [100] }],
        }),
      ),
    ).toEqual([]);
    expect(
      executeSlice(
        metrics,
        slice({ filter: [{ field: "rate", operator: "lte", operands: [0] }] }),
      ),
    ).toEqual([]);
  });

  it("orders rows absent on one term by the next term", () => {
    const partial = [
      { id: "a", name: "z" },
      { id: "b", name: "a" },
    ];
    expect(
      ids(
        executeSlice(
          partial,
          slice({
            sort: [
              { field: "owner", direction: "asc" },
              { field: "name", direction: "asc" },
            ],
          }),
        ),
      ),
    ).toEqual(["b", "a"]);
  });

  it("never mutates the caller's array", () => {
    const input = [...rows];
    executeSlice(input, slice({ sort: [{ field: "cpu", direction: "asc" }] }));
    expect(ids(input)).toEqual(["a", "b", "c", "d"]);
  });

  it("reads fields through a caller-supplied accessor", () => {
    const wrapped = [{ record: { id: "a", cpu: 1 } }];
    expect(
      executeSlice(
        wrapped,
        slice({ filter: [{ field: "cpu", operator: "eq", operands: [1] }] }),
        {
          read: (row, field) =>
            (row as { record: Record<string, unknown> }).record[field],
        },
      ),
    ).toEqual(wrapped);
  });

  it("reads own properties only, so a prototype member is absent", () => {
    expect(readProperty("plain", "id")).toBeUndefined();
    expect(readProperty(null, "id")).toBeUndefined();
    expect(readProperty({ id: "a" }, "id")).toBe("a");
    expect(readProperty({ id: "a" }, "toString")).toBeUndefined();
  });

  it("never matches a prototype member with isSet", () => {
    expect(
      executeSlice(
        rows,
        slice({
          filter: [{ field: "toString", operator: "isSet", operands: [] }],
        }),
      ),
    ).toEqual([]);
  });
});
