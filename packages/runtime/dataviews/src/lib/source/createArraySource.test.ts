import { describe, expect, it, vi } from "vitest";
import { byId } from "../../../testing/fixtures.js";
import { createCollection } from "../collection/index.js";
import { DEFAULT_WINDOW, type Slice, type SortTerm } from "../query/index.js";
import type { SourceDelivery } from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import { ROOT_NUMERIC_COLLATION } from "./constants.js";
import createArraySource from "./createArraySource.js";
import type { SourceActionRunner, SourceRequest } from "./types.js";

const emptySlice: Slice = { filter: [], search: null, sort: [], group: [] };

const request = (overrides: Partial<SourceRequest> = {}): SourceRequest => ({
  requestId: "i1:r1",
  slice: emptySlice,
  window: { ...DEFAULT_WINDOW, size: 2 },
  ...overrides,
});

const exact = (value: number) => ({ kind: "exact", value });

const rows = [
  { id: "a", name: "Alpha", cpu: 4 },
  { id: "b", name: "beta", cpu: 12 },
  { id: "c", name: "Gamma", cpu: 8 },
];

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "id", kind: "text" },
    { field: "name", kind: "text" },
    { field: "cpu", kind: "number" },
  ],
});

const source = () =>
  createArraySource<RowRecord>({
    rows,
    collection,
    searchFields: ["name"],
  });

const delivery = () => vi.fn<(delivery: SourceDelivery) => void>();

/** The nth delivery, or a failure rather than a silently skipped assertion. */
const deliveredAt = (
  deliver: ReturnType<typeof delivery>,
  index: number,
): SourceDelivery => {
  const call = deliver.mock.calls[index];
  if (call === undefined) {
    throw new Error(`expected a delivery at index ${index}`);
  }
  return call[0];
};

const idsOf = (delivered: SourceDelivery) =>
  delivered.status === "succeeded"
    ? delivered.page.rows.map((row) => (row as { id: string }).id)
    : [delivered.failure.reason];

describe("createArraySource", () => {
  it("declares complete input, and each field's own operators", () => {
    expect({ ...source().capabilities }).toEqual({
      // Text fields are ordered, never filtered, so the
      // declaration offers no operator over them at all.
      filter: { cpu: ["gte", "lte"] },
      search: { fields: ["name"] },
      sort: {
        fields: ["id", "name", "cpu"],
        terms: null,
        default: [],
        tiebreak: "opaque",
        collation: ROOT_NUMERIC_COLLATION,
      },
      group: { fields: [], levels: 0, summaries: "none", collapse: false },
      counts: { pageable: "exact", matched: "exact", total: "exact" },
      pagination: { kind: "offset" },
      selection: { scope: "explicit" },
      actions: {},
    });
  });

  it("declares a default ordering with each field once", () => {
    expect(
      createArraySource({
        rows,
        collection,
        defaultSort: [
          { field: "cpu", direction: "desc" },
          { field: "cpu", direction: "asc" },
        ],
      }).capabilities.sort.default,
    ).toEqual([{ field: "cpu", direction: "desc" }]);
  });

  it("refuses a default ordering naming a field the schema does not define", () => {
    expect(() =>
      createArraySource({
        rows,
        collection,
        defaultSort: [{ field: "zone", direction: "asc" }],
      }),
    ).toThrow('the default ordering names "zone", which is not sortable');
  });

  it("runs its declared default when a query states no term of its own", () => {
    const live = createArraySource({
      rows,
      collection,
      defaultSort: [{ field: "cpu", direction: "desc" }],
    });
    const deliver = delivery();
    live.execute(request({ window: { ...DEFAULT_WINDOW, size: 3 } }), deliver);
    expect(idsOf(deliveredAt(deliver, 0))).toEqual(["b", "c", "a"]);
  });

  it("collates text at the root locale, numerically, unless told otherwise", () => {
    const numbered = [
      { id: "n10", name: "node10" },
      { id: "n2", name: "node2" },
    ];
    const live = createArraySource({ rows: numbered, collection });
    const deliver = delivery();
    live.execute(
      request({
        slice: { ...emptySlice, sort: [{ field: "name", direction: "asc" }] },
      }),
      deliver,
    );
    expect(idsOf(deliveredAt(deliver, 0))).toEqual(["n2", "n10"]);

    const byCodePoint = createArraySource({
      rows: numbered,
      collection,
      collation: null,
    });
    const other = delivery();
    byCodePoint.execute(
      request({
        slice: { ...emptySlice, sort: [{ field: "name", direction: "asc" }] },
      }),
      other,
    );
    expect(idsOf(deliveredAt(other, 0))).toEqual(["n10", "n2"]);
  });

  it("declares no search when no field is searchable", () => {
    expect(
      createArraySource({ rows, collection }).capabilities.search,
    ).toBeNull();
  });

  it("freezes its declaration against the caller's arrays", () => {
    const defaultSort: SortTerm[] = [{ field: "id", direction: "asc" }];
    const searchFields = ["name"];
    const { capabilities } = createArraySource({
      rows,
      collection,
      defaultSort,
      searchFields,
    });
    defaultSort.push({ field: "cpu", direction: "asc" });
    searchFields.push("cpu");
    expect(capabilities.sort.default).toEqual([
      { field: "id", direction: "asc" },
    ]);
    expect(capabilities.search).toEqual({ fields: ["name"] });
    expect(Object.isFrozen(capabilities)).toBe(true);
    expect(Object.isFrozen(capabilities.sort.fields)).toBe(true);
  });

  it("delivers the requested window synchronously with all three counts", () => {
    const deliver = delivery();
    source().execute(request(), deliver);
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliveredAt(deliver, 0)).toEqual({
      status: "succeeded",
      page: {
        rows: [rows[0], rows[1]],
        groups: null,
        counts: { pageable: exact(3), matched: exact(3), total: exact(3) },
        more: null,
        cursors: null,
      },
    });
  });

  it("counts the matched set, not the loaded page, and the whole input", () => {
    const deliver = delivery();
    source().execute(
      request({
        slice: { ...emptySlice, search: "a" },
        window: { ...DEFAULT_WINDOW, size: 1 },
      }),
      deliver,
    );
    expect(deliveredAt(deliver, 0)).toMatchObject({
      page: {
        rows: [rows[0]],
        counts: { pageable: exact(3), matched: exact(3), total: exact(3) },
      },
    });
  });

  it("reports the filtered set apart from the collection total", () => {
    const deliver = delivery();
    source().execute(
      request({
        slice: {
          ...emptySlice,
          filter: [{ field: "cpu", operator: "gte", operands: [8] }],
        },
      }),
      deliver,
    );
    expect(deliveredAt(deliver, 0)).toMatchObject({
      page: {
        counts: { pageable: exact(2), matched: exact(2), total: exact(3) },
      },
    });
  });

  it("windows past the end of the result as an empty page", () => {
    const deliver = delivery();
    source().execute(
      request({ window: { ...DEFAULT_WINDOW, page: 3, size: 2 } }),
      deliver,
    );
    expect(deliveredAt(deliver, 0)).toMatchObject({ page: { rows: [] } });
  });

  it("reuses one query's matched set across window changes", () => {
    // Each row reports the reads of its ordered field through a getter.
    let reads = 0;
    const counted = rows.map((row) =>
      Object.defineProperty({ ...row }, "cpu", {
        enumerable: true,
        get: () => {
          reads += 1;
          return row.cpu;
        },
      }),
    );
    const live = createArraySource({ rows: counted, collection });
    const query: Slice = {
      ...emptySlice,
      sort: [{ field: "cpu", direction: "asc" }],
    };
    live.execute(request({ slice: query }), delivery());
    const afterFirst = reads;
    expect(afterFirst).toBeGreaterThan(0);

    const second = delivery();
    live.execute(
      request({
        requestId: "i1:r2",
        slice: query,
        window: { ...DEFAULT_WINDOW, page: 2, size: 2 },
      }),
      second,
    );
    expect(reads).toBe(afterFirst);
    expect(idsOf(deliveredAt(second, 0))).toEqual(["b"]);
  });

  it("re-executes a query the records changed under", () => {
    const live = source();
    const deliver = delivery();
    const query: Slice = {
      ...emptySlice,
      sort: [{ field: "cpu", direction: "asc" }],
    };
    live.execute(request({ slice: query }), deliver);
    expect(idsOf(deliveredAt(deliver, 0))).toEqual(["a", "c"]);
    live.setRows([...rows, { id: "d", name: "delta", cpu: 1 }]);
    expect(idsOf(deliveredAt(deliver, 1))).toEqual(["d", "a"]);
  });

  it("re-executes every live request when the records change", () => {
    const live = source();
    const first = delivery();
    const second = delivery();
    live.execute(request(), first);
    live.execute(
      request({
        requestId: "i1:r2",
        slice: { ...emptySlice, sort: [{ field: "cpu", direction: "desc" }] },
      }),
      second,
    );
    live.setRows([...rows, { id: "d", name: "delta", cpu: 1 }]);
    expect(first).toHaveBeenCalledTimes(2);
    expect(idsOf(deliveredAt(first, 1))).toEqual(["a", "b"]);
    expect(idsOf(deliveredAt(second, 1))).toEqual(["b", "c"]);
  });

  it("stops delivering to a released request", () => {
    const live = source();
    const deliver = delivery();
    const release = live.execute(request(), deliver);
    release();
    live.setRows([]);
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it("keeps the other requests attached when one is released", () => {
    const live = source();
    const kept = delivery();
    const dropped = delivery();
    live.execute(request(), kept);
    live.execute(request({ requestId: "i1:r2" }), dropped)();
    live.setRows([]);
    expect(kept).toHaveBeenCalledTimes(2);
    expect(dropped).toHaveBeenCalledTimes(1);
  });

  it("copies the records, so a caller's later mutation cannot leak in", () => {
    const mutable = [{ id: "a" }];
    const live = createArraySource({ rows: mutable, collection });
    mutable.push({ id: "b" });
    const deliver = delivery();
    live.execute(request(), deliver);
    expect(idsOf(deliveredAt(deliver, 0))).toEqual(["a"]);
  });

  it("copies the replacement records too", () => {
    const live = source();
    const replacement = [{ id: "z" }];
    live.setRows(replacement);
    // The push is only observable through a delivery made after it.
    replacement.push({ id: "y" });
    const later = delivery();
    live.execute(request({ requestId: "i1:r9" }), later);
    expect(idsOf(deliveredAt(later, 0))).toEqual(["z"]);
  });

  it("carries the application's row operations", async () => {
    const runAction = vi.fn<SourceActionRunner>().mockResolvedValue([]);
    const live = createArraySource({
      rows,
      collection,
      actions: { stop: { targets: "explicit", limit: null } },
      runAction,
    });
    expect(live.capabilities.actions["stop"]).toEqual({
      targets: "explicit",
      limit: null,
    });
    await live.runAction?.({
      action: "stop",
      targets: { kind: "explicit", ids: ["a"] },
      payload: null,
    });
    expect(runAction).toHaveBeenCalledWith({
      action: "stop",
      targets: { kind: "explicit", ids: ["a"] },
      payload: null,
    });
  });

  it("has no row operations unless the application supplies them", () => {
    expect("runAction" in source()).toBe(false);
  });
});
