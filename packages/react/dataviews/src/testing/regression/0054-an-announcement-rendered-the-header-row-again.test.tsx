/**
 * Regression: an announcement rendered the table's header row again.
 *
 * Before the fix, what the table last announced was state of the table
 * itself, so saying something — "Name is always shown", which changes no
 * arrangement — rendered the table again and every header cell with it.
 * The announcement now holds what it says, and saying something renders the
 * region alone.
 *
 * Header cells are counted by wrapping the module that renders them: React
 * offers no per-component render count to read otherwise, as regression
 * 0014 found.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { createMachineProvider, machine } from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

const renders = vi.hoisted(() => ({ count: 0 }));

vi.mock(
  "../../lib/_work_in_progress/DataTable/common/HeaderCell/HeaderCell.js",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../lib/_work_in_progress/DataTable/common/HeaderCell/HeaderCell.js")
      >();
    const CountedHeaderCell = (props: Parameters<typeof actual.default>[0]) => {
      renders.count += 1;
      return createElement(actual.default, props);
    };
    return { default: CountedHeaderCell };
  },
);

describe("regression 0054 — an announcement rendered the header row again", () => {
  it("renders no header cell to say that a column is always shown", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
    });
    render(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name", hideable: false },
          { id: "status", header: "Status" },
        ]}
        label="Machines"
        settings={<DataViews.Settings />}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Table settings" }));
    const item = screen.getByRole("menuitem", {
      name: "Name is always shown",
    });
    renders.count = 0;
    fireEvent.click(item);
    expect(
      document.querySelector(".ds.data-table-announcement"),
    ).toHaveTextContent("Name is always shown");
    expect(renders.count).toBe(0);
  });
});
