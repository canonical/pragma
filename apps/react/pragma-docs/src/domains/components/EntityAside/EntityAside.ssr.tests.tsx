/**
 * SSR posture: the aside renders to static markup from a warm store (the
 * `EntryServer` branch after the prepare step).
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import componentEntityRecordsButton from "../__fixtures__/componentEntityRecordsButton.js";
import { BUTTON_URI, entityPageAt } from "../__fixtures__/entityPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("EntityAside SSR", () => {
  it("renders the quick-facts region into the server HTML", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      entityPageAt(BUTTON_URI, componentEntityRecordsButton, fetchFn),
    );
    expect(html).toContain('data-region="aside"');
    expect(html).toContain("Quick facts");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
