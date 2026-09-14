/**
 * Regression: a view id alone is no query for a provider keeping no views.
 *
 * Before the fix, a location carrying only `view=x` was read as carrying a
 * query whatever the provider kept. A provider given no views, started from
 * a snapshot, stood on the empty query that location decoded to instead:
 * the snapshot's query was dropped on the server and on the client alike.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import createRecordingLocation from "../../../testing/createRecordingLocation.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import { createCollection } from "../../lib/collection/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
  ],
});

describe("regression 0043 — a lone view id hid the snapshot's query", () => {
  it("stands on the snapshot's query, and spells the id out of the location", () => {
    const { location } = createRecordingLocation({ href: "/machines?view=x" });
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["eq"] } }),
        answer: answering([]),
      }).source,
      location,
      snapshot: { query: "status=failed", presentation: {} },
    });
    const readStatus = () =>
      provider.state.get().slice.filter.map(({ operands }) => operands);
    expect(readStatus()).toEqual([["failed"]]);
    observeUntilFinished(provider);
    expect(readStatus()).toEqual([["failed"]]);
    expect(location.read().get("status")).toBe("failed");
    expect(location.read().has("view")).toBe(false);
  });
});
