/**
 * The strip's two tenants, as pure projections of their props.
 *
 * The load-bearing claims: the chips report their state to assistive tech
 * (not only through colour), toggling produces the RIGHT next filter
 * without navigating, and the status figure's numbers agree with the
 * filter it is given — the figure must never be able to flatter the graph.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { allNamespacesFilter, type LensFilter } from "../lensFilter.js";
import ExplorerControls from "./ExplorerControls.js";
import ExplorerStatus from "./ExplorerStatus.js";

const NAMESPACES = [
  { prefix: "ds", label: "ds" },
  { prefix: "cs", label: "cs" },
];

const renderControls = (
  filter: LensFilter,
  onFilterChange = vi.fn(),
): { onFilterChange: ReturnType<typeof vi.fn> } => {
  render(
    <ExplorerControls
      filter={filter}
      namespaceLabels={NAMESPACES}
      onFilterChange={onFilterChange}
    />,
  );
  return { onFilterChange };
};

describe("ExplorerControls", () => {
  it("offers one chip per real axis value — abstraction and ontology", () => {
    renderControls(allNamespacesFilter(["ds", "cs"]));
    // The axes are named for what they ARE. No "experimental"/"stable"
    // chip exists, because OntologyClass carries no such field.
    expect(
      within(screen.getByRole("group", { name: "Filter by abstraction" }))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Abstract", "Concrete"]);
    expect(
      within(screen.getByRole("group", { name: "Filter by ontology" }))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["ds", "cs"]);
  });

  it("reports lit state through aria-pressed, not colour alone", () => {
    renderControls({
      ...allNamespacesFilter(["ds"]),
      abstractions: ["concrete"],
    });
    expect(screen.getByRole("button", { name: "Abstract" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Concrete" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "ds" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "cs" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("toggles a lit chip OFF, leaving the other axis untouched", () => {
    const filter = allNamespacesFilter(["ds", "cs"]);
    const { onFilterChange } = renderControls(filter);

    fireEvent.click(screen.getByRole("button", { name: "cs" }));

    expect(onFilterChange).toHaveBeenCalledTimes(1);
    const next = onFilterChange.mock.calls[0]?.[0] as LensFilter;
    expect([...next.namespaces]).toEqual(["ds"]);
    // The abstraction axis is carried through unchanged.
    expect([...next.abstractions]).toEqual([...filter.abstractions]);
    expect(next.text).toBe(filter.text);
  });

  it("toggles an unlit chip back ON in canonical order", () => {
    const { onFilterChange } = renderControls({
      ...allNamespacesFilter(["ds", "cs"]),
      namespaces: ["cs"],
    });

    fireEvent.click(screen.getByRole("button", { name: "ds" }));

    const next = onFilterChange.mock.calls[0]?.[0] as LensFilter;
    // Canonical order, not append order — chips must not jump around
    // under the cursor as they are toggled.
    expect([...next.namespaces]).toEqual(["ds", "cs"]);
  });
});

describe("ExplorerStatus", () => {
  it("states the proportion in words, not only as a bar", () => {
    render(<ExplorerStatus abstract={4} total={29} visible={17} />);
    // The caption is the accessible channel; the bar is glanceable only.
    expect(screen.getByRole("figure").textContent).toContain(
      "17 of 29 classes",
    );
    expect(screen.getByRole("figure").textContent).toContain("4 abstract");
  });

  it("omits the abstract clause when nothing abstract is showing", () => {
    render(<ExplorerStatus abstract={0} total={29} visible={25} />);
    expect(screen.getByRole("figure").textContent).toContain(
      "25 of 29 classes",
    );
    expect(screen.getByRole("figure").textContent).not.toContain("abstract");
  });

  it("survives the degenerate empty graph without dividing by zero", () => {
    render(<ExplorerStatus abstract={0} total={0} visible={0} />);
    expect(screen.getByRole("figure").textContent).toContain("0 of 0 classes");
  });

  it("announces politely — the count changes as chips move", () => {
    render(<ExplorerStatus abstract={1} total={29} visible={17} />);
    expect(screen.getByRole("figure")).toHaveAttribute("aria-live", "polite");
  });
});
