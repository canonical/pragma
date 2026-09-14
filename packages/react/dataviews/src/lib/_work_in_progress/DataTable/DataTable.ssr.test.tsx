/**
 * On the server there is nothing to measure, so the table publishes its
 * declarative tracks: the baseline is aligned and the markup is
 * deterministic before any solver or observer runs. And there is nothing to
 * observe the provider: a server render starts no request.
 */

import {
  createMemoryLocation,
  DEFAULT_WINDOW,
  decodeQuery,
  type PresentationStore,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createStandInPresentationStore } from "../../../../testing/createStandInStores.js";
import { deliverRows } from "../../../../testing/fixtures.js";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
  machines,
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
    // A stored width the server never reads: the tracks stay declarative.
    const readPresentation = vi.fn<PresentationStore["readPresentation"]>(
      async () => ({ "table.width.name": 300 }),
    );
    const heard = vi.fn<PresentationStore["subscribe"]>();
    const { provider } = createMachineProvider({
      presentation: createStandInPresentationStore({
        readPresentation,
        subscribe: heard,
      }),
    });
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
    expect(readPresentation).not.toHaveBeenCalled();
    expect(heard).not.toHaveBeenCalled();
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

  /** Every sort link's destination in server markup, entities decoded. */
  const listSortLinks = (markup: string): readonly URLSearchParams[] =>
    [...markup.matchAll(/<a href="\?([^"]*)"[^>]*class="sort"/g)].map(
      (match) => new URLSearchParams((match[1] ?? "").replaceAll("&amp;", "&")),
    );

  it("renders each sortable header as a real link to the next ordering, from page one", () => {
    // The page the reader is on, a host parameter the grammar does not own,
    // and the ordering the provider holds.
    const location = createMemoryLocation({
      href: "/machines?tab=inventory&sort=name__asc&page=3",
    });
    const { provider } = createMachineProvider({
      location,
      capabilities: declareMachineOrdering(3),
      seed: {
        slice: {
          filter: [],
          search: null,
          sort: [{ field: "name", direction: "asc" }],
          group: [],
        },
        window: { ...DEFAULT_WINDOW, page: 3 },
      },
    });
    const markup = renderToString(
      <DataTable
        provider={provider}
        columns={[
          { id: "name", header: "Name", sortable: true },
          { id: "status", header: "Status", sortable: true },
          { id: "cores", header: "Cores" },
        ]}
        label="Machines"
      />,
    );
    const links = listSortLinks(markup);
    expect(links).toHaveLength(2);
    const decoded = links.map((params) =>
      decodeQuery({ schema: machines.schema, params }),
    );
    // Name cycles from ascending to descending; Status starts ascending.
    expect(decoded.map((query) => query.slice.sort)).toEqual([
      [{ field: "name", direction: "desc" }],
      [{ field: "status", direction: "asc" }],
    ]);
    for (const [at, query] of decoded.entries()) {
      expect(query.issues).toEqual([]);
      expect(query.window.page).toBe(1);
      expect(links.at(at)?.get("tab")).toBe("inventory");
    }
    // Nothing a script alone drives is offered, and one header claims the sort.
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain('role="status"');
    expect(markup.match(/aria-sort=/g)).toEqual(["aria-sort="]);
    expect(markup).toContain('aria-sort="ascending"');
  });

  it("renders a sortable header as its label when there is no location to link to", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(3),
    });
    const markup = renderToString(
      <DataTable
        provider={provider}
        columns={[{ id: "name", header: "Name", sortable: true }]}
        label="Machines"
      />,
    );
    expect(markup).not.toContain("<a ");
    expect(markup).not.toContain("<button");
    expect(markup).toContain('class="label">Name</span>');
  });
});
