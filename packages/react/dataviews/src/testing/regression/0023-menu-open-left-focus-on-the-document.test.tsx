/**
 * Regression: opening a header menu keeps focus on a control.
 *
 * Before the fix, the button a reader activated unmounted as the menu
 * mounted, and the menu moved focus to its first item only frames after it
 * opened, so focus sat on the document in between: a key pressed in that gap
 * went nowhere, and a screen reader could announce the document.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

describe("regression 0023 — opening a menu left focus on the document", () => {
  it("holds focus on the menu's own button while the menu opens", () => {
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
    const trigger = findTrigger();
    trigger.focus();
    fireEvent.click(trigger);
    expect(findTrigger()).toHaveFocus();
  });
});
