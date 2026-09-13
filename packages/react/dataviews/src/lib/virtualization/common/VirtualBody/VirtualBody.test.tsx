/**
 * The windowed body's contract: a bounded range of rows mounted from the
 * whole window, logical positions and counts across the gaps, the row
 * holding focus kept mounted, and a scroll that corrects itself when rows
 * above the viewport change height.
 *
 * jsdom lays nothing out, so the viewport's height, its scroll position
 * and every row's measured size are the test's to set.
 */
import {
  createDataViewsProvider,
  createSchema,
  type DataViewsProvider,
} from "@canonical/dataviews-core";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { type ReactElement, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COUNTED_EXACTLY,
  declaring,
  sorting,
} from "../../../capabilities.fixtures.js";
import {
  DataTable,
  type DataTableCellProps,
  type DataTableColumn,
  type DataTableProps,
} from "../../../DataTable/index.js";
import virtualRows from "../../virtualRows.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "running"] },
]);

type Fields = typeof schema.fields;
type Machine = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
};

const capabilities = declaring({
  filter: { status: ["eq"] },
  search: { fields: ["name"] },
  sort: sorting(["name"], 1),
  counts: COUNTED_EXACTLY,
});

/** `count` machines from `m-<from>`, each named `host-<n>`. */
const machines = (count: number, from = 0): Machine[] =>
  Array.from({ length: count }, (_, position) => ({
    id: `m-${from + position}`,
    name: `host-${from + position}`,
    status: "running",
  }));

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", resizable: true },
  { id: "status", header: "Status" },
];

/** Rows placed at 10px until measured; the viewport shows 100px. */
const windowing = virtualRows({ estimatedRowHeight: 10 });

/** A ResizeObserver the test drives: it keeps what it observes. */
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
  /** Report each element's border-box height, all at one width. */
  report(sizes: readonly (readonly [Element, number])[], width: number): void {
    for (const [target] of sizes) {
      if (!this.observed.has(target)) {
        throw new Error("reported an element nobody observes");
      }
    }
    this.#callback(
      sizes.map(([target, height]) => ({
        target,
        borderBoxSize: [{ blockSize: height, inlineSize: width }],
      })) as unknown as ResizeObserverEntry[],
      this as unknown as ResizeObserver,
    );
  }
}

/** The observer measuring the rows. */
const rowObserver = (): FakeResizeObserver => {
  const observer = FakeResizeObserver.live.find((candidate) =>
    [...candidate.observed].some(
      (element) => element.getAttribute("role") === "row",
    ),
  );
  if (observer === undefined) {
    throw new Error("no observer is measuring rows");
  }
  return observer;
};

/** Every height reported, for a page to add up as the browser would. */
const reported = new WeakMap<Element, number>();

/** Report sizes through the observer measuring the rows. */
const report = (
  sizes: readonly (readonly [Element, number])[],
  width = 400,
): void => {
  for (const [element, height] of sizes) {
    reported.set(element, height);
  }
  const observer = rowObserver();
  act(() => {
    observer.report(sizes, width);
  });
};

/** Settle a fresh request on the provider with these rows. */
const load = (
  provider: DataViewsProvider<Fields, Machine>,
  rows: readonly Machine[],
): void => {
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
};

/** Give a table a scroll position the test can set, starting at the top. */
const scrollable = (table: HTMLElement): HTMLElement => {
  Object.defineProperty(table, "scrollTop", {
    value: 0,
    writable: true,
    configurable: true,
  });
  return table;
};

const makeProvider = (): DataViewsProvider<Fields, Machine> =>
  createDataViewsProvider<Fields, Machine>({ schema, capabilities });

/** A windowed table over `rows`, scrolled to the top. */
const windowedTable = (
  rows: readonly Machine[] = machines(1000),
  props: Partial<DataTableProps<Fields, Machine>> = {},
  wrap: (table: ReactElement) => ReactElement = (table) => table,
) => {
  const provider = makeProvider();
  const view = render(
    wrap(
      <DataTable
        provider={provider}
        columns={columns}
        label="Machines"
        windowing={windowing}
        {...props}
      />,
    ),
  );
  load(provider, rows);
  return { provider, view, table: scrollable(screen.getByRole("table")) };
};

/**
 * Hold a table's scroll within its page, as a browser does, however the
 * page changes under it: its gaps and its mounted rows, each at the height
 * last reported for it, or 10px.
 */
const pageBound = (table: HTMLElement): void => {
  let top = 0;
  const bound = (value: number): number => {
    const page =
      [...table.querySelectorAll<HTMLElement>(".ds.data-table-gap")]
        .map((gap) => Number.parseFloat(gap.style.blockSize))
        .reduce((total, height) => total + height, 0) +
      [
        ...table.querySelectorAll(
          '.ds.data-table-row-group.body > [role="row"]',
        ),
      ]
        .map((row) => reported.get(row) ?? 10)
        .reduce((total, height) => total + height, 0);
    return Math.max(0, Math.min(value, page - 100));
  };
  Object.defineProperty(table, "scrollTop", {
    configurable: true,
    get: () => bound(top),
    set: (value: number) => {
      top = bound(value);
    },
  });
};

const scrollTo = (table: HTMLElement, top: number): void => {
  act(() => {
    table.scrollTop = top;
    fireEvent.scroll(table);
  });
};

/** The hosts of the mounted rows, in order. */
const mountedHosts = (scope: HTMLElement = document.body): string[] =>
  within(scope)
    .getAllByRole("row")
    .slice(1)
    .map(
      (row) =>
        row.querySelector(".ds.data-table-body-cell:not(.selection)")
          ?.textContent ?? "",
    );

/** The heights of the gaps, in order. */
const gapHeights = (table: HTMLElement): string[] =>
  [...table.querySelectorAll<HTMLElement>(".ds.data-table-gap")].map(
    (gap) => gap.style.blockSize,
  );

/** The row showing one host. */
const rowOf = (host: string): HTMLElement => {
  const row = screen.getByText(host).closest<HTMLElement>('[role="row"]');
  if (row === null) {
    throw new Error(`no row shows ${host}`);
  }
  return row;
};

beforeEach(() => {
  FakeResizeObserver.live = [];
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  // The table's viewport shows 100px; nothing else has a height.
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.getAttribute("role") === "table" ? 100 : 0;
    },
  );
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("windowed DataTable", () => {
  it("mounts the rows in view and a few past each edge, not the whole window", () => {
    const { table } = windowedTable();
    expect(mountedHosts()).toEqual(machines(15).map((row) => row.name));
    expect(gapHeights(table)).toEqual(["9850px"]);
  });

  it("counts every row and places each mounted one in logical order", () => {
    const { table } = windowedTable();
    expect(table).toHaveAttribute("aria-rowcount", "1001");
    const [header, first] = screen.getAllByRole("row");
    expect(header).toHaveAttribute("aria-rowindex", "1");
    expect(first).toHaveAttribute("aria-rowindex", "2");
    scrollTo(table, 5000);
    expect(rowOf("host-500")).toHaveAttribute("aria-rowindex", "502");
  });

  it("moves the mounted rows with the scroll", () => {
    const { table } = windowedTable();
    scrollTo(table, 5000);
    expect(mountedHosts()).toEqual(machines(19, 496).map((row) => row.name));
    expect(gapHeights(table)).toEqual(["4960px", "4850px"]);
  });

  it("shows its rows beneath the header, which the viewport keeps in view", () => {
    // A 24px header above a 100px body: the rows in view are the same.
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.getAttribute("role") === "table" ? 124 : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains("body") ? 24 : 0;
      },
    );
    const { table } = windowedTable();
    expect(mountedHosts()).toEqual(machines(15).map((row) => row.name));
    scrollTo(table, 5000);
    expect(mountedHosts()).toEqual(machines(19, 496).map((row) => row.name));
  });

  it("ends on the last row, with no gap after it", () => {
    const { table } = windowedTable();
    scrollTo(table, 9900);
    expect(rowOf("host-999")).toHaveAttribute("aria-rowindex", "1001");
    expect(gapHeights(table)).toEqual(["9860px"]);
    expect(
      table.querySelector(".ds.data-table-row-group.body")?.lastElementChild,
    ).toBe(rowOf("host-999"));
  });

  it("renders nothing for a scroll that keeps the same rows mounted", () => {
    let renders = 0;
    const Counted = ({ value }: DataTableCellProps) => {
      renders += 1;
      return <>{String(value)}</>;
    };
    const { table } = windowedTable(machines(1000), {
      columns: [{ id: "name", header: "Name", cell: Counted }],
    });
    scrollTo(table, 5000);
    renders = 0;
    scrollTo(table, 5003);
    expect(renders).toBe(0);
    // Ten rows further on, ten rows enter and only they render.
    scrollTo(table, 5100);
    expect(renders).toBe(10);
  });

  describe("focus", () => {
    it("keeps the row holding focus mounted, with its neighbours, wherever the viewport goes", () => {
      const { table } = windowedTable(machines(1000), { selectable: true });
      const checkbox = screen.getByRole("checkbox", { name: "Select m-3" });
      act(() => {
        checkbox.focus();
      });
      scrollTo(table, 5000);
      expect(checkbox).toBeInTheDocument();
      expect(document.activeElement).toBe(checkbox);
      expect(mountedHosts().slice(0, 3)).toEqual([
        "host-2",
        "host-3",
        "host-4",
      ]);
      expect(rowOf("host-3")).toHaveAttribute("aria-rowindex", "5");
      expect(gapHeights(table)).toEqual(["20px", "4910px", "4850px"]);
    });

    it("follows focus from one row to the next", () => {
      const { table } = windowedTable(machines(1000), { selectable: true });
      act(() => {
        screen.getByRole("checkbox", { name: "Select m-3" }).focus();
      });
      act(() => {
        screen.getByRole("checkbox", { name: "Select m-4" }).focus();
      });
      scrollTo(table, 5000);
      expect(mountedHosts().slice(0, 3)).toEqual([
        "host-3",
        "host-4",
        "host-5",
      ]);
    });

    it("keeps a row that already holds focus when a new range mounts it", () => {
      const { provider, table, view } = windowedTable(machines(1000), {
        selectable: true,
      });
      act(() => {
        screen.getByRole("checkbox", { name: "Select m-3" }).focus();
      });
      view.rerender(
        <DataTable
          provider={provider}
          columns={columns}
          label="Machines"
          selectable
          windowing={virtualRows({ estimatedRowHeight: 20 })}
        />,
      );
      scrollTo(table, 10_000);
      expect(
        screen.getByRole("checkbox", { name: "Select m-3" }),
      ).toBeInTheDocument();
    });

    it("ignores focus that lands on no row", () => {
      const { table } = windowedTable(machines(1000), { selectable: true });
      const group = table.querySelector<HTMLElement>(
        ".ds.data-table-row-group.body",
      );
      if (group === null) {
        throw new Error("no body row group");
      }
      fireEvent.focus(group);
      scrollTo(table, 5000);
      expect(mountedHosts()).toEqual(machines(19, 496).map((row) => row.name));
    });

    it("lets the row go once focus leaves the table", () => {
      const { table } = windowedTable(machines(1000), { selectable: true });
      const outside = document.createElement("button");
      document.body.append(outside);
      act(() => {
        screen.getByRole("checkbox", { name: "Select m-3" }).focus();
      });
      scrollTo(table, 5000);
      act(() => {
        outside.focus();
      });
      expect(screen.queryByRole("checkbox", { name: "Select m-3" })).toBeNull();
      outside.remove();
    });

    it("keeps the row while focus is only away with the window", () => {
      const { table } = windowedTable(machines(1000), { selectable: true });
      const checkbox = screen.getByRole("checkbox", { name: "Select m-3" });
      act(() => {
        checkbox.focus();
      });
      scrollTo(table, 5000);
      vi.mocked(document.hasFocus).mockReturnValue(false);
      act(() => {
        checkbox.blur();
      });
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe("measurement", () => {
    it("scrolls by what a row above the viewport grew, so the view holds still", () => {
      const { table } = windowedTable();
      scrollTo(table, 5000);
      report([
        [rowOf("host-497"), 30],
        [rowOf("host-505"), 30],
        [table, 100],
      ]);
      expect(table.scrollTop).toBe(5020);
    });

    it("forgets the heights of rows not mounted when the rows' width changes", () => {
      const { table } = windowedTable();
      report(machines(5).map((row) => [rowOf(row.name), 20] as const));
      scrollTo(table, 5000);
      report(
        mountedHosts().map((host) => [rowOf(host), 10] as const),
        500,
      );
      // The five rows at the top are back to their estimate: the view
      // moves up by the 50px they had grown.
      expect(table.scrollTop).toBe(4950);
      expect(gapHeights(table)[0]).toBe("4910px");
    });

    it("mounts more rows when the viewport grows", () => {
      const { table } = windowedTable();
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
        function (this: HTMLElement) {
          return this.getAttribute("role") === "table" ? 200 : 0;
        },
      );
      report([[table, 200]]);
      expect(mountedHosts()).toHaveLength(25);
    });

    it("observes only the rows it has mounted, however far it scrolls", () => {
      const { table } = windowedTable();
      for (let top = 0; top <= 9000; top += 1000) {
        scrollTo(table, top);
      }
      // The mounted rows and the viewport itself, nothing that has left.
      expect(rowObserver().observed.size).toBe(mountedHosts().length + 1);
    });

    it("forgets the heights of rows not mounted when a column is resized", () => {
      const { table } = windowedTable();
      report(machines(5).map((row) => [rowOf(row.name), 20] as const));
      scrollTo(table, 5000);
      // New tracks re-wrap cells, whatever the rows' own width does.
      fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });
      expect(table.scrollTop).toBe(4950);
    });

    it("holds the view at the bottom when forgotten heights grow the page", () => {
      const { table } = windowedTable();
      pageBound(table);
      report(machines(5).map((row) => [rowOf(row.name), 5] as const));
      // The very end of the page: 10,000px less 25, less the viewport.
      scrollTo(table, 9875);
      // A new width forgets the five short rows, far above: the page grows
      // by 25px and the view moves with its rows, past the page's old end.
      report(
        mountedHosts().map((host) => [rowOf(host), 10] as const),
        500,
      );
      expect(table.scrollTop).toBe(9900);
    });

    it("holds the view at the bottom when forgotten heights shrink the page", () => {
      const { table } = windowedTable();
      pageBound(table);
      report(machines(5).map((row) => [rowOf(row.name), 20] as const));
      // The very end of the page: 10,000px and 50, less the viewport.
      scrollTo(table, 9950);
      report(
        mountedHosts().map((host) => [rowOf(host), 10] as const),
        500,
      );
      // 50px up with its rows, which is the new end: not 50px past it.
      expect(table.scrollTop).toBe(9900);
    });

    it("holds the view at the bottom when forgotten heights grow some rows and shrink others", () => {
      const { table } = windowedTable();
      pageBound(table);
      // Forgetting them: two rows 10px shorter, three 5px taller, net -5.
      report([
        [rowOf("host-0"), 20],
        [rowOf("host-1"), 20],
        [rowOf("host-2"), 5],
        [rowOf("host-3"), 5],
        [rowOf("host-4"), 5],
      ]);
      scrollTo(table, 9905);
      report(
        mountedHosts().map((host) => [rowOf(host), 10] as const),
        500,
      );
      expect(table.scrollTop).toBe(9900);
    });

    it("holds the view when a row grows in the batch that forgets heights", () => {
      const { table } = windowedTable();
      pageBound(table);
      report(machines(5).map((row) => [rowOf(row.name), 5] as const));
      scrollTo(table, 9875);
      // The five short rows forgotten (+25) and host-987 above the anchor
      // measured 10px taller (+10), in one report.
      report(
        mountedHosts().map(
          (host) => [rowOf(host), host === "host-987" ? 20 : 10] as const,
        ),
        500,
      );
      expect(table.scrollTop).toBe(9910);
    });

    it("holds the view at the bottom when a mounted row above it shrinks", () => {
      const { table } = windowedTable();
      pageBound(table);
      scrollTo(table, 9900);
      report([[rowOf("host-987"), 5]]);
      expect(table.scrollTop).toBe(9895);
    });

    it("holds the view at the bottom when rows above it leave", () => {
      const rows = machines(1000);
      const { provider, table } = windowedTable(rows);
      pageBound(table);
      scrollTo(table, 9900);
      load(provider, rows.slice(5));
      expect(table.scrollTop).toBe(9850);
    });

    it("places a viewport that grew in the batch that forgot heights", () => {
      const { table } = windowedTable();
      report(machines(5).map((row) => [rowOf(row.name), 5] as const));
      scrollTo(table, 5000);
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
        function (this: HTMLElement) {
          return this.getAttribute("role") === "table" ? 200 : 0;
        },
      );
      report(
        [
          ...mountedHosts().map((host) => [rowOf(host), 10] as const),
          [table, 200],
        ],
        500,
      );
      // Twenty rows in view, one partly, and four past each edge.
      expect(table.scrollTop).toBe(5025);
      expect(mountedHosts()).toHaveLength(29);
    });

    it("holds the view at the bottom when a column resize grows the page", () => {
      const { table } = windowedTable();
      pageBound(table);
      report(machines(5).map((row) => [rowOf(row.name), 5] as const));
      scrollTo(table, 9875);
      fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });
      expect(table.scrollTop).toBe(9900);
    });

    it("forgets the height of a row whose record was replaced", () => {
      const rows = machines(1000);
      const { provider, table } = windowedTable(rows);
      report(machines(5).map((row) => [rowOf(row.name), 20] as const));
      scrollTo(table, 5000);
      load(
        provider,
        rows.map((row) =>
          row.id === "m-2" ? { ...row, name: "renamed" } : row,
        ),
      );
      expect(table.scrollTop).toBe(4990);
    });
  });

  describe("new entries", () => {
    it("keeps the view on its rows when rows arrive above them", () => {
      const rows = machines(1000);
      const { provider, table } = windowedTable(rows);
      scrollTo(table, 5000);
      load(provider, [...machines(5, 1000), ...rows]);
      expect(table.scrollTop).toBe(5050);
      expect(rowOf("host-500")).toHaveAttribute("aria-rowindex", "507");
      // The correction is made once: the same rows again move nothing.
      load(provider, [...machines(5, 1000), ...rows]);
      expect(table.scrollTop).toBe(5050);
    });

    it("shows rows arriving at the very top rather than scrolling past them", () => {
      const rows = machines(1000);
      const { provider, table } = windowedTable(rows);
      load(provider, [...machines(5, 1000), ...rows]);
      expect(table.scrollTop).toBe(0);
      expect(mountedHosts()[0]).toBe("host-1000");
    });

    it("counts and places a stale status among the rows it stands above", () => {
      const { provider, table } = windowedTable();
      act(() => {
        provider.setSearch("host-1");
      });
      const requestId = provider.state.get().pendingRequestId;
      if (requestId === null) {
        throw new Error("expected the search to issue a request");
      }
      act(() => {
        provider.complete(requestId, {
          status: "failed",
          failure: { reason: "unreachable", cause: null, transient: null },
        });
      });
      expect(table).toHaveAttribute("aria-rowcount", "1002");
      const [, status, first] = screen.getAllByRole("row");
      expect(status).toHaveAttribute("aria-rowindex", "2");
      expect(first).toHaveAttribute("aria-rowindex", "3");
    });

    it("renders an unchanged status once, however often the table renders", () => {
      const renderStatus = vi.fn(() => "Not current");
      const { provider, table, view } = windowedTable(machines(1000), {
        renderStatus,
      });
      act(() => {
        provider.setSearch("host-1");
      });
      const requestId = provider.state.get().pendingRequestId;
      if (requestId === null) {
        throw new Error("expected the search to issue a request");
      }
      act(() => {
        provider.complete(requestId, {
          status: "failed",
          failure: { reason: "unreachable", cause: null, transient: null },
        });
      });
      const calls = renderStatus.mock.calls.length;
      view.rerender(
        <DataTable
          provider={provider}
          columns={columns}
          label="Machines"
          windowing={windowing}
          renderStatus={renderStatus}
        />,
      );
      scrollTo(table, 3);
      expect(renderStatus).toHaveBeenCalledTimes(calls);
    });
  });

  it("selects every displayed row from the header, mounted or not", () => {
    const { provider } = windowedTable(machines(1000), { selectable: true });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select all displayed rows" }),
    );
    expect(provider.selection.state.get().ids.size).toBe(1000);
  });

  it("resizes a column across the rows it mounts", () => {
    const { table } = windowedTable();
    const tracks = table.style.getPropertyValue("--data-table-columns");
    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });
    expect(table.style.getPropertyValue("--data-table-columns")).not.toBe(
      tracks,
    );
  });

  it("keeps each table's own range, whatever descriptor they share", () => {
    const first = makeProvider();
    const second = makeProvider();
    render(
      <>
        <DataTable
          provider={first}
          columns={columns}
          label="First"
          windowing={windowing}
        />
        <DataTable
          provider={second}
          columns={columns}
          label="Second"
          windowing={windowing}
        />
      </>,
    );
    load(first, machines(1000));
    load(second, machines(1000));
    const [one, two] = screen.getAllByRole("table").map(scrollable);
    scrollTo(one, 5000);
    expect(mountedHosts(one)).toContain("host-500");
    expect(mountedHosts(two)[0]).toBe("host-0");
  });

  it("windows by its estimates where nothing can measure", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    windowedTable();
    expect(mountedHosts()).toHaveLength(15);
  });

  it("keeps its range, focus and anchor through StrictMode's double mount", () => {
    const { table } = windowedTable(
      machines(1000),
      { selectable: true },
      (element) => <StrictMode>{element}</StrictMode>,
    );
    expect(mountedHosts()).toHaveLength(15);
    act(() => {
      screen.getByRole("checkbox", { name: "Select m-3" }).focus();
    });
    scrollTo(table, 5000);
    expect(document.activeElement).toBe(
      screen.getByRole("checkbox", { name: "Select m-3" }),
    );
    report([[rowOf("host-497"), 30]]);
    expect(table.scrollTop).toBe(5020);
  });

  it("measures the rows it mounted before a double mount remounted it", () => {
    const provider = makeProvider();
    load(provider, machines(1000));
    render(
      <StrictMode>
        <DataTable
          provider={provider}
          columns={columns}
          label="Machines"
          windowing={windowing}
        />
      </StrictMode>,
    );
    const table = scrollable(screen.getByRole("table"));
    report([[rowOf("host-2"), 30]]);
    scrollTo(table, 5000);
    // host-2 measured 20px taller, so the rows in view start two rows
    // earlier than the estimates alone would put them.
    expect(mountedHosts()[0]).toBe("host-494");
  });

  it("starts a new range when the estimate changes", () => {
    const { provider, view } = windowedTable();
    view.rerender(
      <DataTable
        provider={provider}
        columns={columns}
        label="Machines"
        windowing={virtualRows({ estimatedRowHeight: 20 })}
      />,
    );
    expect(mountedHosts()).toHaveLength(10);
  });

  it("leaves nothing observing or listening once unmounted", () => {
    const added = vi.spyOn(EventTarget.prototype, "addEventListener");
    const removed = vi.spyOn(EventTarget.prototype, "removeEventListener");
    const { table, view } = windowedTable();
    const ours = added.mock.calls.flatMap(([type, listener], call) => {
      const target = added.mock.contexts[call];
      return type === "scroll" &&
        target instanceof Node &&
        (target === table || table.contains(target))
        ? [{ target, type, listener }]
        : [];
    });
    expect(ours.length).toBeGreaterThan(0);
    view.unmount();
    for (const { target, type, listener } of ours) {
      expect(
        removed.mock.calls.some(
          ([removedType, removedListener], call) =>
            removed.mock.contexts[call] === target &&
            removedType === type &&
            removedListener === listener,
        ),
      ).toBe(true);
    }
    expect(
      FakeResizeObserver.live.every((observer) => observer.observed.size === 0),
    ).toBe(true);
  });

  it("hydrates the server's whole window without a mismatch, then narrows it", async () => {
    const errors = vi.spyOn(console, "error");
    const provider = makeProvider();
    load(provider, machines(100));
    const table = (
      <DataTable
        provider={provider}
        columns={columns}
        label="Machines"
        windowing={windowing}
      />
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(table);
    document.body.append(container);
    expect(container.querySelectorAll('[role="row"]')).toHaveLength(101);
    const root = await act(async () => hydrateRoot(container, table));
    expect(errors).not.toHaveBeenCalled();
    expect(container.querySelectorAll('[role="row"]')).toHaveLength(16);
    // A row hydrated from the server's markup is measured like any other.
    const hydrated = container.querySelector('[aria-rowindex="4"]');
    if (hydrated === null) {
      throw new Error("no hydrated row");
    }
    report([[hydrated, 30]]);
    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
