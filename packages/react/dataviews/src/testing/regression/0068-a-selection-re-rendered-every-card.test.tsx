/**
 * The cards themselves held the select-all subscription, so checking one
 * card's box re-rendered the whole body: every card, and every value in it.
 * The control that reads the selection is its own, mounted only where the
 * cards are selectable, as the table's select-all cell is.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMachineProvider, machine } from "../../../testing/machines.js";
import { Cards } from "../../lib/_work_in_progress/Cards/index.js";
import type {
  DisplayField,
  DisplayFieldCellProps,
} from "../../lib/common/index.js";

describe("a selection made on a card", () => {
  it("re-renders no card's values", () => {
    const renders: string[] = [];
    const Probe = ({ rowId }: DisplayFieldCellProps) => {
      renders.push(rowId);
      return null;
    };
    const fields: readonly DisplayField[] = [
      { id: "name", header: "Name" },
      { id: "probe", header: "Probe", field: "status", cell: Probe },
    ];
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha"), machine("m-2", "beta")],
    });
    render(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
        selectable
      />,
    );
    // Both cards drew their values once: what follows is measured against it.
    expect(renders).toEqual(["m-1", "m-2"]);
    renders.length = 0;

    fireEvent.click(screen.getByRole("checkbox", { name: "Select beta" }));
    expect(renders).toEqual([]);
    // The page's own control follows the selection it makes.
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", {
        name: "Select all displayed rows",
      }).indeterminate,
    ).toBe(true);

    act(() => {
      provider.selection.add(["m-1"]);
    });
    expect(renders).toEqual([]);
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", {
        name: "Select all displayed rows",
      }).checked,
    ).toBe(true);
  });
});
