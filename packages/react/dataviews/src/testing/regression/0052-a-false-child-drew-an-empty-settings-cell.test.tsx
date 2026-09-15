/**
 * Regression: a table not given its settings drew an empty, unnamed settings
 * cell.
 *
 * Before the fix, the header's settings cell was drawn whenever the table's
 * children were not undefined, so the ordinary conditional
 * `{canConfigure && <DataViews.Settings />}` left an empty column header and
 * reserved the settings track for it. The cell is now filled by the named
 * `settings` prop, which is typed to take an element or nothing, and is drawn
 * only for a valid element, so the same conditional passed from untyped code
 * draws nothing either.
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMachineProvider, machine } from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

describe("regression 0052 — a false child drew an empty settings cell", () => {
  it("draws no settings cell for a conditional that renders nothing, typed or not", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
    });
    const canConfigure = (): boolean => false;
    const { container } = render(
      <DataTable
        provider={provider}
        columns={[{ id: "name", header: "Name" }]}
        label="Machines"
        settings={canConfigure() ? <DataViews.Settings /> : undefined}
      />,
    );
    // The children's conditional, carried over to the prop from untyped
    // code: false is no element, and draws no cell either.
    const untyped = render(
      <DataTable
        provider={provider}
        columns={[{ id: "name", header: "Name" }]}
        label="Machines"
        // @ts-expect-error — a conditional's false is no element.
        settings={canConfigure() && <DataViews.Settings />}
      />,
    );
    expect(
      untyped.container.querySelector(".data-table-header-cell.settings"),
    ).toBeNull();
    expect(
      container.querySelector(".data-table-header-cell.settings"),
    ).toBeNull();
    expect(container.querySelectorAll("[role='columnheader']")).toHaveLength(1);
  });
});
