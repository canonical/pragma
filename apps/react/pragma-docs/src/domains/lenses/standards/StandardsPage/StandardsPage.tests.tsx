/**
 * The standards index's warm-store proof (the P-2 exit criterion, applied
 * to the P-5 view): a store seeded with the fixture renders the grouped
 * index WITHOUT the network being consulted — with teeth, because the same
 * render against an empty store does hit the network — plus the Load more
 * action (the live graph carries 131 standards, more than one page, so
 * pagination is load-bearing here).
 *
 * It also pins the SINGLE-GROUP posture, which is the shipped reality
 * against the pragma graph: `cs:CodeStandard` has no subclasses, so
 * grouping by the instance's class yields exactly one group and the
 * jump-link secondary nav is deliberately not rendered. A one-item nav is
 * noise, and the two-group case lives in `StandardsIndex.tests.tsx`.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import type { FetchFunction, GraphQLResponse } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import { STANDARDS_PAGE_SIZE } from "#domains/lenses/standards/standardsIndexQuery.js";
import { GRAPH_BINDINGS } from "#lib/graphBindings/index.js";
import standardsIndexRecords from "../__fixtures__/standardsIndexRecords.js";
import {
  CODE_STANDARD_CLASS_URI,
  CS_NAMESPACE,
  STANDARDS_TEST_TIMEOUT_MS,
  standardsIndexPage,
} from "../__fixtures__/standardsPageHarness.js";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/**
 * Page 1's `endCursor`, read straight off the fixture's connection handle
 * pageInfo so the dispatch assertion below tracks any regeneration.
 */
const pageOneEndCursor = (() => {
  const pageInfo = (
    standardsIndexRecords as unknown as Record<string, unknown>
  )[
    `client:${CODE_STANDARD_CLASS_URI}:__StandardsIndex_instances_connection:pageInfo`
  ] as { endCursor?: unknown } | undefined;
  const endCursor = pageInfo?.endCursor;
  if (typeof endCursor !== "string") {
    throw new Error("standardsIndexRecords fixture lost its page-1 endCursor");
  }
  return endCursor;
})();

/**
 * A minimal valid page 2 for `StandardsIndexPaginationQuery`. The node
 * fields match the operation's selections exactly; both nodes are of the
 * bound class, so they land in the SAME group page 1 already has — which
 * is what appending looks like on a graph with no subclasses.
 * `hasNextPage: false` so the affordance retires.
 */
const standardNode = (local: string) => ({
  __typename: "CodeStandard",
  uri: `${CS_NAMESPACE}${local}`,
  _meta: {
    curie: `cs:${local}`,
    title: local,
    type: {
      __typename: "OntologyClass",
      uri: CODE_STANDARD_CLASS_URI,
      _meta: { title: "CodeStandard" },
    },
  },
});

const pageTwoResponse = {
  data: {
    ontologyClass: {
      __typename: "OntologyClass",
      uri: CODE_STANDARD_CLASS_URI,
      instances: {
        edges: [
          {
            node: standardNode("turtle.naming.unified_prefix"),
            cursor: "Y3M6dHVydGxlLm5hbWluZy51bmlmaWVkX3ByZWZpeA==",
          },
          {
            node: standardNode("testing.file.structure"),
            cursor: pageOneEndCursor,
          },
        ],
        pageInfo: { endCursor: pageOneEndCursor, hasNextPage: false },
      },
    },
  },
} as unknown as GraphQLResponse;

describe("StandardsPage against a warm store", () => {
  it(
    "renders one group from the fixture's standards, without a jump-link nav, no fetch",
    () => {
      const fetchFn = createFetchSpy();
      render(standardsIndexPage(standardsIndexRecords, fetchFn));

      // The static lens marker (outside the boundaries).
      expect(
        screen.getByRole("heading", { level: 1, name: "Standards" }),
      ).toBeInTheDocument();
      // Exactly one group — every standard is an instance of the bound
      // class, and that class has no subclasses.
      expect(
        screen
          .getAllByRole("heading", { level: 3 })
          .map((heading) => heading.textContent),
      ).toEqual(["CodeStandard"]);
      // …so the secondary nav is absent. This is the loss the category
      // grouping took, made visible rather than left to a diff reader.
      expect(
        screen.queryByRole("navigation", { name: "Categories" }),
      ).not.toBeInTheDocument();
      // All eight fixture nodes address the reading page by ABSOLUTE IRI,
      // percent-encoded — the D31 round-trip, at its new address.
      expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(8);
      expect(
        screen
          .getByRole("link", { name: "code.array.safe_access" })
          .getAttribute("href"),
      ).toBe(
        `/standards/${encodeURIComponent(`${CS_NAMESPACE}code.array.safe_access`)}`,
      );
      expect(
        screen.getByRole("link", { name: "react.component.link_component" }),
      ).toBeInTheDocument();
      // The fixture's pageInfo says the graph has more than one page — the
      // cap surfaces as an explicit affordance (ruling R1).
      expect(
        screen.getByRole("button", { name: "Load more" }),
      ).toBeInTheDocument();
      // …and the network was NEVER consulted.
      expect(fetchFn).not.toHaveBeenCalled();
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );

  it(
    "has teeth: the same render against an empty store hits the network",
    () => {
      const fetchFn = createFetchSpy();
      render(standardsIndexPage(undefined, fetchFn));

      expect(screen.getByText("Loading the standards…")).toBeInTheDocument();
      // The static marker still stands while the interior suspends.
      expect(
        screen.getByRole("heading", { level: 1, name: "Standards" }),
      ).toBeInTheDocument();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );

  it(
    "Load more dispatches ONE pagination fetch after the cursor and appends page 2",
    async () => {
      // A resolving fetch — unlike the never-settling spy above, this one
      // exercises the click→fetch→append action, not just button presence.
      const fetchFn = vi.fn(() =>
        Promise.resolve(pageTwoResponse),
      ) as ReturnType<typeof vi.fn> & FetchFunction;
      render(standardsIndexPage(standardsIndexRecords, fetchFn));
      expect(fetchFn).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Load more" }));

      // (a) Exactly one network dispatch: the generated pagination query,
      // resuming from the fixture's endCursor — and carrying the CLASS
      // BINDING through, which is what makes the refetch reach the same
      // collection the first page came from.
      expect(fetchFn).toHaveBeenCalledTimes(1);
      const [requestParams, variables] = fetchFn.mock.calls.at(0) as [
        { name: string },
        Record<string, unknown>,
      ];
      expect(requestParams.name).toBe("StandardsIndexPaginationQuery");
      expect(variables).toEqual({
        classUri: GRAPH_BINDINGS.standards.classUri,
        count: STANDARDS_PAGE_SIZE,
        cursor: pageOneEndCursor,
      });

      // (b) The resolved page-2 nodes APPEND under the existing group…
      expect(
        await screen.findByRole("link", {
          name: "turtle.naming.unified_prefix",
        }),
      ).toBeInTheDocument();
      // …page 1 stays on the page…
      expect(
        screen.getByRole("link", { name: "code.array.safe_access" }),
      ).toBeInTheDocument();
      // …and page 2's hasNextPage: false retires the affordance.
      expect(
        screen.queryByRole("button", { name: "Load more" }),
      ).not.toBeInTheDocument();
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );
});
