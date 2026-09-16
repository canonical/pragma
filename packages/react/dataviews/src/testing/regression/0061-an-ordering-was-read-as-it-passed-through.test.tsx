/**
 * Regression: an ordering is read as it stands, not as it passed through.
 *
 * Before the fix every change spoke an announcement of its own, so a reader
 * who added a second term while the first announcement was still waiting
 * heard the ordering before the change and the ordering after it. What the
 * rows are ordered by has one latest answer, so it is said under a topic,
 * and what stood under that topic in the same moment is replaced.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import readAnnouncements from "../../../testing/readAnnouncements.js";
import type { DataTableColumn } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";
import { COALESCE_DELAY_MS } from "../../lib/common/index.js";

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", sortable: true },
  { id: "status", header: "Status", sortable: true },
];

// What counts as one moment is this case's subject, so it decides the time.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("regression 0061 — an ordering was read as it passed through", () => {
  it("says the ordering that stands, once, for two changes made in one moment", async () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(2),
    });
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    // Still inside the announcer's short wait: the ordering below stands
    // where the one above stood, rather than being read after it.
    act(() => {
      vi.advanceTimersByTime(COALESCE_DELAY_MS / 2);
    });
    fireEvent.click(screen.getByRole("button", { name: "Status" }), {
      shiftKey: true,
    });

    expect(await readAnnouncements()).toEqual([
      "Sorted by Name, ascending; then Status, ascending.",
    ]);
  });
});
