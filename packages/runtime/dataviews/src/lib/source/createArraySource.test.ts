import { describe, expect, it, vi } from "vitest";
import DEFAULT_WINDOW from "../query/defaultWindow.js";
import type { Slice } from "../query/types.js";
import type { SourceDelivery } from "../result/types.js";
import type { RowRecord } from "../rows/types.js";
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

const source = () =>
  createArraySource<RowRecord>({
    rows,
    fields: ["id", "name", "cpu"],
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
  it("declares complete input and every grammar operator per field", () => {
    expect({ ...source().capabilities }).toEqual({
      filter: {
        id: ["eq", "gte", "lte", "isSet"],
        name: ["eq", "gte", "lte", "isSet"],
        cpu: ["eq", "gte", "lte", "isSet"],
      },
      search: { fields: ["name"] },
      sort: {
        fields: ["id", "name", "cpu"],
        terms: null,
        default: [],
        tiebreak: "opaque",
        collation: null,
      },
      group: { fields: [], depth: 0, summaries: "none", collapse: false },
      counts: { visible: "exact", matched: "exact", total: "exact" },
      pagination: { mode: "offset" },
      selection: { scope: "explicit" },
      lookup: { batch: null },
      actions: {},
      kinds: null,
    });
  });

  it("declares no search when no field is searchable", () => {
    expect(
      createArraySource({ rows, fields: ["id"] }).capabilities.search,
    ).toBeNull();
  });

  it("freezes its declaration against the caller's arrays", () => {
    const fields = ["id", "name"];
    const searchFields = ["name"];
    const { capabilities } = createArraySource({ rows, fields, searchFields });
    fields.push("cpu");
    searchFields.push("cpu");
    expect(capabilities.sort.fields).toEqual(["id", "name"]);
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
        counts: { visible: exact(3), matched: exact(3), total: exact(3) },
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
        counts: { visible: exact(3), matched: exact(3), total: exact(3) },
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
        counts: { visible: exact(2), matched: exact(2), total: exact(3) },
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
    const read = vi.fn((row: unknown, field: string) =>
      typeof row === "object" && row !== null
        ? (row as Record<string, unknown>)[field]
        : undefined,
    );
    const live = createArraySource({ rows, fields: ["cpu"], read });
    const query: Slice = {
      ...emptySlice,
      sort: [{ field: "cpu", direction: "asc" }],
    };
    live.execute(request({ slice: query }), delivery());
    const afterFirst = read.mock.calls.length;
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
    expect(read.mock.calls.length).toBe(afterFirst);
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
    const live = createArraySource({ rows: mutable, fields: ["id"] });
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

  it("reads fields through a caller-supplied accessor", () => {
    const live = createArraySource({
      rows: [{ record: { id: "a", cpu: 1 } }],
      fields: ["cpu"],
      read: (row, field) =>
        (row as { record: Record<string, unknown> }).record[field],
    });
    const deliver = delivery();
    live.execute(
      request({
        slice: {
          ...emptySlice,
          filter: [{ field: "cpu", operator: "eq", operands: [1] }],
        },
      }),
      deliver,
    );
    expect(deliveredAt(deliver, 0)).toMatchObject({
      page: { counts: { matched: exact(1) } },
    });
  });

  it("looks records up by identity, reporting the absent ones as missing", async () => {
    const live = source();
    const found = [
      { id: "c", status: "found", record: rows[2] },
      { id: "gone", status: "missing" },
      { id: "a", status: "found", record: rows[0] },
    ];
    await expect(live.lookup?.(["c", "gone", "a"])).resolves.toEqual(found);
    // The index outlives one call, so a second lookup reads the same
    // records rather than indexing every row again.
    await expect(live.lookup?.(["c", "gone", "a"])).resolves.toEqual(found);
  });

  it("looks up through a caller-supplied identity", async () => {
    const live = createArraySource({
      rows: [{ key: "k1" }, { key: "k2" }],
      fields: ["key"],
      identify: (row) => row.key,
    });
    await expect(live.lookup?.(["k2"])).resolves.toEqual([
      { id: "k2", status: "found", record: { key: "k2" } },
    ]);
  });

  it("looks up against the replacement records after a write", async () => {
    const live = source();
    // The identity index is kept between lookups, so the write is what has
    // to drop it; a second lookup must not answer from the old records.
    await expect(live.lookup?.(["a"])).resolves.toEqual([
      { id: "a", status: "found", record: rows[0] },
    ]);
    live.setRows([{ id: "z", name: "Zed", cpu: 1 }]);
    await expect(live.lookup?.(["a", "z"])).resolves.toEqual([
      { id: "a", status: "missing" },
      { id: "z", status: "found", record: { id: "z", name: "Zed", cpu: 1 } },
    ]);
  });

  it("carries the application's row operations", async () => {
    const runAction = vi.fn<SourceActionRunner>().mockResolvedValue([]);
    const live = createArraySource({
      rows,
      fields: ["id"],
      actions: { stop: { targets: "explicit", limit: null } },
      runAction,
    });
    expect(live.capabilities.actions.stop).toEqual({
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
