/**
 * Regression: the sort panel attaches a caller's ref.
 *
 * Before the fix, the panel spread a caller's props onto its section and
 * then set its own ref over them, so a ref the props type accepted was never
 * attached, and the caller held null with no warning.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

describe("regression 0015 — the sort panel dropped a caller's ref", () => {
  it("hands the section to a caller's ref and keeps its own", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(null),
    });
    provider.setSort([{ field: "status", direction: "asc" }]);
    const ref = createRef<HTMLElement>();
    render(
      <DataViews provider={provider}>
        <DataViews.SortPanel ref={ref} />
      </DataViews>,
    );
    expect(ref.current).toBe(screen.getByRole("region", { name: "Sort" }));
    // Its own reference still works: the last term leaving hands focus to
    // the panel it names.
    const remove = within(
      screen.getByRole("region", { name: "Sort" }),
    ).getByRole("button", { name: "Remove" });
    remove.focus();
    fireEvent.click(remove);
    expect(document.activeElement).toBe(ref.current);
  });
});
