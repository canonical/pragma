/**
 * Without scripting there is nothing to choose a renderer with, so the server
 * draws every renderer in turn, each in a region named for it, and offers no
 * choice that would do nothing.
 */

import {
  createArraySource,
  createDataViewsProvider,
  createMemoryLocation,
} from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildFleet, machines } from "../../../../testing/machines.js";
import type { DisplayField } from "../../common/index.js";
import type { DataTableColumn } from "../DataTable/index.js";
import { Cards } from "../DataViews/common/Cards/index.js";
import { DataViews } from "../DataViews/index.js";
import RendererSwitch from "./RendererSwitch.js";
import type { RendererChoice } from "./types.js";

const renderers: readonly RendererChoice[] = [
  { id: "table", label: "Table", content: <p>the table</p> },
  { id: "cards", label: "Cards", content: <p>the cards</p> },
];

const tree = <RendererSwitch label="Show machines as" renderers={renderers} />;

describe("RendererSwitch on the server", () => {
  it("draws every renderer in turn, each named, and offers no choice", () => {
    const markup = renderToString(tree);
    expect(markup).toContain('aria-label="Table"');
    expect(markup).toContain('aria-label="Cards"');
    expect(markup.indexOf("the table")).toBeLessThan(
      markup.indexOf("the cards"),
    );
    expect(markup).not.toContain("<select");
  });
});

describe("a composition of renderers on the server", () => {
  it("draws each renderer over one provider, with the baseline each keeps", () => {
    // One declaration serves both renderers: a column is a display field
    // with what only a table adds, so the cards take the same list.
    const columns: readonly DataTableColumn[] = [
      { id: "name", header: "Host", sortable: true },
      { id: "status", header: "Status" },
    ];
    const fields: readonly DisplayField[] = columns;
    const provider = createDataViewsProvider({
      collection: machines,
      source: createArraySource({ rows: buildFleet(9), collection: machines }),
      location: createMemoryLocation({ href: "/machines?status=failed" }),
    });
    provider.refresh();
    const markup = renderToString(
      <DataViews provider={provider}>
        <RendererSwitch
          label="Show machines as"
          renderers={[
            {
              id: "table",
              label: "Table",
              content: (
                <DataViews.DataTable
                  columns={columns}
                  label="Machines"
                  selectable
                />
              ),
            },
            {
              id: "cards",
              label: "Cards",
              content: (
                <Cards
                  fields={fields}
                  title="name"
                  label="Machines as cards"
                  selectable
                />
              ),
            },
          ]}
        />
      </DataViews>,
    );
    // Both renderers are drawn, each in its own named region, and each
    // region is read on its own rather than by counting the whole page.
    // Each region is marked by the renderer it holds, which is how the
    // switch finds them itself once scripts arrive.
    const regions = markup.split('data-renderer="').slice(1);
    expect(regions).toHaveLength(2);
    const [table = "", cards = ""] = regions;
    expect(table).toContain('aria-label="Table"');
    expect(table).toContain('role="table"');
    expect(cards).toContain('aria-label="Cards"');
    expect(cards).toContain('role="list"');
    // Each draws the same query: every third machine of nine failed.
    for (const region of regions) {
      expect(region).toContain("host-003");
      expect(region).toContain("host-009");
      expect(region).not.toContain("host-002");
      // Each keeps its own baseline: native checkboxes, one per record and
      // one for the page.
      expect(region.match(/type="checkbox"/g)).toHaveLength(4);
    }
    // The table's headings are real links to the ordering they lead to.
    expect(table).toContain("sort=name__asc");
    // And nothing offers a choice that would do nothing without scripts.
    expect(markup).not.toContain("<select");
  });
});
