/**
 * Regression: a refused sort is spoken once.
 *
 * Before the fix each header held a polite live region of its own, so a
 * refusal was read twice: once from the header, once from the table's
 * announcement. The reason still stands beside the control, where a sighted
 * reader sees it, but the only live region a whole composition renders is
 * the root's announcer, and every region that speaks from a place of its own
 * says what belongs to that place and nothing of the refusal.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import createMemoryViewStore from "../../../testing/createMemoryViewStore.js";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import readAnnouncements from "../../../testing/readAnnouncements.js";
import type { DataTableColumn } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

const REFUSED = "Sort unchanged: this source orders by at most 1 term.";

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", sortable: true },
  { id: "status", header: "Status", sortable: true },
];

/** The reason beside whichever Status header is mounted now. */
const findReason = (): Element | null =>
  screen
    .getByRole("button", { name: "Status" })
    .closest("[role='columnheader']")
    ?.querySelector(".sort-reason") ?? null;

describe("regression 0059 — a refusal was spoken twice", () => {
  it("leaves one live region in a whole composition, and says the refusal once", async () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(1),
      views: createMemoryViewStore().store,
    });
    render(
      <DataViews provider={provider}>
        <DataViews.Filters />
        <DataViews.SavedViews />
        <DataViews.DataTable columns={columns} label="Machines" />
        <DataViews.Pagination />
      </DataViews>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    const before = (await readAnnouncements()).length;
    fireEvent.click(screen.getByRole("button", { name: "Status" }), {
      shiftKey: true,
    });

    // One region the composition declares live itself: the root's announcer.
    // The places that speak for themselves are status regions, counted below.
    const live = Array.from(document.querySelectorAll("[aria-live]"));
    expect(live).toHaveLength(1);
    expect(live.at(0)).toHaveClass("ds", "data-views-announcer");
    // Nothing the composition renders is urgent, and every region speaking
    // from a place of its own — the pagination summary, the saved views'
    // notice, a filter's feedback, each of them live by its role — says
    // nothing of the refusal.
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0);
    const places = Array.from(document.querySelectorAll('[role="status"]'));
    expect(places.length).toBeGreaterThan(0);
    for (const place of places) {
      expect(place.textContent ?? "").not.toContain(REFUSED);
    }
    // The header shows it; the announcer is what speaks it.
    expect(findReason()).toHaveTextContent(REFUSED);
    expect(findReason()).not.toHaveAttribute("aria-live");
    expect(findReason()).not.toHaveAttribute("role", "status");
    expect((await readAnnouncements()).slice(before)).toEqual([REFUSED]);
  });
});
