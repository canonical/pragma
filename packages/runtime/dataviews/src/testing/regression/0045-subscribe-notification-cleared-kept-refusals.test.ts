/**
 * Regression: a location notifying as it is subscribed to clears no kept
 * refusal.
 *
 * Before the fix, an observation that wrote nothing awaited no echo, so a
 * location that calls its listener at once — as some adapters do — was read
 * as having moved. Observed again over the spelling the loop had already
 * written, the provider dropped what the snapshot's query was refused for.
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
import { createDataViewsProvider } from "../../lib/provider/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
    { field: "owner", kind: "flag" },
  ],
});

/** A location whose subscription calls the listener at once. */
const notifyingOnSubscribe = (href: string): QueryLocation => {
  const memory = createMemoryLocation({ href });
  return {
    ...memory,
    subscribe(listener) {
      const stop = memory.subscribe(listener);
      listener();
      return stop;
    },
  };
};

describe("regression 0045 — a subscribe notification cleared kept refusals", () => {
  it("keeps reporting them when observed again over its own spelling", () => {
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["eq"] } }),
        answer: answering([]),
      }).source,
      location: notifyingOnSubscribe("/machines"),
      snapshot: { query: "status=failed&owner__isSet=1", presentation: {} },
    });
    const release = provider.observe();
    release();
    observeUntilFinished(provider);
    expect(provider.issues.get().map(({ parameter }) => parameter)).toEqual([
      "owner__isSet",
    ]);
  });
});
