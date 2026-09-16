/**
 * The announcer carries what has no place on screen, and nothing else. Every
 * outcome with a place of its own — the pagination summary, the table's
 * status row, a filter's feedback, the saved views' status — is spoken by
 * that place, in its own words, and the root's announcer stays silent, so a
 * reader hears each outcome once.
 */

import { createPage, DEFAULT_WINDOW } from "@canonical/dataviews-core";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import createMemoryViewStore from "../../../testing/createMemoryViewStore.js";
import {
  createMachineProvider,
  type Machine,
  type MachineProvider,
  machine,
} from "../../../testing/machines.js";
import readAnnouncements from "../../../testing/readAnnouncements.js";
import type { DataTableColumn } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name" },
  { id: "cores", header: "Cores" },
];

/** Every part that speaks from a place of its own, over one provider. */
const Composition = ({
  provider,
}: {
  readonly provider: MachineProvider;
}): ReactElement => (
  <DataViews provider={provider}>
    <DataViews.Filters />
    <DataViews.SavedViews />
    <DataViews.DataTable columns={columns} label="Machines" />
    <DataViews.Pagination sizes={[1, 5]} />
  </DataViews>
);

describe("the announcer never repeats a status", () => {
  it("says nothing of what a place on screen already says", async () => {
    const { provider, source } = createMachineProvider({
      snapshot: { query: "page=1&size=1", presentation: {} },
      views: createMemoryViewStore().store,
    });
    render(<Composition provider={provider} />);
    // One region for the root, and every assertion below reads it.
    expect(document.querySelectorAll(".ds.data-views-announcer")).toHaveLength(
      1,
    );

    /** Answer the source's latest request with one page of `rows`. */
    const deliver = (rows: readonly Machine[]) => {
      act(() => {
        source.latest().deliver({
          status: "succeeded",
          page: createPage({ rows, matched: 2, total: 2 }),
        });
      });
    };

    // A page arrives: the summary says what is on screen.
    deliver([machine("m-1", "alpha")]);
    expect(
      within(screen.getByRole("navigation", { name: "Pagination" })).getByRole(
        "status",
      ),
    ).toHaveTextContent("Showing row 1 out of 2");
    expect(await readAnnouncements()).toEqual([]);

    // A page turn: the summary says so, from the same place.
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(provider.state.get().window).toEqual({
      ...DEFAULT_WINDOW,
      page: 2,
      size: 1,
    });
    deliver([machine("m-2", "beta", "failed", 8)]);
    expect(
      within(screen.getByRole("navigation", { name: "Pagination" })).getByRole(
        "status",
      ),
    ).toHaveTextContent("Showing row 2 out of 2");
    expect(await readAnnouncements()).toEqual([]);

    // A refresh that fails: the status row says why, above the rows it kept.
    act(() => {
      provider.refresh();
    });
    act(() => {
      source.latest().deliver({
        status: "failed",
        failure: {
          reason: "the server is offline",
          cause: new Error("offline"),
          transient: null,
        },
      });
    });
    expect(
      screen.getByText(
        "These rows could not be refreshed: the server is offline",
      ),
    ).toBeInTheDocument();
    expect(await readAnnouncements()).toEqual([]);

    // An edit the schema refuses: the control's own feedback says why. What
    // it says is the schema's reason, worded by the record; that it is said
    // there, and nowhere else, is this test's subject.
    const bound = screen.getByLabelText("cores from");
    fireEvent.change(bound, { target: { value: "-5" } });
    // The feedback is the last thing the control is described by: a hint
    // describing the field stands before it.
    const describedBy = (bound.getAttribute("aria-describedby") ?? "").split(
      /\s+/,
    );
    const feedback = document.getElementById(describedBy.at(-1) ?? "");
    expect(feedback).toHaveAttribute("role", "status");
    expect(bound).toHaveAccessibleDescription(/\S/);
    expect(await readAnnouncements()).toEqual([]);

    // A view saved: the saved views' own status says so.
    const views = provider.views;
    if (views === null) {
      throw new Error("a provider given a view store keeps saved views");
    }
    const saved = await act(() => views.saveAs("Busy"));
    expect(saved.status).toBe("saved");
    expect(screen.getByText('Saved "Busy".')).toBeInTheDocument();
    expect(await readAnnouncements()).toEqual([]);

    // The control: an outcome with no place on screen does reach the
    // announcer, so the silence above is the announcer keeping quiet and not
    // a test that could never hear anything.
    fireEvent.click(
      screen.getByRole("button", { name: "Column options for Cores" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Hide column" }));
    expect(await readAnnouncements()).toEqual(["Cores hidden"]);
  });
});
