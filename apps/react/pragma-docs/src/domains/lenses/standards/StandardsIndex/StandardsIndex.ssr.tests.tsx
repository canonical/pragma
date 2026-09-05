/**
 * SSR posture: the composed index layout renders to static markup from a
 * warm store — the group section and the pagination affordance both
 * present without client JS. No secondary nav is asserted: the fixture is
 * a single group (the shipped reality for `cs:CodeStandard`), and the nav
 * renders only when there is more than one.
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
  it("renders the group section and Load more", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      standardsIndexPage(standardsIndexRecords, fetchFn),
    );
    expect(html).toContain('data-region="canvas"');
    expect(html).toContain('id="standards-group-codestandard"');
    expect(html).not.toContain('data-region="secondary-nav"');
    expect(html).toContain("Load more");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
