/**
 * StandardsIndex's grouping contract, now that the lens roots at the TBox.
 *
 * The grouping axis changed from `CodeStandard.categories` — an
 * ontology-derived relation the contract cannot traverse — to the
 * instance's own class, which is the only grouping axis the contract does
 * expose. There is no uncategorised bucket any more, because
 * `EntityMeta.type` is non-null: every node has a class.
 *
 * All three record maps below are HAND-AUTHORED PAYLOADS NORMALISED BY
 * RELAY (the same discipline the captured fixtures now carry), so their
 * storage keys — `ontologyClass(uri:"cs:CodeStandard")`,
 * `instances(first:100)`, the `__StandardsIndex_instances_connection`
 * handle — are Relay's own rather than a guess at Relay's.
 *
 * The two-group map is deliberately shaped so ordering has teeth: the
 * later-titled group ("Style rule") comes FIRST in edge order, so the
 * asserted order can only come from the sort.
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

/** Two instances of two different classes — a subclass of the bound class
 * is the only way the pragma deployment could ever show more than one
 * group, and metro shows two (Station / Interchange) for the same reason. */
const twoGroupRecords = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'ontologyClass(uri:"cs:CodeStandard")': {
      __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
    },
  },
  "http://pragma.canonical.com/codestandards#CodeStandard": {
    __id: "http://pragma.canonical.com/codestandards#CodeStandard",
    __typename: "OntologyClass",
    uri: "http://pragma.canonical.com/codestandards#CodeStandard",
    "instances(first:100)": {
      __ref:
        "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100)",
    },
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#CodeStandard:_meta",
    },
    __StandardsIndex_instances_connection: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection",
    },
  },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100)":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100)",
      __typename: "NodeConnection",
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:0",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:1",
        ],
      },
      pageInfo: {
        __ref:
          "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):pageInfo",
      },
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:0",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#styling.tokens.creation",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3R5bGluZy50b2tlbnMuY3JlYXRpb24=",
    },
  "http://pragma.canonical.com/codestandards#styling.tokens.creation": {
    __id: "http://pragma.canonical.com/codestandards#styling.tokens.creation",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#styling.tokens.creation",
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:_meta",
    },
  },
  "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:_meta",
      __typename: "EntityMeta",
      curie: "cs:styling.tokens.creation",
      title: "styling.tokens.creation",
      type: {
        __ref: "http://pragma.canonical.com/codestandards#StyleRule",
      },
    },
  "http://pragma.canonical.com/codestandards#StyleRule": {
    __id: "http://pragma.canonical.com/codestandards#StyleRule",
    __typename: "OntologyClass",
    uri: "http://pragma.canonical.com/codestandards#StyleRule",
    _meta: {
      __ref: "client:http://pragma.canonical.com/codestandards#StyleRule:_meta",
    },
  },
  "client:http://pragma.canonical.com/codestandards#StyleRule:_meta": {
    __id: "client:http://pragma.canonical.com/codestandards#StyleRule:_meta",
    __typename: "EntityMeta",
    title: "Style rule",
  },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:1":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:1",
      __typename: "NodeEdge",
      node: {
        __ref: "http://pragma.canonical.com/codestandards#code.api.stability",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hcGkuc3RhYmlsaXR5",
    },
  "http://pragma.canonical.com/codestandards#code.api.stability": {
    __id: "http://pragma.canonical.com/codestandards#code.api.stability",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#code.api.stability",
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#code.api.stability:_meta",
    },
  },
  "client:http://pragma.canonical.com/codestandards#code.api.stability:_meta": {
    __id: "client:http://pragma.canonical.com/codestandards#code.api.stability:_meta",
    __typename: "EntityMeta",
    curie: "cs:code.api.stability",
    title: "code.api.stability",
    type: {
      __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
    },
  },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:_meta": {
    __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:_meta",
    __typename: "EntityMeta",
    title: "CodeStandard",
  },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):pageInfo":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):pageInfo",
      __typename: "PageInfo",
      endCursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hcGkuc3RhYmlsaXR5",
      hasNextPage: false,
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection",
      __typename: "NodeConnection",
      __connection_next_edge_index: 2,
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:0",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:1",
        ],
      },
      pageInfo: {
        __ref:
          "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:pageInfo",
      },
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:0",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#styling.tokens.creation",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3R5bGluZy50b2tlbnMuY3JlYXRpb24=",
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:1":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:1",
      __typename: "NodeEdge",
      node: {
        __ref: "http://pragma.canonical.com/codestandards#code.api.stability",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hcGkuc3RhYmlsaXR5",
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:pageInfo":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
      hasPreviousPage: false,
      endCursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hcGkuc3RhYmlsaXR5",
      startCursor: null,
    },
} as unknown as RecordMap;

/** A zero-edge connection: the class exists, it just has no instances. */
const emptyRecords = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'ontologyClass(uri:"cs:CodeStandard")': {
      __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
    },
  },
  "http://pragma.canonical.com/codestandards#CodeStandard": {
    __id: "http://pragma.canonical.com/codestandards#CodeStandard",
    __typename: "OntologyClass",
    uri: "http://pragma.canonical.com/codestandards#CodeStandard",
    "instances(first:100)": {
      __ref:
        "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100)",
    },
    __StandardsIndex_instances_connection: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection",
    },
  },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100)":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100)",
      __typename: "NodeConnection",
      edges: {
        __refs: [],
      },
      pageInfo: {
        __ref:
          "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):pageInfo",
      },
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):pageInfo":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):pageInfo",
      __typename: "PageInfo",
      endCursor: null,
      hasNextPage: false,
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection",
      __typename: "NodeConnection",
      __connection_next_edge_index: 0,
      edges: {
        __refs: [],
      },
      pageInfo: {
        __ref:
          "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:pageInfo",
      },
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:pageInfo":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
      hasPreviousPage: false,
      endCursor: null,
      startCursor: null,
    },
} as unknown as RecordMap;

/** `ontologyClass` came back null — a binding that names a class this
 * graph does not carry (a typo, or an ontology that was not loaded). */
const nullClassRecords = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'ontologyClass(uri:"cs:CodeStandard")': null,
  },
} as unknown as RecordMap;

describe("StandardsIndex grouping", () => {
  it(
    "groups by the instance's own class, ordered by group title, with a jump-link nav",
    () => {
      const fetchFn = createFetchSpy();
      render(standardsIndexPage(twoGroupRecords, fetchFn));

      // Ordering: "CodeStandard" before "Style rule", which is the REVERSE
      // of the edge order — only the sort can produce it.
      expect(
        screen
          .getAllByRole("heading", { level: 3 })
          .map((heading) => heading.textContent),
      ).toEqual(["CodeStandard", "Style rule"]);
      // The jump-link nav renders because there is more than one group,
      // and its anchors are derived from the CLASS IRIs, not the headings.
      const nav = screen.getByRole("navigation", { name: "Categories" });
      expect(nav.getAttribute("data-region")).toBe("secondary-nav");
      expect(
        [...nav.querySelectorAll("a")].map((anchor) =>
          anchor.getAttribute("href"),
        ),
      ).toEqual([
        "#standards-group-codestandard",
        "#standards-group-stylerule",
      ]);
      // Link text is `_meta.title`; the address is the ABSOLUTE IRI,
      // percent-encoded, because `node(id:)` accepts nothing else.
      expect(
        screen
          .getByRole("link", { name: "code.api.stability" })
          .getAttribute("href"),
      ).toBe(
        "/standards/http%3A%2F%2Fpragma.canonical.com%2Fcodestandards%23code.api.stability",
      );
      // …and the reader still sees the compact form beside it.
      expect(screen.getByText("cs:code.api.stability")).toBeInTheDocument();
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

  it(
    "renders the empty state, NOT a crash, when the binding names no class",
    () => {
      // `ontologyClass` is nullable and a mis-set binding is the likeliest
      // way to hit it — a typo in `#lib/graphBindings`, or a deployment
      // whose graph never loaded that ontology. The page must degrade, not
      // throw, and the route's ErrorBoundary must never be reached.
      const fetchFn = createFetchSpy();
      render(standardsIndexPage(nullClassRecords, fetchFn));

      expect(
        screen.getByText("No standards in the graph."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("navigation", { name: "Categories" }),
      ).not.toBeInTheDocument();
      expect(fetchFn).not.toHaveBeenCalled();
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );
});
