/**
 * BIDIRECTIONAL HOVER, PROVEN AT THE DOM — the claim the exhibit never
 * makes (its hover fades the graph only; the rail is inert). The ego centre
 * was well-LOCAL; it now lives in `DefinitionsExplorer`, shared by the rail
 * and the well, so a hover on EITHER surface reaches the OTHER.
 *
 * These are interaction TEETH in the MED-1 sense: not "a handler fired" but
 * the actual cross-surface DOM change a reader would see. Both directions
 * read the real painted class, never an internal.
 *
 * - Hover a RAIL item → the matching GRAPH node keeps its ego standing
 *   (un-faded) while non-neighbours gain the faded class. A rail hover
 *   drives the graph's ego-fade, exactly as a node hover does.
 * - Hover a GRAPH node → the matching RAIL item gains its hover-highlight
 *   (`is-hovered`), distinct from the aria-current selection underneath.
 *
 * The mount is the full triptych over the captured store (the heaviest
 * render), so it carries the shared timeout for parallel runs.
 */

import "./__fixtures__/stubReactFlowGlobals.js";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import definitionsExplorerRecords from "./__fixtures__/definitionsExplorerRecords.js";
import {
  DEFINITIONS_TEST_TIMEOUT_MS,
  definitionsPageAt,
  UIBLOCK_TERM,
} from "./__fixtures__/definitionsPageHarness.js";
import { NODE_FADED_CLASS } from "./HierarchyWell/decorateGraph.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/** The graph node whose term link points at `href` — the stable
 * cross-reference between a rail item and its node (both address the same
 * term). Returns the `.react-flow__node` wrapper that carries the
 * decoration class. */
const nodeForHref = (well: HTMLElement, href: string): HTMLElement => {
  const link = well.querySelector<HTMLElement>(
    `a.hierarchy-node[href="${href}"]`,
  );
  const node = link?.closest<HTMLElement>(".react-flow__node");
  if (!node) throw new Error(`no graph node for ${href}`);
  return node;
};

describe("bidirectional hover — the rail and the graph share one ego centre", () => {
  it("a RAIL hover fades the GRAPH: the hovered term's node stays lit, a distant node fades", {
    timeout: DEFINITIONS_TEST_TIMEOUT_MS,
  }, () => {
    const { container } = render(
      definitionsPageAt(
        UIBLOCK_TERM,
        definitionsExplorerRecords,
        createFetchSpy(),
      ),
    );
    const rail = screen.getByRole("navigation", { name: "Ontology terms" });
    const well = container.querySelector<HTMLElement>(
      '[data-slot="explorer-canvas"]',
    );
    if (!well) throw new Error("unreachable");

    // Before any hover, the selection's OWN fade is what shows (UIBlock is
    // selected in this fixture). We assert the DELTA a rail hover makes, so
    // pick a probe whose faded-ness the rail hover is what changes: hover a
    // ROOT with a small neighbourhood and watch a node outside it fade.
    const componentItem = within(rail)
      .getByRole("link", { name: "Component" })
      .closest("li");
    if (!componentItem) throw new Error("no Component rail item");

    // Hover the rail's "Component" item — its node and one-hop neighbours
    // stay lit; a node two hops away (a sibling, e.g. Pattern) fades.
    fireEvent.mouseEnter(componentItem);

    const componentNode = nodeForHref(well, "/definitions/ds%3AComponent");
    // The hovered term itself is the ego centre — never faded.
    expect(componentNode.classList.contains(NODE_FADED_CLASS)).toBe(false);

    // A node NOT in Component's 1-hop neighbourhood fades. CodeStandard is
    // in a different ontology entirely — guaranteed distant.
    const distantNode = nodeForHref(well, "/definitions/cs%3ACodeStandard");
    expect(distantNode.classList.contains(NODE_FADED_CLASS)).toBe(true);

    // Leaving the rail item restores the selection-only fade: the distant
    // node is faded by the SELECTION now (UIBlock selected), but the point
    // is the hovered-centre override lifted.
    fireEvent.mouseLeave(componentItem);
    // Component is a neighbour of the selected UIBlock, so with the hover
    // gone it returns to un-faded under the selection's own ego.
    expect(
      nodeForHref(well, "/definitions/ds%3AComponent").classList.contains(
        NODE_FADED_CLASS,
      ),
    ).toBe(false);
  });

  it("a GRAPH hover marks the RAIL: the hovered node's rail item gains is-hovered", {
    timeout: DEFINITIONS_TEST_TIMEOUT_MS,
  }, () => {
    const { container } = render(
      definitionsPageAt(
        UIBLOCK_TERM,
        definitionsExplorerRecords,
        createFetchSpy(),
      ),
    );
    const rail = screen.getByRole("navigation", { name: "Ontology terms" });
    const well = container.querySelector<HTMLElement>(
      '[data-slot="explorer-canvas"]',
    );
    if (!well) throw new Error("unreachable");

    const patternRailItem = within(rail)
      .getByRole("link", { name: "Pattern" })
      .closest("li");
    if (!patternRailItem) throw new Error("no Pattern rail item");
    // Nothing hovered yet: the rail item carries no hover highlight.
    expect(patternRailItem.classList.contains("is-hovered")).toBe(false);

    // Hover the Pattern NODE in the graph (React Flow's node-enter path).
    const patternNode = nodeForHref(well, "/definitions/ds%3APattern");
    fireEvent.mouseEnter(patternNode);

    // THE CROSS-SURFACE CLAIM: the matching RAIL item lit up — a graph
    // hover reached the index. Distinct from selection (aria-current is
    // UIBlock's, untouched).
    expect(patternRailItem.classList.contains("is-hovered")).toBe(true);
    expect(patternRailItem.querySelector("a")).not.toHaveAttribute(
      "aria-current",
    );

    // Leaving the node clears it.
    fireEvent.mouseLeave(patternNode);
    expect(patternRailItem.classList.contains("is-hovered")).toBe(false);
  });

  it("keyboard focus on a rail item drives the same shared centre (past the exhibit's keyboard gap)", {
    timeout: DEFINITIONS_TEST_TIMEOUT_MS,
  }, () => {
    const { container } = render(
      definitionsPageAt(
        UIBLOCK_TERM,
        definitionsExplorerRecords,
        createFetchSpy(),
      ),
    );
    const rail = screen.getByRole("navigation", { name: "Ontology terms" });
    const well = container.querySelector<HTMLElement>(
      '[data-slot="explorer-canvas"]',
    );
    if (!well) throw new Error("unreachable");

    const componentItem = within(rail)
      .getByRole("link", { name: "Component" })
      .closest("li");
    if (!componentItem) throw new Error("no Component rail item");

    // Focus (not pointer) raises the centre — the fade follows the keyboard.
    fireEvent.focus(componentItem);
    const distantNode = nodeForHref(well, "/definitions/cs%3ACodeStandard");
    expect(distantNode.classList.contains(NODE_FADED_CLASS)).toBe(true);
    // The rail item marks itself under focus too.
    expect(componentItem.classList.contains("is-hovered")).toBe(true);

    fireEvent.blur(componentItem);
    expect(componentItem.classList.contains("is-hovered")).toBe(false);
  });
});
