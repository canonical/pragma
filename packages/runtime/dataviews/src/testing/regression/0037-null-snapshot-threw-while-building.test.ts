/**
 * Regression: a snapshot that is not an object is read as none.
 *
 * Before the fix, a snapshot's query and arrangement were checked, but the
 * snapshot itself was trusted. A page embedding `null` where the snapshot
 * was expected — parsed by `JSON.parse` into a value typed as a snapshot —
 * threw while the provider was built, reading the arrangement of nothing.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";
import { EMPTY_SLICE } from "../../lib/query/index.js";
import type { DataViewsSnapshot } from "../../lib/snapshot/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "status", kind: "choices", options: ["failed"] }],
});

describe("regression 0037 — a null snapshot threw while building", () => {
  it.each(["null", "[]", '"status=failed"'])(
    "builds on %s as on no snapshot",
    (text) => {
      const snapshot: DataViewsSnapshot = JSON.parse(text);
      const provider = createDataViewsProvider({
        collection: machines,
        source: createManualSource({ capabilities: declare({}) }).source,
        snapshot,
      });
      expect(provider.state.get().slice).toEqual(EMPTY_SLICE);
      expect(provider.presentation.state.get().presentation).toEqual({});
      expect(provider.issues.get()).toEqual([]);
    },
  );
});
