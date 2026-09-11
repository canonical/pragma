/**
 * SSR posture: the rail's full term listing — groups, prefixed hrefs, the
 * filter control at its empty default — renders to static markup from the
 * warm store.
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

describe("TermRail SSR", () => {
  it("renders the groups and percent-encoded term hrefs", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      definitionsPageAt(UIBLOCK_TERM, definitionsExplorerRecords, fetchFn),
    );
    expect(html).toContain('data-slot="explorer-rail"');
    expect(html).toContain('aria-label="Ontology terms"');
    expect(html).toContain('href="/definitions/ds%3AComponent"');
    expect(html).toContain('href="/definitions/cs%3ACodeStandard"');
    expect(html).toContain('href="/definitions/anatomy%3ANamedNode"');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
