/**
 * SSR posture: the header renders to static markup from a warm store —
 * the exact branch `EntryServer` walks when the prepare step seeded the
 * per-request environment.
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import componentEntityRecordsButton from "../__fixtures__/componentEntityRecordsButton.js";
import { BUTTON_URI, entityPageAt } from "../__fixtures__/entityPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("EntityHeader SSR", () => {
  it("renders the identity block into the server HTML", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      entityPageAt(BUTTON_URI, componentEntityRecordsButton, fetchFn),
    );
    expect(html).toContain('<h1 id="component-entity-title">Button</h1>');
    expect(html).toContain("ds entity-header");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
