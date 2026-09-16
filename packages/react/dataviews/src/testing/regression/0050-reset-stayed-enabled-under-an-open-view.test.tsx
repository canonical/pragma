/**
 * Regression: "Reset table settings" stayed enabled under an open view,
 * changed nothing and announced a reset.
 *
 * Before the fix, whether a reset changed anything was read from the whole
 * arrangement in force, which includes the open view's saved arrangement:
 * with a view saved hiding a column and no change of the viewer's own, the
 * item stayed enabled forever, removed keys the viewer's layer did not hold
 * and still said "Table settings reset". A reset now reads the viewer's own
 * layer alone.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import createMemoryViewStore from "../../../testing/createMemoryViewStore.js";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import readAnnouncements from "../../../testing/readAnnouncements.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

describe("regression 0050 — reset stayed enabled under an open view", () => {
  it("offers no reset and announces none while only the view hides a column", async () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(null),
      views: createMemoryViewStore().store,
    });
    const { views } = provider;
    if (views === null) {
      throw new Error("a provider given a view store keeps saved views");
    }
    render(
      <DataViews provider={provider}>
        <DataViews.DataTable
          columns={[
            { id: "name", header: "Name" },
            { id: "status", header: "Status" },
          ]}
          label="Machines"
          settings={<DataViews.Settings />}
        />
      </DataViews>,
    );
    act(() => {
      provider.presentation.arrange({ "table.hidden": ["status"] });
    });
    const created = await act(() => views.saveAs("Without status"));
    if (created.status !== "saved") {
      throw new Error(`the view was not saved: ${created.status}`);
    }
    act(() => {
      provider.presentation.arrange({ "table.hidden": undefined });
    });
    await act(() => views.open(created.view.id));
    fireEvent.click(screen.getByRole("button", { name: "Table settings" }));
    const reset = screen.getByRole("menuitem", {
      name: "Reset table settings",
    });
    expect(reset).toHaveClass("disabled");
    fireEvent.click(reset);
    expect(await readAnnouncements()).toEqual([]);
  });
});
