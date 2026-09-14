/**
 * Regression: a snapshot's arrangement is checked where it enters.
 *
 * Before the fix, a snapshot's arrangement was trusted as a keyed record. A
 * snapshot parsed from a page — JSON anyone could have written — carrying
 * `"presentation": null` threw while the provider was built, since the
 * session's memory store read the arrangement's entries.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";
import type { DataViewsSnapshot } from "../../lib/snapshot/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "status", kind: "choices", options: ["failed"] }],
});

describe("regression 0032 — a snapshot arrangement was trusted", () => {
  it("builds and observes over an arrangement that is not a record, holding none", () => {
    const snapshot: DataViewsSnapshot = JSON.parse(
      '{"query":"status=failed","presentation":null}',
    );
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({ capabilities: declare({}) }).source,
      snapshot,
    });
    expect(provider.presentation.state.get().presentation).toEqual({});
    const release = provider.observe();
    expect(provider.presentation.state.get().presentation).toEqual({});
    release();
  });
});
