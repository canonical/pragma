/**
 * Regression: what a snapshot's query was refused for stays reported when
 * the provider is observed again.
 *
 * Before the fix, the refusals were kept for the loop's first observation
 * only. A provider released and observed again — as a StrictMode mount does,
 * or a screen remounted over the same provider — read back the spelling the
 * loop had written, which left the refused clause out, and cleared the
 * report although nothing had moved.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import createRecordingLocation from "../../../testing/createRecordingLocation.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import { createCollection } from "../../lib/collection/index.js";
import {
  createDataViewsProvider,
  readProviderHost,
} from "../../lib/provider/index.js";
import type { Predicate } from "../../lib/query/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
    { field: "owner", kind: "flag" },
  ],
});

/** A provider started from a refused snapshot over a recording location at `/machines`. */
const buildProvider = () => {
  const { location } = createRecordingLocation({ href: "/machines" });
  const provider = createDataViewsProvider({
    collection,
    source: createManualSource({
      capabilities: declare({ filter: { status: ["isAny"] } }),
      answer: answering([]),
    }).source,
    location,
    snapshot: { query: "status=failed&owner__isSet=1", presentation: {} },
  });
  return {
    location,
    provider,
    host: readProviderHost(provider),
    readRefused: () => provider.issues.get().map(({ parameter }) => parameter),
    readStatus: () =>
      provider.state.get().slice.filter.map(({ operands }) => operands),
  };
};

/** The predicate a command moves the host to. */
const RUNNING: Predicate = {
  field: "status",
  operator: "isAny",
  operands: ["running"],
};

describe("regression 0042 — a snapshot's refusals went unreported when observed again", () => {
  it("keeps reporting them across a release and a second observation", () => {
    const { provider, readRefused } = buildProvider();
    const release = provider.observe();
    release();
    observeUntilFinished(provider);
    expect(readRefused()).toEqual(["owner__isSet"]);
  });

  it("drops them once the location moves, and brings none back on the next observation", () => {
    const { location, provider, readRefused } = buildProvider();
    const release = provider.observe();
    location.write(new URLSearchParams("status=failed"));
    expect(readRefused()).toEqual([]);
    release();
    observeUntilFinished(provider);
    expect(readRefused()).toEqual([]);
  });

  it("drops them once a command moves the host, and brings none back on the next observation", () => {
    const { host, provider, readRefused } = buildProvider();
    const release = provider.observe();
    host.setPredicate(RUNNING);
    expect(readRefused()).toEqual([]);
    release();
    observeUntilFinished(provider);
    expect(readRefused()).toEqual([]);
  });

  it("drops them when a command moved the host while nothing observed", () => {
    const { host, provider, readRefused } = buildProvider();
    host.setPredicate(RUNNING);
    observeUntilFinished(provider);
    expect(readRefused()).toEqual([]);
  });

  it("drops them when the location moved while nothing observed", () => {
    const { location, provider, readRefused, readStatus } = buildProvider();
    const release = provider.observe();
    release();
    location.write(new URLSearchParams("status=running"));
    observeUntilFinished(provider);
    expect(readStatus()).toEqual([["running"]]);
    expect(readRefused()).toEqual([]);
  });
});
