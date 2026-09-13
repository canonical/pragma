/**
 * On the server there is nothing to measure, so the table publishes its
 * declarative tracks: the baseline is aligned and the markup is
 * deterministic before any solver or observer runs. And there is nothing to
 * observe the provider: a server render starts no request.
 */
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { deliverRows } from "../../../../testing/fixtures.js";
import {
  createMachineProvider,
  machine,
} from "../../../../testing/machines.js";
import DataTable from "./DataTable.js";
import type { DataTableColumn } from "./types.js";

const columns: readonly DataTableColumn[] = [
  {
    id: "name",
    header: "Name",
    resizable: true,
    sizing: { kind: "flex", weight: 2, minPx: 120 },
  },
  {
    id: "status",
    header: "Status",
    sizing: { kind: "fixed", px: 80 },
  },
];

describe("DataTable SSR", () => {
  it("renders the declarative tracks, the roles and the controls", () => {
    // Rows the server already holds, fed to the provider by hand: nothing
    // observes it, so nothing else would ask the source.
    const { provider } = createMachineProvider();
    const host = readProviderHost(provider);
    host.complete(host.refresh(), deliverRows([machine("m-1", "alpha")]));
    const html = renderToString(
      <DataTable
        provider={provider}
        label="Machines"
        selectable
        columns={columns}
      />,
    );
    // The data columns only: the selection track is the stylesheet's, and
    // `dense` is what sets the density channel.
    expect(html).toContain("--data-table-columns:minmax(120px, 2fr) 80px");
    expect(html).toContain('class="ds data-table dense"');
    expect(html).toContain('role="table"');
    expect(html).toContain('aria-label="Machines"');
    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-label="Select all displayed rows"');
    expect(html).toContain("alpha");
  });

  it("observes nothing on the server: the provider stays idle and the source is never asked", () => {
    // A source that would answer at once, were it asked. The table observes
    // its provider from an effect, which a server render never runs.
    const { provider, source } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
    });
    const html = renderToString(
      <DataTable provider={provider} label="Machines" columns={columns} />,
    );
    expect(source.calls).toHaveLength(0);
    expect(provider.state.get().result.status).toBe("idle");
    expect(html).toContain("Loading…");
    expect(html).not.toContain("alpha");
    // Deterministic: the same idle provider renders the same markup.
    expect(
      renderToString(
        <DataTable provider={provider} label="Machines" columns={columns} />,
      ),
    ).toBe(html);
  });
});
