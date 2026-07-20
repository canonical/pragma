/**
 * The catalog's warm-store proof: the trimmed capture renders the tier
 * groups, the cards, and the pagination affordance WITHOUT the network
 * being consulted — with teeth, because the same render against an empty
 * store does hit the network.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import type { FetchFunction, GraphQLResponse } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import { CATALOG_PAGE_SIZE } from "#domains/components/catalogQuery.js";
import { catalogPage } from "../__fixtures__/catalogPageHarness.js";
import catalogRecords from "../__fixtures__/catalogRecords.js";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/**
 * Contention insurance (fix-pass F3): these tests mount the full provider
 * stack + static router, which can overrun the 5s default under heavy
 * parallel machine load. Per-test only — the config default stands.
 */
const HARNESS_TEST_TIMEOUT_MS = 15_000;

/**
 * Page 1's captured `endCursor`, read straight off the fixture's connection
 * handle pageInfo so the dispatch assertion below tracks any recapture.
 */
const pageOneEndCursor = (() => {
  const pageInfo = (catalogRecords as unknown as Record<string, unknown>)[
    "client:root:__CatalogList_components_connection:pageInfo"
  ] as { endCursor?: unknown } | undefined;
  const endCursor = pageInfo?.endCursor;
  if (typeof endCursor !== "string") {
    throw new Error("catalogRecords fixture lost its page-1 endCursor");
  }
  return endCursor;
})();

/**
 * A minimal valid page 2 for `CatalogListPaginationQuery` — the wire shape
 * (data.components.edges[].node + cursor, pageInfo) mirrors the live
 * capture recipe in the fixture header; node fields match the operation's
 * selections. Two nodes, `hasNextPage: false` so the affordance retires.
 */
const pageTwoResponse = {
  data: {
    components: {
      edges: [
        {
          node: {
            __typename: "Component",
            id: "ds:global.component.tooltip",
            tier: { name: "Global", id: "ds:global" },
            uri: "ds:global.component.tooltip",
            name: "Tooltip",
            summary: "",
          },
          cursor: "ZHM6Z2xvYmFsLmNvbXBvbmVudC50b29sdGlw",
        },
        {
          node: {
            __typename: "Component",
            id: "ds:apps_workplaceengineering.component.theme_switcher",
            tier: {
              name: "Apps/WorkplaceEngineering",
              id: "ds:apps_workplaceengineering",
            },
            uri: "ds:apps_workplaceengineering.component.theme_switcher",
            name: "ThemeSwitcher",
            summary: "",
          },
          cursor: pageOneEndCursor,
        },
      ],
      pageInfo: { endCursor: pageOneEndCursor, hasNextPage: false },
    },
  },
} as unknown as GraphQLResponse;

describe("ComponentsCatalogPage against a warm store", () => {
  it(
    "renders tier groups in R7 order with the fixture's cards, no fetch",
    () => {
      const fetchFn = createFetchSpy();
      render(catalogPage(catalogRecords, fetchFn));

      // The static lens marker (outside the boundaries).
      expect(
        screen.getByRole("heading", { level: 1, name: "Components" }),
      ).toBeInTheDocument();
      // Tier order, ruling R7: Global first, the rest alphabetical.
      expect(
        screen
          .getAllByRole("heading", { level: 3 })
          .map((heading) => heading.textContent),
      ).toEqual(["Global", "Apps/LXD", "Sites"]);
      // The jump-link secondary nav mirrors the same order.
      const tierNav = screen.getByRole("navigation", { name: "Tiers" });
      expect(tierNav.getAttribute("data-region")).toBe("secondary-nav");
      expect(
        [...tierNav.querySelectorAll("a")].map((anchor) =>
          anchor.getAttribute("href"),
        ),
      ).toEqual([
        "#catalog-tier-global",
        "#catalog-tier-apps-lxd",
        "#catalog-tier-sites",
      ]);
      // Cards: all eight fixture nodes, with the entity link round-tripping
      // the D31 address (percent-encoded URI segment).
      expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(8);
      const accordion = screen.getByRole("link", { name: "Accordion" });
      expect(accordion.getAttribute("href")).toBe(
        "/components/ds%3Aglobal.component.accordion",
      );
      expect(screen.getByRole("link", { name: "Meter" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Quote" })).toBeInTheDocument();
      // The captured pageInfo says the live graph has more than one page —
      // the cap surfaces as an explicit affordance (ruling R1).
      expect(
        screen.getByRole("button", { name: "Load more" }),
      ).toBeInTheDocument();
      // …and the network was NEVER consulted.
      expect(fetchFn).not.toHaveBeenCalled();
    },
    HARNESS_TEST_TIMEOUT_MS,
  );

  it(
    "has teeth: the same render against an empty store hits the network",
    () => {
      const fetchFn = createFetchSpy();
      render(catalogPage(undefined, fetchFn));

      expect(screen.getByText("Loading the catalog…")).toBeInTheDocument();
      // The static marker still stands while the interior suspends.
      expect(
        screen.getByRole("heading", { level: 1, name: "Components" }),
      ).toBeInTheDocument();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    },
    HARNESS_TEST_TIMEOUT_MS,
  );

  it(
    "Load more dispatches ONE pagination fetch after the cursor and appends page 2",
    async () => {
      // A resolving fetch — unlike the never-settling spy above, this one
      // exercises the click→fetch→append action, not just button presence.
      const fetchFn = vi.fn(() =>
        Promise.resolve(pageTwoResponse),
      ) as ReturnType<typeof vi.fn> & FetchFunction;
      render(catalogPage(catalogRecords, fetchFn));
      expect(fetchFn).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Load more" }));

      // (a) Exactly one network dispatch: the generated pagination query,
      // resuming from the fixture's captured endCursor (`cursor` feeds the
      // operation's `after` argument).
      expect(fetchFn).toHaveBeenCalledTimes(1);
      const [requestParams, variables] = fetchFn.mock.calls.at(0) as [
        { name: string },
        Record<string, unknown>,
      ];
      expect(requestParams.name).toBe("CatalogListPaginationQuery");
      expect(variables).toEqual({
        count: CATALOG_PAGE_SIZE,
        cursor: pageOneEndCursor,
      });

      // (b) The resolved page-2 payload's cards APPEND to the list…
      expect(
        await screen.findByRole("link", { name: "ThemeSwitcher" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Tooltip" })).toBeInTheDocument();
      // …page 1 stays on the page…
      expect(
        screen.getByRole("link", { name: "Accordion" }),
      ).toBeInTheDocument();
      // …and page 2's hasNextPage: false retires the affordance.
      expect(
        screen.queryByRole("button", { name: "Load more" }),
      ).not.toBeInTheDocument();
    },
    HARNESS_TEST_TIMEOUT_MS,
  );
});
