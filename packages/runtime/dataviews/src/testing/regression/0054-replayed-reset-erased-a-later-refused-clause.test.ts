/**
 * Regression: a reset replayed after the location moved keeps the refused
 * clause the move brought.
 *
 * Before the fix, a reset a listener issued during an observation's first
 * pass was written afterwards with the host's current query and the reset's
 * cause. When a later listener had moved the location over the reset, the
 * replay respelled that query whole: the reader's refused clause vanished
 * from the location and from the report.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import { createCollection } from "../../lib/collection/index.js";
import { createMemoryLocation } from "../../lib/location/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
  ],
});

const createSource = () =>
  createManualSource({
    capabilities: declare({ filter: { status: ["isAny"] } }),
    answer: answering([]),
  }).source;

describe("regression 0054 — a replayed reset erased a later refused clause", () => {
  it("writes the move over the reset, keeping the refused clause", () => {
    const location = createMemoryLocation({ href: "/machines?status=running" });
    const provider = createDataViewsProvider({
      collection,
      source: createSource(),
      location,
    });
    // Moved while nothing observed, so the first pass adopts.
    location.write(new URLSearchParams("status=failed"));
    const steps = [
      () => provider.reset(),
      () => location.write(new URLSearchParams("status=melted&size=25")),
    ];
    provider.state.subscribe(() => {
      steps.shift()?.();
    });
    observeUntilFinished(provider);
    expect(provider.state.get().window.size).toBe(25);
    expect(location.read().get("status")).toBe("melted");
    expect(provider.issues.get().map(({ parameter }) => parameter)).toEqual([
      "status",
    ]);
  });
});
