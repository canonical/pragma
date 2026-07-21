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
import { DEFAULT_TABLE_COLUMNS, GRAPH_COLUMNS } from "./types.js";

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

/** The explorer root's grid element — the one carrying the inline template. */
const explorerRoot = (): HTMLElement | null =>
  document.querySelector(".journeys-explorer");

/** The explorer root's live inline grid-template-columns string. jsdom
 * echoes the inline `style` string back verbatim, so the constant we set is
 * exactly what we read. */
const gridTemplate = (): string =>
  explorerRoot()?.style.gridTemplateColumns ?? "";

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
    // RULING 2: the default grid is TWO tracks and the inspector element is
    // absent — no empty inspector column.
    expect(gridTemplate()).toBe(DEFAULT_TABLE_COLUMNS);
    expect(inspectorPresent()).toBe(false);
    expect(explorerRoot()).toHaveAttribute("data-view", "table");
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

    // Precondition: table, two tracks, no inspector.
    expect(tablePresent()).toBe(true);
    expect(wellPresent()).toBe(false);
    expect(inspectorPresent()).toBe(false);
    expect(gridTemplate()).toBe(DEFAULT_TABLE_COLUMNS);

    // Flip to Graph — clicking the STRIP's toggle, which reaches the canvas
    // ONLY through the shared view context.
    fireEvent.click(graphOption());

    // The well's node DOM is now mounted — the actual DOM the reader sees,
    // not a callback. The table's markup is GONE (never both), the inspector
    // region appears, and the grid is now THREE tracks (RULING 2).
    expect(wellPresent()).toBe(true);
    expect(tablePresent()).toBe(false);
    expect(inspectorPresent()).toBe(true);
    expect(gridTemplate()).toBe(GRAPH_COLUMNS);
    expect(explorerRoot()).toHaveAttribute("data-view", "graph");
    expect(graphOption()).toHaveAttribute("aria-pressed", "true");

    // The empty-selection prompt guides the reader honestly rather than a
    // blank canvas: no job is selected, so the graph shows the default
    // coordinate and says how to centre it on one. Asserted by the graph
    // prompt's own class (the inspector's empty state also says "Select a
    // job", so a bare text match would not prove the graph prompt exists).
    expect(
      document.querySelector(".journeys-explorer-graph-prompt")?.textContent,
    ).toMatch(/Select a job/);

    // Flip back to Table — the reverse holds: table returns, well and
    // inspector leave, the grid drops back to two tracks.
    fireEvent.click(tableOption());
    expect(tablePresent()).toBe(true);
    expect(wellPresent()).toBe(false);
    expect(inspectorPresent()).toBe(false);
    expect(gridTemplate()).toBe(DEFAULT_TABLE_COLUMNS);
    expect(explorerRoot()).toHaveAttribute("data-view", "table");
  });
});
