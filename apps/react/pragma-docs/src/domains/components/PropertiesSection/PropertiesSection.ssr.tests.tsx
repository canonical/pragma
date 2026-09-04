/**
 * SSR posture: the property table renders to static markup from a warm
 * store (the `EntryServer` branch after the prepare step).
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import componentEntityRecordsButton from "../__fixtures__/componentEntityRecordsButton.js";
import { BUTTON_URI, entityPageAt } from "../__fixtures__/entityPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("PropertiesSection SSR", () => {
  it("renders the property rows into the server HTML", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      entityPageAt(BUTTON_URI, componentEntityRecordsButton, fetchFn),
    );
    expect(html).toContain("ds properties-section");
    expect(html).toContain("variantSpecial");
    expect(html).toContain("anticipation");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
