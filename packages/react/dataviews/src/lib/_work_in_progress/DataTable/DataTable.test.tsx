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
  createMemoryLocation,
  type DataViewsProvider,
  type DisplayStatus,
  declareCapabilities,
  type SortTerm,
  type SourceDelivery,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createRef, type ReactElement, StrictMode, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import createManualSource from "../../../../testing/createManualSource.js";
import {
  createStandInPresentationStore,
  createStandInViewStore,
} from "../../../../testing/createStandInStores.js";
import elementAt from "../../../../testing/elementAt.js";
import expectNoAxeViolations from "../../../../testing/expectNoAxeViolations.js";
import {
  buildStoredView,
  deliverRows,
  pageOf,
} from "../../../../testing/fixtures.js";
import {
  createMachineProvider,
  declareMachineOrdering,
  MACHINE_CAPABILITIES,
  type Machine,
  type MachineFields,
  machine,
  machines,
} from "../../../../testing/machines.js";
import readAnnouncements from "../../../../testing/readAnnouncements.js";
import type { ManualSource } from "../../../../testing/types.js";
import type { DisplayFieldCellProps } from "../../common/index.js";
import { useDataViewsCell, useDataViewsValue } from "../../hooks/index.js";
import { DataViews } from "../DataViews/index.js";
import DataTable from "./DataTable.js";
import type { DataTableColumn } from "./types.js";

type Provider = DataViewsProvider<MachineFields, Machine>;

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", sortable: true },
  { id: "status", header: "Status" },
];

/** The same columns, neither offering a sort. */
const unsortedColumns: readonly DataTableColumn[] = [
  { id: "name", header: "Name" },
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
      screen
        .getAllByRole("columnheader")
        .map((header) => header.querySelector(".label")?.textContent),
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
    const Badge = ({ value, rowId, columnId }: DisplayFieldCellProps) => {
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

  it("cycles one column's ordering and claims aria-sort only while it sorts", () => {
    const { provider } = loadedTable();
    const headers = screen.getAllByRole("columnheader");
    const sortable = elementAt(headers, 0);
    const plain = elementAt(headers, 1);
    // At rest nothing orders the rows, so no header claims a sort.
    expect(sortable).not.toHaveAttribute("aria-sort");
    expect(plain).not.toHaveAttribute("aria-sort");
    // The chevron repeats the order for the eye, hidden from assistive
    // technology; a column at rest shows none.
    const glyph = () =>
      elementAt(screen.getAllByRole("columnheader"), 0).querySelector(
        ".sort > .ds.icon",
      );
    expect(glyph()).toBeNull();

    const button = within(sortable).getByRole("button", { name: "Name" });
    expect(button).not.toHaveAccessibleDescription();
    fireEvent.click(button);
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
    ]);
    expect(elementAt(screen.getAllByRole("columnheader"), 0)).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    // The button carries the description; its header does not repeat it.
    expect(
      elementAt(screen.getAllByRole("columnheader"), 0),
    ).not.toHaveAccessibleDescription();
    expect(glyph()).toHaveAttribute("aria-hidden", "true");
    expect(glyph()?.querySelector("use")).toHaveAttribute(
      "href",
      expect.stringMatching(/#chevron-up$/),
    );
    expect(button).toHaveAccessibleName("Name");
    expect(button).toHaveAccessibleDescription("ascending");
    // One term needs no precedence numeral.
    expect(
      elementAt(screen.getAllByRole("columnheader"), 0).querySelector(
        ".precedence",
      ),
    ).toBeNull();

    fireEvent.click(button);
    expect(elementAt(screen.getAllByRole("columnheader"), 0)).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(glyph()?.querySelector("use")).toHaveAttribute(
      "href",
      expect.stringMatching(/#chevron-down$/),
    );
    expect(button).toHaveAccessibleDescription("descending");

    fireEvent.click(button);
    expect(provider.state.get().slice.sort).toEqual([]);
    expect(
      elementAt(screen.getAllByRole("columnheader"), 0),
    ).not.toHaveAttribute("aria-sort");
    expect(glyph()).toBeNull();
    expect(button).not.toHaveAccessibleDescription();
  });

  /** Three sortable columns over a source ordering by all three. */
  const renderOrderingTable = (
    terms: number | null,
    defaultSort: readonly SortTerm[] = [],
    columnsInView: readonly DataTableColumn[] = [
      { id: "name", header: "Name", sortable: true },
      { id: "status", header: "Status", sortable: true },
      { id: "cores", header: "Cores", sortable: true },
    ],
  ) => {
    const { provider, source } = createMachineProvider({
      rows: [machine("m-1", "alpha"), machine("m-2", "beta", "failed", 8)],
      capabilities: declareMachineOrdering(terms, defaultSort),
    });
    const view = render(
      <DataTable
        provider={provider}
        columns={columnsInView}
        label="Machines"
      />,
    );
    return { provider, source, view };
  };

  /** The sort button of the header with this name. */
  const findSortButton = (name: string): HTMLElement =>
    screen.getByRole("button", { name });

  /** The header whose sort control has this name. */
  const findHeader = (name: string): HTMLElement =>
    screen.getByRole("columnheader", { name });

  /** The polite region where that header says why a sort changed nothing. */
  const findSortReason = (name: string): Element | null =>
    findHeader(name).querySelector(".sort-reason");

  it("adds, turns and removes a further term with Shift, numbering each sorted header", () => {
    const { provider } = renderOrderingTable(3);
    fireEvent.click(findSortButton("Name"));
    fireEvent.click(findSortButton("Status"), { shiftKey: true });
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
      { field: "status", direction: "asc" },
    ]);
    // Only the first term's header claims the sort; both state their place.
    expect(findHeader("Name")).toHaveAttribute("aria-sort", "ascending");
    expect(findHeader("Status")).not.toHaveAttribute("aria-sort");
    expect(findSortButton("Name")).toHaveAccessibleDescription(
      "ascending, 1st of 2",
    );
    expect(findSortButton("Status")).toHaveAccessibleDescription(
      "ascending, 2nd of 2",
    );
    // The numerals repeat the precedence for the eye only.
    const findNumeral = (name: string) =>
      findHeader(name).querySelector(".precedence");
    expect(findNumeral("Name")).toHaveTextContent("1");
    expect(findNumeral("Status")).toHaveTextContent("2");
    expect(findNumeral("Status")).toHaveAttribute("aria-hidden", "true");
    expect(findHeader("Cores").querySelector(".precedence")).toBeNull();

    fireEvent.click(findSortButton("Status"), { shiftKey: true });
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
      { field: "status", direction: "desc" },
    ]);
    expect(findSortButton("Status")).toHaveAccessibleDescription(
      "descending, 2nd of 2",
    );

    fireEvent.click(findSortButton("Status"), { shiftKey: true });
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
    ]);
    // One term again: no numerals, and the description says the direction.
    expect(findNumeral("Name")).toBeNull();
    expect(findSortButton("Name")).toHaveAccessibleDescription("ascending");
  });

  it("adds a term from Shift+Enter and Shift+Space as from a Shift+click", () => {
    const { provider } = renderOrderingTable(3);
    // A key's own click carries `detail` 0 and may lose the modifier.
    fireEvent.keyDown(findSortButton("Name"), { key: "Enter", shiftKey: true });
    fireEvent.click(findSortButton("Name"), { detail: 0 });
    fireEvent.keyDown(findSortButton("Cores"), { key: " ", shiftKey: true });
    fireEvent.click(findSortButton("Cores"), { detail: 0 });
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
      { field: "cores", direction: "asc" },
    ]);
    // Without Shift, the same keys sort by the column alone.
    fireEvent.keyDown(findSortButton("Status"), { key: "Enter" });
    fireEvent.click(findSortButton("Status"), { detail: 0 });
    expect(provider.state.get().slice.sort).toEqual([
      { field: "status", direction: "asc" },
    ]);
  });

  it("reads a Shift held on a key only for the click that key produces", () => {
    const { provider } = renderOrderingTable(3);
    fireEvent.click(findSortButton("Name"));
    // Shift+Enter on a key whose click never came, then a pointer click.
    fireEvent.keyDown(findSortButton("Status"), {
      key: "Enter",
      shiftKey: true,
    });
    fireEvent.click(findSortButton("Status"), { detail: 1 });
    expect(provider.state.get().slice.sort).toEqual([
      { field: "status", direction: "asc" },
    ]);
    // A key other than Enter or Space leaves no Shift behind either.
    fireEvent.keyDown(findSortButton("Cores"), { key: "Tab", shiftKey: true });
    fireEvent.click(findSortButton("Cores"), { detail: 0 });
    expect(provider.state.get().slice.sort).toEqual([
      { field: "cores", direction: "asc" },
    ]);
  });

  it("says politely why a term past the source's maximum changed nothing", async () => {
    const { provider } = renderOrderingTable(2);
    fireEvent.click(findSortButton("Name"));
    fireEvent.click(findSortButton("Status"), { shiftKey: true });
    const reason = findSortReason("Cores");
    // Shown, not live: the table's announcer is what says it.
    expect(reason).not.toHaveAttribute("aria-live");
    expect(reason).toBeEmptyDOMElement();
    // The orderings the two clicks applied are spoken before the refusal.
    await readAnnouncements();

    fireEvent.click(findSortButton("Cores"), { shiftKey: true });
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
      { field: "status", direction: "asc" },
    ]);
    expect(reason?.textContent).toBe(
      "Sort unchanged: this source orders by at most 2 terms.",
    );
    expect((await readAnnouncements()).at(-1)).toBe(
      "Sort unchanged: this source orders by at most 2 terms.",
    );
    // Only the header activated says it.
    expect(findSortReason("Name")).toBeEmptyDOMElement();

    // An accepted choice clears it, even one that changes nothing.
    openMenuOf("Name");
    choose("Sort ascending");
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
      { field: "status", direction: "asc" },
    ]);
    expect(reason).toBeEmptyDOMElement();

    // So does the next activation the source accepts.
    fireEvent.click(findSortButton("Cores"), { shiftKey: true });
    expect(reason).not.toBeEmptyDOMElement();
    fireEvent.click(findSortButton("Cores"));
    expect(reason).toBeEmptyDOMElement();
  });

  it("ends a source's reason with one full stop, whether or not the source ended it", () => {
    const { provider } = renderOrderingTable(1);
    fireEvent.click(findSortButton("Name"));
    const [refusal] = provider.setSort([
      { field: "name", direction: "asc" },
      { field: "status", direction: "asc" },
    ]);
    if (refusal === undefined) {
      throw new Error("a source ordering by one term accepted two");
    }
    const setSort = vi
      .spyOn(provider, "setSort")
      .mockReturnValue([{ ...refusal, reason: "this source is busy." }]);
    onTestFinished(() => {
      setSort.mockRestore();
    });
    fireEvent.click(findSortButton("Status"), { shiftKey: true });
    // Exactly: a matcher that trims would hide a second stop or a no-break
    // space.
    expect(findSortReason("Status")?.textContent).toBe(
      "Sort unchanged: this source is busy.",
    );
  });

  it("moves neither focus nor the ordering on arrow keys: the header row is no grid", () => {
    const { provider } = renderOrderingTable(3);
    const before = provider.state.get().slice.sort;
    const button = findSortButton("Status");
    button.focus();
    for (const key of ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"]) {
      fireEvent.keyDown(button, { key });
    }
    expect(button).toHaveFocus();
    expect(provider.state.get().slice.sort).toBe(before);
    expect(
      document.querySelector("[role='grid'], [role='treegrid']"),
    ).not.toBeInTheDocument();
    // No roving tab stop: every sort button is in the tab order.
    const sortButtons = document.querySelectorAll<HTMLButtonElement>(
      "[role='columnheader'] button.sort",
    );
    expect(sortButtons.length).toBeGreaterThan(1);
    for (const sortButton of sortButtons) {
      expect(sortButton.tabIndex).toBe(0);
    }
  });

  it("keeps the sort button it focused, never replacing it, through every change it draws", () => {
    renderOrderingTable(3);
    const button = findSortButton("Status");
    button.focus();
    fireEvent.click(button);
    fireEvent.click(findSortButton("Name"), { shiftKey: true });
    findSortButton("Status").focus();
    fireEvent.click(findSortButton("Status"), { shiftKey: true });
    expect(document.activeElement).toBe(button);
    expect(findSortButton("Status")).toBe(button);
  });

  /** Every ordering of distinct fields drawn from `fields`, the empty one included. */
  const listOrderings = (
    fields: readonly string[],
  ): readonly (readonly SortTerm[])[] => {
    const orderings: (readonly SortTerm[])[] = [[]];
    const extend = (prefix: readonly SortTerm[], left: readonly string[]) => {
      for (const field of left) {
        for (const direction of ["asc", "desc"] as const) {
          const next = [...prefix, { field, direction }];
          orderings.push(next);
          extend(
            next,
            left.filter((other) => other !== field),
          );
        }
      }
    };
    extend([], fields);
    return orderings;
  };

  it("puts aria-sort on exactly one header, the first term's, across every ordering", () => {
    const orderings = listOrderings(["name", "status", "cores"]);
    // Every ordering of up to three distinct fields, in both directions.
    expect(orderings).toHaveLength(79);
    const names: Readonly<Record<string, string>> = {
      name: "Name",
      status: "Status",
      cores: "Cores",
    };
    for (const defaultSort of [
      [],
      [{ field: "cores", direction: "desc" }],
    ] as const) {
      const { provider, view } = renderOrderingTable(null, defaultSort);
      // Plain attribute queries: 158 orderings through role queries would
      // spend seconds computing names the text content already states.
      const listClaimed = () => [
        ...view.container.querySelectorAll<HTMLElement>(
          "[role='columnheader'][aria-sort]",
        ),
      ];
      for (const ordering of orderings) {
        act(() => {
          provider.setSort(ordering);
        });
        const shown = ordering.length > 0 ? ordering : defaultSort;
        const claimed = listClaimed();
        const first = shown.at(0);
        if (first === undefined) {
          expect(claimed).toEqual([]);
          continue;
        }
        expect(
          claimed.map((header) => header.querySelector(".label")?.textContent),
        ).toEqual([names[first.field]]);
        expect(elementAt(claimed, 0)).toHaveAttribute(
          "aria-sort",
          first.direction === "asc" ? "ascending" : "descending",
        );
      }
      view.unmount();
    }
  });

  it("puts aria-sort on the first rendered column of the first term, over duplicate, unsortable and hidden columns", () => {
    // Which column claims depends on the first term, and on a later term only
    // where the first term's field shows no column: orderings of two terms
    // run only over a layout that leaves a field without one.
    const orderingsOfOne = listOrderings(["name", "status", "cores"]).filter(
      (ordering) => ordering.length <= 1,
    );
    const orderingsOfTwo = listOrderings(["name", "status", "cores"]).filter(
      (ordering) => ordering.length <= 2,
    );
    expect(orderingsOfOne).toHaveLength(7);
    expect(orderingsOfTwo).toHaveLength(31);
    const layouts: readonly {
      readonly columns: readonly DataTableColumn[];
      readonly hidden: readonly string[];
      readonly order: readonly string[];
      /** The label of the first rendered column showing each field. */
      readonly claims: Readonly<Record<string, string | undefined>>;
    }[] = [
      {
        columns: [
          { id: "again", header: "Name again", field: "name", sortable: true },
          { id: "name", header: "Name", sortable: true },
          { id: "status", header: "Status", sortable: true },
          { id: "cores", header: "Cores", sortable: true },
        ],
        hidden: [],
        order: [],
        claims: { name: "Name again", status: "Status", cores: "Cores" },
      },
      {
        columns: [
          { id: "name", header: "Name", sortable: true },
          { id: "status", header: "Status" },
          { id: "cores", header: "Cores", sortable: true },
        ],
        hidden: [],
        order: [],
        claims: { name: "Name", status: "Status", cores: "Cores" },
      },
      {
        columns: [
          { id: "name", header: "Name", sortable: true },
          { id: "status", header: "Status", sortable: true },
          { id: "cores", header: "Cores", sortable: true },
        ],
        hidden: ["status"],
        order: [],
        claims: { name: "Name", status: undefined, cores: "Cores" },
      },
      {
        // The first of two columns over one field hidden: the other claims.
        columns: [
          { id: "again", header: "Name again", field: "name", sortable: true },
          { id: "name", header: "Name", sortable: true },
          { id: "status", header: "Status", sortable: true },
          { id: "cores", header: "Cores", sortable: true },
        ],
        hidden: ["again"],
        order: [],
        claims: { name: "Name", status: "Status", cores: "Cores" },
      },
      {
        // The two reordered: the one rendered first claims, not the one
        // declared first.
        columns: [
          { id: "again", header: "Name again", field: "name", sortable: true },
          { id: "name", header: "Name", sortable: true },
          { id: "status", header: "Status", sortable: true },
          { id: "cores", header: "Cores", sortable: true },
        ],
        hidden: [],
        order: ["name", "again", "status", "cores"],
        claims: { name: "Name", status: "Status", cores: "Cores" },
      },
      {
        // Moved and hidden as the settings menu leaves them: a column moved
        // first claims, and a hidden one claims nothing wherever it stood.
        columns: [
          { id: "name", header: "Name", sortable: true },
          { id: "status", header: "Status", sortable: true },
          { id: "cores", header: "Cores", sortable: true },
        ],
        hidden: ["name"],
        order: ["status", "cores", "name"],
        claims: { name: undefined, status: "Status", cores: "Cores" },
      },
    ];
    for (const layout of layouts) {
      for (const defaultSort of [
        [],
        [{ field: "status", direction: "desc" }],
      ] as const) {
        const { provider, view } = renderOrderingTable(
          null,
          defaultSort,
          layout.columns,
        );
        act(() => {
          provider.presentation.arrange({
            "table.hidden": layout.hidden,
            "table.order": layout.order,
          });
        });
        const orderings = Object.values(layout.claims).includes(undefined)
          ? orderingsOfTwo
          : orderingsOfOne;
        for (const ordering of orderings) {
          act(() => {
            provider.setSort(ordering);
          });
          const first = (ordering.length > 0 ? ordering : defaultSort).at(0);
          const claimed = [
            ...view.container.querySelectorAll<HTMLElement>(
              "[role='columnheader'][aria-sort]",
            ),
          ];
          const label =
            first === undefined ? undefined : layout.claims[first.field];
          expect(
            claimed.map(
              (header) => header.querySelector(".label")?.textContent,
            ),
          ).toEqual(label === undefined ? [] : [label]);
        }
        view.unmount();
      }
    }
  });

  it("clears a refusal's reason once focus leaves its header and its own menu", () => {
    renderOrderingTable(1);
    fireEvent.click(findSortButton("Name"));
    // A reader on the header, in a document that has focus: a blur with the
    // window's focus gone is the window's, not the column's.
    findSortButton("Status").focus();
    fireEvent.click(findSortButton("Status"), { shiftKey: true });
    const findStatusReason = () => findSortReason("Status");
    expect(findStatusReason()).not.toBeEmptyDOMElement();
    // Within the header: it stands.
    fireEvent.blur(findSortButton("Status"), {
      relatedTarget: screen.getByRole("button", {
        name: "Column options for Status",
      }),
    });
    expect(findStatusReason()).not.toBeEmptyDOMElement();
    // Into this column's own menu, portalled outside the header: it stands.
    openMenuOf("Status");
    fireEvent.blur(findSortButton("Status"), {
      relatedTarget: screen.getByRole("menuitem", { name: "Sort ascending" }),
    });
    expect(findStatusReason()).not.toBeEmptyDOMElement();
    // From there to another column's control, its menu still open: it goes.
    fireEvent.blur(findSortButton("Status"), {
      relatedTarget: findSortButton("Name"),
    });
    expect(findStatusReason()).toBeEmptyDOMElement();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(findSortButton("Status"), { shiftKey: true });
    expect(findStatusReason()).not.toBeEmptyDOMElement();
    // Into another column's menu: it goes.
    openMenuOf("Name");
    fireEvent.blur(findSortButton("Status"), {
      relatedTarget: screen.getByRole("menuitem", { name: "Sort descending" }),
    });
    expect(findStatusReason()).toBeEmptyDOMElement();
    fireEvent.keyDown(document, { key: "Escape" });
    // Refused again, then focus going nowhere at all: it goes.
    fireEvent.click(findSortButton("Status"), { shiftKey: true });
    expect(findStatusReason()).not.toBeEmptyDOMElement();
    findSortButton("Status").focus();
    fireEvent.blur(findSortButton("Status"));
    expect(findStatusReason()).toBeEmptyDOMElement();
    // Leaving again with nothing refused changes nothing.
    fireEvent.blur(findSortButton("Status"));
    expect(findStatusReason()).toBeEmptyDOMElement();
  });

  it("claims the sort on the first column showing a field, and on none when no column shows it", () => {
    const { provider } = renderOrderingTable(
      null,
      [],
      [
        { id: "name", header: "Name", sortable: true },
        { id: "again", header: "Name again", field: "name", sortable: true },
        { id: "status", header: "Status", sortable: true },
      ],
    );
    act(() => {
      provider.setSort([{ field: "name", direction: "desc" }]);
    });
    expect(findHeader("Name")).toHaveAttribute("aria-sort", "descending");
    expect(findHeader("Name again")).not.toHaveAttribute("aria-sort");
    act(() => {
      provider.setSort([
        { field: "cores", direction: "asc" },
        { field: "status", direction: "asc" },
      ]);
    });
    // Cores has no column: nothing claims a sort a reader cannot see.
    expect(
      screen
        .getAllByRole("columnheader")
        .filter((header) => header.hasAttribute("aria-sort")),
    ).toEqual([]);
    expect(findSortButton("Status")).toHaveAccessibleDescription(
      "ascending, 2nd of 2",
    );
  });

  it("shows the ordering on a column that offers no sort, describing its header", () => {
    const { provider } = renderOrderingTable(
      null,
      [],
      [
        { id: "name", header: "Name", sortable: true },
        { id: "status", header: "Status" },
      ],
    );
    act(() => {
      provider.setSort([
        { field: "status", direction: "desc" },
        { field: "name", direction: "asc" },
      ]);
    });
    const status = screen.getByRole("columnheader", { name: "Status" });
    expect(status).toHaveAttribute("aria-sort", "descending");
    // No sort control: its menu hides and moves the column, and sorts nothing.
    expect(within(status).queryByRole("button", { name: "Status" })).toBeNull();
    expect(status.querySelector(".sort-reason")).toBeNull();
    expect(status).toHaveAccessibleDescription("descending, 1st of 2");
    expect(status.querySelector(".precedence")).toHaveTextContent("1");
  });

  it("renders a link to the next ordering before hydration and a button after, without a mismatch", async () => {
    const location = createMemoryLocation({ href: "/machines?tab=inventory" });
    const build = () =>
      createMachineProvider({
        rows: [machine("m-1", "alpha")],
        location,
        capabilities: declareMachineOrdering(3),
      }).provider;
    const buildTable = (provider: Provider) => (
      <DataTable
        provider={provider}
        columns={[{ id: "name", header: "Name", sortable: true }]}
        label="Machines"
      />
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(buildTable(build()));
    document.body.append(container);
    onTestFinished(() => {
      container.remove();
    });
    // The next ordering from the first page, the window's size and the
    // host's own parameter kept.
    expect(container.querySelector("a.sort")).toHaveAttribute(
      "href",
      "?tab=inventory&sort=name__asc&page=1&size=50",
    );
    expect(container.querySelector("button")).toBeNull();

    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => {
      errors.mockRestore();
    });
    const root = await act(async () =>
      hydrateRoot(container, buildTable(build())),
    );
    onTestFinished(() => {
      act(() => {
        root.unmount();
      });
    });
    expect(errors).not.toHaveBeenCalled();
    // No link held focus, so the button that replaces it takes none.
    expect(document.activeElement).toBe(document.body);
    expect(container.querySelector("a.sort")).toBeNull();
    expect(
      within(container).getByRole("button", { name: "Name" }),
    ).toBeInTheDocument();
  });

  /** Open one column's header menu from its trigger. */
  const openMenuOf = (name: string): HTMLElement => {
    fireEvent.click(
      screen.getByRole("button", { name: `Column options for ${name}` }),
    );
    // The menu mounts as it opens, replacing the button that opened it.
    return screen.getByRole("button", { name: `Column options for ${name}` });
  };

  /** Choose an item of the open header menu. */
  const choose = (item: string): void => {
    fireEvent.click(screen.getByRole("menuitem", { name: item }));
  };

  it("sorts from a column's header menu and returns focus to its trigger", () => {
    const { provider } = renderOrderingTable(2);
    openMenuOf("Status");
    choose("Sort descending");
    expect(provider.state.get().slice.sort).toEqual([
      { field: "status", direction: "desc" },
    ]);
    // Closed, the menu unmounts: its button, in the trigger's place, has focus.
    expect(
      screen.getByRole("button", { name: "Column options for Status" }),
    ).toHaveFocus();
    expect(findHeader("Status")).toHaveAttribute("aria-sort", "descending");
  });

  it("adds a column from its menu while the source has room, and sorts by it alone once it has none", () => {
    const { provider } = renderOrderingTable(2);
    fireEvent.click(findSortButton("Name"));
    openMenuOf("Status");
    choose("Sort ascending");
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
      { field: "status", direction: "asc" },
    ]);
    openMenuOf("Cores");
    choose("Sort descending");
    expect(provider.state.get().slice.sort).toEqual([
      { field: "cores", direction: "desc" },
    ]);
  });

  it("sets an ordered column's direction where it stands from its menu", () => {
    const { provider } = renderOrderingTable(3);
    act(() => {
      provider.setSort([
        { field: "name", direction: "asc" },
        { field: "status", direction: "asc" },
        { field: "cores", direction: "asc" },
      ]);
    });
    openMenuOf("Status");
    choose("Sort descending");
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
      { field: "status", direction: "desc" },
      { field: "cores", direction: "asc" },
    ]);
  });

  it("offers remove from sort only while the reader's ordering names the column", () => {
    const { provider } = renderOrderingTable(3, [
      { field: "status", direction: "asc" },
    ]);
    // The source's default orders by Status, but the reader stated nothing:
    // there is no term of the reader's to remove.
    openMenuOf("Status");
    expect(
      screen.queryByRole("menuitem", { name: "Remove from sort" }),
    ).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    act(() => {
      provider.setSort([
        { field: "status", direction: "asc" },
        { field: "name", direction: "desc" },
      ]);
    });
    openMenuOf("Status");
    choose("Remove from sort");
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "desc" },
    ]);
    // Closed, the menu unmounts: its button, in the trigger's place, has focus.
    expect(
      screen.getByRole("button", { name: "Column options for Status" }),
    ).toHaveFocus();
  });

  it("offers a header menu on every column that can be sorted, hidden or moved, once scripts run", () => {
    renderOrderingTable(
      3,
      [],
      [
        { id: "name", header: "Name", sortable: true },
        { id: "status", header: "Status" },
        { id: "cores", header: "Cores", hideable: false },
      ],
    );
    expect(
      screen.getByRole("button", { name: "Column options for Name" }),
    ).toHaveAttribute("aria-haspopup", "menu");
    openMenuOf("Status");
    // No sort where the column offers none; standing in the middle, both moves.
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual(["Hide column", "Move column left", "Move column right"]);
    fireEvent.keyDown(document, { key: "Escape" });
    openMenuOf("Cores");
    // A column that may not be hidden is offered no Hide.
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual(["Move column left", "Move column right"]);
    expect(
      screen.getByRole("menuitem", { name: "Move column right" }),
    ).toHaveClass("disabled");
  });

  it("offers no header menu on a column that can be neither sorted, hidden nor moved", () => {
    renderOrderingTable(
      3,
      [],
      [{ id: "name", header: "Name", hideable: false }],
    );
    expect(
      screen.queryByRole("button", { name: "Column options for Name" }),
    ).toBeNull();
    cleanup();
    // The last column shown, hideable, with nowhere to move: nothing either.
    renderOrderingTable(3, [], [{ id: "name", header: "Name" }]);
    expect(
      screen.queryByRole("button", { name: "Column options for Name" }),
    ).toBeNull();
    cleanup();
    // A column that cannot be hidden and stands first can still move right.
    renderOrderingTable(
      3,
      [],
      [
        { id: "name", header: "Name", hideable: false },
        { id: "status", header: "Status", hideable: false },
      ],
    );
    openMenuOf("Name");
    expect(
      screen.getByRole("menuitem", { name: "Move column left" }),
    ).toHaveClass("disabled");
  });

  it("hides a column from its header menu, announces it, and hands focus to the heading now in its place", async () => {
    const { provider, source } = renderOrderingTable(
      3,
      [],
      [
        { id: "name", header: "Name", sortable: true },
        { id: "status", header: "Status" },
        { id: "cores", header: "Cores", sortable: true },
      ],
    );
    const slice = provider.state.get().slice;
    const requests = source.calls.length;
    openMenuOf("Status");
    choose("Hide column");
    expect(
      screen.queryByRole("columnheader", { name: "Status" }),
    ).not.toBeInTheDocument();
    expect(await readAnnouncements()).toEqual(["Status hidden"]);
    // Cores stands where Status stood: its first control takes the focus.
    expect(findSortButton("Cores")).toHaveFocus();
    expect(provider.state.get().slice).toBe(slice);
    expect(source.calls).toHaveLength(requests);
    // The last column's menu, once hidden, hands focus to the new last one.
    openMenuOf("Cores");
    choose("Hide column");
    expect(findSortButton("Name")).toHaveFocus();
  });

  it("disables Hide on the last column shown, from its own header menu", () => {
    const { provider } = renderOrderingTable(
      3,
      [],
      [
        { id: "name", header: "Name", sortable: true },
        { id: "status", header: "Status" },
      ],
    );
    act(() => {
      provider.presentation.arrange({ "table.hidden": ["status"] });
    });
    openMenuOf("Name");
    const hide = screen.getByRole("menuitem", { name: "Hide column" });
    expect(hide).toHaveClass("disabled");
    fireEvent.click(hide);
    expect(provider.presentation.state.get().presentation).toEqual({
      "table.hidden": ["status"],
    });
  });

  it("draws a settings cell and nothing else in a table declaring no columns", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
    });
    render(
      <DataTable
        provider={provider}
        columns={[]}
        label="Machines"
        settings={<DataViews.Settings />}
      />,
    );
    expect(screen.getAllByRole("columnheader")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Table settings" }));
    expect(
      screen.getByRole("menuitem", { name: "Reset table settings" }),
    ).toHaveClass("disabled");
  });

  it("moves a column from its header menu, announcing where it stands, focus kept on its trigger, asking the source for nothing", async () => {
    const { provider, source } = renderOrderingTable(
      3,
      [],
      [
        { id: "name", header: "Name", sortable: true },
        { id: "status", header: "Status" },
        { id: "cores", header: "Cores" },
      ],
    );
    const slice = provider.state.get().slice;
    const requests = source.calls.length;
    openMenuOf("Name");
    choose("Move column right");
    expect(
      screen
        .getAllByRole("columnheader")
        .map((header) => header.getAttribute("aria-labelledby"))
        .map((id) => document.getElementById(id ?? "")?.textContent),
    ).toEqual(["Status", "Name", "Cores"]);
    expect(await readAnnouncements()).toEqual([
      "Name moved to position 2 of 3",
    ]);
    expect(
      screen.getByRole("button", { name: "Column options for Name" }),
    ).toHaveFocus();
    expect(provider.state.get().slice).toBe(slice);
    expect(source.calls).toHaveLength(requests);
  });

  it("has no axe violation with a header menu open", async () => {
    renderOrderingTable(3);
    openMenuOf("Name");
    await expectNoAxeViolations(document.body);
  });

  it("names each header by its label alone, whatever controls it holds", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(1),
    });
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name", sortable: true, resizable: true },
          { id: "status", header: "Status", sortable: true },
          { id: "cores", header: "Cores" },
        ]}
        label="Machines"
      />,
    );
    // A refusal's message sits in the Status header for as long as it stands.
    fireEvent.click(findSortButton("Name"));
    fireEvent.click(findSortButton("Status"), { shiftKey: true });
    const status = findHeader("Status");
    // The header holds more text than its label: the message and the
    // menu button's hidden name are both inside it.
    expect(status).toHaveTextContent(
      "Sort unchanged: this source orders by at most 1 term",
    );
    expect(status).toHaveTextContent("Column options for Status");
    // Yet every header, with a control or without, is named by its label.
    for (const name of ["Name", "Status", "Cores"]) {
      expect(
        screen
          .getAllByRole("columnheader")
          .find((header) => header.textContent?.startsWith(name)),
      ).toHaveAccessibleName(name);
    }
  });

  it("sorts by a column's field, not its id, from every gesture, and says why on that header", () => {
    const { provider } = renderOrderingTable(
      2,
      [],
      [
        { id: "host", header: "Host", field: "name", sortable: true },
        { id: "state", header: "State", field: "status", sortable: true },
        { id: "size", header: "Size", field: "cores", sortable: true },
      ],
    );
    fireEvent.click(findSortButton("Host"));
    fireEvent.click(findSortButton("State"), { shiftKey: true });
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
      { field: "status", direction: "asc" },
    ]);
    fireEvent.click(findSortButton("Size"), { shiftKey: true });
    expect(findSortReason("Size")?.textContent?.trim()).toBe(
      "Sort unchanged: this source orders by at most 2 terms.",
    );
    openMenuOf("Host");
    choose("Sort descending");
    openMenuOf("State");
    choose("Remove from sort");
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "desc" },
    ]);
    expect(findHeader("Host")).toHaveAttribute("aria-sort", "descending");
  });

  it("shows the source's declared default as the ordering while the query states none", () => {
    // A source's declared default already orders its rows, so the header
    // says so rather than claiming the rows are unsorted.
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareCapabilities(machines, {
        filter: { status: ["isAny"] },
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
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(findSortButton("Name")).toHaveAccessibleDescription("ascending");
    // The first activation is still ascending: the default is not a term.
    fireEvent.click(findSortButton("Name"));
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
    ]);
  });

  /**
   * The status row the core decided, rendered once and first in the body,
   * carrying its status as `data-status`. Returns the rows after it.
   */
  const statusRow = (
    status: DisplayStatus["status"],
    text: string,
    announced: boolean,
  ): readonly HTMLElement[] => {
    const table = screen.getByRole("table", { name: "Machines" });
    const body = elementAt(within(table).getAllByRole("rowgroup"), 1);
    const listed = within(body).getAllByRole("row");
    const first = elementAt(listed, 0);
    const rows = listed.slice(1);
    expect(first).toHaveClass("status");
    expect(within(body).getAllByRole("row", { name: text })).toHaveLength(1);
    const cell = within(first).getByRole("cell");
    expect(cell).toHaveAttribute("data-status", status);
    expect(cell).toHaveTextContent(text);
    if (announced) {
      expect(within(cell).getByRole("status")).toHaveTextContent(text);
    } else {
      expect(within(table).queryByRole("status")).toBeNull();
    }
    return rows;
  };

  /** A settled outcome: announced politely, once, from the status cell. */
  const announcedStatusRow = (
    status: DisplayStatus["status"],
    text: string,
  ): readonly HTMLElement[] => statusRow(status, text, true);

  /** A passing state: silent, so nothing is announced that will not last. */
  const silentStatusRow = (
    status: DisplayStatus["status"],
    text: string,
  ): readonly HTMLElement[] => statusRow(status, text, false);

  it("renders pending in place of the rows, silently, before any arrive", () => {
    const { provider, source } = createMachineProvider();
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    // The first request is out and unanswered: there is no outcome to
    // announce, so the row is not a `role="status"` live region.
    expect(source.calls).toHaveLength(1);
    expect(silentStatusRow("pending", "Loading…")).toEqual([]);
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
  });

  it("renders a failure in place of the rows, and announces it", () => {
    const { provider, source } = createMachineProvider();
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    fail(source, "the inventory is unreachable");
    expect(
      announcedStatusRow(
        "failed",
        "These rows could not be loaded: the inventory is unreachable",
      ),
    ).toEqual([]);
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "false");
  });

  it("renders an empty collection as no data, and announces it", () => {
    deliveredTable([]);
    expect(announcedStatusRow("no-data", "There is nothing here yet.")).toEqual(
      [],
    );
  });

  it("renders a query that matched nothing as no results, and announces it", () => {
    // Told apart from no data: the two call for different responses — add
    // something, or change the query — so they are never one message.
    const { provider, source } = deliveredTable([]);
    act(() => {
      provider.setSearch("alpha");
    });
    deliver(source, []);
    expect(
      announcedStatusRow("no-results", "No rows match this query."),
    ).toEqual([]);
  });

  it("renders an earlier query's rows under stale, announced, and leaves focus alone", () => {
    const { source } = deliveredTable();
    const button = screen.getByRole("button", { name: "Name" });
    button.focus();
    fireEvent.click(button);
    // The ordering issued a request the source is now executing.
    expect(source.calls).toHaveLength(2);
    fail(source, "the inventory is unreachable");
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "false");
    // The status row leads, and the retained rows follow it unblanked.
    const rows = announcedStatusRow(
      "stale",
      "These rows do not match the current query: the inventory is unreachable",
    );
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

  it("renders the rows a failed refresh could not replace under refresh-failed, announced", () => {
    const { provider, source } = deliveredTable();
    act(() => {
      provider.refresh();
    });
    fail(source, "the inventory is unreachable");
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "false");
    // The rows still answer the query the user asked, so they stay, and the
    // failure is said above them rather than shown nowhere at all.
    const rows = announcedStatusRow(
      "refresh-failed",
      "These rows could not be refreshed: the inventory is unreachable",
    );
    expect(rows.map((row) => row.textContent)).toEqual([
      "alpharunning",
      "betarunning",
    ]);
  });

  it("hands the core's status to the caller's renderStatus, as any node", () => {
    const { provider, source, view } = deliveredTable([], {
      renderStatus: (status) =>
        "reason" in status ? (
          `${status.status} (${status.reason})`
        ) : (
          <em>nothing: {status.status}</em>
        ),
    });
    act(() => {
      provider.setSearch("alpha");
    });
    deliver(source, []);
    expect(screen.getByText("nothing: no-results").tagName).toBe("EM");
    act(() => {
      provider.refresh();
    });
    fail(source, "offline");
    expect(screen.getByRole("status")).toHaveTextContent(
      /^failed \(offline\)$/,
    );
    // A new renderer while a status shows is shown at once: the body is
    // not held behind the one it was mounted with.
    view.rerender(
      <DataTable
        provider={provider}
        columns={columns}
        label="Machines"
        renderStatus={() => "Changed"}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/^Changed$/);
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

  it("leaves row counts and positions to a virtualized table", () => {
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
    const Probe = ({ rowId }: DisplayFieldCellProps) => {
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
    const Probe = ({ rowId, columnId }: DisplayFieldCellProps) => {
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
      screen
        .getAllByRole("columnheader")
        .map((header) => header.querySelector(".label")?.textContent),
    ).toEqual(["Name", "Status"]);
    view.rerender(
      <DataTable
        provider={provider}
        columns={[...columns, { id: "cores", header: "Cores" }]}
        label="Machines"
      />,
    );
    expect(
      screen
        .getAllByRole("columnheader")
        .map((header) => header.querySelector(".label")?.textContent),
    ).toEqual(["Name", "Status", "Cores"]);
    expect(
      within(elementAt(screen.getAllByRole("row"), 1))
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["alpha", "running", "4"]);
  });

  it("stops observing the collection when the table unmounts", () => {
    const renders: string[] = [];
    const Probe = ({ rowId }: DisplayFieldCellProps) => {
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

  it("keeps two tables on one provider agreed on every width: one authority", async () => {
    const patchPresentation = vi.fn(async () => ({ status: "saved" }) as const);
    const { provider } = createMachineProvider({
      presentation: createStandInPresentationStore({ patchPresentation }),
    });
    render(
      <>
        <DataTable
          provider={provider}
          columns={[
            { id: "name", header: "Name", resizable: true },
            { id: "status", header: "Status" },
          ]}
          label="Machines"
        />
        <DataTable provider={provider} columns={columns} label="Elsewhere" />
      </>,
    );
    const readTracks = (name: string): string =>
      screen
        .getByRole("table", { name })
        .style.getPropertyValue("--data-table-columns");
    // A resize in one table is written to the presentation once, and the
    // other table reads it from there: nothing echoes it back.
    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });
    for (const name of ["Machines", "Elsewhere"]) {
      // jsdom reports a zero-width container, so the solver publishes each
      // column's own reservation; the declarative form is the server path.
      expect(readTracks(name)).toBe("112px 96px");
    }
    act(() => {
      provider.presentation.arrange({ "table.width.status": 200 });
    });
    for (const name of ["Machines", "Elsewhere"]) {
      expect(readTracks(name)).toBe("112px 200px");
    }
    // One write reaches the store, the resize and the arrangement merged:
    // the other table read the widths, and echoed nothing back.
    await waitFor(() => {
      expect(patchPresentation.mock.calls).toEqual([
        ["default", { "table.width.name": 112, "table.width.status": 200 }],
      ]);
    });
  });

  it("sizes a column named for a prototype member from its declaration", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
    });
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "constructor", header: "Name", field: "name" },
          { id: "status", header: "Status" },
        ]}
        label="Machines"
      />,
    );
    // Nothing is stored for it: the prototype's `constructor` is no width.
    expect(
      screen
        .getByRole("table", { name: "Machines" })
        .style.getPropertyValue("--data-table-columns"),
    ).toBe("96px 96px");
  });

  it("renders the columns the presentation shows, in its order, a column declared not hideable always", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
    });
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name", hideable: false },
          { id: "status", header: "Status" },
          { id: "cores", header: "Cores" },
        ]}
        label="Machines"
      />,
    );
    const listHeaders = (): string[] =>
      screen
        .getAllByRole("columnheader")
        .map((header) => header.querySelector(".label")?.textContent ?? "");
    expect(listHeaders()).toEqual(["Name", "Status", "Cores"]);
    act(() => {
      provider.presentation.arrange({
        "table.order": ["cores", "region", "name"],
        "table.hidden": ["status", "name"],
      });
    });
    expect(listHeaders()).toEqual(["Cores", "Name"]);
    // The cells follow the header: each row is the same two columns.
    expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual(
      ["4", "alpha"],
    );
    expect(
      screen
        .getByRole("table", { name: "Machines" })
        .style.getPropertyValue("--data-table-columns"),
    ).toBe("96px 96px");
  });

  it("re-layers every table when a view opens, without an echo", async () => {
    const view = buildStoredView({
      id: "wide",
      name: "Wide",
      query: "",
      presentation: {
        "table.width.name": 240,
        "table.order": ["status", "name"],
      },
    });
    const patchPresentation = vi.fn(async () => ({ status: "saved" }) as const);
    const { provider } = createMachineProvider({
      views: createStandInViewStore({
        list: async () => ({ views: [view], unreadable: [] }),
        get: async () => ({ status: "found", view }),
      }),
      presentation: createStandInPresentationStore({ patchPresentation }),
    });
    const { unmount } = render(
      <>
        <DataTable provider={provider} columns={columns} label="Machines" />
        <DataTable provider={provider} columns={columns} label="Elsewhere" />
      </>,
    );
    const listHeaders = (name: string): string[] =>
      within(screen.getByRole("table", { name }))
        .getAllByRole("columnheader")
        .map((header) => header.querySelector(".label")?.textContent ?? "");
    await act(async () => {
      await provider.views?.open(view.id);
    });
    for (const name of ["Machines", "Elsewhere"]) {
      expect(listHeaders(name)).toEqual(["Status", "Name"]);
      expect(
        screen
          .getByRole("table", { name })
          .style.getPropertyValue("--data-table-columns"),
      ).toBe("96px 240px");
    }
    // Applying a view's arrangement is not a resize: nothing is written
    // back. Unmounting releases the last observer, which sends every write
    // the tables queued before the check runs — so an echo cannot hide
    // behind the writer's delay.
    unmount();
    expect(patchPresentation).not.toHaveBeenCalled();
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
      const { provider } = loadedTable([machine("m-1", "alpha")], {
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
      expect(provider.presentation.state.get().presentation).toEqual({});
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("mounts and publishes its columns at their minimums where there is no ResizeObserver", () => {
    // A runtime with nothing to measure a container by: no width ever
    // arrives, so the table resolves each column at its minimum rather than
    // failing to mount.
    vi.stubGlobal("ResizeObserver", undefined);
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
    });
    const { container } = render(
      <DataTable
        provider={provider}
        columns={unsortedColumns}
        label="Machines"
      />,
    );
    expect(screen.getByRole("table", { name: "Machines" })).toBeInTheDocument();
    expect(
      container
        .querySelector<HTMLElement>("[role='table']")
        ?.style.getPropertyValue("--data-table-columns"),
    ).toBe("96px 96px");
  });

  it("is safe under StrictMode double-mount without orphaned subscriptions", () => {
    const { provider, source } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
    });
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
            // Sortable columns: a header menu mounts only while open, so a
            // closed one observes nothing and what is counted is the table's.
            columns={columns}
            label="Machines"
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
    const Probe = ({ rowId, columnId }: DisplayFieldCellProps) => {
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
      const readTracks = (): string =>
        screen
          .getByRole("table", { name: "Machines" })
          .style.getPropertyValue("--data-table-columns");
      measure(400);
      expect(readTracks()).toBe("100px 300px");
      fireEvent.pointerDown(screen.getByRole("separator"), { clientX: 0 });
      fireEvent.pointerMove(window, { clientX: 50 });
      act(() => {
        for (const frame of frames.splice(0)) {
          frame(0);
        }
      });
      // The last column follows the edge being dragged, before any commit.
      expect(readTracks()).toBe("150px 250px");
      fireEvent.pointerUp(window);
      expect(readTracks()).toBe("150px 250px");
      // Once the columns no longer fit, nothing is stretched: the table
      // scrolls instead.
      measure(200);
      expect(readTracks()).toBe("150px 100px");
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
    const readTracks = (): string =>
      screen
        .getByRole("table", { name: "Machines" })
        .style.getPropertyValue("--data-table-columns");
    expect(handle).toHaveAttribute("aria-valuemax", "80");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(readTracks()).toBe("66px 96px");
    // The first step committed a fixed override; the declared maximum still
    // stops the second step, and the third moves nothing.
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(readTracks()).toBe("80px 96px");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(readTracks()).toBe("80px 96px");
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
    // Offered, and at rest claiming no sort: nothing orders the rows yet.
    expect(name).not.toHaveAttribute("aria-sort");
    expect(within(status).queryByRole("button", { name: "Status" })).toBeNull();
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
    // No sort control on either column; their menus only hide and move.
    expect(screen.queryByRole("button", { name: "Name" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Status" })).toBeNull();
    expect(
      screen.queryByRole("menuitem", { name: "Sort ascending" }),
    ).toBeNull();
    expect(screen.getAllByRole("columnheader")[0]).not.toHaveAttribute(
      "aria-sort",
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

  it("returns to a coherent table once the status clears", () => {
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
    expect(screen.getAllByRole("row")).toHaveLength(2);
    // A refresh that fails and then succeeds clears the same way.
    act(() => {
      provider.refresh();
    });
    fail(source, "offline");
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => {
      provider.refresh();
    });
    deliver(source, [machine("m-2", "beta")]);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getAllByRole("row")).toHaveLength(2);
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

  describe("accessibility", () => {
    it("has no axe violation over loaded rows with sorting and resizing offered", async () => {
      const { view } = loadedTable(undefined, {
        columns: [
          { id: "name", header: "Name", sortable: true, resizable: true },
          { id: "status", header: "Status" },
        ],
      });
      await expectNoAxeViolations(view.container);
    });

    it("has no axe violation with a selection column and a row selected", async () => {
      const { provider, view } = loadedTable(undefined, { selectable: true });
      act(() => {
        provider.selection.add(["m-1"]);
      });
      await expectNoAxeViolations(view.container);
    });

    it("has no axe violation while a column is sorted", async () => {
      const { view } = loadedTable();
      fireEvent.click(screen.getByRole("button", { name: "Name" }));
      await expectNoAxeViolations(view.container);
    });

    it("has no axe violation over several terms and a refusal's reason", async () => {
      const { provider } = createMachineProvider({
        rows: [machine("m-1", "alpha")],
        capabilities: declareMachineOrdering(2),
      });
      const view = render(
        <DataTable
          provider={provider}
          columns={[
            { id: "name", header: "Name", sortable: true },
            { id: "status", header: "Status", sortable: true },
            { id: "cores", header: "Cores" },
          ]}
          label="Machines"
        />,
      );
      act(() => {
        provider.setSort([
          { field: "name", direction: "asc" },
          { field: "cores", direction: "desc" },
        ]);
      });
      fireEvent.click(screen.getByRole("button", { name: "Status" }), {
        shiftKey: true,
      });
      await expectNoAxeViolations(view.container);
    });

    it("has no axe violation while rows are pending, and once they have failed", async () => {
      const { provider, source } = createMachineProvider();
      const view = render(
        <DataTable provider={provider} columns={columns} label="Machines" />,
      );
      await expectNoAxeViolations(view.container);
      fail(source, "the inventory is unreachable");
      await expectNoAxeViolations(view.container);
    });

    it("has no axe violation in the markup a server sends", async () => {
      const { provider } = createMachineProvider({
        location: createMemoryLocation({ href: "/machines" }),
        capabilities: declareMachineOrdering(2),
        snapshot: {
          query: "sort=name__desc&sort=status__asc",
          presentation: {},
        },
      });
      const container = document.createElement("div");
      container.innerHTML = renderToString(
        <DataTable
          provider={provider}
          columns={[
            { id: "name", header: "Name", sortable: true },
            { id: "status", header: "Status", sortable: true },
            { id: "cores", header: "Cores" },
          ]}
          label="Machines"
        />,
      );
      document.body.append(container);
      onTestFinished(() => {
        container.remove();
      });
      await expectNoAxeViolations(container);
    });
  });
});
