/**
 * Regression: a source's declared default shows as the ordering in force.
 *
 * Before the fix, a table over a source that orders by a declared default
 * reported no sorted column until the query stated a term of its own — "not
 * sorted", over rows that were in fact sorted.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

describe("regression 0007 — a declared default shown as unsorted", () => {
  it("claims the sort on the default's first term while the query states none", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(null, [
        { field: "cores", direction: "desc" },
        { field: "name", direction: "asc" },
      ]),
    });
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name", sortable: true },
          { id: "cores", header: "Cores", sortable: true },
        ]}
        label="Machines"
      />,
    );
    expect(provider.state.get().slice.sort).toEqual([]);
    expect(
      screen.getByRole("columnheader", { name: /^Cores/ }),
    ).toHaveAttribute("aria-sort", "descending");
    expect(
      screen.getByRole("button", { name: "Name" }),
    ).toHaveAccessibleDescription("ascending, 2nd of 2");
  });
});
