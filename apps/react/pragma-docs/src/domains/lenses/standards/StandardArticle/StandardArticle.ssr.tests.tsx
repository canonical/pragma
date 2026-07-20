/**
 * SSR posture: the reading column renders to static markup from a warm
 * store — header, prose blocks, and extends links present without client
 * JS.
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import standardEntityRecords from "../__fixtures__/standardEntityRecords.js";
import {
  LINK_COMPONENT_URI,
  standardReadingPageAt,
} from "../__fixtures__/standardsPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("StandardArticle SSR", () => {
  it("renders the reading column with prose and extends", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      standardReadingPageAt(LINK_COMPONENT_URI, standardEntityRecords, fetchFn),
    );
    expect(html).toContain('data-slot="reading-canvas"');
    expect(html).toContain("standard-article-prose");
    expect(html).toContain("Extends");
    expect(html).toContain("/standards/cs%3Areact.component.props");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
