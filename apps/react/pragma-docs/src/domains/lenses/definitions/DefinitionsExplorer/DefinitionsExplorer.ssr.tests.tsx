/**
 * SSR posture — the React Flow keystone: the whole triptych renders to
 * static markup from a warm store, INCLUDING the well's full node DOM
 * (React Flow v12 server-renders nodes carrying explicit width/height and
 * handles). No browser API, no network, no client JS.
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

describe("DefinitionsExplorer SSR", () => {
  it("renders all three panels — and the well's node DOM — to a string", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      definitionsPageAt(UIBLOCK_TERM, definitionsExplorerRecords, fetchFn),
    );

    expect(html).toContain('data-slot="explorer-rail"');
    expect(html).toContain('data-slot="explorer-canvas"');
    expect(html).toContain('data-slot="explorer-inspector"');

    // The graph's nodes are server-rendered term links: all 29 classes
    // across the four ontologies (31 surface + 17 ds + 3 cs + 9 anatomy).
    const nodeCount = html.match(/hierarchy-node-shell/g)?.length ?? 0;
    expect(nodeCount).toBe(60);
    // Server-rendered edges too (the explicit handles make paths
    // computable without measurement).
    expect(html).toContain("hierarchy-edges");
    expect(html).toContain("hierarchy-edge");

    // The selected term's node/rail links carry aria-current in the
    // server HTML itself.
    expect(html).toContain('aria-current="page"');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
