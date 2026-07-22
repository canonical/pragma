/**
 * THE WELL ACTUALLY RE-RENDERS — the claim no other suite makes.
 *
 * The well is memoised at its boundary (`HierarchyWell`'s `memo`
 * comparator), and that comparator is the single point of failure for the
 * whole chip mechanism: it decides whether a filter change reaches React
 * Flow at all. Every OTHER consequence of a chip has its own independent
 * witness — the chip's `aria-pressed` flips in `ExplorerControls.tests`,
 * the status figure recounts in `stripSlots.tests` (a sibling reading the
 * same context), the rail dims in `TermRail.tests` — so if the comparator
 * were replaced by `return true`, freezing the graph forever, all 91
 * definitions tests still passed. The chips would visibly toggle, the
 * figure would recount, the rail would dim, and the GRAPH would sit
 * frozen, which is the one thing the lens exists to show.
 *
 * This file closes that. It mounts the page and the strip's Controls the
 * way PRODUCTION mounts them — siblings under one `LensFilterProvider`,
 * because the strip is rendered by the Shell outside the page's subtree —
 * clicks a real chip through the real UI, and asserts on the WELL'S OWN
 * NODES: the count carrying `is-hidden` must rise. Nothing here reads the
 * comparator, the filter object or any internal; the assertion is what a
 * reader would see in the graph.
 *
 * TEETH (verified by hand, and the reason this file exists): setting the
 * comparator body to `return true` makes the hidden count stay 0 and this
 * test fail. Restoring it makes it pass.
 */

import "./__fixtures__/stubReactFlowGlobals.js";
import { HeadProvider } from "@canonical/react-head";
import { createStaticRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import { createEnvironment } from "#relay/environment.js";
import { appRoutes, middleware, notFoundRoute } from "../../../routes.js";
import definitionsExplorerRecords from "./__fixtures__/definitionsExplorerRecords.js";
import { DEFINITIONS_TEST_TIMEOUT_MS } from "./__fixtures__/definitionsPageHarness.js";
import { DefinitionsPage } from "./DefinitionsPage/index.js";
import { HIDDEN_CLASS } from "./HierarchyWell/decorateGraph.js";
import { LensFilterProvider } from "./lensFilterContext.js";
import { definitionsStripSlots } from "./stripSlots.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/**
 * The explorer AND the strip's chip toolbar under ONE filter provider —
 * the production arrangement (`routes.tsx` wraps the Shell, which mounts
 * the strip from route `meta`). Neither existing suite renders both: the
 * explorer's tests mount the page without the chips, and the strip's
 * tests mount the chips without the well. This is the join, and the join
 * is exactly where the memo boundary lives.
 */
const explorerWithChips = (fetchFn: FetchFunction): ReactElement => {
  const { Controls } = definitionsStripSlots;
  return (
    <HeadProvider>
      <RelayEnvironmentProvider
        environment={createEnvironment({
          records: definitionsExplorerRecords,
          fetchFn,
        })}
      >
        <RouterProvider
          router={createStaticRouter(appRoutes, "/definitions", {
            middleware: [...middleware],
            notFound: notFoundRoute,
          })}
        >
          <LensFilterProvider>
            <Controls />
            <DefinitionsPage params={{}} />
          </LensFilterProvider>
        </RouterProvider>
      </RelayEnvironmentProvider>
    </HeadProvider>
  );
};

/** How many of the well's nodes the graph is currently HIDING. Counted
 * from the DOM React Flow painted, never from the model. */
const hiddenNodeCount = (): number =>
  document.querySelectorAll(`.hierarchy-node-shell.${HIDDEN_CLASS}`).length;

/** Every node the well painted, hidden or not. */
const totalNodeCount = (): number =>
  document.querySelectorAll(".hierarchy-node-shell").length;

describe("the well answers a chip toggle", () => {
  it("hides nodes in the GRAPH when an ontology chip goes off", {
    timeout: DEFINITIONS_TEST_TIMEOUT_MS,
  }, () => {
    render(explorerWithChips(createFetchSpy()));

    // The unfiltered graph: every class painted, none hidden. The total
    // is read from the render rather than pinned, so this survives the
    // ontology growing (the 111-to-108 drift lesson).
    const total = totalNodeCount();
    expect(total).toBeGreaterThan(0);
    expect(hiddenNodeCount()).toBe(0);

    // Toggle a real chip through the real UI — the same button a reader
    // presses, mounted by the same code path the Shell uses.
    const chip = screen.getByRole("button", { name: "anatomy" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(chip);

    // THE CLAIM: the graph itself changed. Some nodes are now hidden,
    // and not all of them are — a chip narrows the view, it does not
    // blank it. Counts are related to each other, never pinned.
    const hidden = hiddenNodeCount();
    expect(hidden).toBeGreaterThan(0);
    expect(hidden).toBeLessThan(total);
    // The graph HIDES rather than removing: positions are preserved so
    // the picture restores exactly when the chip comes back on.
    expect(totalNodeCount()).toBe(total);

    // And it is reversible: pressing the chip again restores the whole
    // graph, which is what "hide, never re-lay-out" buys.
    fireEvent.click(chip);
    expect(hiddenNodeCount()).toBe(0);
    expect(totalNodeCount()).toBe(total);
  });

  it("hides nodes in the GRAPH when an abstraction chip goes off", {
    timeout: DEFINITIONS_TEST_TIMEOUT_MS,
  }, () => {
    render(explorerWithChips(createFetchSpy()));

    const total = totalNodeCount();
    expect(hiddenNodeCount()).toBe(0);

    // The other axis, so the comparator is pinned on BOTH the fields it
    // compares — `abstractions` as well as `namespaces`.
    fireEvent.click(screen.getByRole("button", { name: "Abstract" }));

    const hidden = hiddenNodeCount();
    expect(hidden).toBeGreaterThan(0);
    expect(hidden).toBeLessThan(total);
    expect(totalNodeCount()).toBe(total);
  });
});
