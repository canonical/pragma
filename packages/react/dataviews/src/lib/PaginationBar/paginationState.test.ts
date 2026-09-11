import type {
  CollectionCoordinatorState,
  ResultWindow,
} from "@canonical/dataviews-core";
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import paginationState from "./paginationState.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "ready"] },
]);

type Settled = {
  readonly rows: number;
  readonly count: number | null;
};

/**
 * A provider's snapshot on `window`: settled with `settled` when given, and
 * with a replacement for the next page in flight when `pending` is set.
 */
const snapshot = (
  window: ResultWindow,
  settled?: Settled,
  pending = false,
): CollectionCoordinatorState<object> => {
  const provider = createDataViewsProvider({ schema, window });
  if (settled !== undefined) {
    const requestId = provider.refresh();
    if (requestId === null) {
      throw new Error("expected a refresh request");
    }
    provider.complete(requestId, {
      status: "success",
      rows: Array.from({ length: settled.rows }, (_, at) => ({ id: `m${at}` })),
      count: settled.count,
    });
  }
  if (pending) {
    provider.navigateWindow(window.page + 1);
  }
  return provider.result.get();
};

describe("paginationState", () => {
  it("claims nothing before the first results", () => {
    expect(paginationState(snapshot({ page: 1, size: 5 }), [5])).toMatchObject({
      page: 1,
      size: 5,
      shown: null,
      total: null,
      pages: null,
      hasNext: false,
      sizes: [5],
    });
  });

  it("counts the pages a filtered total makes", () => {
    const state = paginationState(
      snapshot({ page: 2, size: 5 }, { rows: 5, count: 12 }),
      [5],
    );
    expect(state).toMatchObject({ shown: 5, total: 12, pages: 3 });
    expect(state.hasNext).toBe(true);
    expect(state.back).toBe(1);
  });

  it("steps back one page from the last", () => {
    expect(
      paginationState(
        snapshot({ page: 3, size: 5 }, { rows: 2, count: 12 }),
        [5],
      ).back,
    ).toBe(2);
  });

  it("keeps one page for an empty collection", () => {
    expect(
      paginationState(
        snapshot({ page: 1, size: 5 }, { rows: 0, count: 0 }),
        [5],
      ).pages,
    ).toBe(1);
  });

  it("offers Next without a count only while the page is full", () => {
    const window = { page: 1, size: 5 };
    expect(
      paginationState(snapshot(window, { rows: 5, count: null }), [5]).hasNext,
    ).toBe(true);
    expect(
      paginationState(snapshot(window, { rows: 4, count: null }), [5]).hasNext,
    ).toBe(false);
  });

  it("steps back from past the last page to the last one there is", () => {
    expect(
      paginationState(
        snapshot({ page: 9, size: 5 }, { rows: 0, count: 12 }),
        [5],
      ).back,
    ).toBe(3);
  });

  it("claims no count or total for a replacement in flight", () => {
    const state = paginationState(
      snapshot({ page: 1, size: 5 }, { rows: 5, count: 12 }, true),
      [5],
    );
    expect(state).toMatchObject({ page: 2, shown: null, total: null });
    expect(state.hasNext).toBe(false);
  });

  it("offers each size once, the applied one always among them", () => {
    const window = { page: 1, size: 25 };
    expect(paginationState(snapshot(window), [50, 10, 50]).sizes).toEqual([
      10, 25, 50,
    ]);
    expect(paginationState(snapshot(window), [25, 50, 25]).sizes).toEqual([
      25, 50,
    ]);
  });
});
