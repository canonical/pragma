/**
 * The windowed table's share of the representative performance suite, as
 * far as jsdom takes it: bounded DOM at every scroll position of a large
 * local window, work in proportion to the rows entering the range, no row
 * work for a selection or a resize, variable-height rows, and repeated
 * mounting that leaves nothing subscribed. Layout, paint and latency need
 * a browser and are not measured here.
 */
import type { DataViewsProvider } from "@canonical/dataviews-core";
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DataTable from "../DataTable/DataTable.js";
import type {
  DataTableCellProps,
  DataTableColumn,
} from "../DataTable/types.js";
import virtualRows from "./virtualRows.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "running"] },
]);

type Fields = typeof schema.fields;
type Machine = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
};

const rows: readonly Machine[] = Array.from(
  { length: 10_000 },
  (_, position) => ({
    id: `m-${position}`,
    name: `host-${position}`,
    status: "running",
  }),
);

/** 32px rows in a 640px viewport: twenty in view, four more past each edge. */
const rowHeight = 32;
const inView = 640 / rowHeight;
const mountedAtMost = inView + 1 + 2 * 4;

let cellRenders = 0;

/** A cell that counts its renders: every mounted row renders one. */
function CountedCell({ value }: DataTableCellProps) {
  cellRenders += 1;
  return <>{String(value)}</>;
}

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", cell: CountedCell, resizable: true },
  { id: "status", header: "Status" },
];

/** A ResizeObserver the test drives. */
class FakeResizeObserver {
  static live: FakeResizeObserver[] = [];
  readonly observed = new Set<Element>();
  readonly #callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
    FakeResizeObserver.live.push(this);
  }
  observe(target: Element): void {
    this.observed.add(target);
  }
  unobserve(target: Element): void {
    this.observed.delete(target);
  }
  disconnect(): void {
    this.observed.clear();
  }
  report(sizes: readonly (readonly [Element, number])[]): void {
    this.#callback(
      sizes.map(([target, height]) => ({
        target,
        borderBoxSize: [{ blockSize: height, inlineSize: 800 }],
      })) as unknown as ResizeObserverEntry[],
      this as unknown as ResizeObserver,
    );
  }
}

/** A windowed table over all ten thousand rows, scrolled to the top. */
const largeTable = (selectable = false) => {
  const provider: DataViewsProvider<Fields, Machine> = createDataViewsProvider<
    Fields,
    Machine
  >({ schema });
  const view = render(
    <DataTable
      provider={provider}
      columns={columns}
      label="Machines"
      selectable={selectable}
      windowing={virtualRows({ estimatedRowHeight: rowHeight })}
    />,
  );
  const requestId = provider.refresh();
  if (requestId === null) {
    throw new Error("expected a refresh request");
  }
  const counted = { kind: "exact", value: rows.length } as const;
  act(() => {
    provider.complete(requestId, {
      status: "succeeded",
      page: {
        rows,
        groups: null,
        counts: { visible: counted, matched: counted, total: counted },
        more: null,
        cursors: null,
      },
    });
  });
  const table = screen.getByRole("table");
  Object.defineProperty(table, "scrollTop", {
    value: 0,
    writable: true,
    configurable: true,
  });
  return { provider, view, table };
};

const scrollTo = (table: HTMLElement, top: number): void => {
  act(() => {
    table.scrollTop = top;
    fireEvent.scroll(table);
  });
};

/** The body rows mounted right now. */
const mountedRows = (table: HTMLElement): HTMLElement[] => [
  ...table.querySelectorAll<HTMLElement>(
    '.ds.data-table-row-group.body > [role="row"]',
  ),
];

beforeEach(() => {
  cellRenders = 0;
  FakeResizeObserver.live = [];
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.getAttribute("role") === "table" ? 640 : 0;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("windowed DataTable, bounded work", () => {
  it("mounts a bounded range of a 10,000-row window at every scroll position", () => {
    const { table } = largeTable();
    for (let top = 0; top < rows.length * rowHeight; top += 3_200) {
      scrollTo(table, top);
      const mounted = mountedRows(table);
      expect(mounted.length).toBeLessThanOrEqual(mountedAtMost);
      expect(mounted.length).toBeGreaterThanOrEqual(inView);
      // The row at the viewport's top is among them, at its position.
      expect(
        mounted.some(
          (row) =>
            row.getAttribute("aria-rowindex") === String(top / rowHeight + 2),
        ),
      ).toBe(true);
    }
    // Every element under the table, gaps and cells included, stays
    // bounded by the mounted rows rather than the window.
    expect(table.querySelectorAll("*").length).toBeLessThan(200);
  });

  it("renders only the rows entering the range as it scrolls", () => {
    const { table } = largeTable();
    scrollTo(table, 16_000);
    for (let step = 1; step <= 20; step += 1) {
      cellRenders = 0;
      scrollTo(table, 16_000 + step * 10 * rowHeight);
      expect(cellRenders).toBe(10);
    }
  });

  it("renders no cell for a scroll inside the range, a selection or a resize", () => {
    const { provider, table } = largeTable(true);
    scrollTo(table, 16_000);
    cellRenders = 0;
    scrollTo(table, 16_005);
    act(() => {
      provider.selection.toggle("m-505");
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select all displayed rows" }),
    );
    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });
    expect(cellRenders).toBe(0);
    expect(provider.selection.state.get().ids.size).toBe(rows.length);
  });

  it("keeps its gaps equal to the rows they stand for, however tall each is", () => {
    const { table } = largeTable();
    const measured = mountedRows(table).map(
      (row, position) => [row, position % 2 === 0 ? 32 : 64] as const,
    );
    const [observer] = FakeResizeObserver.live.filter((candidate) =>
      candidate.observed.has(measured[0][0]),
    );
    act(() => {
      observer.report(measured);
    });
    scrollTo(table, 160_000);
    const [before] = table.querySelectorAll<HTMLElement>(".ds.data-table-gap");
    const first = Number(mountedRows(table)[0].getAttribute("aria-rowindex"));
    // Every row before the first mounted one: the measured ones at their
    // measured heights, the rest at the estimate.
    const grown = measured.reduce((total, [, height]) => total + height, 0);
    expect(before.style.blockSize).toBe(
      `${grown + (first - 2 - measured.length) * rowHeight}px`,
    );
  });

  it("leaves nothing subscribed or observed after repeated mounting", () => {
    const provider = createDataViewsProvider<Fields, Machine>({ schema });
    let live = 0;
    for (const channel of [provider.rows, provider.state]) {
      const subscribe = channel.subscribe;
      vi.spyOn(channel, "subscribe").mockImplementation((listener) => {
        live += 1;
        const unsubscribe = subscribe(listener);
        return () => {
          live -= 1;
          unsubscribe();
        };
      });
    }
    for (let cycle = 0; cycle < 25; cycle += 1) {
      const { unmount } = render(
        <DataTable
          provider={provider}
          columns={columns}
          label="Machines"
          windowing={virtualRows({ estimatedRowHeight: rowHeight })}
        />,
      );
      unmount();
    }
    expect(live).toBe(0);
    expect(
      FakeResizeObserver.live.every((observer) => observer.observed.size === 0),
    ).toBe(true);
  });
});
