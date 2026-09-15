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

  it("renders a standing set's move to none-of as a real link before any script runs", () => {
    const location = createMemoryLocation({
      href: "/machines?tab=overview&status=failed&cpu__gte=4",
    });
    const html = renderToString(
      <DataViews
        provider={createDataViewsProvider({
          collection,
          source: createManualSource<Row>({ capabilities: everything }).source,
          location,
        })}
      >
        <Filters />
      </DataViews>,
    );
    const link =
      /<a class="switch" href="([^"]*)">Match none of these instead<\/a>/.exec(
        html,
      );
    const href = link?.at(1)?.replaceAll("&amp;", "&");
    expect(href).toBeDefined();
    const params = new URLSearchParams(href?.slice(1));
    // The set moved, the host's own parameter kept, from the first page.
    expect(params.getAll("status__isNone")).toEqual(["failed"]);
    expect(params.has("status")).toBe(false);
    expect(params.get("tab")).toBe("overview");
    // Another field's restriction stays where it stood.
    expect(params.get("cpu__gte")).toBe("4");
    expect(params.get("page")).toBe("1");
    // No button before any script runs.
    expect(html).not.toMatch(/<button[^>]*>Match none of these instead/);
  });

  it("renders no move where there is no location to lead to", () => {
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource<Row>({ capabilities: everything }).source,
    });
    readProviderHost(provider).adopt(
      {
        slice: {
          ...EMPTY_SLICE,
          filter: [
            { field: "status", operator: "isAny", operands: ["failed"] },
          ],
        },
        window: DEFAULT_WINDOW,
      },
      "adopt",
      null,
    );
    const html = renderToString(
      <DataViews provider={provider}>
        <Filters />
      </DataViews>,
    );
    expect(html).toContain('name="status" checked="" value="failed"');
    expect(html).not.toContain("Match none of these instead");
  });

  it("keeps in a move's link a restriction on the field it does not move", () => {
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource<Row>({ capabilities: everything }).source,
      location: createMemoryLocation({ href: "/machines?status=failed" }),
    });
    // Adopted as it stands, never checked against the schema: a link leads
    // on from what is in force, and moves only the set it names.
    readProviderHost(provider).adopt(
      {
        slice: {
          ...EMPTY_SLICE,
          filter: [
            { field: "status", operator: "isAny", operands: ["failed"] },
            { field: "status", operator: "contains", operands: ["fail"] },
          ],
        },
        window: DEFAULT_WINDOW,
      },
      "adopt",
      null,
    );
    const html = renderToString(
      <DataViews provider={provider}>
        <Filters />
      </DataViews>,
    );
    const href = /<a class="switch" href="([^"]*)">/
      .exec(html)
      ?.at(1)
      ?.replaceAll("&amp;", "&");
    const params = new URLSearchParams(href?.slice(1));
    expect(params.getAll("status__isNone")).toEqual(["failed"]);
    expect(params.get("status__contains")).toBe("fail");
  });

  it("renders the fields not shown by default as a native disclosure whose controls still submit", () => {
    const html = renderToString(
      <DataViews
        provider={createDataViewsProvider({
          collection,
          source: createManualSource<Row>({ capabilities: everything }).source,
          location: createMemoryLocation({ href: "/machines?cpu__gte=4" }),
        })}
      >
        <Filters primary={["status"]} />
      </DataViews>,
    );
    const opens = html.indexOf(
      '<details class="more"><summary class="summary">More filters</summary>',
    );
    expect(opens).toBeGreaterThan(-1);
    // Restricted, so outside the disclosure; unrestricted, so inside it.
    expect(html.indexOf('name="cpu__gte"')).toBeLessThan(opens);
    expect(html.indexOf('name="status"')).toBeLessThan(opens);
    expect(html.indexOf('name="updated__gte"')).toBeGreaterThan(opens);
    expect(html.indexOf('name="owner__isSet"')).toBeGreaterThan(opens);
  });

  it("renders a none-of set and the text a field starts with into controls a submission keeps", () => {
    const html = renderToString(
      <DataViews
        provider={createDataViewsProvider({
          collection,
          source: createManualSource<Row>({ capabilities: withText }).source,
          location: createMemoryLocation({
            href: "/machines?status__isNone=failed&name__startsWith=we",
          }),
        })}
      >
        <Filters />
      </DataViews>,
    );
    expect(html).toContain('name="status__isNone" checked="" value="failed"');
    expect(html).toMatch(/<input[^>]*name="name__startsWith"[^>]*value="we"/);
  });
});
