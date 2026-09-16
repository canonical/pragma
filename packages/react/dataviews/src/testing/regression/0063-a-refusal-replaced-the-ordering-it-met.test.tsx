/**
 * Regression: a refusal and the ordering it met are both read.
 *
 * Both were announced under the ordering's topic, so a reader who sorted one
 * column and was refused another in the same moment heard only the refusal:
 * the ordering that had just been applied was replaced by why nothing else
 * moved. A refusal is not an ordering — it says why nothing moved, not what
 * now stands — so it stands under a topic of its own.
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

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("regression 0063 — a refusal replaced the ordering it met", () => {
  it("says both the ordering that stands and why the other term was refused", async () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      // One term at a time: a second, added with Shift, is refused.
      capabilities: declareMachineOrdering(1),
    });
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    act(() => {
      vi.advanceTimersByTime(COALESCE_DELAY_MS / 2);
    });
    fireEvent.click(screen.getByRole("button", { name: "Status" }), {
      shiftKey: true,
    });

    // One announcement of that moment, carrying both: what the rows are
    // ordered by, and why they are not ordered by more.
    expect(await readAnnouncements()).toEqual([
      "Sorted by Name, ascending. Sort unchanged: this source orders by at most 1 term.",
    ]);
  });
});
