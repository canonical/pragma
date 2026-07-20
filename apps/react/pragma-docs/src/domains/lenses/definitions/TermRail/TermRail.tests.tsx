/**
 * The rail's contracts, driven through the real page over the captured
 * records: per-ontology Classes/Properties grouping with prefixed term
 * addresses, and — the load-bearing one — THE ASYMMETRY: the rail DIMS
 * under a filter and never HIDES, so the index stays complete and stable
 * while the graph is what disappears. The filter itself stays EPHEMERAL
 * (component state, P-D7 transient tier — the URL never changes while
 * filtering). Mounts are consolidated (the full-triptych render is heavy)
 * and carry explicit timeouts for fully-parallel runs.
 */

import "../__fixtures__/stubReactFlowGlobals.js";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import definitionsExplorerRecords from "../__fixtures__/definitionsExplorerRecords.js";
import {
  DEFINITIONS_TEST_TIMEOUT_MS,
  definitionsPageAt,
  UIBLOCK_TERM,
} from "../__fixtures__/definitionsPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

const renderRail = (): HTMLElement => {
  render(
    definitionsPageAt(
      UIBLOCK_TERM,
      definitionsExplorerRecords,
      createFetchSpy(),
    ),
  );
  return screen.getByRole("navigation", { name: "Ontology terms" });
};

describe("TermRail", () => {
  it("groups terms per ontology with prefixed addresses; abstractness is a note, not a name", {
    timeout: DEFINITIONS_TEST_TIMEOUT_MS,
  }, () => {
    const rail = renderRail();

    // The ds group: a class link and a property link, both prefixed.
    const dsGroup = within(rail).getByRole("region", { name: "ds" });
    expect(
      within(dsGroup)
        .getByRole("link", { name: "Component" })
        .getAttribute("href"),
    ).toBe("/definitions/ds%3AComponent");
    expect(
      within(dsGroup)
        .getByRole("link", { name: "hasSubcomponent" })
        .getAttribute("href"),
    ).toBe("/definitions/ds%3AhasSubcomponent");

    // The other two ontologies group their own terms.
    const csGroup = within(rail).getByRole("region", { name: "cs" });
    expect(
      within(csGroup)
        .getByRole("link", { name: "Code Standard" })
        .getAttribute("href"),
    ).toBe("/definitions/cs%3ACodeStandard");
    const anatomyGroup = within(rail).getByRole("region", {
      name: "anatomy",
    });
    expect(
      within(anatomyGroup)
        .getByRole("link", { name: "Named Node" })
        .getAttribute("href"),
    ).toBe("/definitions/anatomy%3ANamedNode");

    // Abstractness rides beside the link, never inside its name.
    const uiBlockItem = within(rail)
      .getByRole("link", { name: "UI Block" })
      .closest("li");
    expect(uiBlockItem).not.toBeNull();
    expect(uiBlockItem?.textContent).toContain("abstract");
  });

  it("DIMS under a filter and never HIDES — the index stays complete", {
    timeout: DEFINITIONS_TEST_TIMEOUT_MS,
  }, () => {
    render(
      definitionsPageAt(
        UIBLOCK_TERM,
        definitionsExplorerRecords,
        createFetchSpy(),
      ),
    );
    const rail = screen.getByRole("navigation", { name: "Ontology terms" });
    const urlBefore = window.location.pathname;
    const countAll = within(rail).getAllByRole("link").length;
    expect(countAll).toBeGreaterThan(1);

    fireEvent.change(screen.getByLabelText("Filter terms"), {
      target: { value: "UI Block" },
    });

    // NOTHING is removed: the same number of links is still mounted, in
    // the same document order. This is the exact behaviour the previous
    // implementation got backwards, and the TTL contract's demand.
    expect(within(rail).getAllByRole("link")).toHaveLength(countAll);
    const match = within(rail).getByRole("link", { name: "UI Block" });
    const nonMatch = within(rail).getByRole("link", { name: "Code Standard" });
    expect(nonMatch).toBeInTheDocument();

    // The non-match is DIMMED; the match is not.
    expect(nonMatch.closest("li")).toHaveAttribute("data-dimmed", "true");
    expect(match.closest("li")).not.toHaveAttribute("data-dimmed");
    // …and the state reaches assistive tech, not just the eye.
    expect(nonMatch.closest("li")).toHaveAttribute("aria-disabled", "true");

    // The filter is view state, never address state (P-D7).
    expect(window.location.pathname).toBe(urlBefore);

    // Clearing un-dims everything.
    fireEvent.change(screen.getByLabelText("Filter terms"), {
      target: { value: "" },
    });
    expect(
      within(rail).getByRole("link", { name: "Code Standard" }).closest("li"),
    ).not.toHaveAttribute("data-dimmed");
  });

  it("reports each group's match count in words, not only in opacity", {
    timeout: DEFINITIONS_TEST_TIMEOUT_MS,
  }, () => {
    render(
      definitionsPageAt(
        UIBLOCK_TERM,
        definitionsExplorerRecords,
        createFetchSpy(),
      ),
    );
    const rail = screen.getByRole("navigation", { name: "Ontology terms" });
    const dsGroup = within(rail).getByRole("region", { name: "ds" });
    const classCount = within(dsGroup)
      .getByRole("heading", { name: /^Classes/ })
      .textContent?.replace("Classes", "")
      .trim();
    // Unfiltered: every class in the group matches.
    expect(classCount).toMatch(/^(\d+) of \1$/);

    fireEvent.change(screen.getByLabelText("Filter terms"), {
      target: { value: "UI Block" },
    });

    // Filtered: the numerator drops, the denominator (what EXISTS) does
    // not — the count says how many match, never how many there are.
    const filtered = within(dsGroup)
      .getByRole("heading", { name: /^Classes/ })
      .textContent?.replace("Classes", "")
      .trim();
    expect(filtered).toBe(`1 of ${classCount?.split(" of ").at(1)}`);
  });
});
