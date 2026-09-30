/**
 * SSR posture: catalog cards render to static markup from a warm store —
 * anchors carry their entity hrefs in the raw HTML (what the e2e asserts
 * through the real HTTP pipeline).
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import { catalogPage } from "../__fixtures__/catalogPageHarness.js";
import catalogRecords from "../__fixtures__/catalogRecords.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("CatalogItem SSR", () => {
  it("renders card anchors with encoded entity hrefs", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(catalogPage(catalogRecords, fetchFn));
    expect(html).toContain("ds catalog-item");
    expect(html).toContain(
      'href="/components/ds%3Aglobal.component.accordion"',
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
