/**
 * SSR posture for the whole index page: a warm store renders the lens
 * marker and the composed layout to static markup — no fetch, no client
 * JS. The dev-server e2e asserts the same page through the real HTTP
 * pipeline; this is the fast in-process twin.
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import standardsIndexRecords from "../__fixtures__/standardsIndexRecords.js";
import { standardsIndexPage } from "../__fixtures__/standardsPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("StandardsPage SSR", () => {
  it("renders the lens marker and the grouped index", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      standardsIndexPage(standardsIndexRecords, fetchFn),
    );
    expect(html).toContain('id="lens-standards-title"');
    // The compact identity beside each link, and the absolute IRI in the
    // href — both, because they are now different strings.
    expect(html).toContain("cs:code.array.safe_access");
    expect(html).toContain(
      "/standards/http%3A%2F%2Fpragma.canonical.com%2Fcodestandards%23code.array.safe_access",
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
