/**
 * The standards index's warm-store proof (the P-2 exit criterion, applied
 * to the P-5 view): a store seeded with the captured fixture renders the
 * grouped index WITHOUT the network being consulted — with teeth, because
 * the same render against an empty store does hit the network — plus the
 * Load more action (the live graph carries 131 standards, more than the
 * schema's 100-item page cap, so pagination is load-bearing here).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import type { FetchFunction, GraphQLResponse } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import { STANDARDS_PAGE_SIZE } from "#domains/lenses/standards/standardsIndexQuery.js";
import standardsIndexRecords from "../__fixtures__/standardsIndexRecords.js";
import {
  STANDARDS_TEST_TIMEOUT_MS,
  standardsIndexPage,
} from "../__fixtures__/standardsPageHarness.js";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/**
 * Page 1's captured `endCursor`, read straight off the fixture's
 * connection handle pageInfo so the dispatch assertion below tracks any
 * recapture.
 */
const pageOneEndCursor = (() => {
  const pageInfo = (
    standardsIndexRecords as unknown as Record<string, unknown>
  )["client:root:__StandardsIndex_codeStandards_connection:pageInfo"] as
    | { endCursor?: unknown }
    | undefined;
  const endCursor = pageInfo?.endCursor;
  if (typeof endCursor !== "string") {
    throw new Error("standardsIndexRecords fixture lost its page-1 endCursor");
  }
  return endCursor;
})();

/**
 * A minimal valid page 2 for `StandardsIndexPaginationQuery` — the wire
 * shape mirrors the live capture recipe in the fixture header; node
 * fields match the operation's selections. Two nodes from the REAL second
 * page (the live graph's 131st standards live past the cap), one of them
 * carrying a display name — the loaded page exercises the name-over-uri
 * rule. `hasNextPage: false` so the affordance retires.
 */
const pageTwoResponse = {
  data: {
    codeStandards: {
      edges: [
        {
          node: {
            __typename: "CodeStandard",
            id: "cs:turtle.naming.unified_prefix",
            uri: "cs:turtle.naming.unified_prefix",
            name: "Unified Prefix",
            categories: {
              edges: [
                {
                  node: {
                    __typename: "Category",
                    id: "cs:turtle",
                    slug: "turtle",
                  },
                },
              ],
            },
          },
          cursor: "Y3M6dHVydGxlLm5hbWluZy51bmlmaWVkX3ByZWZpeA==",
        },
        {
          node: {
            __typename: "CodeStandard",
            id: "cs:testing.file.structure",
            uri: "cs:testing.file.structure",
            name: null,
            categories: {
              edges: [
                {
                  node: {
                    __typename: "Category",
                    id: "cs:testing",
                    slug: "testing",
                  },
                },
              ],
            },
          },
          cursor: pageOneEndCursor,
        },
      ],
      pageInfo: { endCursor: pageOneEndCursor, hasNextPage: false },
    },
  },
} as unknown as GraphQLResponse;

describe("StandardsPage against a warm store", () => {
  it(
    "renders category groups alphabetically with the fixture's standards, no fetch",
    () => {
      const fetchFn = createFetchSpy();
      render(standardsIndexPage(standardsIndexRecords, fetchFn));

      // The static lens marker (outside the boundaries).
      expect(
        screen.getByRole("heading", { level: 1, name: "Standards" }),
      ).toBeInTheDocument();
      // Category order: alphabetical slugs (no Global-first analogue).
      expect(
        screen
          .getAllByRole("heading", { level: 3 })
          .map((heading) => heading.textContent),
      ).toEqual(["code", "css", "react", "storybook", "styling"]);
      // The jump-link secondary nav mirrors the same order.
      const categoryNav = screen.getByRole("navigation", {
        name: "Categories",
      });
      expect(categoryNav.getAttribute("data-region")).toBe("secondary-nav");
      expect(
        [...categoryNav.querySelectorAll("a")].map((anchor) =>
          anchor.getAttribute("href"),
        ),
      ).toEqual([
        "#standards-category-code",
        "#standards-category-css",
        "#standards-category-react",
        "#standards-category-storybook",
        "#standards-category-styling",
      ]);
      // Links: all eight fixture nodes address the reading page with the
      // D31 round-trip (percent-encoded URI segment); no live standard on
      // page 1 carries a name, so the URI is the link text.
      expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(8);
      const safeAccess = screen.getByRole("link", {
        name: "cs:code.array.safe_access",
      });
      expect(safeAccess.getAttribute("href")).toBe(
        "/standards/cs%3Acode.array.safe_access",
      );
      expect(
        screen.getByRole("link", { name: "cs:react.component.link_component" }),
      ).toBeInTheDocument();
      // The captured pageInfo says the live graph has more than one page —
      // the cap surfaces as an explicit affordance (ruling R1).
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
      // resuming from the fixture's captured endCursor.
      expect(fetchFn).toHaveBeenCalledTimes(1);
      const [requestParams, variables] = fetchFn.mock.calls.at(0) as [
        { name: string },
        Record<string, unknown>,
      ];
      expect(requestParams.name).toBe("StandardsIndexPaginationQuery");
      expect(variables).toEqual({
        count: STANDARDS_PAGE_SIZE,
        cursor: pageOneEndCursor,
      });

      // (b) The resolved page-2 nodes APPEND: the named standard renders
      // its display name (the name-over-uri rule) under its NEW category
      // heading…
      expect(
        await screen.findByRole("link", { name: "Unified Prefix" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 3, name: "turtle" }),
      ).toBeInTheDocument();
      // …page 1 stays on the page…
      expect(
        screen.getByRole("link", { name: "cs:code.array.safe_access" }),
      ).toBeInTheDocument();
      // …and page 2's hasNextPage: false retires the affordance.
      expect(
        screen.queryByRole("button", { name: "Load more" }),
      ).not.toBeInTheDocument();
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );
});
