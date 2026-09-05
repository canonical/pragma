/**
 * SSR posture for the whole catalog page: a warm store renders the lens
 * marker and the composed layout to static markup — no fetch, no client
 * JS. The dev-server e2e asserts the same page through the real HTTP
 * pipeline; this is the fast in-process twin.
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import { catalogPage } from "../__fixtures__/catalogPageHarness.js";
import catalogRecords from "../__fixtures__/catalogRecords.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("ComponentsCatalogPage SSR", () => {
  it("renders the lens marker and the grouped catalog", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(catalogPage(catalogRecords, fetchFn));
    expect(html).toContain('id="lens-components-title"');
    expect(html).toContain("Accordion");
    expect(html).toContain("Global");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
