import { describe, expect, it, vi } from "vitest";
import type { CompletionResult } from "../collection/createCollectionCoordinator.js";
import type { Slice } from "../query/types.js";
import createArraySource from "./createArraySource.js";
import type { SourceActionRunner, SourceRequest } from "./types.js";

const emptySlice: Slice = { filter: [], search: null, sort: [], group: null };

const request = (overrides: Partial<SourceRequest> = {}): SourceRequest => ({
  requestId: "i1:r1",
  slice: emptySlice,
  window: { page: 1, size: 2 },
  ...overrides,
});

const rows = [
  { id: "a", name: "Alpha", cpu: 4 },
  { id: "b", name: "beta", cpu: 12 },
  { id: "c", name: "Gamma", cpu: 8 },
];

const source = () =>
  createArraySource({
    rows,
    fields: ["id", "name", "cpu"],
    searchFields: ["name"],
  });

const delivery = () => vi.fn<(result: CompletionResult) => void>();

/** The nth delivery, or a failure rather than a silently skipped assertion. */
const deliveredAt = (
  deliver: ReturnType<typeof delivery>,
  index: number,
): CompletionResult => {
  const call = deliver.mock.calls[index];
  if (call === undefined) {
    throw new Error(`expected a delivery at index ${index}`);
  }
  return call[0];
};

const idsOf = (result: CompletionResult) =>
  result.status === "success"
    ? result.rows.map((row) => (row as { id: string }).id)
    : [result.reason];

describe("createArraySource", () => {
  it("declares complete input and every grammar operator per field", () => {
    expect({ ...source().capabilities }).toEqual({
      filter: {
        id: ["eq", "gte", "lte", "isSet"],
        name: ["eq", "gte", "lte", "isSet"],
        cpu: ["eq", "gte", "lte", "isSet"],
      },
      search: ["name"],
      sort: ["id", "name", "cpu"],
      sortTerms: null,
      group: [],
      count: "filtered",
    });
  });

  it("declares no search when no field is searchable", () => {
    expect(
      createArraySource({ rows, fields: ["id"] }).capabilities.search,
    ).toEqual([]);
  });

  it("freezes its declaration against the caller's arrays", () => {
    const fields = ["id", "name"];
    const searchFields = ["name"];
    const { capabilities } = createArraySource({ rows, fields, searchFields });
    fields.push("cpu");
    searchFields.push("cpu");
    expect(capabilities.sort).toEqual(["id", "name"]);
    expect(capabilities.search).toEqual(["name"]);
    expect(Object.isFrozen(capabilities)).toBe(true);
    expect(Object.isFrozen(capabilities.sort)).toBe(true);
  });

  it("delivers the requested window synchronously with the filtered total", () => {
    const deliver = delivery();
    source().execute(request(), deliver);
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliveredAt(deliver, 0)).toEqual({
      status: "success",
      rows: [rows[0], rows[1]],
      count: 3,
    });
  });

  it("counts the filtered set, not the loaded page", () => {
    const deliver = delivery();
    source().execute(
      request({
        slice: { ...emptySlice, search: "a" },
        window: { page: 1, size: 1 },
      }),
      deliver,
    );
    expect(deliveredAt(deliver, 0)).toEqual({
      status: "success",
      rows: [rows[0]],
      count: 3,
    });
  });

  it("windows past the end of the result as an empty page", () => {
    const deliver = delivery();
    source().execute(request({ window: { page: 3, size: 2 } }), deliver);
    expect(deliveredAt(deliver, 0)).toEqual({
      status: "success",
      rows: [],
      count: 3,
    });
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
        window: { page: 2, size: 2 },
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
    expect(deliveredAt(deliver, 0)).toMatchObject({ count: 1 });
  });

  it("carries the application's row operations", async () => {
    const runAction = vi.fn<SourceActionRunner>().mockResolvedValue([]);
    const live = createArraySource({ rows, fields: ["id"], runAction });
    await live.runAction?.({ action: "stop", targets: ["a"], payload: null });
    expect(runAction).toHaveBeenCalledWith({
      action: "stop",
      targets: ["a"],
      payload: null,
    });
  });

  it("has no row operations unless the application supplies them", () => {
    expect("runAction" in source()).toBe(false);
  });
});
