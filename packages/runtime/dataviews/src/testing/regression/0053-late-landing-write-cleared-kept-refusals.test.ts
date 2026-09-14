/**
 * Regression: a first-pass write that lands late is the loop's own echo.
 *
 * Before the fix, the loop awaited only where the location stood once its
 * first pass was done. A router applying the pass's write after the call
 * returned delivered that very spelling later, which the loop read as the
 * reader's move: what the snapshot's query was refused for stopped being
 * reported while the host still stood on the narrowed query.
 *
 * It also pins that a location already carrying what the host spells is
 * left unwritten, so the loop never awaits a write it never made.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import createRecordingLocation from "../../../testing/createRecordingLocation.js";
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

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
    { field: "owner", kind: "flag" },
  ],
});

/** The spelling the first pass writes for the snapshot's executable query. */
const SNAPSHOT_SPELLING = "status=failed&page=1&size=50";

/**
 * A provider started from a refused snapshot over a location at `/machines`
 * whose writes wait in `pending` until landed — or, with `drops`, never land.
 */
const buildLagging = (drops = false) => {
  const memory = createMemoryLocation({ href: "/machines" });
  const pending: URLSearchParams[] = [];
  const location: QueryLocation = {
    ...memory,
    write(next) {
      if (!drops) {
        pending.push(next);
      }
    },
  };
  const provider = createDataViewsProvider({
    collection,
    source: createManualSource({
      capabilities: declare({ filter: { status: ["eq"] } }),
      answer: answering([]),
    }).source,
    location,
    snapshot: { query: "status=failed&owner__isSet=1", presentation: {} },
  });
  return {
    memory,
    pending,
    provider,
    /** The router applies the oldest navigation still waiting. */
    landNext: () => {
      const next = pending.shift();
      if (next !== undefined) {
        memory.write(next);
      }
    },
    readRefused: () => provider.issues.get().map(({ parameter }) => parameter),
    readFilter: () =>
      provider.state.get().slice.filter.map(({ operands }) => operands),
  };
};

describe("regression 0053 — a late-landing write cleared kept refusals", () => {
  it("keeps reporting the snapshot's refusals when the write lands", () => {
    const { memory, pending, provider, landNext, readRefused, readFilter } =
      buildLagging();
    observeUntilFinished(provider);
    expect(readRefused()).toEqual(["owner__isSet"]);
    while (pending.length > 0) {
      landNext();
    }
    expect(readRefused()).toEqual(["owner__isSet"]);
    // And a later move of the reader's own is read as one.
    memory.write(new URLSearchParams("status=running"));
    expect(readRefused()).toEqual([]);
    expect(readFilter()).toEqual([["running"]]);
  });

  it("reads a return to where the location stood before the pass, once the write landed", () => {
    const { memory, provider, landNext, readFilter } = buildLagging();
    observeUntilFinished(provider);
    landNext();
    memory.write(new URLSearchParams(""));
    expect(readFilter()).toEqual([]);
  });

  it("reads back a transition written while the first write has not landed", () => {
    const { pending, provider, landNext, readRefused, readFilter } =
      buildLagging();
    observeUntilFinished(provider);
    readProviderHost(provider).setPredicate({
      field: "status",
      operator: "eq",
      operands: ["running"],
    });
    expect(readRefused()).toEqual([]);
    expect(readFilter()).toEqual([["running"]]);
    expect(pending.at(-1)?.get("status")).toBe("running");
    while (pending.length > 0) {
      landNext();
    }
    expect(readFilter()).toEqual([["running"]]);
    expect(readRefused()).toEqual([]);
  });

  it("adopts the first write when it lands after the reader moved elsewhere", () => {
    const { memory, pending, provider, landNext, readFilter } = buildLagging();
    observeUntilFinished(provider);
    expect(pending.at(0)?.toString()).toBe(SNAPSHOT_SPELLING);
    memory.write(new URLSearchParams("status=running"));
    expect(readFilter()).toEqual([["running"]]);
    landNext();
    expect(readFilter()).toEqual([["failed"]]);
  });

  it("adopts a spelling a dropped first write had, once observed again", () => {
    const { memory, provider, readFilter } = buildLagging(true);
    const release = provider.observe();
    release();
    memory.write(new URLSearchParams("status=running"));
    observeUntilFinished(provider);
    expect(readFilter()).toEqual([["running"]]);
    memory.write(new URLSearchParams(SNAPSHOT_SPELLING));
    expect(readFilter()).toEqual([["failed"]]);
  });

  it("writes nothing when the location already carries what a reset returns to", () => {
    const { location, writes } = createRecordingLocation({
      href: "/machines?page=1&size=50",
    });
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["eq"] } }),
        answer: answering([]),
      }).source,
      location,
    });
    provider.reset();
    observeUntilFinished(provider);
    expect(writes).toEqual([]);
  });
});
