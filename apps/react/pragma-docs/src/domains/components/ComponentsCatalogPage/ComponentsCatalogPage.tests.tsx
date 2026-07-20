/**
 * The catalog's warm-store proof: the trimmed capture renders the tier
 * groups, the cards, and the pagination affordance WITHOUT the network
 * being consulted — with teeth, because the same render against an empty
 * store does hit the network.
 */

import { render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import { catalogPage } from "../__fixtures__/catalogPageHarness.js";
import catalogRecords from "../__fixtures__/catalogRecords.js";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("ComponentsCatalogPage against a warm store", () => {
  it("renders tier groups in R7 order with the fixture's cards, no fetch", () => {
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
  });

  it("has teeth: the same render against an empty store hits the network", () => {
    const fetchFn = createFetchSpy();
    render(catalogPage(undefined, fetchFn));

    expect(screen.getByText("Loading the catalog…")).toBeInTheDocument();
    // The static marker still stands while the interior suspends.
    expect(
      screen.getByRole("heading", { level: 1, name: "Components" }),
    ).toBeInTheDocument();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
