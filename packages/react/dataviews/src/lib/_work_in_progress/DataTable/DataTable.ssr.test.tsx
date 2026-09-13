/**
 * On the server there is nothing to measure, so the table publishes its
 * declarative tracks: the baseline is aligned and the markup is
 * deterministic before any solver or observer runs.
 */
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DataTable from "./DataTable.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "running"] },
]);

describe("DataTable SSR", () => {
  it("renders the declarative tracks, the roles and the controls", () => {
    const provider = createDataViewsProvider({ schema });
    const requestId = provider.refresh();
    if (requestId === null) {
      throw new Error("expected a refresh request");
    }
    const one = { kind: "exact", value: 1 } as const;
    provider.complete(requestId, {
      status: "succeeded",
      page: {
        rows: [{ id: "m-1", name: "alpha", status: "running" }],
        groups: null,
        counts: { pageable: one, matched: one, total: one },
        more: null,
        cursors: null,
      },
    });
    const html = renderToString(
      <DataTable
        provider={provider}
        label="Machines"
        selectable
        columns={[
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
        ]}
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
});
