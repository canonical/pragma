/**
 * Regression: a write is read back even when an earlier queued write lands
 * within it.
 *
 * Before the fix, the loop decided whether to read a write back by reading
 * the location after it, and took a location carrying neither the spelling
 * written nor the one it stood at before as moved by a listener. A router
 * landing the previous queued write as the next arrived left the location on
 * that previous spelling, so the new spelling was never read back, and a
 * clause in it the source cannot execute went unreported.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import { createCollection } from "../../lib/collection/index.js";
import {
  createMemoryLocation,
  type QueryLocation,
} from "../../lib/location/index.js";
import {
  createDataViewsProvider,
  readProviderHost,
} from "../../lib/provider/index.js";
import {
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type Predicate,
} from "../../lib/query/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
  ],
});

const FAILED: Predicate = {
  field: "status",
  operator: "isAny",
  operands: ["failed"],
};

describe("regression 0058 — a queued write landing within a write skipped its read-back", () => {
  it("reports what the source refuses in a write made while the one before lands", () => {
    const memory = createMemoryLocation({ href: "/machines?page=1&size=50" });
    const pending: URLSearchParams[] = [];
    const location: QueryLocation = {
      ...memory,
      write(next) {
        // The router applies the navigation before as the next one arrives.
        const earlier = pending.shift();
        pending.push(next);
        if (earlier !== undefined) {
          memory.write(earlier);
        }
      },
    };
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["isAny"] } }),
        answer: answering([]),
      }).source,
      location,
    });
    observeUntilFinished(provider);
    const host = readProviderHost(provider);
    host.setPredicate(FAILED);
    // A query carrying an ordering the source cannot execute, adopted past the
    // command boundary.
    host.adopt(
      {
        slice: {
          ...EMPTY_SLICE,
          filter: [FAILED],
          sort: [{ field: "status", direction: "asc" }],
        },
        window: DEFAULT_WINDOW,
      },
      "view",
      null,
    );
    expect(provider.issues.get().map(({ parameter }) => parameter)).toContain(
      "sort",
    );
  });
});
