/**
 * Regression: hiding a column from its header menu sent focus to nothing when
 * the heading taking its place held no control.
 *
 * Before the fix, focus went to the first control of the heading now
 * standing where the hidden column stood, and nowhere when that heading had
 * none — a column that can neither be sorted, hidden nor moved has no menu —
 * so a keyboard reader was left on the document. Focus now walks to the
 * nearest heading with a control, and to the table's settings last.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMachineProvider, machine } from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

describe("regression 0057 — hiding a column left focus on a heading with no control", () => {
  it("hands focus to the table's settings when no heading has a control", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
    });
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "status", header: "Status" },
          { id: "name", header: "Name", hideable: false },
        ]}
        label="Machines"
        settings={<DataViews.Settings />}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Column options for Status" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Hide column" }));
    // Name, alone, can be neither sorted, hidden nor moved: it has no menu.
    expect(
      screen.queryByRole("button", { name: "Column options for Name" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Table settings" }),
    ).toHaveFocus();
  });
});
