/**
 * THE VIEW-SWITCH TEETH (FIX 2) — one reading at a time, DOM-level.
 *
 * The owner's ruling: either the table or the graph, never both. This file
 * pins that through the REAL explorer against the captured warm store,
 * reading the real DOM before and after a click — never a "callback fired"
 * assertion (the MED-1 lesson). Flipping to Graph must make the well's node
 * DOM appear AND the table's own markup leave; flipping back must reverse
 * it.
 *
 * The default is the TABLE, and the SSR determinism half is proved by the
 * frame + hydrate suites (the default view's markup is byte-fixed). Here we
 * exercise the client transition the switch performs.
 */

import "../../definitions/__fixtures__/stubReactFlowGlobals.js";
import { fireEvent, render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import journeysExplorerRecords from "../__fixtures__/journeysExplorerRecords.js";
import {
  JOURNEYS_TEST_TIMEOUT_MS,
  journeysPageAt,
} from "../__fixtures__/journeysPageHarness.js";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/** The switch's two toggle buttons, by their accessible name. */
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

describe("JourneysExplorer view switch", () => {
  it("shows the TABLE by default, and never the graph alongside it", {
    timeout: JOURNEYS_TEST_TIMEOUT_MS,
  }, () => {
    const fetchFn = createFetchSpy();
    render(journeysPageAt(undefined, journeysExplorerRecords, fetchFn));

    // Default: the table is mounted, the well is NOT — one reading at a
    // time, table-first.
    expect(tablePresent()).toBe(true);
    expect(wellPresent()).toBe(false);
    // The default is announced on the switch: Table is the pressed toggle.
    expect(tableOption()).toHaveAttribute("aria-pressed", "true");
    expect(graphOption()).toHaveAttribute("aria-pressed", "false");
    // Warm store: no network for the default view.
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("FLIPS to the graph — the well appears AND the table leaves", {
    timeout: JOURNEYS_TEST_TIMEOUT_MS,
  }, () => {
    const fetchFn = createFetchSpy();
    render(journeysPageAt(undefined, journeysExplorerRecords, fetchFn));

    // Precondition.
    expect(tablePresent()).toBe(true);
    expect(wellPresent()).toBe(false);

    // Flip to Graph.
    fireEvent.click(graphOption());

    // The well's node DOM is now mounted — the actual DOM the reader sees,
    // not a callback. And the table's markup is GONE: never both at once.
    expect(wellPresent()).toBe(true);
    expect(tablePresent()).toBe(false);
    expect(graphOption()).toHaveAttribute("aria-pressed", "true");

    // The empty-selection prompt guides the reader honestly rather than a
    // blank canvas: no job is selected, so the graph shows the default
    // coordinate and says how to centre it on one. Asserted by the graph
    // prompt's own class (the inspector's empty state also says "Select a
    // job", so a bare text match would not prove the graph prompt exists).
    expect(
      document.querySelector(".journeys-explorer-graph-prompt")?.textContent,
    ).toMatch(/Select a job/);

    // Flip back to Table — the reverse holds.
    fireEvent.click(tableOption());
    expect(tablePresent()).toBe(true);
    expect(wellPresent()).toBe(false);
  });
});
