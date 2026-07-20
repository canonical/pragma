/**
 * The rail's contracts, driven through the real page over the captured
 * records: per-ontology Classes/Properties grouping with prefixed term
 * addresses, and the EPHEMERAL text filter (component state, P-D7
 * transient tier — the URL never changes while filtering). Mounts are
 * consolidated (the full-triptych render is heavy) and carry explicit
 * timeouts for fully-parallel runs.
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

  it("filters ephemerally: typing narrows the lists, the URL stays put", {
    timeout: DEFINITIONS_TEST_TIMEOUT_MS,
  }, () => {
    const rail = renderRail();
    const urlBefore = window.location.pathname;

    fireEvent.change(within(rail).getByLabelText("Filter terms"), {
      target: { value: "UI Block" },
    });

    expect(
      within(rail).getByRole("link", { name: "UI Block" }),
    ).toBeInTheDocument();
    expect(
      within(rail).queryByRole("link", { name: "Code Standard" }),
    ).not.toBeInTheDocument();
    // Properties that do not match report their empty state honestly.
    expect(
      within(rail).getAllByText("No matching properties.").length,
    ).toBeGreaterThanOrEqual(1);
    // The filter is view state, never address state (P-D7).
    expect(window.location.pathname).toBe(urlBefore);

    // Clearing restores everything.
    fireEvent.change(within(rail).getByLabelText("Filter terms"), {
      target: { value: "" },
    });
    expect(
      within(rail).getByRole("link", { name: "Code Standard" }),
    ).toBeInTheDocument();
  });
});
