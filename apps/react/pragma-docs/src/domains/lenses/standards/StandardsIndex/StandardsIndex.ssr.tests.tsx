/**
 * SSR posture: the composed index layout renders to static markup from a
 * warm store — secondary nav, category sections, and the pagination
 * affordance all present without client JS.
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import standardsIndexRecords from "../__fixtures__/standardsIndexRecords.js";
import { standardsIndexPage } from "../__fixtures__/standardsPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("StandardsIndex SSR", () => {
  it("renders secondary nav, category groups, and Load more", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      standardsIndexPage(standardsIndexRecords, fetchFn),
    );
    expect(html).toContain('data-region="secondary-nav"');
    expect(html).toContain('id="standards-category-code"');
    expect(html).toContain('id="standards-category-styling"');
    expect(html).toContain("Load more");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
