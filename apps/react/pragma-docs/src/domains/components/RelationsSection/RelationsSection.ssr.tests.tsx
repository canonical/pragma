/**
 * SSR posture: the relation lists render to static markup from a warm
 * store (the `EntryServer` branch after the prepare step).
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import componentEntityRecordsCard from "../__fixtures__/componentEntityRecordsCard.js";
import { CARD_URI, entityPageAt } from "../__fixtures__/entityPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("RelationsSection SSR", () => {
  it("renders the subcomponent list into the server HTML", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      entityPageAt(CARD_URI, componentEntityRecordsCard, fetchFn),
    );
    expect(html).toContain("ds relations-section");
    expect(html).toContain("Card.Content");
    expect(html).toContain("ds:global.subcomponent.card-content");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
