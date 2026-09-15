/**
 * Regression: the settings menu remounted every item's label whenever the
 * columns changed while it was open.
 *
 * Before the fix, every item carried a label component made for it, so a
 * change arriving while the menu was open — another table on the provider,
 * a store read — gave every item a component of a new type, and each label
 * was unmounted and mounted again. Every item now renders one shared label.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMachineProvider, machine } from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

describe("regression 0055 — an open settings menu remounted its labels", () => {
  it("keeps an item's label mounted through a change to another column", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
    });
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name" },
          { id: "status", header: "Status" },
          { id: "cores", header: "Cores" },
        ]}
        label="Machines"
        settings={<DataViews.Settings />}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Table settings" }));
    const label = screen
      .getByRole("menuitem", { name: "Hide Name" })
      .querySelector(".label");
    expect(label).not.toBeNull();
    act(() => {
      provider.presentation.arrange({ "table.hidden": ["cores"] });
    });
    expect(screen.getByRole("menuitem", { name: "Show Cores" })).toBeVisible();
    expect(
      screen
        .getByRole("menuitem", { name: "Hide Name" })
        .querySelector(".label"),
    ).toBe(label);
  });
});
