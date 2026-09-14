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
  DEFAULT_WINDOW,
  declareCapabilities,
  EMPTY_SLICE,
  type SourceCapabilities,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
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
    { field: "name", kind: "text" },
  ],
});

const everything = declareCapabilities(collection, {
  filter: { status: true, cpu: true, updated: true, owner: true },
  search: ["name"],
  counts: COUNTED_EXACTLY,
});

/** Every operator the schema allows, the text field's included. */
const withText = declareCapabilities(collection, {
  filter: { status: true, cpu: true, updated: true, owner: true, name: true },
  counts: COUNTED_EXACTLY,
});

/**
 * The filters rendered on the server over a query holding `name contains
 * "web"`, adopted as a location's query is: a clause the source does not
 * declare still stands, for removal, where a snapshot would refuse it.
 */
const renderWithTextApplied = (capabilities: SourceCapabilities): string => {
  const provider = createDataViewsProvider({
    collection,
    source: createManualSource<Row>({ capabilities }).source,
  });
  readProviderHost(provider).adopt(
    {
      slice: {
        ...EMPTY_SLICE,
        filter: [{ field: "name", operator: "contains", operands: ["web"] }],
      },
      window: DEFAULT_WINDOW,
    },
    "adopt",
    null,
  );
  return renderToString(
    <DataViews provider={provider}>
      <Filters />
    </DataViews>,
  );
};

/**
 * The server markup of the text input alone, so its attributes are read
 * wherever React places them and however it spells them.
 */
const readTextInput = (html: string): string => {
  const tag = /<input[^>]*name="name__contains"[^>]*\/>/.exec(html)?.at(0);
  if (tag === undefined) {
    throw new Error("the server renders no text input for name");
  }
  return tag;
};

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

  it("renders applied text into its input, so a submission keeps it", () => {
    const input = readTextInput(renderWithTextApplied(withText));
    expect(input).toContain('value="web"');
    expect(input).not.toMatch(/readonly=/i);
  });

  it("renders applied text the source does not declare read-only", () => {
    const input = readTextInput(renderWithTextApplied(everything));
    expect(input).toContain('value="web"');
    expect(input).toMatch(/readonly=""/i);
  });
});
