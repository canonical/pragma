/**
 * StandardsIndex's grouping contract: alphabetical category slugs, and
 * the schema-legal zero-category standard lands in an "uncategorised"
 * bucket LAST — proven with a synthetic record map, because the live
 * graph currently has zero uncategorised standards (131/131 carry one;
 * the schema still allows none). Storage keys mirror the capture exactly
 * (`codeStandards(first:100)` + the `@connection` handle) so the one page
 * query stays fulfilled.
 *
 * The categorised fixture is deliberately `webcomponents` — a REAL live
 * slug (page 2 of the connection) chosen because it sorts AFTER
 * "uncategorised" alphabetically. That is what gives the ordering
 * assertion teeth: with an earlier slug (the original `turtle`) the
 * expectation held on plain alphabetical order alone, so deleting
 * `compareCategories`'s uncategorised-last branch left the test GREEN.
 * Now only the special case can produce the asserted order.
 */

import { render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { describe, expect, it, vi } from "vitest";
import {
  STANDARDS_TEST_TIMEOUT_MS,
  standardsIndexPage,
} from "../__fixtures__/standardsPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/** One categorised node (with a display name — the name-over-uri rule)
 * under the late-sorting `webcomponents` slug, and one zero-category
 * node, connection keys as captured. */
const uncategorisedRecords = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    "codeStandards(first:100)": {
      __ref: "client:root:codeStandards(first:100)",
    },
    __StandardsIndex_codeStandards_connection: {
      __ref: "client:root:__StandardsIndex_codeStandards_connection",
    },
  },
  "client:root:codeStandards(first:100)": {
    __id: "client:root:codeStandards(first:100)",
    __typename: "CodeStandardConnection",
    edges: {
      __refs: [
        "client:root:codeStandards(first:100):edges:0",
        "client:root:codeStandards(first:100):edges:1",
      ],
    },
    pageInfo: { __ref: "client:root:codeStandards(first:100):pageInfo" },
  },
  "client:root:codeStandards(first:100):edges:0": {
    __id: "client:root:codeStandards(first:100):edges:0",
    __typename: "CodeStandardEdge",
    node: { __ref: "cs:webcomponents.component.naming" },
    cursor: "cursor-0",
  },
  "client:root:codeStandards(first:100):edges:1": {
    __id: "client:root:codeStandards(first:100):edges:1",
    __typename: "CodeStandardEdge",
    node: { __ref: "cs:limbo.orphan_rule" },
    cursor: "cursor-1",
  },
  "client:root:codeStandards(first:100):pageInfo": {
    __id: "client:root:codeStandards(first:100):pageInfo",
    __typename: "PageInfo",
    endCursor: "cursor-1",
    hasNextPage: false,
  },
  "client:root:__StandardsIndex_codeStandards_connection": {
    __id: "client:root:__StandardsIndex_codeStandards_connection",
    __typename: "CodeStandardConnection",
    __connection_next_edge_index: 2,
    edges: {
      __refs: [
        "client:root:__StandardsIndex_codeStandards_connection:edges:0",
        "client:root:__StandardsIndex_codeStandards_connection:edges:1",
      ],
    },
    pageInfo: {
      __ref: "client:root:__StandardsIndex_codeStandards_connection:pageInfo",
    },
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:0": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:0",
    __typename: "CodeStandardEdge",
    node: { __ref: "cs:webcomponents.component.naming" },
    cursor: "cursor-0",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:1": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:1",
    __typename: "CodeStandardEdge",
    node: { __ref: "cs:limbo.orphan_rule" },
    cursor: "cursor-1",
  },
  "client:root:__StandardsIndex_codeStandards_connection:pageInfo": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:pageInfo",
    __typename: "PageInfo",
    endCursor: "cursor-1",
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
  },
  "cs:webcomponents.component.naming": {
    __id: "cs:webcomponents.component.naming",
    __typename: "CodeStandard",
    id: "cs:webcomponents.component.naming",
    uri: "cs:webcomponents.component.naming",
    name: "Component Naming",
    "categories(first:1)": {
      __ref: "client:cs:webcomponents.component.naming:categories(first:1)",
    },
  },
  "client:cs:webcomponents.component.naming:categories(first:1)": {
    __id: "client:cs:webcomponents.component.naming:categories(first:1)",
    __typename: "CategoryConnection",
    edges: {
      __refs: [
        "client:cs:webcomponents.component.naming:categories(first:1):edges:0",
      ],
    },
  },
  "client:cs:webcomponents.component.naming:categories(first:1):edges:0": {
    __id: "client:cs:webcomponents.component.naming:categories(first:1):edges:0",
    __typename: "CategoryEdge",
    node: { __ref: "cs:webcomponents" },
    cursor: "cursor-cat-0",
  },
  "cs:webcomponents": {
    __id: "cs:webcomponents",
    __typename: "Category",
    id: "cs:webcomponents",
    slug: "webcomponents",
  },
  "cs:limbo.orphan_rule": {
    __id: "cs:limbo.orphan_rule",
    __typename: "CodeStandard",
    id: "cs:limbo.orphan_rule",
    uri: "cs:limbo.orphan_rule",
    name: null,
    "categories(first:1)": {
      __ref: "client:cs:limbo.orphan_rule:categories(first:1)",
    },
  },
  "client:cs:limbo.orphan_rule:categories(first:1)": {
    __id: "client:cs:limbo.orphan_rule:categories(first:1)",
    __typename: "CategoryConnection",
    edges: { __refs: [] },
  },
} as unknown as RecordMap;

/** A zero-edge connection, storage keys as captured (both connection
 * records: raw field + @connection handle). */
const emptyRecords = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    "codeStandards(first:100)": {
      __ref: "client:root:codeStandards(first:100)",
    },
    __StandardsIndex_codeStandards_connection: {
      __ref: "client:root:__StandardsIndex_codeStandards_connection",
    },
  },
  "client:root:codeStandards(first:100)": {
    __id: "client:root:codeStandards(first:100)",
    __typename: "CodeStandardConnection",
    edges: { __refs: [] },
    pageInfo: { __ref: "client:root:codeStandards(first:100):pageInfo" },
  },
  "client:root:codeStandards(first:100):pageInfo": {
    __id: "client:root:codeStandards(first:100):pageInfo",
    __typename: "PageInfo",
    endCursor: null,
    hasNextPage: false,
  },
  "client:root:__StandardsIndex_codeStandards_connection": {
    __id: "client:root:__StandardsIndex_codeStandards_connection",
    __typename: "CodeStandardConnection",
    __connection_next_edge_index: 0,
    edges: { __refs: [] },
    pageInfo: {
      __ref: "client:root:__StandardsIndex_codeStandards_connection:pageInfo",
    },
  },
  "client:root:__StandardsIndex_codeStandards_connection:pageInfo": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:pageInfo",
    __typename: "PageInfo",
    endCursor: null,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
  },
} as unknown as RecordMap;

describe("StandardsIndex category grouping", () => {
  it(
    "buckets a zero-category standard as uncategorised, LAST, without fetching",
    () => {
      const fetchFn = createFetchSpy();
      render(standardsIndexPage(uncategorisedRecords, fetchFn));

      // The ordering claim, and the file's teeth: "webcomponents" sorts
      // AFTER "uncategorised" alphabetically, so this order can only come
      // from the uncategorised-last special case, never from localeCompare.
      expect(
        screen
          .getAllByRole("heading", { level: 3 })
          .map((heading) => heading.textContent),
      ).toEqual(["webcomponents", "uncategorised"]);
      // The named standard renders its display name (the name-over-uri
      // rule); the orphan falls back to its URI.
      expect(
        screen.getByRole("link", { name: "Component Naming" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "cs:limbo.orphan_rule" }),
      ).toBeInTheDocument();
      // pageInfo says one page only — no pagination affordance.
      expect(
        screen.queryByRole("button", { name: "Load more" }),
      ).not.toBeInTheDocument();
      expect(fetchFn).not.toHaveBeenCalled();
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );

  it(
    "renders the honest empty state for a zero-edge connection, no fetch",
    () => {
      const fetchFn = createFetchSpy();
      render(standardsIndexPage(emptyRecords, fetchFn));

      expect(screen.queryAllByRole("heading", { level: 3 })).toEqual([]);
      expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
      expect(
        screen.getByText("No standards in the graph."),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Load more" }),
      ).not.toBeInTheDocument();
      expect(fetchFn).not.toHaveBeenCalled();
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );
});
