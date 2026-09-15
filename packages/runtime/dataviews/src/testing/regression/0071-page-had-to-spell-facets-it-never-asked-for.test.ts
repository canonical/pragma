/**
 * Regression: a page answering no facets need not spell them.
 *
 * Before the fix, `SourcePage.facets` was required, so every hand-written
 * source — one asked for no facets included — had to write `facets: {}` on
 * each page it delivered. A page may now leave them out, and is read as
 * having answered none.
 */

import { describe, expect, it } from "vitest";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createQueryCoordinator } from "../../lib/coordinator/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";
import type { SourcePage } from "../../lib/result/index.js";
import type { Source } from "../../lib/source/index.js";

/** A page spelled by hand, as a source author writes one, with no facets. */
const page: SourcePage = {
  rows: [{ id: "a" }],
  groups: null,
  counts: {
    pageable: { kind: "unknown" },
    matched: { kind: "unknown" },
    total: { kind: "unknown" },
  },
  more: null,
  cursors: null,
};

describe("regression 0071 — a page had to spell facets it never asked for", () => {
  it("publishes a page without facets through a provider as having answered none", () => {
    const source: Source = {
      capabilities: declare({}),
      execute: (_request, deliver) => {
        deliver({ status: "succeeded", page });
        return () => {};
      },
    };
    const provider = createDataViewsProvider({
      collection: createCollection({ fields: [], identify: byId }),
      source,
    });
    const release = provider.observe();
    expect(provider.state.get().result.facets).toEqual({});
    release();
  });

  it("completes a page without facets as having answered none", () => {
    const coordinator = createQueryCoordinator();
    coordinator.complete(coordinator.refresh(), { status: "succeeded", page });
    expect(coordinator.state.result.facets).toEqual({});
  });
});
