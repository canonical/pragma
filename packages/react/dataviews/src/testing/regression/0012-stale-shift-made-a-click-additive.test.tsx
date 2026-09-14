/**
 * Regression: a Shift held on a finished key press does not make a later
 * keyboard click additive.
 *
 * Before the fix, the Shift of an Enter or Space keydown was kept until the
 * next click, so a keydown whose click never came, followed by any click
 * a key produced, added a term instead of sorting by the column alone.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

describe("regression 0012 — a stale Shift made a click additive", () => {
  it("forgets the Shift once its Enter is released or the control is left", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(3),
    });
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name", sortable: true },
          { id: "status", header: "Status", sortable: true },
        ]}
        label="Machines"
      />,
    );
    const name = screen.getByRole("button", { name: "Name" });
    const status = screen.getByRole("button", { name: "Status" });
    fireEvent.click(name);

    fireEvent.keyDown(status, { key: "Enter", shiftKey: true });
    fireEvent.keyUp(status, { key: "Enter", shiftKey: true });
    fireEvent.click(status, { detail: 0 });
    expect(provider.state.get().slice.sort).toEqual([
      { field: "status", direction: "asc" },
    ]);

    fireEvent.keyDown(name, { key: " ", shiftKey: true });
    fireEvent.blur(name);
    fireEvent.click(name, { detail: 0 });
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
    ]);

    // Space clicks on its keyup, so its Shift still counts through it.
    fireEvent.keyDown(status, { key: " ", shiftKey: true });
    fireEvent.keyUp(status, { key: " ", shiftKey: true });
    fireEvent.click(status, { detail: 0 });
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "asc" },
      { field: "status", direction: "asc" },
    ]);

    // The click consumed that Shift: a later click with no key of its own,
    // as assistive technology sends, sorts by the column alone.
    fireEvent.click(status, { detail: 0 });
    expect(provider.state.get().slice.sort).toEqual([
      { field: "status", direction: "desc" },
    ]);
  });
});
