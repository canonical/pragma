/**
 * A server render of the filters: the GET form, its named controls and its
 * hidden destination come from the query the location carries, read when
 * the provider is built, through the same encoder the browser uses; and
 * nothing observes — the source is never asked.
 */
import {
  createCollection,
  createDataViewsProvider,
  createMemoryLocation,
  declareCapabilities,
} from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import createManualSource from "../../../../../../testing/createManualSource.js";
import { COUNTED_EXACTLY } from "../../../../../../testing/fixtures.js";
import DataViews from "../../Provider.js";
import Filters from "./Filters.js";

type Row = { readonly id: string };

const collection = createCollection({
  identify: (row: Row) => row.id,
  fields: [
    {
      field: "status",
      kind: "choices",
      options: ["failed", "cancelled", "ready"],
    },
    { field: "cpu", kind: "number", min: 0, max: 64 },
    { field: "updated", kind: "date" },
    { field: "owner", kind: "flag" },
  ],
});

const everything = declareCapabilities(collection, {
  filter: { status: true, cpu: true, updated: true, owner: true },
  search: ["name"],
  counts: COUNTED_EXACTLY,
});

describe("DataViews.Filters SSR", () => {
  it("renders the form on the server, its controls and destination from the query the location carries", () => {
    const location = createMemoryLocation({
      href: "/machines?status=failed&cpu__gte=4&q=yak&page=2&size=50",
    });
    const source = createManualSource<Row>({ capabilities: everything });
    const provider = createDataViewsProvider({
      collection,
      source: source.source,
      location,
    });
    const html = renderToString(
      <DataViews provider={provider}>
        <Filters />
      </DataViews>,
    );
    expect(html).toContain('method="get"');
    expect(html).toContain('name="status" checked="" value="failed"');
    expect(html).toMatch(
      /type="number" min="0" max="64" step="any"[^>]*name="cpu__gte" value="4"/,
    );
    expect(html).toContain('type="hidden" name="q" value="yak"');
    expect(html).toContain('type="hidden" name="page" value="1"');
    expect(html).not.toContain('type="hidden" name="status"');
    // Nothing observed the provider, so nothing ran.
    expect(source.calls).toHaveLength(0);
  });
});
