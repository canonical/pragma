/**
 * The well through the real page fan-out (the captured Button fixture):
 * chips land on their homes or stay honestly inert, the subject anchors
 * the graph without linking to itself, the legend generates from the
 * encoding table, and the ego-fade follows the pointer both in and out.
 */

import { fireEvent, render, within } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import componentEntityRecordsButton from "../__fixtures__/componentEntityRecordsButton.js";
import { BUTTON_URI, entityPageAt } from "../__fixtures__/entityPageHarness.js";
import { EDGE_FAMILIES } from "./constants.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

const renderWell = (): HTMLElement => {
  const { container } = render(
    entityPageAt(BUTTON_URI, componentEntityRecordsButton, createFetchSpy()),
  );
  const well = container.querySelector(".ds.neighbourhood-well");
  expect(well).not.toBeNull();
  return well as HTMLElement;
};

describe("NeighbourhoodWell", () => {
  it("renders the subject as an unlinked centre and links only live homes", () => {
    const well = renderWell();
    const centre = well.querySelector(`[data-well-uri="${BUTTON_URI}"]`);
    expect(centre).not.toBeNull();
    expect(centre?.querySelector("a")).toBeNull();

    // The class node travels to Definitions; the specialisation to its
    // entity page; tier and modifier families stay inert chips.
    const links = [...well.querySelectorAll("a")].map((anchor) =>
      anchor.getAttribute("href"),
    );
    expect(links).toContain("/definitions/ds%3AComponent");
    expect(links).toContain(
      "/components/ds%3Aglobal.component.dropdown_button",
    );
    const tier = well.querySelector('[data-well-uri="ds:global"]');
    expect(tier?.querySelector("a")).toBeNull();
  });

  it("generates the legend from the edge-family table (it cannot drift)", () => {
    const well = renderWell();
    const legend = well.querySelector(".well-legend");
    expect(legend).not.toBeNull();
    for (const family of EDGE_FAMILIES) {
      expect(
        within(legend as HTMLElement).getByText(family.label),
      ).toBeInTheDocument();
    }
  });

  it("fades the rest of the graph around a hovered neighbour, and recovers", () => {
    const well = renderWell();
    const target = well.querySelector(
      '[data-well-uri="ds:global.modifier_family.anticipation"]',
    );
    const bystander = well.querySelector(
      '[data-well-uri="ds:global.modifier_family.importance"]',
    );
    const centre = well.querySelector(`[data-well-uri="${BUTTON_URI}"]`);
    if (target === null || bystander === null || centre === null) {
      throw new Error("well fixtures missing");
    }

    fireEvent.mouseOver(target);
    expect(bystander.className).toContain("well-quiet");
    expect(target.className).not.toContain("well-quiet");
    // The subject never fades: every relation includes it.
    expect(centre.className).not.toContain("well-quiet");

    const canvas = well.querySelector(".well-canvas");
    fireEvent.mouseLeave(canvas as Element);
    expect(bystander.className).not.toContain("well-quiet");
  });
});
