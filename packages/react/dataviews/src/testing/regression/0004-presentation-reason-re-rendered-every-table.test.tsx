/**
 * Regression: a table re-renders for a change to the arrangement, never
 * for a change to the reason the arrangement is not being saved.
 *
 * Before the fix, the table read the presentation's whole state, so a
 * failed write — which changes the reason and not the arrangement — made
 * every table on the provider render again for nothing, and a width commit
 * re-rendered the saved-views control, which reads only the reason.
 */

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { Profiler } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createStandInPresentationStore,
  createStandInViewStore,
} from "../../../testing/createStandInStores.js";
import { createMachineProvider, machine } from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

afterEach(cleanup);

describe("regression 0004 — a presentation reason re-rendered every table", () => {
  it("commits the table again for a width, not for a reason", async () => {
    let commits = 0;
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      presentation: createStandInPresentationStore({
        patchPresentation: async () => {
          throw new Error("view storage failed");
        },
      }),
    });
    render(
      <Profiler
        id="table"
        onRender={() => {
          commits += 1;
        }}
      >
        <DataTable
          provider={provider}
          columns={[{ id: "name", header: "Name" }]}
          label="Machines"
        />
      </Profiler>,
    );
    await screen.findByRole("cell", { name: "alpha" });
    const settled = commits;
    act(() => {
      provider.presentation.arrange({ "table.width.name": 200 });
    });
    expect(commits).toBe(settled + 1);
    await waitFor(() => {
      expect(provider.presentation.state.get().presentationReason).toBe(
        "view storage failed",
      );
    });
    // The width committed the table once; the reason that followed did not.
    expect(commits).toBe(settled + 1);
  });

  it("commits the saved-views control for a reason, not for a width", async () => {
    let commits = 0;
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      views: createStandInViewStore(),
      presentation: createStandInPresentationStore({
        patchPresentation: async () => {
          throw new Error("view storage failed");
        },
      }),
    });
    render(
      <DataViews provider={provider}>
        <Profiler
          id="saved-views"
          onRender={() => {
            commits += 1;
          }}
        >
          <DataViews.SavedViews />
        </Profiler>
      </DataViews>,
    );
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "View" })).toBeEnabled();
    });
    const settled = commits;
    act(() => {
      provider.presentation.arrange({ "table.width.name": 200 });
    });
    // The width committed nothing here; the reason that followed did, once.
    expect(commits).toBe(settled);
    await waitFor(() => {
      expect(
        screen.getByText(/The arrangement is not being saved/),
      ).toBeInTheDocument();
    });
    expect(commits).toBe(settled + 1);
  });
});
