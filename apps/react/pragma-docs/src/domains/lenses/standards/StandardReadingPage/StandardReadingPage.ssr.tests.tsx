/**
 * SSR posture for the whole reading page: a warm store renders the
 * breadcrumb and the reading column to static markup — no fetch, no
 * client JS. The dev-server e2e asserts the same page through the real
 * HTTP pipeline; this is the fast in-process twin.
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import standardEntityRecords from "../__fixtures__/standardEntityRecords.js";
import {
  LINK_COMPONENT_URI,
  standardReadingPageAt,
} from "../__fixtures__/standardsPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("StandardReadingPage SSR", () => {
  it("renders marker, breadcrumb, article, and prose", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      standardReadingPageAt(LINK_COMPONENT_URI, standardEntityRecords, fetchFn),
    );
    expect(html).toContain('data-view="standard-reading"');
    expect(html).toContain(
      `<h1 id="standard-reading-title">${LINK_COMPONENT_URI}</h1>`,
    );
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('data-slot="reading-canvas"');
    expect(html).toContain("LinkComponentProps");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
