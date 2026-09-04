/**
 * SSR posture: the inspector aside — identity, live-region contract, and
 * the selected class's record — renders to static markup from the warm
 * store.
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

describe("TermInspector SSR", () => {
  it("renders the aside with its live-region contract and the class record", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      definitionsPageAt(UIBLOCK_TERM, definitionsExplorerRecords, fetchFn),
    );
    expect(html).toContain('data-slot="explorer-inspector"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Term inspector"');
    expect(html).toContain("ds:UIBlock");
    // The lineage breadcrumb (B8) replaced the "Superclasses" bullet list —
    // the ⊂ chain renders server-side from the warm store.
    expect(html).toContain("Lineage");
    expect(html).toContain("⊂");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
