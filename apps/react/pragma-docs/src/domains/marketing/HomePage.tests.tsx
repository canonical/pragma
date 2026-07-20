/**
 * The Home lobby's warm-store proof (the P-2 exit criterion, applied to
 * the front door): a store seeded with the captured fixture renders both
 * projections WITHOUT the network being consulted — with teeth, because
 * the same render against an empty store does hit the network.
 *
 * The numbers are read OUT OF THE FIXTURE, never hardcoded here: the
 * graph moves (the 111→108 lesson), and a recapture must not need a test
 * edit. What IS pinned is that the rendered number equals the fixture's
 * `instanceCount` — the honest-count contract from `lobbyQuery.ts`, whose
 * whole point is that this figure is NOT a capped edge count.
 */

import { render, screen, within } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import {
  FIRST_EXEMPLAR_NAME,
  FIRST_EXEMPLAR_URI,
  LOBBY_TEST_TIMEOUT_MS,
  lobbyPage,
} from "./__fixtures__/lobbyPageHarness.js";
import lobbyRecords from "./__fixtures__/lobbyRecords.js";
import {
  LOBBY_COMPONENT_CLASS,
  LOBBY_EXEMPLAR_COUNT,
  LOBBY_PATTERN_CLASS,
  LOBBY_STANDARD_CLASS,
} from "./lobbyQuery.js";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/**
 * Read a class's captured `instanceCount` straight off the fixture, so
 * every count assertion below tracks a recapture instead of pinning a
 * graph number.
 */
const capturedInstanceCount = (classUri: string): number => {
  const record = (lobbyRecords as unknown as Record<string, unknown>)[
    `client:root:ontologyClass(uri:"${classUri}")`
  ] as { instanceCount?: unknown } | undefined;
  const count = record?.instanceCount;
  if (typeof count !== "number") {
    throw new Error(
      `lobbyRecords fixture lost its instanceCount for ${classUri}`,
    );
  }
  return count;
};

describe("HomePage against a warm store", () => {
  it(
    "renders the hero prose and both projections from the fixture, no fetch",
    () => {
      const fetchFn = createFetchSpy();
      render(lobbyPage(lobbyRecords, fetchFn));

      // The static lens marker (outside the boundaries).
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "The design system, as a graph",
        }),
      ).toBeInTheDocument();

      // ── projection 1: the exemplar strip ──
      const examples = screen.getByRole("region", {
        name: "A few of the components",
      });
      expect(examples.getAttribute("data-slot")).toBe("examples");
      const exemplarLinks = within(examples).getAllByRole("link");
      // Exactly the page size the query asked for — the strip never
      // silently truncates or pads.
      expect(exemplarLinks).toHaveLength(LOBBY_EXEMPLAR_COUNT);
      // The D31 round-trip: an exemplar's href IS the entity address.
      const first = within(examples).getByRole("link", {
        name: FIRST_EXEMPLAR_NAME,
      });
      expect(first.getAttribute("href")).toBe(
        `/components/${encodeURIComponent(FIRST_EXEMPLAR_URI)}`,
      );
      // Every strip link lands on the components lens, none elsewhere.
      for (const link of exemplarLinks) {
        expect(link.getAttribute("href")).toMatch(/^\/components\/ds%3A/);
      }

      // ── projection 2: the doors, with their honest counts ──
      const doors = screen.getByRole("region", { name: "The lenses" });
      expect(doors.getAttribute("data-slot")).toBe("doors");
      const doorLinks = within(doors).getAllByRole("link");
      expect(doorLinks.map((link) => link.getAttribute("href"))).toEqual([
        "/components",
        "/definitions",
        "/standards",
        "/guides",
      ]);

      // The rendered figures equal the fixture's instanceCount — the
      // honest-count contract. Read from the fixture, never pinned.
      const componentCount = capturedInstanceCount(LOBBY_COMPONENT_CLASS);
      const patternCount = capturedInstanceCount(LOBBY_PATTERN_CLASS);
      const standardCount = capturedInstanceCount(LOBBY_STANDARD_CLASS);
      expect(doors.textContent).toContain(
        `The graph holds ${componentCount} components and ${patternCount} patterns.`,
      );
      expect(doors.textContent).toContain(
        `The graph holds ${standardCount} of them.`,
      );

      // The standards figure is the one the cap would have LIED about:
      // the connection maxes at 100 per page, so a count above that could
      // only have come from `instanceCount`. If a future edit swaps the
      // source back to an edge count, this snaps.
      expect(standardCount).toBeGreaterThan(100);

      // Definitions is named WITHOUT a number (no cheap honest count
      // exists for it) — and no door invents a zero.
      const definitionsDoor = within(doors)
        .getByRole("link", { name: "Definitions" })
        .closest("li");
      expect(definitionsDoor?.textContent).not.toMatch(/\d/);

      // Guides says what it is rather than promising a built lens.
      const guidesDoor = within(doors)
        .getByRole("link", { name: "Guides" })
        .closest("li");
      expect(guidesDoor?.textContent).toContain("placeholder");

      // …and the network was NEVER consulted.
      expect(fetchFn).not.toHaveBeenCalled();
    },
    LOBBY_TEST_TIMEOUT_MS,
  );

  it(
    "has teeth: the same render against an empty store hits the network",
    () => {
      const fetchFn = createFetchSpy();
      render(lobbyPage(undefined, fetchFn));

      expect(
        screen.getByText("Loading the graph’s shape…"),
      ).toBeInTheDocument();
      // The hero is authored prose, so it stands while the interior
      // suspends — the lobby is readable before the graph answers.
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "The design system, as a graph",
        }),
      ).toBeInTheDocument();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    },
    LOBBY_TEST_TIMEOUT_MS,
  );
});
