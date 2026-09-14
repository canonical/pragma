/**
 * Regression: a provider keeping no views stands on no view.
 *
 * Before the fix, a view id the URL or a snapshot carried was taken up by a
 * provider given no views. Nothing could ever leave that view: every write
 * and every destination spelled it, and each snapshot handed it on.
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

/** Whether a snapshot's query names an open view. */
const isNamingView = (query: string) => new URLSearchParams(query).has("view");

describe("regression 0040 — a view id was kept without views", () => {
  it("reads no view from the location, and spells the id out of it", () => {
    const { location } = createRecordingLocation({
      href: "/machines?view=x&status=failed",
    });
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({ capabilities, answer: answering([]) })
        .source,
      location,
    });
    expect(isNamingView(provider.readSnapshot().query)).toBe(false);
    observeUntilFinished(provider);
    expect(location.read().has("view")).toBe(false);
    location.write(new URLSearchParams("view=y&status=failed"));
    expect(location.read().has("view")).toBe(false);
    expect(isNamingView(provider.readSnapshot().query)).toBe(false);
  });

  it("reads no view from a snapshot", () => {
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({ capabilities }).source,
      snapshot: { query: "view=x&status=failed", presentation: {} },
    });
    expect(isNamingView(provider.readSnapshot().query)).toBe(false);
  });
});
