/**
 * CatalogList's grouping contract (ruling R7): Global first, other tiers
 * alphabetical, and the schema-legal null tier lands in an "Untiered"
 * bucket LAST — proven with a synthetic record map, because the live
 * graph currently has zero null tiers (the schema still allows them).
 * Storage keys mirror the capture exactly (`components(first:100)` + the
 * `@connection` handle) so the one page query stays fulfilled.
 */

import { render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { describe, expect, it, vi } from "vitest";
import { catalogPage } from "../__fixtures__/catalogPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/** One Global node and one null-tier node, connection keys as captured. */
const untieredRecords = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    "components(first:100)": {
      __ref: "client:root:components(first:100)",
    },
    __CatalogList_components_connection: {
      __ref: "client:root:__CatalogList_components_connection",
    },
  },
  "client:root:components(first:100)": {
    __id: "client:root:components(first:100)",
    __typename: "ComponentConnection",
    edges: {
      __refs: [
        "client:root:components(first:100):edges:0",
        "client:root:components(first:100):edges:1",
      ],
    },
    pageInfo: { __ref: "client:root:components(first:100):pageInfo" },
  },
  "client:root:components(first:100):edges:0": {
    __id: "client:root:components(first:100):edges:0",
    __typename: "ComponentEdge",
    node: { __ref: "ds:global.component.button" },
    cursor: "cursor-0",
  },
  "client:root:components(first:100):edges:1": {
    __id: "client:root:components(first:100):edges:1",
    __typename: "ComponentEdge",
    node: { __ref: "ds:limbo.component.orphan" },
    cursor: "cursor-1",
  },
  "client:root:components(first:100):pageInfo": {
    __id: "client:root:components(first:100):pageInfo",
    __typename: "PageInfo",
    endCursor: "cursor-1",
    hasNextPage: false,
  },
  "client:root:__CatalogList_components_connection": {
    __id: "client:root:__CatalogList_components_connection",
    __typename: "ComponentConnection",
    __connection_next_edge_index: 2,
    edges: {
      __refs: [
        "client:root:__CatalogList_components_connection:edges:0",
        "client:root:__CatalogList_components_connection:edges:1",
      ],
    },
    pageInfo: {
      __ref: "client:root:__CatalogList_components_connection:pageInfo",
    },
  },
  "client:root:__CatalogList_components_connection:edges:0": {
    __id: "client:root:__CatalogList_components_connection:edges:0",
    __typename: "ComponentEdge",
    node: { __ref: "ds:global.component.button" },
    cursor: "cursor-0",
  },
  "client:root:__CatalogList_components_connection:edges:1": {
    __id: "client:root:__CatalogList_components_connection:edges:1",
    __typename: "ComponentEdge",
    node: { __ref: "ds:limbo.component.orphan" },
    cursor: "cursor-1",
  },
  "client:root:__CatalogList_components_connection:pageInfo": {
    __id: "client:root:__CatalogList_components_connection:pageInfo",
    __typename: "PageInfo",
    endCursor: "cursor-1",
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
  },
  "ds:global.component.button": {
    __id: "ds:global.component.button",
    __typename: "Component",
    id: "ds:global.component.button",
    name: "Button",
    uri: "ds:global.component.button",
    summary: "Buttons trigger actions.",
    tier: { __ref: "ds:global" },
  },
  "ds:limbo.component.orphan": {
    __id: "ds:limbo.component.orphan",
    __typename: "Component",
    id: "ds:limbo.component.orphan",
    name: "Orphan",
    uri: "ds:limbo.component.orphan",
    summary: null,
    tier: null,
  },
  "ds:global": {
    __id: "ds:global",
    __typename: "Tier",
    id: "ds:global",
    name: "Global",
  },
} as unknown as RecordMap;

describe("CatalogList tier grouping", () => {
  it("buckets a null tier as Untiered, LAST (R7), without fetching", () => {
    const fetchFn = createFetchSpy();
    render(catalogPage(untieredRecords, fetchFn));

    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Global", "Untiered"]);
    // The orphan card renders under the bucket with the name-or-uri rule
    // and the tier tag shows the bucket, not a blank.
    expect(screen.getByRole("link", { name: "Orphan" })).toBeInTheDocument();
    expect(screen.getByText("Untiered", { selector: "p" })).toBeInTheDocument();
    // pageInfo says one page only — no pagination affordance.
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
