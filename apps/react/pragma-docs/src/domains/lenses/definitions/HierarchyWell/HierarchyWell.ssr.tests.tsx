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
});
