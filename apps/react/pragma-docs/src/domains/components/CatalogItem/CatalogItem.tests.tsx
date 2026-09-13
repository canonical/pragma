/**
 * CatalogItem through the real page fan-out: the card's link address is
 * the router's own render of `componentEntity` (percent-encoded URI
 * segment — the D31 pin in `routeQueries.tests.ts` holds it equal to
 * `resolveChipHref`), with the tier tag and the summary teaser.
 */

import { render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import { catalogPage } from "../__fixtures__/catalogPageHarness.js";
import catalogRecords from "../__fixtures__/catalogRecords.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("CatalogItem", () => {
  it("links each card to its entity page with tier tag and teaser", () => {
    const fetchFn = createFetchSpy();
    render(catalogPage(catalogRecords, fetchFn));

    const buttonLink = screen.getByRole("link", { name: "Button" });
    expect(buttonLink.getAttribute("href")).toBe(
      "/components/ds%3Aglobal.component.button",
    );
    const card = buttonLink.closest("li");
    expect(card?.className).toContain("ds catalog-item");
    expect(card?.textContent).toContain("Global");
    expect(card?.textContent).toContain("Buttons trigger actions");
    // An LXD-tier card addresses ITS uri, encoded the same way.
    expect(
      screen.getByRole("link", { name: "BackLink" }).getAttribute("href"),
    ).toBe("/components/ds%3Aapps_lxd.component.back_link");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
