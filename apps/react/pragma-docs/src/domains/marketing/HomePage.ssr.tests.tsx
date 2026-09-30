/**
 * SSR posture for the whole lobby: a warm store renders the hero prose
 * and both projections to static markup — no fetch, no client JS. The
 * dev-server e2e asserts the same page through the real HTTP pipeline;
 * this is the fast in-process twin.
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import { lobbyPage } from "./__fixtures__/lobbyPageHarness.js";
import lobbyRecords from "./__fixtures__/lobbyRecords.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("HomePage SSR", () => {
  it("renders the hero, the exemplar strip, and the doors", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(lobbyPage(lobbyRecords, fetchFn));

    // The lens marker and all three layout.lobby slots.
    expect(html).toContain('id="lobby-title"');
    expect(html).toContain('data-slot="hero"');
    expect(html).toContain('data-slot="examples"');
    expect(html).toContain('data-slot="doors"');

    // Both projections reached the static markup: a real exemplar link
    // (D31-addressed) and every door.
    expect(html).toContain(
      'href="/components/ds%3Aglobal.component.accordion"',
    );
    expect(html).toContain('href="/definitions"');
    expect(html).toContain('href="/standards"');
    expect(html).toContain('href="/guides"');

    expect(fetchFn).not.toHaveBeenCalled();
  });
});
