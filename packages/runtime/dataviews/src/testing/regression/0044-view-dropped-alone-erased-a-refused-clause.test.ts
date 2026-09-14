/**
 * Regression: dropping an open view keeps the refused clauses beside it.
 *
 * Before the fix, the location loop spelled every move it wrote from the
 * host's query. Dropping a view the store did not have moves the view alone,
 * yet the loop rewrote the whole location: a refused clause the location
 * carried vanished from it and from the report, and a snapshot's kept
 * refusals were cleared — a reload showed a broader query nobody asked for.
 */

import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import createRecordingLocation from "../../../testing/createRecordingLocation.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import openIndexedDBTab from "../../../testing/openIndexedDBTab.js";
import { createCollection } from "../../lib/collection/index.js";
import {
  createDataViewsProvider,
  readProviderHost,
} from "../../lib/provider/index.js";
import type { DataViewsSnapshot } from "../../lib/snapshot/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
    { field: "owner", kind: "flag" },
  ],
});

/** A provider keeping views in an empty store, observed until they are listed. */
const observeWithViewsAt = async (
  href: string,
  snapshot?: DataViewsSnapshot,
) => {
  const { location } = createRecordingLocation({ href });
  const provider = createDataViewsProvider({
    collection,
    source: createManualSource({
      capabilities: declare({ filter: { status: ["eq"] } }),
      answer: answering([]),
    }).source,
    location,
    views: openIndexedDBTab(new IDBFactory()),
    ...(snapshot === undefined ? {} : { snapshot }),
  });
  const views = provider.views;
  if (views === null) {
    throw new Error("expected views over the store given");
  }
  observeUntilFinished(provider);
  await vi.waitFor(() => {
    expect(views.state.get().listing.status).toBe("ready");
  });
  return {
    location,
    provider,
    readRefused: () => provider.issues.get().map(({ parameter }) => parameter),
  };
};

describe("regression 0044 — a view dropped alone erased a refused clause", () => {
  it("keeps a refused clause the location carries, and its report", async () => {
    const { location, provider, readRefused } = await observeWithViewsAt(
      "/machines?view=gone&status=melted",
    );
    expect(readProviderHost(provider).view.get()).toBeNull();
    expect(location.read().has("view")).toBe(false);
    expect(location.read().get("status")).toBe("melted");
    expect(readRefused()).toEqual(["status"]);
  });

  it("keeps reporting what the snapshot's query was refused for", async () => {
    const { location, provider, readRefused } = await observeWithViewsAt(
      "/machines",
      {
        query: "view=gone&status=failed&owner__isSet=1",
        presentation: {},
      },
    );
    expect(readProviderHost(provider).view.get()).toBeNull();
    expect(location.read().has("view")).toBe(false);
    expect(readRefused()).toEqual(["owner__isSet"]);
  });
});
