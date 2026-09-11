/**
 * SSR posture: the composed catalog layout renders to static markup from
 * a warm store — secondary nav, tier sections, and the pagination
 * affordance all present without client JS.
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import { catalogPage } from "../__fixtures__/catalogPageHarness.js";
import catalogRecords from "../__fixtures__/catalogRecords.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("CatalogList SSR", () => {
  it("renders secondary nav, tier groups, and Load more", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(catalogPage(catalogRecords, fetchFn));
    expect(html).toContain('data-region="secondary-nav"');
    expect(html).toContain('id="catalog-tier-global"');
    expect(html).toContain('id="catalog-tier-apps-lxd"');
    expect(html).toContain('id="catalog-tier-sites"');
    expect(html).toContain("Load more");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
