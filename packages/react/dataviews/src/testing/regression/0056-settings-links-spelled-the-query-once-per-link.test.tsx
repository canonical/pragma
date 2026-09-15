/**
 * Regression: before scripts run, the settings menu spelled the query again
 * for every link it offered.
 *
 * Before the fix, each of the up to three links per column read the applied
 * query and encoded it through the location afresh, so a server render of a
 * wide table encoded the same query a hundred times and more. Every link is
 * now spelled over one reading of the query.
 */

import { createMemoryLocation } from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createMachineProvider, machine } from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

describe("regression 0056 — settings links spelled the query once per link", () => {
  it("spells the query once for every link the menu offers", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      location: createMemoryLocation({ href: "/machines?status=running" }),
    });
    const spellQuery = vi.spyOn(readProviderHost(provider), "spellQuery");
    const markup = renderToString(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name" },
          { id: "status", header: "Status" },
          { id: "cores", header: "Cores" },
        ]}
        label="Machines"
        settings={<DataViews.Settings />}
      />,
    );
    expect(markup.match(/<a href=/g)?.length).toBeGreaterThan(3);
    expect(spellQuery).toHaveBeenCalledTimes(1);
  });
});
