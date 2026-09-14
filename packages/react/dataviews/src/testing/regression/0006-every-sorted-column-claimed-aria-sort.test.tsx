/**
 * Regression: only one column header claims the sort.
 *
 * Before the fix, every header whose field the ordering named carried
 * `aria-sort`, so an ordering of two terms announced two sorted columns
 * with nothing to say which came first — and every sortable header at rest
 * claimed `none` besides.
 */

import { render, screen, within } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";
import elementAt from "../../../testing/elementAt.js";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

describe("regression 0006 — every sorted column claimed aria-sort", () => {
  it("puts aria-sort on the first term's header alone", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(null),
    });
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name", sortable: true },
          { id: "status", header: "Status", sortable: true },
        ]}
        label="Machines"
      />,
    );
    const listClaimed = () =>
      screen
        .getAllByRole("columnheader")
        .filter((header) => header.hasAttribute("aria-sort"));
    expect(listClaimed()).toEqual([]);
    act(() => {
      provider.setSort([
        { field: "status", direction: "desc" },
        { field: "name", direction: "asc" },
      ]);
    });
    expect(listClaimed()).toHaveLength(1);
    const status = elementAt(listClaimed(), 0);
    expect(status).toHaveAttribute("aria-sort", "descending");
    expect(
      within(status).getByRole("button", { name: "Status" }),
    ).toBeInTheDocument();
  });
});
