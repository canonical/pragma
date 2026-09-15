/**
 * On the server the settings are a disclosure of real links, each to the page
 * its change leads to, keeping the rest of the query: nothing to press until
 * scripts run. A destination draws the arrangement its change names, read by
 * a provider standing on it, and nothing is offered without a location.
 */

import { createMemoryLocation } from "@canonical/dataviews-core";
import { resolveColumnArrangement } from "@canonical/dataviews-core/bindings";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  machine,
} from "../../../../../../testing/machines.js";
import type { DataTableColumn } from "../../../DataTable/index.js";
import DataViews from "../../Provider.js";

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", hideable: false },
  { id: "status", header: "Status", sortable: true },
  { id: "cores", header: "Cores", sortable: true },
];

/** A provider over one machine, standing on `href`, or on no location. */
const createProvider = (href: string | null) =>
  createMachineProvider({
    rows: [machine("m-1", "alpha")],
    ...(href === null ? {} : { location: createMemoryLocation({ href }) }),
  }).provider;

/** Server markup of a root, its table and the settings in it. */
const renderSettings = (href: string | null): string =>
  renderToString(
    <DataViews provider={createProvider(href)}>
      <DataViews.DataTable
        columns={columns}
        label="Machines"
        settings={<DataViews.Settings />}
      />
    </DataViews>,
  );

/** The destination of each link in server markup, by its text. */
const listLinks = (markup: string): ReadonlyMap<string, URLSearchParams> =>
  new Map(
    [...markup.matchAll(/<a href="\?([^"]*)">(.*?)<\/a>/g)].map((match) => [
      (match.at(2) ?? "").replaceAll("<!-- -->", ""),
      new URLSearchParams((match.at(1) ?? "").replaceAll("&amp;", "&")),
    ]),
  );

/** The headings a provider standing on a destination shows, in order. */
const listShownAt = (params: URLSearchParams): readonly string[] =>
  resolveColumnArrangement(
    columns,
    createProvider(`/machines?${params}`).presentation.state.get().presentation,
  )
    .filter((placed) => !placed.hidden)
    .map((placed) => String(placed.column.header));

describe("DataViews.Settings SSR", () => {
  it("renders a disclosure of links keeping the query, and no menu button", () => {
    const markup = renderSettings("/machines?status=running&page=1&tab=a");
    expect(markup).toContain("<details");
    expect(markup).not.toContain('aria-haspopup="menu"');
    const links = listLinks(markup);
    expect([...links.keys()]).toEqual([
      "Move Name right",
      "Hide Status",
      "Move Status left",
      "Move Status right",
      "Hide Cores",
      "Move Cores left",
    ]);
    for (const params of links.values()) {
      expect(params.get("status")).toBe("running");
      expect(params.get("tab")).toBe("a");
    }
  });

  it("leads each link to the arrangement its change names", () => {
    const links = listLinks(renderSettings("/machines"));
    const expected = new Map([
      ["Move Name right", ["Status", "Name", "Cores"]],
      ["Hide Status", ["Name", "Cores"]],
      ["Move Status left", ["Status", "Name", "Cores"]],
      ["Move Status right", ["Name", "Cores", "Status"]],
      ["Hide Cores", ["Name", "Status"]],
      ["Move Cores left", ["Name", "Cores", "Status"]],
    ]);
    expect([...links.keys()]).toEqual([...expected.keys()]);
    for (const [name, params] of links) {
      expect(listShownAt(params), name).toEqual(expected.get(name));
    }
  });

  it("links the reset, once there is something to reset, to the arrangement declared", () => {
    const links = listLinks(
      renderSettings("/machines?table.order=cores&table.hidden=status"),
    );
    const reset = links.get("Reset table settings");
    expect(reset?.has("table.hidden")).toBe(false);
    expect(reset?.has("table.order")).toBe(false);
    expect(listShownAt(reset ?? new URLSearchParams())).toEqual([
      "Name",
      "Status",
      "Cores",
    ]);
    expect(links.has("Show Status")).toBe(true);
    expect(
      listLinks(renderSettings("/machines")).has("Reset table settings"),
    ).toBe(false);
  });

  it("offers no link without a location to lead to", () => {
    const markup = renderSettings(null);
    expect(markup).not.toContain("<a ");
    expect(markup).not.toContain("<details");
  });
});
