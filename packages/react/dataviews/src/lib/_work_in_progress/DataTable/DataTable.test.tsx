/**
 * The renderer's contract: div rows sharing one published track list, roles
 * that carry the relationships the elements do not, keyed observation so an
 * unrelated change does no work, and one scope per row rather than one per
 * cell. Each case is mutation-tested against that contract.
 *
 * The table observes its provider from an effect, so nothing runs until it
 * is mounted: a manual source receives its first request after `render`,
 * and the test answers it by hand, or the provider is built over a source
 * that answers every request at once.
 */
import {
  createCollection,
  createDataViewsProvider,
  type DataViewsProvider,
  declareCapabilities,
  type SourceDelivery,
} from "@canonical/dataviews-core";
import {
  type ColumnLayout,
  createColumnLayout,
  readProviderHost,
} from "@canonical/dataviews-core/bindings";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createRef, type ReactElement, StrictMode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import createManualSource from "../../../../testing/createManualSource.js";
import elementAt from "../../../../testing/elementAt.js";
import { deliverRows, pageOf } from "../../../../testing/fixtures.js";
import {
  createMachineProvider,
  MACHINE_CAPABILITIES,
  type Machine,
  type MachineFields,
  machine,
  machines,
} from "../../../../testing/machines.js";
import type { ManualSource } from "../../../../testing/types.js";
import {
  DataViews,
  useDataViewsCell,
  useDataViewsValue,
} from "../DataViews/index.js";
import DataTable from "./DataTable.js";
import type { DataTableCellProps, DataTableColumn } from "./types.js";

type Provider = DataViewsProvider<MachineFields, Machine>;

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", sortable: true },
  { id: "status", header: "Status" },
];

/** A page of rows, as the manual source delivers one. */
const page = (rows: readonly Machine[]): SourceDelivery<Machine> => ({
  status: "succeeded",
  page: pageOf(rows),
});

/** A request the source accepted and could not complete. */
const failure = (reason: string): SourceDelivery<Machine> => ({
  status: "failed",
  failure: { reason, cause: new Error(reason), transient: null },
});

/** Answer the source's latest request with these rows. */
const deliver = (
  source: ManualSource<Machine>,
  rows: readonly Machine[],
): void => {
  act(() => {
    source.latest().deliver(page(rows));
  });
};

/** Fail the source's latest request. */
const fail = (source: ManualSource<Machine>, reason: string): void => {
  act(() => {
    source.latest().deliver(failure(reason));
  });
};

/** A table whose source answers every request at once with `rows`. */
const loadedTable = (
  rows: readonly Machine[] = [machine("m-1", "alpha"), machine("m-2", "beta")],
  extra: Partial<Parameters<typeof DataTable<MachineFields, Machine>>[0]> = {},
) => {
  const { provider, source } = createMachineProvider({ rows });
  const view = render(
    <DataTable
      provider={provider}
      columns={columns}
      label="Machines"
      {...extra}
    />,
  );
  return { provider, source, view };
};

/**
 * A table over a source the test answers by hand, its first request
 * settled with `rows`: what a scenario that later fails a request starts
 * from.
 */
const deliveredTable = (
  rows: readonly Machine[] = [machine("m-1", "alpha"), machine("m-2", "beta")],
  extra: Partial<Parameters<typeof DataTable<MachineFields, Machine>>[0]> = {},
) => {
  const { provider, source } = createMachineProvider();
  const view = render(
    <DataTable
      provider={provider}
      columns={columns}
      label="Machines"
      {...extra}
    />,
  );
  deliver(source, rows);
  return { provider, source, view };
};

describe("DataTable", () => {
  it("refuses a value that is not a provider", () => {
    const notAProvider = {} as Provider;
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
      within(elementAt(screen.getAllByRole("row"), 1))
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
    const { provider } = createMachineProvider();
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
    const { provider } = createMachineProvider();
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
    const { provider } = createMachineProvider();
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
    const { provider } = createMachineProvider();
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
    loadedTable(
      [
        machine("m-1", "alpha", "running", 4),
        machine("m-2", "beta", "running", 8),
      ],
      {
        columns: [
          { id: "name", header: "Name" },
          { id: "cores", header: "Cores" },
          { id: "status", header: "Status" },
        ],
      },
    );
    const cells = within(elementAt(screen.getAllByRole("row"), 1)).getAllByRole(
      "cell",
    );
    expect(cells.map((cell) => cell.textContent)).toEqual([
      "alpha",
      "4",
      "running",
    ]);
  });

  it("renders booleans, bigints and unrenderable values by their own rules", () => {
    // Records the machine collection does not describe: a collection of
    // their own, over a source that answers with the one odd row.
    type Oddity = {
      readonly id: string;
      readonly flag: boolean;
      readonly big: bigint;
      readonly shape: object;
    };
    const oddities = createCollection({
      identify: (row: Oddity) => row.id,
      fields: [{ field: "flag", kind: "flag" }],
    });
    const source = createManualSource<Oddity>({
      capabilities: declareCapabilities(oddities, {}),
      answer: () =>
        pageOf([{ id: "m-1", flag: false, big: 9007199254740993n, shape: {} }]),
    });
    const provider = createDataViewsProvider({
      collection: oddities,
      source: source.source,
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
    expect(
      within(elementAt(screen.getAllByRole("row"), 1))
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["false", "9007199254740993", "", ""]);
  });

  it("reads the record field a column names instead of its own id", () => {
    loadedTable([machine("m-1", "alpha")], {
      columns: [{ id: "machine-name", header: "Name", field: "name" }],
    });
    expect(elementAt(screen.getAllByRole("cell"), 0).textContent).toBe("alpha");
  });

  it("renders a column's own content inside that cell's scope", () => {
    // The cell takes no provider: the collection is its witness, and the
    // record channel is typed as its records.
    const Badge = ({ value, rowId, columnId }: DataTableCellProps) => {
      const cell = useDataViewsCell(machines);
      const record = useDataViewsValue(cell.record);
      return (
        <span data-testid={`${rowId}-${columnId}`}>
          {String(value)} of {record.name}
        </span>
      );
    };
    loadedTable([machine("m-1", "alpha", "failed")], {
      columns: [{ id: "status", header: "Status", cell: Badge }],
    });
    expect(screen.getByTestId("m-1-status").textContent).toBe(
      "failed of alpha",
    );
  });

  it("cycles one column's ordering and describes it with aria-sort", async () => {
    const { provider } = loadedTable();
    const headers = screen.getAllByRole("columnheader");
    const sortable = elementAt(headers, 0);
    const plain = elementAt(headers, 1);
    expect(sortable).toHaveAttribute("aria-sort", "none");
    expect(plain).not.toHaveAttribute("aria-sort");
    // The chevron repeats the order for the eye, hidden from assistive
    // technology; a column at rest shows none.
    const glyph = () =>
      elementAt(screen.getAllByRole("columnheader"), 0).querySelector("svg");
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
    const { provider, source } = createMachineProvider();
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    // The first request is out and unanswered.
    expect(source.calls).toHaveLength(1);
    expect(screen.getByRole("row", { name: "Loading…" })).toBeInTheDocument();
    // Nothing has gone wrong and nothing has arrived: there is no outcome to
    // announce, so the row is not a `role="status"` live region.
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("tells an empty collection from a query that matched nothing", () => {
    // The two call for different responses — add something, or change the
    // query — so they are never one message.
    const { provider, source } = deliveredTable([]);
    expect(screen.getByText("There is nothing here yet.")).toBeInTheDocument();
    act(() => {
      provider.setSearch("alpha");
    });
    deliver(source, []);
    expect(screen.getByText("No rows match this query.")).toBeInTheDocument();
  });

  it("lets the caller replace the words of an outcome", () => {
    const { provider, source } = deliveredTable([], {
      renderStatus: (status) => <em>nothing: {status.status}</em>,
    });
    act(() => {
      provider.setSearch("alpha");
    });
    deliver(source, []);
    expect(screen.getByText("nothing: no-results")).toBeInTheDocument();
  });

  it("reports no sorted column for a declared default the header does not read yet", () => {
    // A source's declared default already orders
    // its rows, but the header does not report it yet, so it claims no
    // sorted column rather than half of that contract.
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareCapabilities(machines, {
        filter: { status: ["eq"] },
        sort: {
          fields: ["name"],
          terms: 1,
          tiebreak: "opaque",
          default: [{ field: "name", direction: "asc" }],
        },
        counts: MACHINE_CAPABILITIES.counts,
      }),
    });
    render(
      <DataTable
        provider={provider}
        columns={[{ id: "name", header: "Name", sortable: true }]}
        label="Machines"
      />,
    );
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
    expect(elementAt(screen.getAllByRole("row"), 1).className).toBe(
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
      useDataViewsValue(useDataViewsCell(machines).selected);
      renders.push(rowId);
      return null;
    };
    const { provider } = loadedTable(
      [machine("m-1", "alpha"), machine("m-2", "beta")],
      {
        columns: [{ id: "name", header: "Name", cell: Probe }],
        selectable: true,
      },
    );
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
    const { source } = deliveredTable(
      [machine("m-1", "alpha"), machine("m-2", "beta")],
      {
        columns: [
          { id: "name", header: "Name", cell: Probe },
          { id: "status", header: "Status", cell: Probe },
        ],
      },
    );
    renders.length = 0;
    // A later delivery of the same request: a store write, republished.
    deliver(source, [
      machine("m-1", "alpha", "failed"),
      machine("m-2", "beta"),
    ]);
    expect(renders).toEqual(["m-1/status"]);
  });

  it("mints one scope per row, shared by its cells and stable across renders", () => {
    const seen: { rowId: string; record: unknown }[] = [];
    const Probe = () => {
      const cell = useDataViewsCell(machines);
      seen.push({ rowId: cell.rowId, record: cell.record });
      return null;
    };
    const { provider, source } = createMachineProvider();
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
    deliver(source, [machine("m-1", "alpha"), machine("m-2", "beta")]);
    const firstRow = seen.filter((entry) => entry.rowId === "m-1");
    expect(firstRow).toHaveLength(2);
    const [firstSeen, secondSeen] = firstRow;
    expect(firstSeen?.record).toBe(secondSeen?.record);
    expect(firstSeen?.record).not.toBe(
      seen.find((entry) => entry.rowId === "m-2")?.record,
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
    deliver(source, [
      machine("m-1", "alpha", "failed"),
      machine("m-2", "beta"),
    ]);
    expect(seen.find((entry) => entry.rowId === "m-1")?.record).toBe(
      firstSeen?.record,
    );
  });

  it("rebuilds its model when a column genuinely changes", () => {
    const { provider, view } = loadedTable([machine("m-1", "alpha")]);
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Name", "Status"]);
    view.rerender(
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
      within(elementAt(screen.getAllByRole("row"), 1))
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
    const { provider, source, view } = deliveredTable(
      [machine("m-1", "alpha")],
      { columns: [{ id: "name", header: "Name", cell: Probe }] },
    );
    view.unmount();
    // The last observer left, so the source was released with it.
    expect(source.latest().releases).toBe(1);
    renders.length = 0;
    // Rows fed to the unobserved provider by hand, and a selection change:
    // nothing is mounted to render either.
    const host = readProviderHost(provider);
    host.complete(
      host.refresh(),
      deliverRows([machine("m-1", "alpha", "failed")]),
    );
    act(() => {
      provider.selection.toggle("m-1");
    });
    expect(renders).toEqual([]);
  });

  it("shares user arrangement between two tables on one layout", () => {
    const { provider } = createMachineProvider();
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
    const { provider } = createMachineProvider();
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
      const { provider } = createMachineProvider();
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
        provider={createMachineProvider().provider}
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
      const { provider } = createMachineProvider();
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
      const observer = notified[0];
      if (observer === undefined) {
        throw new Error("expected the table to observe its container");
      }
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
    loadedTable([machine("m-1", "alpha")], {
      columns: [
        {
          id: "name",
          header: "Name",
          resizable: true,
          sizing: { kind: "flex", weight: 1, minPx: 50 },
        },
        { id: "status", header: "Status" },
      ],
    });
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
      const layout = createColumnLayout([
        { id: "name", sizing: { kind: "flex", weight: 1, minPx: 50 } },
        { id: "status", sizing: { kind: "flex", weight: 1, minPx: 96 } },
      ]);
      loadedTable([machine("m-1", "alpha")], {
        columns: [
          { id: "name", header: "Name", resizable: true },
          { id: "status", header: "Status" },
        ],
        layout,
      });
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
      expect(layout.state.get().overrides["name"]).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("is safe under StrictMode double-mount without orphaned subscriptions", () => {
    const { provider, source } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
    });
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
            provider={provider}
            columns={columns}
            label="Machines"
            layout={layout}
            selectable
          />
        </StrictMode>,
      );
      // The rows arrived through the kept mount's observation: the
      // double-invoked mount left one live registry, not a disposed one.
      expect(
        screen.getAllByRole("cell").map((cell) => cell.textContent),
      ).toEqual(["", "alpha", "running"]);
      // The rehearsal's observers were released; one per element remains.
      expect(observing).toBe(2);
      // The kept mount holds the one live execution: a later delivery of
      // the same query reaches the rows.
      expect(source.calls.filter((call) => call.releases === 0)).toHaveLength(
        1,
      );
      act(() => {
        source.latest().deliver(page([machine("m-2", "beta")]));
      });
      expect(screen.getByRole("cell", { name: "beta" })).toBeInTheDocument();
      unmount();
      // Every execution the rehearsal and the kept mount asked for is
      // released: nothing observes the provider any more.
      expect(source.calls.every((call) => call.releases === 1)).toBe(true);
      expect(layoutSubscriptions).toBe(0);
      expect(observing).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps one live execution through StrictMode's double mount, and releases it on unmount", () => {
    const { provider, source } = createMachineProvider();
    const table = (
      <StrictMode>
        <DataTable provider={provider} columns={columns} label="Machines" />
      </StrictMode>
    );
    const { rerender, unmount } = render(table);
    // The rehearsal mount observed and was released, which released its
    // execution; the kept mount observed again and the same request was
    // executed once more. Whatever React rehearsed, exactly one execution
    // is live, and none was released more than once.
    const live = source.calls.filter((call) => call.releases === 0);
    expect(live).toHaveLength(1);
    expect(source.calls.every((call) => call.releases <= 1)).toBe(true);
    const [kept] = live;
    if (kept === undefined) {
      throw new Error("expected a live execution");
    }
    act(() => {
      kept.deliver(page([machine("m-1", "alpha")]));
    });
    expect(screen.getByRole("cell", { name: "alpha" })).toBeInTheDocument();
    // A render that changes nothing observes nothing again.
    const executions = source.calls.length;
    rerender(table);
    expect(source.calls).toHaveLength(executions);
    unmount();
    expect(source.calls.every((call) => call.releases === 1)).toBe(true);
  });

  it("executes each request once for two mounts on one provider, and releases with the last", () => {
    const { provider, source } = createMachineProvider();
    // A root observing the provider, with a connected table inside it, and
    // a standalone table outside it observing the same provider.
    const root = render(
      <DataViews provider={provider}>
        <DataViews.DataTable columns={columns} label="Inside" />
      </DataViews>,
    );
    const standalone = render(
      <DataTable provider={provider} columns={columns} label="Outside" />,
    );
    // Three observers, one request.
    expect(source.calls).toHaveLength(1);
    deliver(source, [machine("m-1", "alpha")]);
    for (const name of ["Inside", "Outside"]) {
      expect(
        within(screen.getByRole("table", { name })).getByRole("cell", {
          name: "alpha",
        }),
      ).toBeInTheDocument();
    }
    // One mount leaving keeps the source running for the other.
    standalone.unmount();
    expect(source.latest().releases).toBe(0);
    expect(screen.getByRole("table", { name: "Inside" })).toBeInTheDocument();
    act(() => {
      provider.setSearch("alpha");
    });
    expect(source.calls).toHaveLength(2);
    deliver(source, [machine("m-1", "alpha")]);
    expect(
      within(screen.getByRole("table", { name: "Inside" })).getByRole("cell", {
        name: "alpha",
      }),
    ).toBeInTheDocument();
    // The last mount leaving releases the live execution.
    root.unmount();
    expect(source.calls.every((call) => call.releases === 1)).toBe(true);
  });

  it("renders no row and no cell again for a live resize preview", () => {
    const renders: string[] = [];
    const Probe = ({ rowId, columnId }: DataTableCellProps) => {
      renders.push(`${rowId}/${columnId}`);
      return null;
    };
    loadedTable([machine("m-1", "alpha"), machine("m-2", "beta")], {
      columns: [
        {
          id: "name",
          header: "Name",
          cell: Probe,
          resizable: true,
          sizing: { kind: "flex", weight: 1, minPx: 50 },
        },
        { id: "status", header: "Status", cell: Probe },
      ],
    });
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
    const { provider, view } = loadedTable([machine("m-1", "alpha")], {
      columns: [
        { id: "name", header: "Name", resizable: true },
        { id: "status", header: "Status", resizable: true },
      ],
    });
    // Status declares itself resizable, but no column follows it to trade
    // width with, so neither a pointer nor a key can reach its edge.
    expect(screen.getAllByRole("separator")).toHaveLength(1);
    expect(screen.getByRole("separator")).toHaveAccessibleName("Name");
    view.rerender(
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
      const { provider } = createMachineProvider();
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
    loadedTable([machine("m-1", "alpha")], {
      columns: [
        {
          id: "name",
          header: "Name",
          resizable: true,
          sizing: { kind: "flex", weight: 1, minPx: 50, maxPx: 80 },
        },
        { id: "status", header: "Status" },
      ],
    });
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
      loadedTable([machine("m-1", "alpha")], {
        columns: [
          {
            id: "name",
            header: "Name",
            resizable: true,
            sizing: { kind: "fixed", px: 100 },
          },
          { id: "status", header: "Status" },
        ],
      });
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
    const layout = createColumnLayout([
      { id: "name", sizing: { kind: "flex", weight: 1, minPx: 50 } },
      { id: "status", sizing: { kind: "flex", weight: 1, minPx: 96 } },
    ]);
    loadedTable([machine("m-1", "alpha")], {
      columns: [
        { id: "name", header: "Name", resizable: true },
        { id: "status", header: "Status" },
      ],
      layout,
    });
    const handle = screen.getByRole("separator");
    // The column declares nothing, so on its own it would default to a 96px
    // minimum; the shared layout, which the widths are solved from,
    // declares 50. The column sits at 50, and a step left moves nothing.
    expect(handle).toHaveAttribute("aria-valuemin", "50");
    expect(handle).toHaveAttribute("aria-valuenow", "50");
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(layout.state.get().overrides["name"]).toBeUndefined();
  });

  it("offers sorting only on a field its source declares sortable", () => {
    // The declaration is the source's own, read through the provider: a
    // column asking for sorting on a field outside it gets no control.
    loadedTable(undefined, {
      columns: [
        { id: "name", header: "Name", sortable: true },
        { id: "status", header: "Status", sortable: true },
      ],
    });
    const headers = screen.getAllByRole("columnheader");
    const name = elementAt(headers, 0);
    const status = elementAt(headers, 1);
    expect(within(name).getByRole("button", { name: "Name" })).toBeVisible();
    expect(name).toHaveAttribute("aria-sort", "none");
    expect(within(status).queryByRole("button")).toBeNull();
    expect(status).not.toHaveAttribute("aria-sort");
  });

  it("offers no sorting on a source that can order nothing", () => {
    const { provider } = createMachineProvider({
      capabilities: {
        ...MACHINE_CAPABILITIES,
        sort: { ...MACHINE_CAPABILITIES.sort, terms: 0 },
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

  it("keeps an earlier query's rows in view, says they are stale and why, and leaves focus alone", () => {
    const { source } = deliveredTable();
    const button = screen.getByRole("button", { name: "Name" });
    button.focus();
    fireEvent.click(button);
    // The ordering issued a request the source is now executing.
    expect(source.calls).toHaveLength(2);
    fail(source, "the inventory is unreachable");
    const table = screen.getByRole("table", { name: "Machines" });
    expect(table).toHaveAttribute("aria-busy", "false");
    expect(within(table).getByRole("status")).toHaveTextContent(
      "These rows do not match the current query: the inventory is unreachable",
    );
    // The status row leads, and the retained rows follow it unblanked.
    const body = elementAt(within(table).getAllByRole("rowgroup"), 1);
    const [status, ...rows] = within(body).getAllByRole("row");
    expect(status).toBeDefined();
    expect(status).toHaveClass("status");
    expect(rows.map((row) => row.textContent)).toEqual([
      "alpharunning",
      "betarunning",
    ]);
    expect(document.activeElement).toBe(button);
    // The query is shown as asked, with the failed ordering still applied.
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  it("keeps one stale status element across re-renders", () => {
    const { provider, source, view } = deliveredTable([
      machine("m-1", "alpha"),
    ]);
    act(() => {
      provider.setSearch("beta");
    });
    fail(source, "offline");
    const statusMessage = screen.getByRole("status");
    view.rerender(
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
    const { provider, source } = deliveredTable();
    act(() => {
      provider.setSearch("beta");
    });
    fail(source, "offline");
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => {
      provider.setSearch("");
    });
    deliver(source, [machine("m-2", "beta")]);
    expect(screen.queryByRole("status")).toBeNull();
    expect(provider.state.get().result.status).toBe("ready");
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("hands a stale status to the caller's renderStatus", () => {
    const { provider, source } = deliveredTable(undefined, {
      renderStatus: (status) =>
        status.status === "stale"
          ? `Out of date (${status.reason})`
          : status.status,
    });
    act(() => {
      provider.setSearch("beta");
    });
    fail(source, "offline");
    expect(screen.getByRole("status")).toHaveTextContent(
      /^Out of date \(offline\)$/,
    );
  });

  it("shows the new reason when a later query fails differently", () => {
    const { provider, source } = deliveredTable();
    act(() => {
      provider.setSearch("beta");
    });
    fail(source, "offline");
    // One batch, as a synchronous source delivers it: the pending state in
    // between never renders.
    act(() => {
      provider.setSearch("gamma");
      source.latest().deliver(failure("timed out"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "These rows do not match the current query: timed out",
    );
  });

  it("keeps the rows a failed refresh could not replace, and says why", () => {
    const { provider, source } = deliveredTable();
    act(() => {
      provider.refresh();
    });
    fail(source, "the inventory is unreachable");
    const table = screen.getByRole("table", { name: "Machines" });
    expect(table).toHaveAttribute("aria-busy", "false");
    // The rows still answer the query the user asked, so they stay, and the
    // failure is said above them rather than shown nowhere at all.
    expect(within(table).getByRole("status")).toHaveTextContent(
      "These rows could not be refreshed: the inventory is unreachable",
    );
    const body = elementAt(within(table).getAllByRole("rowgroup"), 1);
    const [status, ...rows] = within(body).getAllByRole("row");
    expect(status).toBeDefined();
    expect(status).toHaveClass("status");
    expect(rows.map((row) => row.textContent)).toEqual([
      "alpharunning",
      "betarunning",
    ]);
  });

  it("hands a failed refresh to the caller's renderStatus", () => {
    const { provider, source } = deliveredTable(undefined, {
      renderStatus: (status) =>
        status.status === "refresh-failed"
          ? `Not refreshed (${status.reason})`
          : status.status,
    });
    act(() => {
      provider.refresh();
    });
    fail(source, "offline");
    expect(screen.getByRole("status")).toHaveTextContent(
      /^Not refreshed \(offline\)$/,
    );
  });

  it("drops the failed refresh's status once a refresh succeeds", () => {
    const { provider, source } = deliveredTable();
    act(() => {
      provider.refresh();
    });
    fail(source, "offline");
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => {
      provider.refresh();
    });
    deliver(source, [machine("m-1", "alpha")]);
    expect(screen.queryByRole("status")).toBeNull();
    expect(provider.state.get().result.status).toBe("ready");
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("marks the table busy while a request is in flight", () => {
    const { provider, source } = deliveredTable();
    expect(screen.getByRole("table", { name: "Machines" })).toHaveAttribute(
      "aria-busy",
      "false",
    );
    act(() => {
      provider.refresh();
    });
    // The refresh is out and the source has not answered it.
    expect(source.latest().releases).toBe(0);
    expect(screen.getByRole("table", { name: "Machines" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});
