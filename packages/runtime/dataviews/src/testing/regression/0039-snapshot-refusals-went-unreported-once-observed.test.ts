/**
 * Regression: what a snapshot's query was refused for stays reported once
 * the provider is observed.
 *
 * Before the fix, a location carrying no query took the host's spelling on
 * the first observation and read it back. The spelling had the refused
 * clause left out already, so the read found nothing refused and cleared
 * the report: the server and the hydrating client drew the notice, and it
 * vanished once the page mounted.
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
    { field: "owner", kind: "flag" },
  ],
});

const capabilities = declare({ filter: { status: ["eq"] } });

describe("regression 0039 — a snapshot's refusals went unreported once observed", () => {
  it("keeps reporting them until the location carries a query of its own", () => {
    const { location } = createRecordingLocation({ href: "/machines" });
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({ capabilities, answer: answering([]) })
        .source,
      location,
      snapshot: { query: "status=failed&owner__isSet=1", presentation: {} },
    });
    const readRefused = () =>
      provider.issues.get().map(({ parameter }) => parameter);
    expect(readRefused()).toEqual(["owner__isSet"]);
    observeUntilFinished(provider);
    expect(location.read().has("owner__isSet")).toBe(false);
    expect(readRefused()).toEqual(["owner__isSet"]);
    location.write(new URLSearchParams("status=failed"));
    expect(readRefused()).toEqual([]);
  });
});
