/**
 * Regression: a header menu, once closed, costs the page nothing again.
 *
 * Before the fix, a menu mounted on its first open stayed mounted after it
 * closed, keeping its portalled surface, its observers and its window
 * listeners for the rest of the page's life — one set for every column a
 * reader had ever sorted from.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

describe("regression 0021 — a closed menu stayed mounted", () => {
  it("drops its surface and window listeners once closed, and hands focus to its button", () => {
    const added = vi.spyOn(window, "addEventListener");
    const removed = vi.spyOn(window, "removeEventListener");
    onTestFinished(() => {
      added.mockRestore();
      removed.mockRestore();
    });
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(null),
    });
    render(
      <DataTable
        provider={provider}
        columns={[{ id: "name", header: "Name", sortable: true }]}
        label="Machines"
      />,
    );
    const findTrigger = () =>
      screen.getByRole("button", { name: "Column options for Name" });
    fireEvent.click(findTrigger());
    expect(
      document.querySelector(".contextual-menu__surface"),
    ).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      document.querySelector(".contextual-menu__surface"),
    ).not.toBeInTheDocument();
    const countCalls = (spy: typeof added, type: string): number =>
      spy.mock.calls.filter(([registered]) => registered === type).length;
    for (const type of ["resize", "scroll"]) {
      expect(countCalls(removed, type)).toBe(countCalls(added, type));
    }
    expect(findTrigger()).toHaveFocus();
  });
});
