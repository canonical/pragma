/**
 * SSR posture for the whole entity page: a warm store renders the full
 * region set to static markup — no fetch, no client JS. The dev-server e2e
 * asserts the same page through the real HTTP pipeline; this is the fast
 * in-process twin.
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import componentEntityRecordsButton from "../__fixtures__/componentEntityRecordsButton.js";
import { BUTTON_URI, entityPageAt } from "../__fixtures__/entityPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("ComponentEntityPage SSR", () => {
  it("renders marker, header, properties, relations, and aside", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      entityPageAt(BUTTON_URI, componentEntityRecordsButton, fetchFn),
    );
    expect(html).toContain('data-view="component-entity"');
    expect(html).toContain('<h1 id="component-entity-title">Button</h1>');
    expect(html).toContain("variantSpecial");
    expect(html).toContain("Anticipation");
    expect(html).toContain('data-region="aside"');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
