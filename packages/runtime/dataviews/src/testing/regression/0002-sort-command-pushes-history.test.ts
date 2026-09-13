/**
 * Regression: sorting a column must leave a history entry to go back to.
 *
 * Before the fix, every host transition entered history in the provider's
 * one configured mode, which defaulted to `replace` so a stream of edits
 * did not bury the entry the reader arrived on — and a sort command was
 * buried with them, so Back skipped the order the rows had been in. History
 * is now decided per transition: the sort pushes and a search replaces.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import createRecordingLocation from "../../../testing/createRecordingLocation.js";
import { byId, declare, declareSort } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [
    { field: "cpu", kind: "number" },
    { field: "status", kind: "choices", options: ["failed", "ready"] },
  ],
});

describe("regression 0002 — a sort command pushes a history entry", () => {
  it("pushes for the sort and replaces for the search that follows it", () => {
    const { location, writes } = createRecordingLocation({ href: "/machines" });
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({
        capabilities: declare({
          search: { fields: ["name"] },
          sort: declareSort(["cpu"]),
        }),
      }).source,
      location,
    });
    const release = provider.observe();
    provider.setSort([{ field: "cpu", direction: "desc" }]);
    provider.setSearch("web");
    expect(writes.map(([, mode]) => mode)).toEqual([
      "replace",
      "push",
      "replace",
    ]);
    expect(location.read().getAll("sort")).toEqual(["cpu__desc"]);
    release();
  });
});
