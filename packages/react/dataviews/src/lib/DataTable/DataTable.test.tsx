/**
 * The renderer's contract: div rows sharing one published track list, roles
 * that carry the relationships the elements do not, keyed observation so an
 * unrelated change does no work, and one scope per row rather than one per
 * cell. Each case is mutation-tested against that contract.
 */
import type {
  ColumnLayout,
  Completion,
  DataViewsProvider,
} from "@canonical/dataviews-core";
import {
  createColumnLayout,
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { createRef, StrictMode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  COUNTED_EXACTLY,
  declaring,
  delivered,
  exact,
  sorting,
} from "../capabilities.fixtures.js";
import useDataViewsCell from "../DataViews/hooks/useDataViewsCell.js";
import useDataViewsValue from "../DataViews/hooks/useDataViewsValue.js";
import DataTable from "./DataTable.js";
import type { DataTableCellProps, DataTableColumn } from "./types.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "running"] },
]);

type Fields = typeof schema.fields;
type Machine = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly cores: number;
};

const machine = (id: string, name: string, status = "running"): Machine => ({
  id,
  name,
  status,
  cores: 4,
});

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", sortable: true },
  { id: "status", header: "Status" },
];

/** What the fixture source declares: it can order by `name` alone. */
const capabilities = declaring({
  filter: { status: ["eq"] },
  search: { fields: ["name"] },
  sort: sorting(["name"], 1),
  counts: COUNTED_EXACTLY,
});

const makeProvider = (): DataViewsProvider<Fields, Machine> =>
  createDataViewsProvider<Fields, Machine>({ schema, capabilities });

/** A request the source accepted and could not complete. */
const failure = (reason: string): Completion<Machine> => ({
  status: "failed",
  failure: { reason, cause: new Error(reason), transient: null },
});

/** Refresh and return the request id, failing loudly rather than casting. */
const refreshRequest = (
  provider:
    | DataViewsProvider<Fields, Machine>
    | DataViewsProvider<Fields, Record<string, unknown>>,
): string => {
  const requestId = provider.refresh();
  if (requestId === null) {
    throw new Error("expected a refresh request");
  }
  return requestId;
};

/** The request a query edit issued, failing loudly rather than casting. */
const pendingRequest = (
  provider: DataViewsProvider<Fields, Machine>,
): string => {
  const requestId = provider.state.get().pendingRequestId;
  if (requestId === null) {
    throw new Error("expected a pending request");
  }
  return requestId;
};

const load = (
  provider: DataViewsProvider<Fields, Machine>,
  rows: readonly Machine[],
): void => {
  const requestId = refreshRequest(provider);
  act(() => {
    provider.complete(requestId, delivered(rows));
  });
};

const loadedTable = (
  rows: readonly Machine[] = [machine("m-1", "alpha"), machine("m-2", "beta")],
  extra: Partial<Parameters<typeof DataTable<Fields, Machine>>[0]> = {},
) => {
  const provider = makeProvider();
  const view = render(
    <DataTable
      provider={provider}
      columns={columns}
      label="Machines"
      {...extra}
    />,
  );
  load(provider, rows);
  return { provider, view };
};

describe("DataTable", () => {
  it("refuses a value that is not a provider", () => {
    const notAProvider = {} as DataViewsProvider<Fields, Machine>;
    expect(() =>
      render(
        <DataTable
          provider={notAProvider}
          columns={columns}
          label="Machines"
        />,
      ),
    ).toThrow(
      "DataTable requires a provider created by createDataViewsProvider",
    );
  });

  it("renders the table relationships as roles over div geometry", () => {
    loadedTable();
    const table = screen.getByRole("table", { name: "Machines" });
    expect(table.tagName).toBe("DIV");
    expect(within(table).getAllByRole("rowgroup")).toHaveLength(2);
    expect(
      screen.getAllByRole("columnheader").map((c) => c.textContent),
    ).toEqual(["Name", "Status"]);
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(
      within(screen.getAllByRole("row")[1])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["alpha", "running"]);
  });

  // The geometry is one publication on the container and one class on every
  // row: `styles.css` reads the custom property into the shared
  // `grid-template-columns`, so no row ever carries a width of its own. The
  // stylesheet is not applied under jsdom, so what is pinned here is the two
  // halves of that contract — the published value, and the class that reads
  // it — rather than a resolved computed style.
  it("publishes one track list on the container and shares it with every row", () => {
    loadedTable();
    const table = screen.getByRole("table", { name: "Machines" });
    expect(table.style.getPropertyValue("--data-table-columns")).not.toBe("");
    for (const row of screen.getAllByRole("row")) {
      expect(row.matches(".ds.data-table-row")).toBe(true);
      expect(row.getAttribute("style")).toBeNull();
    }
    expect(table.querySelector('[role="cell"][style]')).toBeNull();
  });

  it("merges the caller's class name and inline style onto the root", () => {
    loadedTable([machine("m-1", "alpha")], {
      className: "host",
      style: { opacity: 0.5 },
      id: "machines",
    });
    const table = screen.getByRole("table", { name: "Machines" });
    expect(table.className).toBe("ds data-table dense host");
    expect(table.style.opacity).toBe("0.5");
    expect(table.id).toBe("machines");
  });

  it("hands the root to a caller's callback ref without losing its own", () => {
    const provider = makeProvider();
    const seen: (HTMLDivElement | null)[] = [];
    const { unmount } = render(
      <DataTable
        provider={provider}
        columns={columns}
        label="Machines"
        ref={(node) => {
          seen.push(node);
        }}
      />,
    );
    const table = screen.getByRole("table", { name: "Machines" });
    expect(seen).toEqual([table]);
    // The table still measured its own container: its geometry ref survived.
    expect(table.style.getPropertyValue("--data-table-columns")).not.toBe("");
    unmount();
    expect(seen).toEqual([table, null]);
  });

  it("honours the cleanup a React 19 callback ref returns", () => {
    const provider = makeProvider();
    const seen: (HTMLDivElement | null)[] = [];
    let cleanups = 0;
    const { unmount } = render(
      <DataTable
        provider={provider}
        columns={columns}
        label="Machines"
        ref={(node) => {
          seen.push(node);
          return () => {
            cleanups += 1;
          };
        }}
      />,
    );
    const table = screen.getByRole("table", { name: "Machines" });
    expect(seen).toEqual([table]);
    unmount();
    // The cleanup ran, and it replaced the null call rather than joining it.
    expect(cleanups).toBe(1);
    expect(seen).toEqual([table]);
  });

  it("keeps one attachment across renders that rebuild the caller's ref", () => {
    const provider = makeProvider();
    const attachments: (HTMLDivElement | null)[] = [];
    const Host = (): ReactElement => {
      const [tick, setTick] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setTick(tick + 1)}>
            rerender
          </button>
          <DataTable
            provider={provider}
            columns={columns}
            label="Machines"
            // Rebuilt on every render: the table must not detach and
            // re-measure its container because of it.
            ref={(node) => {
              attachments.push(node);
            }}
          />
        </>
      );
    };
    render(<Host />);
    expect(attachments).toHaveLength(1);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "rerender" }));
    });
    expect(attachments).toHaveLength(1);
  });

  it("fills and clears a caller's ref object", () => {
    const provider = makeProvider();
    const ref = createRef<HTMLDivElement>();
    const { unmount } = render(
      <DataTable
        provider={provider}
        columns={columns}
        label="Machines"
        ref={ref}
      />,
    );
    expect(ref.current).toBe(screen.getByRole("table", { name: "Machines" }));
    unmount();
    expect(ref.current).toBeNull();
  });

  it("renders primitive values as text and leaves other values to a renderer", () => {
    const provider = makeProvider();
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name" },
          { id: "cores", header: "Cores" },
          { id: "status", header: "Status" },
        ]}
        label="Machines"
      />,
    );
    load(provider, [
      {
        id: "m-1",
        name: "alpha",
        cores: 4,
        status: "running",
      } as Machine,
      {
        id: "m-2",
        name: "beta",
        cores: 8,
        status: "running",
      } as Machine,
    ]);
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells.map((cell) => cell.textContent)).toEqual([
      "alpha",
      "4",
      "running",
    ]);
  });

  it("renders booleans, bigints and unrenderable values by their own rules", () => {
    const provider = createDataViewsProvider<Fields, Record<string, unknown>>({
      schema,
    });
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "flag", header: "Flag" },
          { id: "big", header: "Big" },
          { id: "shape", header: "Shape" },
          { id: "missing", header: "Missing" },
        ]}
        label="Machines"
      />,
    );
    const requestId = refreshRequest(provider);
    act(() => {
      provider.complete(
        requestId,
        delivered<Record<string, unknown>>([
          { id: "m-1", flag: false, big: 9007199254740993n, shape: {} },
        ]),
      );
    });
    expect(
      within(screen.getAllByRole("row")[1])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["false", "9007199254740993", "", ""]);
  });

  it("reads the record field a column names instead of its own id", () => {
    const provider = makeProvider();
    render(
      <DataTable
        provider={provider}
        columns={[{ id: "machine-name", header: "Name", field: "name" }]}
        label="Machines"
      />,
    );
    load(provider, [machine("m-1", "alpha")]);
    expect(screen.getAllByRole("cell")[0].textContent).toBe("alpha");
  });

  it("renders a column's own content inside that cell's scope", () => {
    const Badge = ({ value, rowId, columnId }: DataTableCellProps) => {
      const cell = useDataViewsCell(provider);
      const record = useDataViewsValue(cell.row) as Machine;
      return (
        <span data-testid={`${rowId}-${columnId}`}>
          {String(value)} of {record.name}
        </span>
      );
    };
    const provider = makeProvider();
    render(
      <DataTable
        provider={provider}
        columns={[{ id: "status", header: "Status", cell: Badge }]}
        label="Machines"
      />,
    );
    load(provider, [machine("m-1", "alpha", "failed")]);
    expect(screen.getByTestId("m-1-status").textContent).toBe(
      "failed of alpha",
    );
  });

  it("cycles one column's ordering and describes it with aria-sort", async () => {
    const { provider } = loadedTable();
    const [sortable, plain] = screen.getAllByRole("columnheader");
    expect(sortable).toHaveAttribute("aria-sort", "none");
    expect(plain).not.toHaveAttribute("aria-sort");
    // The chevron repeats the order for the eye, hidden from assistive
    // technology; a column at rest shows none.
    const glyph = () =>
      screen.getAllByRole("columnheader")[0].querySelector("svg");
    expect(glyph()).toBeNull();

    const button = within(sortable).getByRole("button", { name: "Name" });
    fireEvent.click(button);
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
    ]);
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(glyph()).toHaveAttribute("aria-hidden", "true");
    expect(glyph()?.querySelector("use")).toHaveAttribute(
      "href",
      expect.stringMatching(/#chevron-up$/),
    );
    expect(button).toHaveAccessibleName("Name");

    fireEvent.click(button);
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(glyph()?.querySelector("use")).toHaveAttribute(
      "href",
      expect.stringMatching(/#chevron-down$/),
    );

    fireEvent.click(button);
    expect(provider.state.get().slice.sort).toEqual([]);
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute(
      "aria-sort",
      "none",
    );
    expect(glyph()).toBeNull();
  });

  it("says it is loading, without announcing it as a status message", () => {
    const provider = makeProvider();
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    expect(screen.getByRole("row", { name: "Loading…" })).toBeInTheDocument();
    // Nothing has gone wrong and nothing has arrived: there is no outcome to
    // announce, so the row is not a `role="status"` live region.
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("tells an empty collection from a query that matched nothing", () => {
    // The two call for different responses — add something, or change the
    // query — so they are never one message.
    const provider = makeProvider();
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    load(provider, []);
    expect(screen.getByText("There is nothing here yet.")).toBeInTheDocument();
    act(() => {
      provider.setSearch("alpha");
    });
    load(provider, []);
    expect(screen.getByText("No rows match this query.")).toBeInTheDocument();
  });

  it("lets the caller replace the words of an outcome", () => {
    const provider = makeProvider();
    render(
      <DataTable
        provider={provider}
        columns={columns}
        label="Machines"
        renderStatus={(status) => <em>nothing: {status.status}</em>}
      />,
    );
    load(provider, []);
    act(() => {
      provider.setSearch("alpha");
    });
    load(provider, []);
    expect(screen.getByText("nothing: no-results")).toBeInTheDocument();
  });

  it("reports no sorted column for a declared default the header does not read yet", () => {
    // Seam for the header unit: a source's declared default already orders
    // its rows, but the header does not report it yet, so it claims no
    // sorted column rather than half of that contract.
    const declared = declaring({
      filter: { status: ["eq"] },
      sort: {
        ...sorting(["name"], 1),
        default: [{ field: "name", direction: "asc" }],
      },
      counts: COUNTED_EXACTLY,
    });
    const provider = createDataViewsProvider<Fields, Machine>({
      schema,
      capabilities: declared,
    });
    render(
      <DataTable
        provider={provider}
        columns={[{ id: "name", header: "Name", sortable: true }]}
        label="Machines"
      />,
    );
    load(provider, [machine("m-1", "alpha")]);
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
      "aria-sort",
      "none",
    );
  });

  it("offers a real checkbox per row, named after the record", () => {
    const { provider } = loadedTable(
      [machine("m-1", "alpha"), machine("m-2", "beta")],
      { selectable: true, rowLabel: (row) => row.name },
    );
    const checkbox = screen.getByRole("checkbox", { name: "Select alpha" });
    expect(screen.getAllByRole("row")[1]).toHaveAttribute(
      "aria-selected",
      "false",
    );
    fireEvent.click(checkbox);
    expect([...provider.selection.state.get().ids]).toEqual(["m-1"]);
    expect(screen.getAllByRole("row")[1]).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getAllByRole("row")[1].className).toBe(
      "ds data-table-row selected",
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Select alpha" }));
    expect(provider.selection.state.get().ids.size).toBe(0);
  });

  it("names a row by its identity when no label is supplied", () => {
    loadedTable([machine("m-1", "alpha")], { selectable: true });
    expect(
      screen.getByRole("checkbox", { name: "Select m-1" }),
    ).toBeInTheDocument();
  });

  it("omits aria-selected where selection is not offered", () => {
    loadedTable([machine("m-1", "alpha")]);
    expect(screen.getAllByRole("row")[1]).not.toHaveAttribute("aria-selected");
  });

  it("leaves row counts and positions to a windowed table", () => {
    loadedTable([machine("m-1", "alpha")]);
    expect(screen.getByRole("table")).not.toHaveAttribute("aria-rowcount");
    for (const row of screen.getAllByRole("row")) {
      expect(row).not.toHaveAttribute("aria-rowindex");
    }
  });

  it("selects and clears exactly the displayed rows from the header", () => {
    const { provider } = loadedTable(
      [machine("m-1", "alpha"), machine("m-2", "beta")],
      { selectable: true },
    );
    act(() => {
      provider.selection.add(["elsewhere"]);
    });
    const selectAll = screen.getByRole("checkbox", {
      name: "Select all displayed rows",
    }) as HTMLInputElement;
    expect(selectAll.checked).toBe(false);
    expect(selectAll.indeterminate).toBe(false);

    fireEvent.click(selectAll);
    expect([...provider.selection.state.get().ids].sort()).toEqual([
      "elsewhere",
      "m-1",
      "m-2",
    ]);
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Select all displayed rows",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select all displayed rows" }),
    );
    expect([...provider.selection.state.get().ids]).toEqual(["elsewhere"]);
  });

  it("shows a partial selection of the displayed rows as mixed", () => {
    const { provider } = loadedTable(
      [machine("m-1", "alpha"), machine("m-2", "beta")],
      { selectable: true },
    );
    act(() => {
      provider.selection.add(["m-1"]);
    });
    const selectAll = screen.getByRole("checkbox", {
      name: "Select all displayed rows",
    }) as HTMLInputElement;
    expect(selectAll.checked).toBe(false);
    expect(selectAll.indeterminate).toBe(true);
  });

  it("offers select-all against an empty displayed set without claiming it is checked", () => {
    loadedTable([], { selectable: true });
    const selectAll = screen.getByRole("checkbox", {
      name: "Select all displayed rows",
    }) as HTMLInputElement;
    expect(selectAll.checked).toBe(false);
    expect(selectAll.indeterminate).toBe(false);
  });

  it("notifies only the row whose selection membership moved", () => {
    const renders: string[] = [];
    const Probe = ({ rowId }: DataTableCellProps) => {
      // Reads the row's membership, so this probe is notified exactly when
      // that row's selection channel publishes.
      useDataViewsValue(useDataViewsCell(provider).selected);
      renders.push(rowId);
      return null;
    };
    const provider = makeProvider();
    render(
      <DataTable
        provider={provider}
        columns={[{ id: "name", header: "Name", cell: Probe }]}
        label="Machines"
        selectable
      />,
    );
    load(provider, [machine("m-1", "alpha"), machine("m-2", "beta")]);
    renders.length = 0;
    act(() => {
      provider.selection.toggle("m-2");
    });
    expect(renders).toEqual(["m-2"]);
  });

  it("notifies only the cells whose field values changed", () => {
    const renders: string[] = [];
    const Probe = ({ rowId, columnId }: DataTableCellProps) => {
      renders.push(`${rowId}/${columnId}`);
      return null;
    };
    const provider = makeProvider();
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name", cell: Probe },
          { id: "status", header: "Status", cell: Probe },
        ]}
        label="Machines"
      />,
    );
    load(provider, [machine("m-1", "alpha"), machine("m-2", "beta")]);
    renders.length = 0;
    load(provider, [machine("m-1", "alpha", "failed"), machine("m-2", "beta")]);
    expect(renders).toEqual(["m-1/status"]);
  });

  it("mints one scope per row, shared by its cells and stable across renders", () => {
    const seen: { rowId: string; row: unknown; provider: unknown }[] = [];
    const Probe = () => {
      const cell = useDataViewsCell(provider);
      seen.push({
        rowId: cell.rowId,
        row: cell.row,
        provider: provider.identity,
      });
      return null;
    };
    const provider = makeProvider();
    const Host = (): ReactElement => {
      const [tick, setTick] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setTick(tick + 1)}>
            rerender
          </button>
          <DataTable
            provider={provider}
            // Rebuilt on every render: content, not array identity, keys the
            // registry, so nothing may be re-minted.
            columns={[
              { id: "name", header: "Name", cell: Probe },
              { id: "status", header: "Status", cell: Probe },
            ]}
            label="Machines"
          />
        </>
      );
    };
    render(<Host />);
    load(provider, [machine("m-1", "alpha"), machine("m-2", "beta")]);
    const firstRow = seen.filter((entry) => entry.rowId === "m-1");
    expect(firstRow).toHaveLength(2);
    expect(firstRow[0].row).toBe(firstRow[1].row);
    expect(firstRow[0].row).not.toBe(
      seen.find((entry) => entry.rowId === "m-2")?.row,
    );

    seen.length = 0;
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "rerender" }));
    });
    // The rebuilt array says the same thing, so nothing below the header
    // re-rendered at all.
    expect(seen).toEqual([]);

    // And nothing was re-minted: the next record change reaches the same
    // scope the first render handed out.
    load(provider, [machine("m-1", "alpha", "failed"), machine("m-2", "beta")]);
    expect(seen.filter((entry) => entry.rowId === "m-1")[0].row).toBe(
      firstRow[0].row,
    );
    expect(new Set(seen.map((entry) => entry.provider)).size).toBe(1);
  });

  it("rebuilds its model when a column genuinely changes", () => {
    const provider = makeProvider();
    const { rerender } = render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    load(provider, [machine("m-1", "alpha")]);
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Name", "Status"]);
    rerender(
      <DataTable
        provider={provider}
        columns={[...columns, { id: "cores", header: "Cores" }]}
        label="Machines"
      />,
    );
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Name", "Status", "Cores"]);
    expect(
      within(screen.getAllByRole("row")[1])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["alpha", "running", "4"]);
  });

  it("stops observing the collection when the table unmounts", () => {
    const renders: string[] = [];
    const Probe = ({ rowId }: DataTableCellProps) => {
      renders.push(rowId);
      return null;
    };
    const provider = makeProvider();
    const { unmount } = render(
      <DataTable
        provider={provider}
        columns={[{ id: "name", header: "Name", cell: Probe }]}
        label="Machines"
      />,
    );
    load(provider, [machine("m-1", "alpha")]);
    unmount();
    renders.length = 0;
    load(provider, [machine("m-1", "alpha", "failed")]);
    act(() => {
      provider.selection.toggle("m-1");
    });
    expect(renders).toEqual([]);
  });

  it("shares user arrangement between two tables on one layout", () => {
    const provider = makeProvider();
    const layout: ColumnLayout = createColumnLayout([
      { id: "name", sizing: { kind: "flex", weight: 1, minPx: 96 } },
      { id: "status", sizing: { kind: "flex", weight: 1, minPx: 96 } },
    ]);
    render(
      <>
        <DataTable
          provider={provider}
          columns={columns}
          label="Machines"
          layout={layout}
        />
        <DataTable
          provider={provider}
          columns={columns}
          label="Machines elsewhere"
          layout={layout}
        />
      </>,
    );
    act(() => {
      layout.setOverride("name", { kind: "fixed", px: 200 });
    });
    for (const name of ["Machines", "Machines elsewhere"]) {
      expect(
        screen
          .getByRole("table", { name })
          .style.getPropertyValue("--data-table-columns"),
        // jsdom reports a zero-width container, so the solver publishes each
        // column's own reservation; the declarative form is the server path.
      ).toBe("200px 96px");
    }
  });

  it("refuses a layout that does not declare a rendered column", () => {
    const provider = makeProvider();
    const layout = createColumnLayout([
      { id: "name", sizing: { kind: "fixed", px: 100 } },
    ]);
    expect(() =>
      render(
        <DataTable
          provider={provider}
          columns={columns}
          label="Machines"
          layout={layout}
        />,
      ),
    ).toThrow('unknown column id "status"');
  });

  it("leaves the selection track to the stylesheet, and its width to no column", () => {
    // Each observation keeps the element it watches, so the container and
    // the selection cell are reported separately.
    const observed: {
      readonly target: Element;
      readonly callback: ResizeObserverCallback;
    }[] = [];
    class StubObserver {
      readonly #callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.#callback = callback;
      }
      observe(target: Element): void {
        observed.push({ target, callback: this.#callback });
      }
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal("ResizeObserver", StubObserver);
    const report = (
      matches: (target: Element) => boolean,
      width: number,
    ): void => {
      act(() => {
        for (const { target, callback } of observed) {
          if (matches(target)) {
            callback(
              [{ contentRect: { width } }] as unknown as ResizeObserverEntry[],
              {} as ResizeObserver,
            );
          }
        }
      });
    };
    // jsdom lays nothing out: the selection cell reads the width the
    // stylesheet would give its track, and every other element none.
    let selectionWidth = 32;
    const measured = vi
      .spyOn(HTMLElement.prototype, "offsetWidth", "get")
      .mockImplementation(function (this: HTMLElement) {
        return this.matches(".selection") ? selectionWidth : 0;
      });
    try {
      const provider = makeProvider();
      const view = (selectable: boolean) => (
        <DataTable
          provider={provider}
          columns={[
            { id: "name", header: "Name", sizing: { kind: "fixed", px: 100 } },
            {
              id: "status",
              header: "Status",
              sizing: { kind: "flex", weight: 1, minPx: 50 },
            },
          ]}
          label="Machines"
          selectable={selectable}
        />
      );
      const { rerender } = render(view(true));
      const table = screen.getByRole("table", { name: "Machines" });
      report((target) => target === table, 400);
      // No track for the selection column in the published list: the
      // columns share what its 32px leave of the 400.
      expect(table.style.getPropertyValue("--data-table-columns")).toBe(
        "100px 268px",
      );
      // The track is sized in rem: a root font-size change moves it with
      // no change to the container, and the columns follow.
      // The report only says the cell resized: its width is read again from
      // the cell's layout, never taken from the entry.
      selectionWidth = 40;
      report((target) => target.matches(".selection"), 0);
      expect(table.style.getPropertyValue("--data-table-columns")).toBe(
        "100px 260px",
      );
      rerender(view(false));
      expect(table.style.getPropertyValue("--data-table-columns")).toBe(
        "100px 300px",
      );
    } finally {
      measured.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("publishes no track list for a table with no columns", () => {
    // `none` would invalidate the stylesheet's selectable template; with
    // nothing published, the selection track stands alone.
    render(
      <DataTable
        provider={makeProvider()}
        columns={[]}
        label="Machines"
        selectable
      />,
    );
    expect(
      screen
        .getByRole("table", { name: "Machines" })
        .style.getPropertyValue("--data-table-columns"),
    ).toBe("");
  });

  it("resolves pixel tracks once the container reports a width", () => {
    const notified: ResizeObserverCallback[] = [];
    let disconnected = 0;
    class StubObserver {
      constructor(callback: ResizeObserverCallback) {
        notified.push(callback);
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {
        disconnected += 1;
      }
    }
    vi.stubGlobal("ResizeObserver", StubObserver);
    try {
      const provider = makeProvider();
      const { unmount } = render(
        <DataTable
          provider={provider}
          columns={[
            { id: "name", header: "Name", sizing: { kind: "fixed", px: 100 } },
            {
              id: "status",
              header: "Status",
              sizing: { kind: "flex", weight: 1, minPx: 50 },
            },
          ]}
          label="Machines"
        />,
      );
      if (notified.length === 0) {
        throw new Error("expected the table to observe its container");
      }
      const observer = notified[0];
      act(() => {
        observer(
          [{ contentRect: { width: 400 } }] as unknown as ResizeObserverEntry[],
          {} as ResizeObserver,
        );
      });
      expect(
        screen
          .getByRole("table", { name: "Machines" })
          .style.getPropertyValue("--data-table-columns"),
      ).toBe("100px 300px");
      unmount();
      expect(disconnected).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("resizes a column from its header, publishing new tracks", () => {
    const provider = makeProvider();
    render(
      <DataTable
        provider={provider}
        columns={[
          {
            id: "name",
            header: "Name",
            resizable: true,
            sizing: { kind: "flex", weight: 1, minPx: 50 },
          },
          { id: "status", header: "Status" },
        ]}
        label="Machines"
      />,
    );
    load(provider, [machine("m-1", "alpha")]);
    const handle = screen.getByRole("separator");
    expect(handle).toHaveAccessibleName("Name");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(
      screen
        .getByRole("table", { name: "Machines" })
        .style.getPropertyValue("--data-table-columns"),
    ).toBe("66px 96px");
  });

  it("shows a live drag in the published tracks without committing it", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    try {
      const provider = makeProvider();
      const layout = createColumnLayout([
        { id: "name", sizing: { kind: "flex", weight: 1, minPx: 50 } },
        { id: "status", sizing: { kind: "flex", weight: 1, minPx: 96 } },
      ]);
      render(
        <DataTable
          provider={provider}
          columns={[
            { id: "name", header: "Name", resizable: true },
            { id: "status", header: "Status" },
          ]}
          label="Machines"
          layout={layout}
        />,
      );
      load(provider, [machine("m-1", "alpha")]);
      fireEvent.pointerDown(screen.getByRole("separator"), { clientX: 0 });
      fireEvent.pointerMove(window, { clientX: 180 });
      act(() => {
        for (const frame of frames.splice(0)) {
          frame(0);
        }
      });
      expect(
        screen
          .getByRole("table", { name: "Machines" })
          .style.getPropertyValue("--data-table-columns"),
        // The column reserved 50px against a zero-width container, and the
        // pointer travelled 180 from there.
      ).toBe("230px 96px");
      // The authority is untouched until the pointer is released.
      expect(layout.state.get().overrides.name).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("is safe under StrictMode double-mount without orphaned subscriptions", () => {
    const provider = makeProvider();
    let rowSubscriptions = 0;
    const observed: DataViewsProvider<Fields, Machine> = {
      ...provider,
      rows: {
        get: provider.rows.get,
        subscribe: (listener) => {
          rowSubscriptions += 1;
          const unsubscribe = provider.rows.subscribe(listener);
          return () => {
            rowSubscriptions -= 1;
            unsubscribe();
          };
        },
      },
    };
    const declared = createColumnLayout([
      { id: "name", sizing: { kind: "flex", weight: 1, minPx: 96 } },
      { id: "status", sizing: { kind: "flex", weight: 1, minPx: 96 } },
    ]);
    let layoutSubscriptions = 0;
    const layout: ColumnLayout = {
      ...declared,
      state: {
        get: declared.state.get,
        subscribe: (listener) => {
          layoutSubscriptions += 1;
          const unsubscribe = declared.state.subscribe(listener);
          return () => {
            layoutSubscriptions -= 1;
            unsubscribe();
          };
        },
      },
    };
    // Elements under observation, across every observer the table creates:
    // its container's and its selection cell's.
    let observing = 0;
    class CountingObserver {
      #live = 0;
      observe(): void {
        this.#live += 1;
        observing += 1;
      }
      unobserve(): void {}
      disconnect(): void {
        observing -= this.#live;
        this.#live = 0;
      }
    }
    vi.stubGlobal("ResizeObserver", CountingObserver);
    try {
      const { unmount } = render(
        <StrictMode>
          <DataTable
            provider={observed}
            columns={columns}
            label="Machines"
            layout={layout}
            selectable
          />
        </StrictMode>,
      );
      load(observed, [machine("m-1", "alpha")]);
      // The rows still arrive: the double-invoked mount left one live
      // registry, not a disposed one.
      expect(
        screen.getAllByRole("cell").map((cell) => cell.textContent),
      ).toEqual(["", "alpha", "running"]);
      // The rehearsal's observers were released; one per element remains.
      expect(observing).toBe(2);
      unmount();
      expect(rowSubscriptions).toBe(0);
      expect(layoutSubscriptions).toBe(0);
      expect(observing).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("renders no row and no cell again for a live resize preview", () => {
    const renders: string[] = [];
    const Probe = ({ rowId, columnId }: DataTableCellProps) => {
      renders.push(`${rowId}/${columnId}`);
      return null;
    };
    const provider = makeProvider();
    render(
      <DataTable
        provider={provider}
        columns={[
          {
            id: "name",
            header: "Name",
            cell: Probe,
            resizable: true,
            sizing: { kind: "flex", weight: 1, minPx: 50 },
          },
          { id: "status", header: "Status", cell: Probe },
        ]}
        label="Machines"
      />,
    );
    load(provider, [machine("m-1", "alpha"), machine("m-2", "beta")]);
    renders.length = 0;
    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });
    // The geometry moved — one publication on the container — and not one
    // of the four cells rendered again for it.
    expect(
      screen
        .getByRole("table", { name: "Machines" })
        .style.getPropertyValue("--data-table-columns"),
    ).toBe("66px 96px");
    expect(renders).toEqual([]);
  });

  it("offers no resize control on the table's trailing edge", () => {
    const provider = makeProvider();
    const { rerender } = render(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name", resizable: true },
          { id: "status", header: "Status", resizable: true },
        ]}
        label="Machines"
      />,
    );
    load(provider, [machine("m-1", "alpha")]);
    // Status declares itself resizable, but no column follows it to trade
    // width with, so neither a pointer nor a key can reach its edge.
    expect(screen.getAllByRole("separator")).toHaveLength(1);
    expect(screen.getByRole("separator")).toHaveAccessibleName("Name");
    rerender(
      <DataTable
        provider={provider}
        columns={[{ id: "name", header: "Name", resizable: true }]}
        label="Machines"
      />,
    );
    expect(screen.queryByRole("separator")).toBeNull();
  });

  it("gives the last column whatever width the others leave, live", () => {
    const notified: ResizeObserverCallback[] = [];
    class StubObserver {
      constructor(callback: ResizeObserverCallback) {
        notified.push(callback);
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("ResizeObserver", StubObserver);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    try {
      const provider = makeProvider();
      render(
        <DataTable
          provider={provider}
          columns={[
            {
              id: "name",
              header: "Name",
              resizable: true,
              sizing: { kind: "fixed", px: 100 },
            },
            {
              id: "status",
              header: "Status",
              sizing: { kind: "fixed", px: 100 },
            },
          ]}
          label="Machines"
        />,
      );
      const measure = (width: number): void => {
        act(() => {
          for (const observer of notified) {
            observer(
              [{ contentRect: { width } }] as unknown as ResizeObserverEntry[],
              {} as ResizeObserver,
            );
          }
        });
      };
      const tracks = (): string =>
        screen
          .getByRole("table", { name: "Machines" })
          .style.getPropertyValue("--data-table-columns");
      measure(400);
      expect(tracks()).toBe("100px 300px");
      fireEvent.pointerDown(screen.getByRole("separator"), { clientX: 0 });
      fireEvent.pointerMove(window, { clientX: 50 });
      act(() => {
        for (const frame of frames.splice(0)) {
          frame(0);
        }
      });
      // The last column follows the edge being dragged, before any commit.
      expect(tracks()).toBe("150px 250px");
      fireEvent.pointerUp(window);
      expect(tracks()).toBe("150px 250px");
      // Once the columns no longer fit, nothing is stretched: the table
      // scrolls instead.
      measure(200);
      expect(tracks()).toBe("150px 100px");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("holds every resize to the column's declared bounds", () => {
    const provider = makeProvider();
    render(
      <DataTable
        provider={provider}
        columns={[
          {
            id: "name",
            header: "Name",
            resizable: true,
            sizing: { kind: "flex", weight: 1, minPx: 50, maxPx: 80 },
          },
          { id: "status", header: "Status" },
        ]}
        label="Machines"
      />,
    );
    load(provider, [machine("m-1", "alpha")]);
    const handle = screen.getByRole("separator");
    const tracks = (): string =>
      screen
        .getByRole("table", { name: "Machines" })
        .style.getPropertyValue("--data-table-columns");
    expect(handle).toHaveAttribute("aria-valuemax", "80");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(tracks()).toBe("66px 96px");
    // The first step committed a fixed override; the declared maximum still
    // stops the second step, and the third moves nothing.
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(tracks()).toBe("80px 96px");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(tracks()).toBe("80px 96px");
  });

  it("scrolls the table to keep a moved edge in view", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    try {
      const provider = makeProvider();
      render(
        <DataTable
          provider={provider}
          columns={[
            {
              id: "name",
              header: "Name",
              resizable: true,
              sizing: { kind: "fixed", px: 100 },
            },
            { id: "status", header: "Status" },
          ]}
          label="Machines"
        />,
      );
      load(provider, [machine("m-1", "alpha")]);
      const table = screen.getByRole("table", { name: "Machines" });
      const handle = screen.getByRole("separator");
      const box = (left: number, width: number) =>
        ({
          left,
          right: left + width,
          top: 0,
          bottom: 40,
          width,
          height: 40,
          x: left,
          y: 0,
        }) as DOMRect;
      // The table's visible width runs from 10 to 130.
      let scrolled = 0;
      Object.defineProperty(table, "clientWidth", { value: 120 });
      Object.defineProperty(table, "scrollLeft", {
        get: () => scrolled,
        set: (next: number) => {
          scrolled = next;
        },
      });
      table.getBoundingClientRect = () => box(10, 122);
      const place = (left: number): void => {
        handle.getBoundingClientRect = () => box(left, 16);
      };
      place(150);
      fireEvent.keyDown(handle, { key: "ArrowRight" });
      expect(scrolled).toBe(36);
      place(-6);
      fireEvent.keyDown(handle, { key: "ArrowLeft" });
      expect(scrolled).toBe(20);
      place(40);
      fireEvent.keyDown(handle, { key: "ArrowRight" });
      expect(scrolled).toBe(20);
      // A drag reveals the edge on every render it causes: the capture, each
      // published frame, and the commit.
      place(200);
      fireEvent.pointerDown(handle, { clientX: 0 });
      expect(scrolled).toBe(106);
      place(230);
      fireEvent.pointerMove(window, { clientX: 40 });
      act(() => {
        for (const frame of frames.splice(0)) {
          frame(0);
        }
      });
      expect(scrolled).toBe(222);
      fireEvent.pointerUp(window);
      expect(scrolled).toBe(338);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("holds a resize to the layout's declared bounds, not the column's", () => {
    const provider = makeProvider();
    const layout = createColumnLayout([
      { id: "name", sizing: { kind: "flex", weight: 1, minPx: 50 } },
      { id: "status", sizing: { kind: "flex", weight: 1, minPx: 96 } },
    ]);
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name", resizable: true },
          { id: "status", header: "Status" },
        ]}
        label="Machines"
        layout={layout}
      />,
    );
    load(provider, [machine("m-1", "alpha")]);
    const handle = screen.getByRole("separator");
    // The column declares nothing, so on its own it would default to a 96px
    // minimum; the shared layout, which the widths are solved from,
    // declares 50. The column sits at 50, and a step left moves nothing.
    expect(handle).toHaveAttribute("aria-valuemin", "50");
    expect(handle).toHaveAttribute("aria-valuenow", "50");
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(layout.state.get().overrides.name).toBeUndefined();
  });

  it("offers sorting only on a field its source declares sortable", () => {
    loadedTable(undefined, {
      columns: [
        { id: "name", header: "Name", sortable: true },
        { id: "status", header: "Status", sortable: true },
      ],
    });
    const [name, status] = screen.getAllByRole("columnheader");
    expect(within(name).getByRole("button", { name: "Name" })).toBeVisible();
    expect(name).toHaveAttribute("aria-sort", "none");
    expect(within(status).queryByRole("button")).toBeNull();
    expect(status).not.toHaveAttribute("aria-sort");
  });

  it("offers no sorting on a source that can order nothing", () => {
    const provider = createDataViewsProvider<Fields, Machine>({
      schema,
      capabilities: {
        ...capabilities,
        sort: { ...capabilities.sort, terms: 0 },
      },
    });
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getAllByRole("columnheader")[0]).not.toHaveAttribute(
      "aria-sort",
    );
  });

  it("refuses a sortable column on a provider not told what its source can sort", () => {
    const provider = createDataViewsProvider<Fields, Machine>({ schema });
    expect(() =>
      render(
        <DataTable provider={provider} columns={columns} label="Machines" />,
      ),
    ).toThrow(
      "DataTable requires a provider given the source's capabilities to offer a sortable column; pass them to createDataViewsProvider",
    );
    render(
      <DataTable
        provider={provider}
        columns={[{ id: "name", header: "Name" }]}
        label="Machines"
      />,
    );
    expect(screen.getByRole("columnheader")).not.toHaveAttribute("aria-sort");
  });

  it("keeps an earlier query's rows in view, says they are stale and why, and leaves focus alone", () => {
    const { provider } = loadedTable();
    const button = screen.getByRole("button", { name: "Name" });
    button.focus();
    fireEvent.click(button);
    const request = pendingRequest(provider);
    act(() => {
      provider.complete(request, failure("the inventory is unreachable"));
    });
    const table = screen.getByRole("table", { name: "Machines" });
    expect(table).toHaveAttribute("aria-busy", "false");
    expect(within(table).getByRole("status")).toHaveTextContent(
      "These rows do not match the current query: the inventory is unreachable",
    );
    // The status row leads, and the retained rows follow it unblanked.
    const body = within(table).getAllByRole("rowgroup")[1];
    const [status, ...rows] = within(body).getAllByRole("row");
    expect(status).toHaveClass("status");
    expect(rows.map((row) => row.textContent)).toEqual([
      "alpharunning",
      "betarunning",
    ]);
    expect(document.activeElement).toBe(button);
    // The query is shown as asked, with the refused ordering still applied.
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  it("keeps one stale status element across re-renders", () => {
    const provider = makeProvider();
    const { rerender } = render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    load(provider, [machine("m-1", "alpha")]);
    act(() => {
      provider.setSearch("beta");
    });
    const request = pendingRequest(provider);
    act(() => {
      provider.complete(request, failure("offline"));
    });
    const statusMessage = screen.getByRole("status");
    rerender(
      <DataTable provider={provider} columns={[...columns]} label="Machines" />,
    );
    act(() => {
      provider.selection.add(["m-1"]);
    });
    expect(screen.getByRole("status")).toBe(statusMessage);
    expect(statusMessage).toHaveTextContent(
      "These rows do not match the current query: offline",
    );
  });

  it("returns to a coherent table once the stale query is replaced", () => {
    const { provider } = loadedTable();
    act(() => {
      provider.setSearch("beta");
    });
    const failed = pendingRequest(provider);
    act(() => {
      provider.complete(failed, failure("offline"));
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => {
      provider.setSearch("");
    });
    const recovered = pendingRequest(provider);
    act(() => {
      provider.complete(recovered, delivered([machine("m-2", "beta")]));
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(provider.state.get().result.status).toBe("ready");
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("hands a stale status to the caller's renderStatus", () => {
    const { provider } = loadedTable(undefined, {
      renderStatus: (status) =>
        status.status === "stale"
          ? `Out of date (${status.reason})`
          : status.status,
    });
    act(() => {
      provider.setSearch("beta");
    });
    act(() => {
      provider.complete(pendingRequest(provider), failure("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      /^Out of date \(offline\)$/,
    );
  });

  it("shows the new reason when a later query fails differently", () => {
    const { provider } = loadedTable();
    act(() => {
      provider.setSearch("beta");
    });
    act(() => {
      provider.complete(pendingRequest(provider), failure("offline"));
    });
    // One batch, as a synchronous source delivers it: the pending state in
    // between never renders.
    act(() => {
      provider.setSearch("gamma");
      provider.complete(pendingRequest(provider), failure("timed out"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "These rows do not match the current query: timed out",
    );
  });

  it("keeps the rows a failed refresh could not replace, and says why", () => {
    const { provider } = loadedTable();
    act(() => {
      provider.complete(
        refreshRequest(provider),
        failure("the inventory is unreachable"),
      );
    });
    const table = screen.getByRole("table", { name: "Machines" });
    expect(table).toHaveAttribute("aria-busy", "false");
    // The rows still answer the query the user asked, so they stay, and the
    // failure is said above them rather than shown nowhere at all.
    expect(within(table).getByRole("status")).toHaveTextContent(
      "These rows could not be refreshed: the inventory is unreachable",
    );
    const body = within(table).getAllByRole("rowgroup")[1];
    const [status, ...rows] = within(body).getAllByRole("row");
    expect(status).toHaveClass("status");
    expect(rows.map((row) => row.textContent)).toEqual([
      "alpharunning",
      "betarunning",
    ]);
  });

  it("hands a failed refresh to the caller's renderStatus", () => {
    const { provider } = loadedTable(undefined, {
      renderStatus: (status) =>
        status.status === "refresh-failed"
          ? `Not refreshed (${status.reason})`
          : status.status,
    });
    act(() => {
      provider.complete(refreshRequest(provider), failure("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      /^Not refreshed \(offline\)$/,
    );
  });

  it("drops the failed refresh's status once a refresh succeeds", () => {
    const { provider } = loadedTable();
    act(() => {
      provider.complete(refreshRequest(provider), failure("offline"));
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => {
      provider.complete(
        refreshRequest(provider),
        delivered([machine("m-1", "alpha")]),
      );
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(provider.state.get().result.status).toBe("ready");
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("marks the table busy while a request is in flight", () => {
    const { provider } = loadedTable();
    expect(screen.getByRole("table", { name: "Machines" })).toHaveAttribute(
      "aria-busy",
      "false",
    );
    act(() => {
      provider.refresh();
    });
    expect(screen.getByRole("table", { name: "Machines" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});
