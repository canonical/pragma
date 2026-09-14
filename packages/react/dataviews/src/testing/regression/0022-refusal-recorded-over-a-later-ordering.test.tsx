/**
 * Regression: a refusal's reason belongs to the ordering it was refused over.
 *
 * Before the fix, the header recorded that ordering inside a state updater,
 * which React may run only after a later change in the same event. A sort
 * something else applied in that event was then recorded as the refused
 * ordering, so the reason stood over an ordering nobody had refused.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

describe("regression 0022 — a refusal was recorded over a later ordering", () => {
  it("drops the reason when the same event changes the ordering after the refusal", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(1),
    });
    render(
      // A host control reacting to the same Shift-click, after the header.
      // biome-ignore lint/a11y/noStaticElementInteractions: a test harness standing in for a host listener
      // biome-ignore lint/a11y/useKeyWithClickEvents: only the click is under test
      <div
        onClick={(event) => {
          if (event.shiftKey) {
            provider.setSort([{ field: "name", direction: "desc" }]);
          }
        }}
      >
        <DataTable
          provider={provider}
          columns={[
            { id: "name", header: "Name", sortable: true },
            { id: "status", header: "Status", sortable: true },
          ]}
          label="Machines"
        />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    const status = screen.getByRole("button", { name: "Status" });
    const setSort = vi.spyOn(provider, "setSort");
    onTestFinished(() => {
      setSort.mockRestore();
    });
    fireEvent.click(status, { shiftKey: true });
    // The header's own Shift-click was refused, then the host's sort accepted.
    expect(
      setSort.mock.results.map(
        (result) => (result.value as readonly unknown[]).length,
      ),
    ).toEqual([1, 0]);
    expect(provider.state.get().slice.sort).toEqual([
      { field: "name", direction: "desc" },
    ]);
    const header = screen.getByRole("columnheader", { name: "Status" });
    expect(header.querySelector(".sort-reason")).toBeEmptyDOMElement();
  });
});
