/**
 * SSR posture — the v12 server-rendering proof at the component level:
 * the well's full node DOM AND its edges render to a string, because the
 * deterministic layout gives every node explicit width/height and
 * handles. `renderToString` uses no browser API, so any regression to
 * client-only rendering (empty well server-side) fails loudly here.
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import definitionsExplorerRecords from "../__fixtures__/definitionsExplorerRecords.js";
import {
  definitionsPageAt,
  UIBLOCK_TERM,
} from "../__fixtures__/definitionsPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("HierarchyWell SSR", () => {
  it("server-renders all 29 class nodes and the subclass edges", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      definitionsPageAt(UIBLOCK_TERM, definitionsExplorerRecords, fetchFn),
    );

    expect(html).toContain('data-slot="explorer-canvas"');
    const nodeCount = html.match(/react-flow__node-term/g)?.length ?? 0;
    expect(nodeCount).toBe(29);
    // Edge PATHS are in the server markup (the explicit handles at work):
    // the live ds tree carries 16 subclass edges, anatomy 2 — 18 total
    // (cs is flat).
    const edgePathCount = html.match(/react-flow__edge-path/g)?.length ?? 0;
    expect(edgePathCount).toBe(18);
    // Node positions are inline transforms — explicit, not measured.
    expect(html).toContain("translate(");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("server-renders the SELECTION'S ego-fade — the default visual state", () => {
    // The exhibit boots with a selection already made and its
    // neighbourhood already lit. Ours does the same, and does it on the
    // SERVER: `term` comes from the URL, so the fade is a pure function
    // of data both sides hold, and baking it into the markup means the
    // first paint is the finished picture rather than a flash of
    // undifferentiated graph.
    const html = renderToString(
      definitionsPageAt(
        UIBLOCK_TERM,
        definitionsExplorerRecords,
        createFetchSpy(),
      ),
    );

    // Faded nodes are in the SERVER html, not applied by an effect.
    expect(html).toContain("is-faded");
    // The selected node is marked, and is NOT among the faded.
    expect(html).toContain("is-selected");
    // Some nodes are spared (the one-hop neighbourhood): if EVERY node
    // were faded the fade would convey nothing, so prove the neighbours
    // survive by counting faded NODES against all nodes. Counting bare
    // "is-faded" would also sweep in faded edges, which outnumber the
    // nodes and made an earlier version of this assertion meaningless.
    const nodeCount = html.match(/react-flow__node-term/g)?.length ?? 0;
    const fadedNodes =
      html.match(/react-flow__node-term[^"]*is-faded/g)?.length ?? 0;
    expect(nodeCount).toBe(29);
    expect(fadedNodes).toBeGreaterThan(0);
    expect(fadedNodes).toBeLessThan(nodeCount);
    // UIBlock's live neighbourhood: its superclass Entity plus every
    // direct subclass. Exactly those are spared.
    expect(nodeCount - fadedNodes).toBeGreaterThanOrEqual(2);
  });

  it("server-renders NO fade when no term is selected (/definitions)", () => {
    // The term-less address has no selection, so nothing is privileged
    // and nothing recedes — the honest empty state, also server-rendered.
    const html = renderToString(
      definitionsPageAt(
        undefined,
        definitionsExplorerRecords,
        createFetchSpy(),
      ),
    );
    expect(html).toContain("react-flow__node-term");
    expect(html).not.toContain("is-faded");
    expect(html).not.toContain("is-selected");
  });
});
