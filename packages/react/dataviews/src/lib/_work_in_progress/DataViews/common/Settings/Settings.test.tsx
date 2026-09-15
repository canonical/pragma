/**
 * DataViews.Settings in its table: the settings cell holding the menu, every
 * change written to the presentation and announced, nothing asked of the
 * source, at least one column always shown, and — without scripts — real
 * links whose destinations draw the arrangement the enhanced menu makes.
 */

import {
  createMemoryLocation,
  type QueryLocation,
} from "@canonical/dataviews-core";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import createMemoryViewStore from "../../../../../../testing/createMemoryViewStore.js";
import createRecordingLocation from "../../../../../../testing/createRecordingLocation.js";
import expectNoAxeViolations from "../../../../../../testing/expectNoAxeViolations.js";
import {
  createMachineProvider,
  declareMachineOrdering,
  type MachineProvider,
  machine,
} from "../../../../../../testing/machines.js";
import { DataTable, type DataTableColumn } from "../../../DataTable/index.js";
import DataViews from "../../Provider.js";

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", hideable: false },
  { id: "status", header: "Status", sortable: true },
  { id: "cores", header: "Cores", sortable: true },
];

/** A provider over one machine, ordering by every field. */
const createProvider = (location?: QueryLocation) =>
  createMachineProvider({
    rows: [machine("m-1", "alpha")],
    capabilities: declareMachineOrdering(null),
    ...(location === undefined ? {} : { location }),
  });

/** The composition a reader meets: a root, its table, the settings in it. */
const Composition = ({
  provider,
  declared = columns,
}: {
  readonly provider: MachineProvider;
  readonly declared?: readonly DataTableColumn[];
}) => (
  <DataViews provider={provider}>
    <DataViews.DataTable
      columns={declared}
      label="Machines"
      settings={<DataViews.Settings />}
    />
  </DataViews>
);

/** The headings of the columns shown, in their order. */
const listShown = (): readonly (string | null)[] =>
  screen
    .getAllByRole("columnheader")
    .filter((cell) => cell.hasAttribute("aria-labelledby"))
    .map(
      (cell) =>
        document.getElementById(cell.getAttribute("aria-labelledby") ?? "")
          ?.textContent ?? null,
    );

const findTrigger = (): HTMLElement =>
  screen.getByRole("button", { name: "Table settings" });

/** Choose one item from the settings menu. */
const choose = (name: string): void => {
  fireEvent.click(findTrigger());
  fireEvent.click(screen.getByRole("menuitem", { name }));
};

/**
 * What every other announcement ends in, so the same words said twice are
 * read twice: a no-break space.
 */
const REPEAT_MARK = "\u00a0";

/** What the table last announced of its columns. */
const readAnnouncement = (): string | null =>
  document.querySelector(".ds.data-table-announcement")?.textContent ?? null;

describe("DataViews.Settings", () => {
  it("throws outside a table's settings cell", () => {
    const { provider } = createProvider();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => {
      errors.mockRestore();
    });
    expect(() =>
      render(
        <DataViews provider={provider}>
          <DataViews.Settings />
        </DataViews>,
      ),
    ).toThrow("DataViews.Settings must be used as a DataTable's settings");
  });

  it("ends the header in a settings cell holding the menu, and a table without it has none", () => {
    const { provider } = createProvider();
    const view = render(<Composition provider={provider} />);
    const cell = findTrigger().closest("[role='columnheader']");
    expect(cell).toHaveClass("ds", "data-table-header-cell", "settings");
    // Last in the header row, after every column's heading.
    expect(cell?.parentElement?.lastElementChild).toBe(cell);
    expect(cell).toHaveAccessibleName("Table settings");
    view.unmount();
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    expect(
      document.querySelector(".data-table-header-cell.settings"),
    ).not.toBeInTheDocument();
  });

  it("works in a standalone table, with no root", () => {
    const { provider } = createProvider();
    render(
      <DataTable
        provider={provider}
        columns={columns}
        label="Machines"
        settings={<DataViews.Settings />}
      />,
    );
    choose("Hide Cores");
    expect(listShown()).toEqual(["Name", "Status"]);
  });

  it("hides a column, announces it and returns focus to its button, asking the source for nothing", () => {
    const recording = createRecordingLocation({ href: "/machines" });
    const { provider, source } = createProvider(recording.location);
    render(<Composition provider={provider} />);
    const requests = source.calls.length;
    const writes = recording.writes.length;
    const slice = provider.state.get().slice;
    choose("Hide Status");
    expect(listShown()).toEqual(["Name", "Cores"]);
    expect(readAnnouncement()).toBe("Status hidden");
    expect(findTrigger()).toHaveFocus();
    expect(provider.presentation.state.get().presentation).toEqual({
      "table.hidden": ["status"],
    });
    // Presentation only: no request, no location write, the same query.
    expect(source.calls).toHaveLength(requests);
    expect(recording.writes).toHaveLength(writes);
    expect(provider.state.get().slice).toBe(slice);
  });

  it("shows a hidden column and moves one, announcing where each now stands", () => {
    const { provider } = createProvider();
    render(<Composition provider={provider} />);
    choose("Hide Status");
    choose("Show Status");
    expect(listShown()).toEqual(["Name", "Status", "Cores"]);
    // Every other announcement ends in a no-break space, so the region's
    // text changes and a screen reader reads the same words again.
    expect(readAnnouncement()).toBe(
      `Status shown, position 2 of 3${REPEAT_MARK}`,
    );
    expect(findTrigger()).toHaveFocus();
    choose("Move Cores left");
    expect(listShown()).toEqual(["Name", "Cores", "Status"]);
    expect(readAnnouncement()).toBe("Cores moved to position 2 of 3");
    expect(findTrigger()).toHaveFocus();
    choose("Move Cores left");
    expect(listShown()).toEqual(["Cores", "Name", "Status"]);
    expect(readAnnouncement()).toBe(
      `Cores moved to position 1 of 3${REPEAT_MARK}`,
    );
  });

  it("keeps a column shown: the last one shown cannot be hidden, and an unhideable one says so", () => {
    const { provider } = createProvider();
    render(<Composition provider={provider} />);
    choose("Name is always shown");
    expect(readAnnouncement()).toBe("Name is always shown");
    expect(listShown()).toEqual(["Name", "Status", "Cores"]);
    const hideable: readonly DataTableColumn[] = [
      { id: "status", header: "Status" },
      { id: "cores", header: "Cores" },
    ];
    const other = createProvider();
    const view = render(
      <Composition provider={other.provider} declared={hideable} />,
    );
    const table = within(view.container);
    fireEvent.click(table.getByRole("button", { name: "Table settings" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Hide Status" }));
    fireEvent.click(table.getByRole("button", { name: "Table settings" }));
    const hideLast = screen.getByRole("menuitem", { name: "Hide Cores" });
    expect(hideLast).toHaveClass("disabled");
    fireEvent.click(hideLast);
    expect(other.provider.presentation.state.get().presentation).toEqual({
      "table.hidden": ["status"],
    });
  });

  it("resets widths, order and hidden columns, asking the source for nothing, and offers no reset with nothing to clear", () => {
    const recording = createRecordingLocation({ href: "/machines" });
    const { provider, source } = createProvider(recording.location);
    render(<Composition provider={provider} />);
    fireEvent.click(findTrigger());
    expect(
      screen.getByRole("menuitem", { name: "Reset table settings" }),
    ).toHaveClass("disabled");
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Reset table settings" }),
    );
    // A disabled item leaves the menu open; its button closes it.
    fireEvent.click(findTrigger());
    choose("Hide Status");
    choose("Move Cores left");
    act(() => {
      provider.presentation.arrange({ "table.width.name": 240 });
    });
    const requests = source.calls.length;
    const writes = recording.writes.length;
    const slice = provider.state.get().slice;
    choose("Reset table settings");
    expect(listShown()).toEqual(["Name", "Status", "Cores"]);
    expect(provider.presentation.state.get().presentation).toEqual({});
    expect(readAnnouncement()).toBe("Table settings reset");
    expect(findTrigger()).toHaveFocus();
    expect(source.calls).toHaveLength(requests);
    expect(recording.writes).toHaveLength(writes);
    expect(provider.state.get().slice).toBe(slice);
  });

  it("resets the columns a followed link chose, back to the arrangement declared", () => {
    const { provider } = createProvider(
      createMemoryLocation({ href: "/machines?table.hidden=status" }),
    );
    render(<Composition provider={provider} />);
    expect(listShown()).toEqual(["Name", "Cores"]);
    choose("Reset table settings");
    expect(listShown()).toEqual(["Name", "Status", "Cores"]);
    expect(provider.presentation.state.get().presentation).toEqual({});
  });

  it("works under StrictMode's doubled effects: one announcement, focus on its button", () => {
    const { provider } = createProvider();
    render(
      <StrictMode>
        <Composition provider={provider} />
      </StrictMode>,
    );
    choose("Hide Status");
    expect(listShown()).toEqual(["Name", "Cores"]);
    expect(readAnnouncement()).toBe("Status hidden");
    expect(findTrigger()).toHaveFocus();
  });

  it("hides columns in the arrangement a saved view remembers", async () => {
    const { store } = createMemoryViewStore();
    /** A provider over one machine keeping its views in the shared store. */
    const createViewer = () => {
      const { provider } = createMachineProvider({
        rows: [machine("m-1", "alpha")],
        capabilities: declareMachineOrdering(null),
        views: store,
      });
      const { views } = provider;
      if (views === null) {
        throw new Error("a provider given a view store keeps saved views");
      }
      return { provider, views };
    };
    const author = createViewer();
    const authoring = render(<Composition provider={author.provider} />);
    choose("Hide Status");
    const created = await act(() => author.views.saveAs("Without status"));
    if (created.status !== "saved") {
      throw new Error(`the view was not saved: ${created.status}`);
    }
    expect(created.view.presentation).toEqual({ "table.hidden": ["status"] });
    authoring.unmount();
    // Another viewer, holding no change of their own, sees every column until
    // the view is opened: only the view can hide Status for them.
    const reader = createViewer();
    render(<Composition provider={reader.provider} />);
    expect(listShown()).toEqual(["Name", "Status", "Cores"]);
    await act(() => reader.views.open(created.view.id));
    expect(listShown()).toEqual(["Name", "Cores"]);
    // The view holds no change of the reader's own to reset.
    fireEvent.click(findTrigger());
    expect(
      screen.getByRole("menuitem", { name: "Reset table settings" }),
    ).toHaveClass("disabled");
  });

  it("has no axe violations with the menu closed and open", async () => {
    const { provider } = createProvider();
    const view = render(<Composition provider={provider} />);
    choose("Hide Status");
    await expectNoAxeViolations(view.container);
    fireEvent.click(findTrigger());
    await waitFor(() =>
      expect(screen.getAllByRole("menuitem").at(0)).toHaveFocus(),
    );
    await expectNoAxeViolations(document.body);
  });

  describe("without scripts, as scripts take over", () => {
    /** Server markup of the composition, over a location standing on `href`. */
    const renderMarkup = (href: string): string =>
      renderToString(
        <Composition
          provider={createProvider(createMemoryLocation({ href })).provider}
        />,
      );

    /** Each link's destination in server markup, by its text. */
    const listLinks = (markup: string): ReadonlyMap<string, string> => {
      const container = document.createElement("div");
      container.innerHTML = markup;
      return new Map(
        [...container.querySelectorAll("details a")].map((link) => [
          link.textContent ?? "",
          link.getAttribute("href") ?? "",
        ]),
      );
    };

    /** The columns a provider standing on a destination shows, in order. */
    const listShownAt = (destination: string): readonly (string | null)[] => {
      const { provider } = createProvider(
        createMemoryLocation({ href: `/machines${destination}` }),
      );
      const view = render(
        <DataTable provider={provider} columns={columns} label="Machines" />,
      );
      const shown = listShown();
      view.unmount();
      return shown;
    };

    it("leads each link to the arrangement the menu's own item makes, from every starting arrangement", () => {
      const chosen = new Set<string>();
      for (const href of [
        "/machines?status=running",
        "/machines?table.hidden=status",
        "/machines?table.order=cores&table.hidden=status",
        "/machines?table.hidden=cores&table.order=cores&table.order=status",
      ]) {
        const links = listLinks(renderMarkup(href));
        expect(links.size, href).toBeGreaterThan(0);
        for (const [name, destination] of links) {
          const { provider } = createProvider(createMemoryLocation({ href }));
          const view = render(<Composition provider={provider} />);
          choose(name);
          const enhanced = listShown();
          view.unmount();
          expect(listShownAt(destination), `${name} from ${href}`).toEqual(
            enhanced,
          );
          chosen.add(name);
        }
      }
      // Shows, moves across a hidden column and the reset were all compared.
      for (const name of [
        "Show Status",
        "Show Cores",
        "Move Status right",
        "Reset table settings",
      ]) {
        expect(chosen).toContain(name);
      }
    });

    it("hydrates what the server drew and hands a focused link's focus to the menu button", async () => {
      const href = "/machines?status=running";
      const markup = renderMarkup(href);
      const container = document.createElement("div");
      container.innerHTML = markup;
      document.body.append(container);
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      let root: ReturnType<typeof hydrateRoot> | null = null;
      onTestFinished(() => {
        act(() => {
          root?.unmount();
        });
        container.remove();
        errors.mockRestore();
      });
      const link = container.querySelector<HTMLElement>("details a");
      link?.focus();
      await act(async () => {
        root = hydrateRoot(
          container,
          <Composition
            provider={createProvider(createMemoryLocation({ href })).provider}
          />,
        );
      });
      expect(errors).not.toHaveBeenCalled();
      expect(container.querySelector("details")).toBeNull();
      expect(
        within(container).getByRole("button", { name: "Table settings" }),
      ).toHaveFocus();
    });
  });
});
