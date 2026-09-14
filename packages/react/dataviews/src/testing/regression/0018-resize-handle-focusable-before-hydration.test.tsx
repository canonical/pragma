/**
 * Regression: a resize handle is not sent before it works.
 *
 * Before the fix, the server sent each resizable column's handle as a
 * focusable separator whose arrow keys resize only once scripts run, so a
 * reader could tab to a control that did nothing — and, without scripts,
 * never would.
 */

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createMachineProvider, machine } from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

describe("regression 0018 — a resize handle focusable before hydration", () => {
  it("sends no separator and nothing focusable for a resizable column", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
    });
    const markup = renderToString(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name", resizable: true },
          { id: "status", header: "Status" },
        ]}
        label="Machines"
      />,
    );
    expect(markup).not.toContain('role="separator"');
    expect(markup).not.toContain('tabindex="0"');
  });
});
