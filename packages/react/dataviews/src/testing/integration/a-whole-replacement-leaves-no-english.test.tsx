/**
 * An application replacing the whole record through the root's `messages`
 * leaves no English: not in what a server renders before any script runs —
 * the table's sort links and settings disclosure, the filters' form, the
 * saved views' notice — nor in what the page shows once scripts take over,
 * the action bar and the table's menus included.
 */

import { createMemoryLocation } from "@canonical/dataviews-core";
import { resolveMessages } from "@canonical/dataviews-core/bindings";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished } from "vitest";
import createMemoryViewStore from "../../../testing/createMemoryViewStore.js";
import createTokenMessages from "../../../testing/createTokenMessages.js";
import findEnglish from "../../../testing/findEnglish.js";
import {
  createMachineProvider,
  declareMachineOrdering,
  type MachineProvider,
  machine,
} from "../../../testing/machines.js";
import type { DataTableColumn } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

const english = resolveMessages();

/**
 * A whole replacement: every message a token naming it. Built from the
 * English record's own keys, so it is whole by construction; the type's
 * compile-time wholeness is pinned beside the record.
 */
const whole = createTokenMessages(english);

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", sortable: true, resizable: true },
  { id: "status", header: "Status", sortable: true, hideable: false },
  { id: "cores", header: "Cores" },
];

/** A provider over two machines, standing on a location, keeping views. */
const createProvider = (): MachineProvider =>
  createMachineProvider({
    rows: [machine("m-1", "alpha"), machine("m-2", "beta", "failed", 8)],
    capabilities: declareMachineOrdering(2),
    location: createMemoryLocation({ href: "/machines?sort=name" }),
    views: createMemoryViewStore().store,
  }).provider;

/** Every part of the composition, over one provider, in the whole replacement. */
const Composition = ({
  provider,
}: {
  readonly provider: MachineProvider;
}): ReactElement => (
  <DataViews provider={provider} messages={whole}>
    <DataViews.Search />
    <DataViews.Filters />
    <DataViews.SortPanel />
    <DataViews.SavedViews />
    <DataViews.Actions />
    <DataViews.DataTable
      columns={columns}
      label="Machines"
      selectable
      settings={<DataViews.Settings />}
    />
    <DataViews.Pagination />
  </DataViews>
);

describe("a whole replacement leaves no English", () => {
  it("in what a server renders before any script runs", () => {
    const html = renderToString(<Composition provider={createProvider()} />);
    const container = document.createElement("div");
    container.innerHTML = html;
    // The replacement's words are there, where English was.
    expect(html).toContain("‹search›");
    expect(html).toContain("‹tableSettings›");
    expect(findEnglish(container, english)).toEqual([]);
  });

  it("through a hydration of the server's own markup", async () => {
    const provider = createProvider();
    const markup = renderToString(<Composition provider={provider} />);
    const container = document.createElement("div");
    container.innerHTML = markup;
    document.body.append(container);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const root = await act(async () =>
      hydrateRoot(container, <Composition provider={createProvider()} />),
    );
    // Registered as soon as there is something to undo, so a failed
    // expectation below still leaves the document as it was found.
    onTestFinished(() => {
      act(() => {
        root.unmount();
      });
      container.remove();
      errors.mockRestore();
    });
    expect(errors.mock.calls).toEqual([]);
    expect(findEnglish(container, english)).toEqual([]);
    expect(container.textContent).toContain("‹filters›");
  });

  it("in the panels and menus an interaction opens", async () => {
    const provider = createProvider();
    render(<Composition provider={provider} />);
    // A bound the schema refuses: the feedback beside the control.
    fireEvent.change(screen.getByLabelText("‹filterFrom›"), {
      target: { value: "-5" },
    });
    // The settings menu, and the saved views' two panels.
    fireEvent.click(screen.getByRole("button", { name: "‹tableSettings›" }));
    fireEvent.click(screen.getByRole("button", { name: "‹renameView›" }));
    fireEvent.click(screen.getByRole("button", { name: "‹deleteView›" }));
    await act(async () => {
      await new Promise((settle) => {
        setTimeout(settle, 50);
      });
    });
    expect(findEnglish(document.body, english)).toEqual([]);
  });

  it("in what the page shows once scripts run, with rows selected and a menu open", async () => {
    const provider = createProvider();
    const { container } = render(<Composition provider={provider} />);
    act(() => {
      provider.selection.add(["m-1"]);
    });
    const [trigger] = screen.getAllByRole("button", {
      name: "‹columnOptions›",
    });
    if (trigger === undefined) {
      throw new Error("the table offers no column menu");
    }
    fireEvent.click(trigger);
    await act(async () => {
      await new Promise((settle) => {
        setTimeout(settle, 50);
      });
    });
    expect(
      screen.getByRole("menuitem", { name: "‹sortAscending›" }),
    ).toBeVisible();
    expect(findEnglish(container, english)).toEqual([]);
    expect(findEnglish(document.body, english)).toEqual([]);
  });
});
