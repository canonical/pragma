import { describe, expect, it } from "vitest";
import { declareSort } from "../../../testing/fixtures.js";
import type { Slice, SortTerm } from "../query/index.js";
import { createSchema } from "../schema/index.js";
import executeSlice from "./executeSlice.js";
import type { ExecuteSliceConfig } from "./types.js";

const emptySlice: Slice = { filter: [], search: null, sort: [], group: [] };

const slice = (overrides: Partial<Slice> = {}): Slice => ({
  ...emptySlice,
  ...overrides,
});

const schema = createSchema([
  { field: "id", kind: "text" },
  { field: "name", kind: "text" },
  { field: "cpu", kind: "number" },
  { field: "ready", kind: "flag" },
  { field: "owner", kind: "text" },
  { field: "seen", kind: "date" },
]);

/** The source declaration of a run: everything sortable, nothing documented. */
const buildExecuteConfig = (
  overrides: Partial<ExecuteSliceConfig> = {},
): ExecuteSliceConfig => ({
  schema,
  sort: declareSort(schema.fieldNames),
  ...overrides,
});

/** A source ordering by `terms` when the query states none. */
const buildConfigWithDefault = (
  terms: readonly SortTerm[],
): ExecuteSliceConfig =>
  buildExecuteConfig({
    sort: { ...declareSort(schema.fieldNames), default: terms },
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
    expect(executeSlice(rows, emptySlice, buildExecuteConfig())).toEqual(rows);
  });

  it("matches equality against the operand set", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "cpu", operator: "eq", operands: [8, 4] }],
          }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["a", "c", "d"]);
  });

  it("never coerces across operand types", () => {
    expect(
      executeSlice(
        rows,
        slice({ filter: [{ field: "cpu", operator: "eq", operands: ["4"] }] }),
        buildExecuteConfig(),
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
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["b"]);
  });

  it("never matches equality on a value outside the operand domain", () => {
    expect(
      executeSlice(
        [{ id: "a", tags: ["x"] }],
        slice({ filter: [{ field: "tags", operator: "eq", operands: ["x"] }] }),
        buildExecuteConfig(),
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
          buildExecuteConfig(),
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
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["c", "d"]);
  });

  it("bounds text by code point, inclusively at both ends", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "name", operator: "gte", operands: ["b"] }],
          }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["b", "d"]);
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "name", operator: "lte", operands: ["beta"] }],
          }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["a", "b", "c"]);
  });

  it("matches nothing for a range over a field the schema does not define", () => {
    // Nothing can say how such a field's values compare, so no row is in
    // any range of it; an equality over it still reads the row's value.
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "zone", operator: "gte", operands: ["a"] }],
          }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual([]);
  });

  it("never satisfies a range with an absent or null value", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "owner", operator: "gte", operands: ["ex:"] }],
          }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["a", "d"]);
    expect(
      executeSlice(
        rows,
        slice({
          filter: [{ field: "owner", operator: "lte", operands: [null] }],
        }),
        buildExecuteConfig(),
      ),
    ).toEqual([]);
  });

  it("bounds flags, false below true", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "ready", operator: "gte", operands: [true] }],
          }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["a", "c"]);
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "ready", operator: "lte", operands: [false] }],
          }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["b", "d"]);
  });

  it("never satisfies a range across value types", () => {
    expect(
      executeSlice(
        rows,
        slice({ filter: [{ field: "cpu", operator: "gte", operands: ["4"] }] }),
        buildExecuteConfig(),
      ),
    ).toEqual([]);
  });

  it("refuses a range predicate carrying no operand", () => {
    expect(
      executeSlice(
        rows,
        slice({ filter: [{ field: "cpu", operator: "gte", operands: [] }] }),
        buildExecuteConfig(),
      ),
    ).toEqual([]);
  });

  it("searches case-insensitively over the declared fields only", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({ search: "AMM" }),
          buildExecuteConfig({
            searchFields: ["name"],
          }),
        ),
      ),
    ).toEqual(["c"]);
    expect(
      executeSlice(
        rows,
        slice({ search: "AMM" }),
        buildExecuteConfig({ searchFields: ["owner"] }),
      ),
    ).toEqual([]);
  });

  it("searches numeric values and never boolean or absent ones", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({ search: "12" }),
          buildExecuteConfig({ searchFields: ["cpu"] }),
        ),
      ),
    ).toEqual(["b"]);
    expect(
      executeSlice(
        rows,
        slice({ search: "true" }),
        buildExecuteConfig({
          searchFields: ["ready", "owner"],
        }),
      ),
    ).toEqual([]);
  });

  it("searches nothing when no field is declared", () => {
    expect(
      executeSlice(rows, slice({ search: "alpha" }), buildExecuteConfig()),
    ).toEqual([]);
  });

  it("treats an empty search string as no search", () => {
    expect(
      executeSlice(rows, slice({ search: "" }), buildExecuteConfig()),
    ).toEqual(rows);
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
          buildExecuteConfig({ searchFields: ["name"] }),
        ),
      ),
    ).toEqual(["a", "c"]);
  });

  it("orders numbers ascending and descending", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({ sort: [{ field: "cpu", direction: "asc" }] }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["a", "c", "d", "b"]);
    expect(
      ids(
        executeSlice(
          rows,
          slice({ sort: [{ field: "cpu", direction: "desc" }] }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["b", "c", "d", "a"]);
  });

  it("runs the source's declared default when the query states no term", () => {
    expect(
      ids(
        executeSlice(
          rows,
          emptySlice,
          buildConfigWithDefault([{ field: "cpu", direction: "desc" }]),
        ),
      ),
    ).toEqual(["b", "c", "d", "a"]);
  });

  it("runs the query's own terms instead of the default, not before it", () => {
    // Were the default appended, c and d — tied on ready — would order by
    // cpu descending; replaced, they keep the order they came in.
    expect(
      ids(
        executeSlice(
          rows,
          slice({ sort: [{ field: "ready", direction: "asc" }] }),
          buildConfigWithDefault([{ field: "name", direction: "desc" }]),
        ),
      ),
    ).toEqual(["b", "d", "a", "c"]);
  });

  it("keeps the input order when neither the query nor the source orders", () => {
    expect(executeSlice(rows, emptySlice, buildExecuteConfig())).toEqual(rows);
  });

  it("appends a named tiebreak the source declares, after every term", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({ sort: [{ field: "ready", direction: "asc" }] }),
          buildExecuteConfig({
            sort: {
              ...declareSort(schema.fieldNames),
              tiebreak: [{ field: "cpu", direction: "desc" }],
            },
          }),
        ),
      ),
    ).toEqual(["b", "d", "c", "a"]);
  });

  it("collapses a field spelled twice, so the first term is the ordering", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            sort: [
              { field: "cpu", direction: "asc" },
              { field: "cpu", direction: "desc" },
            ],
          }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["a", "c", "d", "b"]);
  });

  it("orders rows equal under every term by their input order", () => {
    const duplicates = [
      { id: "x", name: "same" },
      { id: "y", name: "same" },
    ];
    expect(
      ids(
        executeSlice(
          duplicates,
          slice({ sort: [{ field: "name", direction: "desc" }] }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["x", "y"]);
  });

  it("filters, searches and orders in one pass", () => {
    expect(
      ids(
        executeSlice(
          rows,
          slice({
            filter: [{ field: "cpu", operator: "gte", operands: [8] }],
            sort: [{ field: "name", direction: "asc" }],
          }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["c", "b", "d"]);
  });

  it("never reports a NaN as within a range", () => {
    const metrics = [
      { id: "a", cpu: 2 },
      { id: "b", cpu: Number.NaN },
      { id: "c", cpu: 1 },
    ];
    expect(
      ids(
        executeSlice(
          metrics,
          slice({
            filter: [{ field: "cpu", operator: "lte", operands: [100] }],
          }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["a", "c"]);
    expect(
      ids(
        executeSlice(
          metrics,
          slice({ filter: [{ field: "cpu", operator: "gte", operands: [0] }] }),
          buildExecuteConfig(),
        ),
      ),
    ).toEqual(["a", "c"]);
  });

  it("bounds a date field by calendar date, inclusive at both ends", () => {
    const seen = [
      { id: "a", seen: "2024-01-14" },
      { id: "b", seen: "2024-01-15" },
      { id: "c", seen: "2024-02-01" },
      // The filter domain is the calendar date as the row spells it; a value
      // spelled any other way is outside it and matches no bound.
      { id: "d", seen: new Date("2024-01-20T00:00:00Z") },
      { id: "e", seen: null },
    ];
    const between = (gte: string, lte: string) =>
      ids(
        executeSlice(
          seen,
          slice({
            filter: [
              { field: "seen", operator: "gte", operands: [gte] },
              { field: "seen", operator: "lte", operands: [lte] },
            ],
          }),
          buildExecuteConfig(),
        ),
      );
    expect(between("2024-01-15", "2024-02-01")).toEqual(["b", "c"]);
    expect(between("2024-01-14", "2024-01-14")).toEqual(["a"]);
    expect(between("2024-01-16", "2024-01-31")).toEqual([]);
  });

  it("never mutates the caller's array", () => {
    const input = [...rows];
    executeSlice(
      input,
      slice({ sort: [{ field: "cpu", direction: "asc" }] }),
      buildExecuteConfig(),
    );
    expect(ids(input)).toEqual(["a", "b", "c", "d"]);
  });

  it("never matches a prototype member with isSet", () => {
    expect(
      executeSlice(
        rows,
        slice({
          filter: [{ field: "toString", operator: "isSet", operands: [] }],
        }),
        buildExecuteConfig(),
      ),
    ).toEqual([]);
  });
});
