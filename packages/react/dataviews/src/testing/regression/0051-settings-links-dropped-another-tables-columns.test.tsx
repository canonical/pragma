/**
 * Regression: a settings link, followed without scripts, dropped what
 * another table over the same presentation had hidden and ordered.
 *
 * Before the fix, a link's arrangement was spelled from the columns of the
 * table the link was in, so its hidden list and its order named that table's
 * columns alone, and following it showed another table's hidden columns
 * again. A link now carries the stored lists whole.
 */

import { createMemoryLocation } from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createMachineProvider, machine } from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

describe("regression 0051 — settings links dropped another table's columns", () => {
  it("keeps another table's hidden and ordered ids in every link", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      location: createMemoryLocation({
        href: "/machines?table.order=owner&table.order=name&table.hidden=owner",
      }),
    });
    const container = document.createElement("div");
    container.innerHTML = renderToString(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name" },
          { id: "status", header: "Status" },
        ]}
        label="Machines"
        settings={<DataViews.Settings />}
      />,
    );
    const hide = [...container.querySelectorAll("details a")].find(
      (link) => link.textContent === "Hide Status",
    );
    const params = new URLSearchParams(hide?.getAttribute("href") ?? "");
    expect(params.getAll("table.hidden")).toEqual(["owner", "status"]);
    expect(params.getAll("table.order")).toEqual(["owner", "name"]);
  });
});
