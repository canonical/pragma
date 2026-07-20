/**
 * SSR posture: the page's canvas identity (`data-view` + the frame
 * suite's h1 marker) and the term view's real content render to a string
 * from the warm store.
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

describe("DefinitionsPage SSR", () => {
  it("renders the marker, the view identity, and the term's content", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      definitionsPageAt(UIBLOCK_TERM, definitionsExplorerRecords, fetchFn),
    );
    expect(html).toContain('id="lens-definitions-title"');
    expect(html).toContain('data-view="definitions"');
    expect(html).toContain("UI Block");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
