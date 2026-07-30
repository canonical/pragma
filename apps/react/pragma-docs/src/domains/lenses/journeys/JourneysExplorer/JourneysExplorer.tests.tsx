/**
 * THE VIEW-SWITCH TEETH (RULING 1 + RULING 2) — one reading at a time, and
 * the inspector column comes and goes, DOM-level.
 *
 * The owner's two rulings, pinned against the REAL explorer over the captured
 * warm store, reading the real DOM before and after a click — never a
 * "callback fired" assertion (the MED-1 lesson):
 *
 *   RULING 1 — the Table ⇄ Graph switch now lives in the MODE STRIP's
 *   `controls` socket, not the canvas. So this suite mounts the strip's
 *   switch alongside the page under ONE `JourneyViewProvider` (the
 *   production topology; the switch is a sibling of the canvas and context is
 *   the only path between them) and clicks the STRIP's toggles. Flipping to
 *   Graph must make the well's node DOM appear AND the table's own markup
 *   leave; flipping back must reverse it.
 *
 *   RULING 2 — the grid drops the inspector column in table mode. The
 *   explorer root is TWO-track in table mode (no inspector element, no third
 *   column) and THREE-track in graph mode (the inspector rides the right
 *   track). The teeth assert the inline `grid-template-columns` string AND
 *   the presence/absence of the inspector region — not merely the view swap.
 *
 * The default is the TABLE (two tracks, no inspector), and the SSR
 * determinism half is proved by the frame + hydrate suites (the default
 * view's markup is byte-fixed). Here we exercise the client transition the
 * strip's switch performs.
 */

import "../../definitions/__fixtures__/stubReactFlowGlobals.js";
import { fireEvent, render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import journeysExplorerRecords from "../__fixtures__/journeysExplorerRecords.js";
import {
  JOURNEYS_TEST_TIMEOUT_MS,
  journeysStrip,
} from "../__fixtures__/journeysPageHarness.js";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/** The switch's two toggle buttons, by their accessible name — rendered in
 * the STRIP now (RULING 1), reached the same way the reader reaches them. */
const graphOption = (): HTMLElement =>
  screen.getByRole("button", { name: "Graph" });
const tableOption = (): HTMLElement =>
  screen.getByRole("button", { name: "Table" });

/** Is the well's React Flow node DOM currently mounted? */
const wellPresent = (): boolean =>
  document.querySelector(".react-flow__node-hop") !== null;

/** Is the table's grid currently mounted? */
const tablePresent = (): boolean =>
  document.querySelector('[data-slot="journeys-table"]') !== null;

/** Is the job inspector region currently mounted (RULING 2 — graph only)? */
const inspectorPresent = (): boolean =>
  document.querySelector(".journey-inspector") !== null;

/** The explorer root's grid element. */
const explorerRoot = (): HTMLElement | null =>
  document.querySelector(".journeys-explorer");

/** The view the explorer is in, read off `data-view` — the attribute the
 * stylesheet keys the tenants' column SPANS off (RULING 2, strict
 * intrinsic-grid form: no inline template any more; the view drives spans in
 * CSS, not a template string). This is the SSR-safe seam the switch flips. */
const explorerView = (): string | null =>
  explorerRoot()?.getAttribute("data-view") ?? null;

describe("JourneysExplorer view switch — the strip drives the canvas", () => {
  it("shows the TABLE by default: two-track grid, no inspector, no graph", {
    timeout: JOURNEYS_TEST_TIMEOUT_MS,
  }, () => {
    const fetchFn = createFetchSpy();
    render(journeysStrip(undefined, journeysExplorerRecords, fetchFn));

    // Default: the table is mounted, the well is NOT — one reading at a
    // time, table-first.
    expect(tablePresent()).toBe(true);
    expect(wellPresent()).toBe(false);
    // RULING 2: the default view is TABLE (the stylesheet keys the two-track
    // span off `data-view`) and the inspector element is absent — no empty
    // inspector column.
    expect(explorerView()).toBe("table");
    expect(inspectorPresent()).toBe(false);
    // The default is announced on the strip's switch: Table is pressed.
    expect(tableOption()).toHaveAttribute("aria-pressed", "true");
    expect(graphOption()).toHaveAttribute("aria-pressed", "false");
    // Warm store: no network for the default view.
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("FLIPS to the graph from the STRIP — the well and the inspector appear, the table leaves, the grid gains its third track", {
    timeout: JOURNEYS_TEST_TIMEOUT_MS,
  }, () => {
    const fetchFn = createFetchSpy();
    render(journeysStrip(undefined, journeysExplorerRecords, fetchFn));

    // Precondition: table view, no inspector.
    expect(tablePresent()).toBe(true);
    expect(wellPresent()).toBe(false);
    expect(inspectorPresent()).toBe(false);
    expect(explorerView()).toBe("table");

    // Flip to Graph — clicking the STRIP's toggle, which reaches the canvas
    // ONLY through the shared view context.
    fireEvent.click(graphOption());

    // The well's node DOM is now mounted — the actual DOM the reader sees,
    // not a callback. The table's markup is GONE (never both), the inspector
    // region appears, and the view flips to graph — the stylesheet then gives
    // the inspector its column span (RULING 2).
    expect(wellPresent()).toBe(true);
    expect(tablePresent()).toBe(false);
    expect(inspectorPresent()).toBe(true);
    expect(explorerView()).toBe("graph");
    expect(graphOption()).toHaveAttribute("aria-pressed", "true");

    // The empty-selection guidance now rides the well's OWN floating hint
    // (the separate band above the graph is gone — the graph is the
    // background, owner ruling), so it is asserted on `.journey-hint`. Its
    // "centre the graph" phrasing is unique to the well, so this proves the
    // graph's hint specifically, not the inspector's empty state (which also
    // says "Select a job").
    expect(
      document.querySelector(".journey-hint")?.textContent,
    ).toMatch(/centre the graph/);

    // Flip back to Table — the reverse holds: table returns, well and
    // inspector leave, the view drops back to table.
    fireEvent.click(tableOption());
    expect(tablePresent()).toBe(true);
    expect(wellPresent()).toBe(false);
    expect(inspectorPresent()).toBe(false);
    expect(explorerView()).toBe("table");
  });
});
